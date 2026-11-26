"""Private frozen plans, append-only events, summaries and run comparison."""
import json
import os
import platform
import re
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from . import PROTOCOL, __version__
from .errors import LabError
from .manifest import canonical, digest, manifest_bytes, read_json

VERSION = 'redown.live-lab.receipt/1'
RUN_ID = re.compile(r'[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\Z')


def stamp():
    return datetime.now(timezone.utc).isoformat(timespec='milliseconds')


def exclusive(path, data):
    with Path(path).open('xb') as stream:
        stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())


def document(path, data):
    value = json.dumps(data, ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False) + '\n'
    exclusive(path, value.encode('utf-8'))


def environment(caps):
    return {
        'evidenceClass': caps['evidenceClass'], 'runnerVersion': __version__, 'sdkVersion': __version__,
        'protocol': PROTOCOL, 'engineVersion': caps.get('engineVersion'), 'extensionVersion': caps.get('extensionVersion'),
        'commit': caps.get('commit'), 'sourceDigest': caps.get('sourceDigest'),
        'python': platform.python_version(), 'platform': platform.system(), 'platformRelease': platform.release(),
        'architecture': platform.machine(),
    }


class Journal:
    def __init__(self, root):
        self.root = Path(root)
        self.path = self.root / 'operations.ndjson'
        self.start = time.monotonic()

    def append(self, event, **data):
        row = {'event': event, 'at': stamp(), 'elapsedMs': round((time.monotonic() - self.start) * 1000), **data}
        data = canonical(row) + b'\n'
        with self.path.open('ab') as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())

    def rows(self):
        if not self.path.exists():
            return
        with self.path.open('rb') as stream:
            for line in stream:
                # An interrupted last append is not a receipt.
                if not line.endswith(b'\n'):
                    break
                yield json.loads(line)


def snapshot(root, original, document_path, plan, context):
    raw = manifest_bytes(document_path)
    temporary = root / 'manifest.json'
    exclusive(temporary, raw)
    if digest(read_json(temporary)) != digest(original):
        raise LabError('MANIFEST_CHANGED')
    core = {'manifestDigest': plan['manifestDigest'], 'generator': plan['generator'],
            'inventory': plan['inventory'], 'schedule': plan['schedule'],
            'estimate': plan['estimate'], 'effectiveBudget': plan['effectiveBudget'],
            'target': context['target'], 'overrides': context['overrides']}
    frozen = {**core, 'resolvedDigest': digest(core)}
    document(root / 'resolved-manifest.json', frozen)
    document(root / 'source-inventory.json', plan['inventory'])
    document(root / 'run.json', {**context, 'receiptSchema': VERSION, 'openedAt': stamp(),
                                 'resolvedDigest': frozen['resolvedDigest']})
    return frozen


def load_run(root):
    run = read_json(root / 'run.json')
    frozen = read_json(root / 'resolved-manifest.json')
    original = read_json(root / 'manifest.json')
    original_hash = digest(original)
    recorded = frozen.pop('resolvedDigest', None)
    if (run.get('receiptSchema') != VERSION or not RUN_ID.fullmatch(run.get('runId', ''))
            or recorded != run.get('resolvedDigest') or recorded != digest(frozen)
            or frozen.get('manifestDigest') != original_hash
            or read_json(root / 'source-inventory.json') != frozen['inventory']):
        raise LabError('FROZEN_MANIFEST_DIGEST_MISMATCH')
    frozen['resolvedDigest'] = recorded
    return run, frozen, original


def projection(root, schedule=None):
    intents, outcomes, progress, ended = {}, {}, None, None
    for row in Journal(root).rows():
        event = row['event']
        if event == 'intent':
            intents[row['scenarioId']] = row
        elif event == 'result':
            outcomes[row['scenarioId']] = row
        elif event == 'progress':
            progress = row
        elif event == 'finished':
            ended = row
    interrupted = {name: {'state': 'UNCERTAIN', 'code': 'INTENT_WITHOUT_TERMINAL_RECEIPT'}
                   for name in intents if name not in outcomes}
    cases = tuple(row['scenarioId'] for row in schedule) if schedule is not None else (*outcomes, *interrupted)
    counts = Counter((outcomes.get(name) or interrupted.get(name) or {'state': 'NOT_RUN'})['state'] for name in cases)
    if ended and progress:
        progress = {**progress, 'activeUploads': 0, 'activeDownloads': 0}
    return {'state': ended['state'] if ended else 'IN_PROGRESS_OR_INTERRUPTED',
            'counts': dict(counts), 'progress': progress, 'operations': outcomes,
            'unfinishedIntents': interrupted}


def save_summary(root, journal, state, schedule, **extra):
    journal.append('finished', state=state)
    view = projection(root, schedule)
    summary = {'receiptSchema': VERSION, 'state': state, 'finishedAt': stamp(), 'durationMs': round(
        (time.monotonic() - journal.start) * 1000), 'counts': view['counts'], **extra,
        'artifacts': {path.name: str(path) for path in root.iterdir() if path.name != 'manifest.json'}}
    document(root / 'summary.json', summary)
    lines = [f'REDOWN Python Laboratory {__version__}', f'Result: {state}',
             f'Run evidence: {root}', '', 'Operations by result']
    lines.extend(f'  {name}: {count}' for name, count in sorted(view['counts'].items()))
    reviewed = [row for row in view['operations'].values() if row['state'] != 'PASS']
    if reviewed or view['unfinishedIntents']:
        lines.extend(['', 'Operations requiring review'])
        lines.extend(f'  {row["scenarioId"]}: {row["state"]} {row["code"]}' for row in reviewed)
        lines.extend(f'  {name}: {row["code"]}' for name, row in view['unfinishedIntents'].items())
    lines.extend(['', f'Frozen plan: {root / "resolved-manifest.json"}',
                  f'Per-operation receipts: {journal.path}'])
    exclusive(root / 'SUMMARY.txt', ('\n'.join(lines) + '\n').encode('utf-8'))
    return summary


def scenario_signature(entry, manifest):
    phase = next(row for row in manifest['phases'] if row['id'] == entry['phase'])
    active = {key: value for key, value in phase.items() if key != 'steps'}
    return digest({'scenario': entry, 'phase': active, 'generator': manifest['generator'],
                   'budget': manifest['budget']})


def compare(left, right):
    old, baseline, old_manifest = load_run(left)
    new, candidate, new_manifest = load_run(right)
    before = projection(left, baseline['schedule'])
    after = projection(right, candidate['schedule'])
    a = {entry['scenarioId']: entry for entry in baseline['schedule']}
    b = {entry['scenarioId']: entry for entry in candidate['schedule']}
    changes = {field: {'before': old['environment'].get(field), 'after': new['environment'].get(field)}
               for field in set(old['environment']) | set(new['environment'])
               if old['environment'].get(field) != new['environment'].get(field)}
    for field in ('provider', 'accountId', 'bucketName'):
        if old['target'].get(field) != new['target'].get(field):
            changes[field] = {'before': old['target'].get(field), 'after': new['target'].get(field)}
    inconclusive = bool({'evidenceClass', 'provider', 'accountId', 'bucketName'} & changes.keys())
    outcomes = []
    for id_ in sorted(a.keys() | b.keys()):
        previous = before['operations'].get(id_, before['unfinishedIntents'].get(id_, {}))
        current = after['operations'].get(id_, after['unfinishedIntents'].get(id_, {}))
        previous_state = previous.get('state', 'NOT_RUN')
        current_state = current.get('state', 'NOT_RUN')
        if id_ not in a or id_ not in b or scenario_signature(a[id_], old_manifest) != scenario_signature(b[id_], new_manifest):
            classification = 'WORKLOAD_CHANGED'
        elif inconclusive:
            classification = 'INCONCLUSIVE_ENVIRONMENT'
        elif 'UNSUPPORTED' in (previous_state, current_state):
            classification = 'UNSUPPORTED'
        elif {previous_state, current_state} & {'UNCERTAIN', 'CANCELLED', 'BLOCKED', 'NOT_RUN'}:
            classification = 'INCONCLUSIVE'
        elif previous_state == 'PASS' and current_state == 'FAIL':
            classification = 'REGRESSION'
        elif previous_state == 'FAIL' and current_state == 'PASS':
            classification = 'IMPROVEMENT'
        else:
            classification = 'UNCHANGED_OUTCOME'
        outcomes.append({'scenarioId': id_, 'classification': classification, 'before': previous_state,
                         'after': current_state, 'beforeCode': previous.get('code'), 'afterCode': current.get('code')})
    return {'before': old['runId'], 'after': new['runId'], 'environmentChanges': changes,
            'manifestChanged': baseline['manifestDigest'] != candidate['manifestDigest'],
            'beforeManifestDigest': baseline['manifestDigest'], 'afterManifestDigest': candidate['manifestDigest'],
            'counts': dict(Counter(row['classification'] for row in outcomes)), 'scenarios': outcomes}
