"""Generate and verify isolated right-click readiness scenarios."""
import hashlib
import json
import os
import random
import signal
import subprocess
import sys
import time
from pathlib import Path
from uuid import uuid4

from .errors import LabError
from .evidence import document

MODES = ('simple', 'narrow', 'depth')
INTERNAL_MODE = {'narrow': 'nested'}
CONDITIONS = ('cold', 'registration-race', 'returning', 'compatible-build', 'transient-health',
              'revoked', 'sibling', 'lost-deploy-ack', 'endpoint-missing', 'evicted-setup')
WARM_CONDITIONS = ('returning', 'compatible-build', 'transient-health', 'revoked', 'endpoint-missing')
FOCUSED = [(mode, condition) for mode in MODES for condition in ('cold', 'registration-race')]
FOCUSED += [('simple', 'returning'), ('narrow', 'compatible-build'), ('depth', 'transient-health'),
            ('simple', 'revoked'), ('narrow', 'sibling'), ('simple', 'lost-deploy-ack'),
            ('depth', 'endpoint-missing'), ('narrow', 'evicted-setup')]


def scenarios(seed, count):
    pairs = list(FOCUSED)
    exercised_warm = set()
    rng = random.Random(seed)
    while len(pairs) < count:
        block = [(mode, condition) for mode in MODES for condition in CONDITIONS]
        rng.shuffle(block)
        pairs.extend(block)
    for case, (mode, condition) in enumerate(pairs[:count], 1):
        case_52_regression = seed == 271127 and case == 52
        case_65_regression = seed == 271127 and case == 65
        case_83_regression = seed == 271127 and case == 83
        if case_52_regression:
            mode, condition = 'simple', 'transient-health'
        if case_65_regression:
            mode, condition = 'depth', 'evicted-setup'
        if case_83_regression:
            mode, condition = 'depth', 'endpoint-missing'
        name = f'{mode}-{case:03d}.txt'
        prefix = 'qa/folder/'
        payload = f'ReDown 2B.1 fixture {seed} {case}\n'
        plan = {
            'case': case, 'mode': INTERNAL_MODE.get(mode, mode), 'scenario': condition,
            'prefix': prefix, 'filename': name, 'payload': payload,
            'expected': {
                'verified': condition != 'revoked',
                'key': prefix + name,
                'sha256': hashlib.sha256(payload.encode('utf-8')).hexdigest(),
                'publicationRequests': 0 if condition == 'revoked' else 2 if condition == 'sibling' else 1,
                'deployments': 0 if condition in ('returning', 'compatible-build', 'revoked', 'transient-health') else 1,
            },
        }
        if case_83_regression:
            plan['capabilityFaults'] = ['post-deploy', 'post-probe']
        if case_65_regression:
            plan['interruptSetupProbe'] = True
        # The focused cases plus one complete shuffled block exercise every
        # warm condition in each mode. Later occurrences run normally.
        if condition in WARM_CONDITIONS and (case_52_regression or (mode, condition) not in exercised_warm):
            plan['interruptWarmProbe'] = True
            exercised_warm.add((mode, condition))
        yield plan


def _verdict(expected, observed):
    if observed.get('status') != 'OBSERVED':
        predicate = 'fixture initialization completed' if observed.get('phase') == 'fixture-initialization' else 'fixture completed'
        return [{'predicate': predicate, 'expected': True, 'actual': observed.get('code')}]
    actual = observed['actual']
    checks = {
        'isolatedMode': expected['mode'],
        'compiled': True,
        'registrationAcknowledged': True,
        'coldProbeMadeWorkerRequests': False,
        'localProofBefore': expected['scenario'] in WARM_CONDITIONS,
        'nativeInput': None,
        'sourceAdmitted': True,
        'workerResponsive': expected['expected']['verified'],
        'dispatched': expected['expected']['verified'],
        'publicationVerified': True if expected['expected']['verified'] else None,
        'outsideScopeDenied': True,
        'publicationRequests': expected['expected']['publicationRequests'],
        'deployments': expected['expected']['deployments'],
        'objectCount': expected['expected']['publicationRequests'],
        'verified': expected['expected']['verified'],
        'key': expected['expected']['key'] if expected['expected']['verified'] else None,
        'sha256': expected['expected']['sha256'] if expected['expected']['verified'] else None,
        'manualIntervention': not expected['expected']['verified'],
    }
    if expected['scenario'] in ('transient-health', 'lost-deploy-ack', 'registration-race', 'endpoint-missing', 'evicted-setup'):
        checks['scenarioExercised'] = True
    if 'capabilityFaults' in expected:
        checks.update({
            'accountAuthorized': True,
            'capabilityFaults': expected['capabilityFaults'],
            'peakLocalRuntimes': 1,
            'firstFailedBoundary': 'worker.health',
            'initialHealthCode': 'WORKER_ENDPOINT_MISSING',
            'readinessProbeRequests': 1,
            'originalOperationVerified': True,
        })
    if expected.get('interruptSetupProbe'):
        checks.update({
            'readinessProbeRequests': 1,
            'originalProbeReconciled': True,
            'originalOperationVerified': True,
        })
    differences = [{'predicate': name, 'expected': value, 'actual': actual.get(name)}
                   for name, value in checks.items() if actual.get(name) != value]
    if expected['scenario'] in WARM_CONDITIONS:
        if actual.get('originalOperationVerified') != expected['expected']['verified']:
            differences.append({'predicate': 'original warm-scenario save operation',
                                'expected': expected['expected']['verified'],
                                'actual': actual.get('originalOperationVerified')})
        warm = observed.get('warmInitialization') or {}
        initial = warm.get('probe') or {}
        reconciled = warm.get('outcome') == 'reconciled'
        proof = (warm.get('probeStatus') or {}) if reconciled else initial
        receipt = proof.get('receipt') or {}
        operation = warm.get('operationId')
        proof_prefix = f"{expected['prefix']}.click2cloud-readiness/{operation}"
        exact_scope = {'matchesScope': True, 'prefix': proof_prefix}
        warm_checks = {
            'warm initialization verified': warm.get('boundary') == 'verified',
            'ordinary warm initialization': warm.get('experiment') == 'ordinary-initialization',
            'one warm probe write': warm.get('probeWrites') == 1,
            'warm content independently verified': proof.get('state') == 'verified'
            and proof.get('code') == 'R2_READBACK_BYTES'
            and proof.get('proofKind') == 'independent-get-byte-comparison',
            'original warm operation': bool(operation) and proof.get('operationId') == receipt.get('operationId') == operation,
            'exact warm scope and key': proof.get('destination') == receipt.get('destination') == exact_scope
            and receipt.get('key') == f'{proof_prefix}/readiness.txt'
            and receipt.get('size') == len(f'Click2Cloud readback {operation}'.encode('utf-8'))
            and bool(receipt.get('etag')) and bool(receipt.get('version')),
            'warm acknowledgment retained': (reconciled and initial.get('state') in ('blocked', 'uncertain', 'failed')
                                             and bool(initial.get('code')))
            or (warm.get('outcome') == 'verified' and initial.get('state') == 'verified'),
        }
        if expected.get('interruptWarmProbe'):
            warm_checks['injected warm reply loss reconciled'] = (
                warm.get('replyLossInjected') is True and reconciled
                and initial.get('code') == 'READINESS_RECONCILE_REQUIRED'
                and initial.get('operationId') == operation
            )
        differences.extend({'predicate': name, 'expected': True, 'actual': value}
                           for name, value in warm_checks.items() if not value)
    return differences


def _stop_fixture(process):
    try:
        if os.name == 'nt':
            result = subprocess.run(['taskkill', '/T', '/F', '/PID', str(process.pid)],
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5)
            if result.returncode:
                process.kill()
        else:
            os.killpg(process.pid, signal.SIGKILL)
    except (OSError, subprocess.TimeoutExpired):
        process.kill()
    try:
        return process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        return None


def _run_fixture(command, *, repository, root, plans, timeout_seconds):
    started = time.monotonic()
    expected = {case['case']: case for case in plans}
    total = len(plans)
    current = None
    case_started = started
    next_heartbeat = started + 5
    counts = {'PASS': 0, 'FAIL': 0}
    offset = 0
    progress_path = root / 'progress.ndjson'

    def update():
        nonlocal offset, current, case_started, next_heartbeat
        if not progress_path.is_file():
            return
        with progress_path.open('rb') as stream:
            stream.seek(offset)
            for line in stream:
                if not line.endswith(b'\n'):
                    break
                offset += len(line)
                event = json.loads(line)
                status = event['status']
                if status == 'RUNNING':
                    if current is None or event['case'] != current['case']:
                        case_started = time.monotonic()
                    current = event
                else:
                    status = 'FAIL' if _verdict(expected[event['case']], event['observation']) else 'PASS'
                    counts[status] += 1
                    current = None
                print(f"[{event['ordinal']}/{event['total']}] case {event['case']} "
                      f"{event['mode']} {event['scenario']} | {event['phase']} | {status} "
                      f"| case {event['caseElapsedMs'] / 1000:.1f}s | campaign {event['elapsedMs'] / 1000:.1f}s",
                      file=sys.stderr, flush=True)
                next_heartbeat = time.monotonic() + 5

    print(f"Starting {total} right-click cases | deadline {timeout_seconds}s | receipts {root}",
          file=sys.stderr, flush=True)
    with (root / 'fixture.log').open('w', encoding='utf-8') as log:
        process = subprocess.Popen(command, cwd=repository, stdout=log, stderr=subprocess.STDOUT,
                                   env={**os.environ, 'REDOWN_LAB_PYTHON': sys.executable},
                                   start_new_session=os.name != 'nt')
        stop_code = None
        try:
            while process.poll() is None:
                update()
                now = time.monotonic()
                if now - started >= timeout_seconds or (current and now - case_started >= 120):
                    stop_code = 'FIXTURE_CASE_TIMEOUT' if current and now - case_started >= 120 else 'FIXTURE_CAMPAIGN_TIMEOUT'
                    break
                if now >= next_heartbeat:
                    phase = f"case {current['case']} | {current['phase']}" if current else 'waiting for fixture'
                    remaining = total - sum(counts.values())
                    print(f"[{counts['PASS']} PASS, {counts['FAIL']} FAIL, {remaining} unfinished] "
                          f"{phase} | {now - started:.1f}s elapsed",
                          file=sys.stderr, flush=True)
                    next_heartbeat = now + 5
                time.sleep(0.2)
        except KeyboardInterrupt:
            stop_code = 'FIXTURE_INTERRUPTED'
        exit_code = _stop_fixture(process) if stop_code else process.returncode
        update()
    return exit_code, stop_code, current, round(time.monotonic() - started, 3)


def fixture(seed, count, selected, *, repository, timeout_seconds=None):
    repository = Path(repository).resolve()
    runner = repository / 'scripts' / 'verify-python-lab.mjs'
    if not runner.is_file():
        raise LabError('RIGHT_CLICK_FIXTURE_REPOSITORY_REQUIRED')
    if not 1 <= count <= 300 or selected is not None and not 1 <= selected <= 300:
        raise LabError('RIGHT_CLICK_FIXTURE_CASE_LIMIT')
    plans = [case for case in scenarios(seed, max(count, selected or 0))
             if selected is None or case['case'] == selected]
    if timeout_seconds is None:
        timeout_seconds = max(120, 30 + len(plans) * 20)
    if not 1 <= timeout_seconds <= 7200:
        raise LabError('RIGHT_CLICK_FIXTURE_TIMEOUT_LIMIT')
    root = repository / 'lab-local' / 'verification' / f'right-click-{uuid4()}'
    root.mkdir(parents=True, mode=0o700)
    manifest = root / 'scenario-plan.json'
    document(manifest, {'schema': 'redown.right-click-scenarios/1', 'seed': seed, 'cases': plans})
    exit_code, stop_code, active, elapsed = _run_fixture(
        ['node', str(runner), '--right-click-fixture', str(manifest)], repository=repository,
        root=root, plans=plans, timeout_seconds=timeout_seconds)
    results_file = root / 'observations.json'
    results = json.loads(results_file.read_text(encoding='utf-8')) if results_file.is_file() else {}
    observed_cases = {case['case']: case for case in results.get('cases', [])}
    cases = []
    for case in plans:
        observed = observed_cases.get(case['case'])
        if observed is None:
            if active and active['case'] == case['case'] and (stop_code or exit_code != 0):
                observed = {'status': 'FAIL', 'code': stop_code or 'FIXTURE_RUNNER_EXIT', 'phase': active['phase']}
            else:
                observed = {'status': 'NOT_TESTED', 'code': 'FIXTURE_NOT_OBSERVED'}
        differences = _verdict(case, observed)
        status = ('PASS' if not differences else 'NOT_TESTED' if observed['status'] == 'NOT_TESTED' else 'FAIL')
        cases.append({**observed, 'case': case['case'], 'mode': case['mode'], 'scenario': case['scenario'],
                      'status': status, 'differences': differences})
    overall = 'PASS' if not stop_code and exit_code == 0 and all(case['status'] == 'PASS' for case in cases) else 'FAIL'
    summary = {'status': overall, 'seed': seed, 'revision': results.get('revision'),
               'sourceDigest': results.get('sourceDigest'), 'workerCodeDigest': results.get('workerCodeDigest'), 'extensionVersion': results.get('extensionVersion'),
               'protocol': results.get('protocol'), 'evidenceLayer': results.get('evidenceLayer'),
               'platform': results.get('platform'), 'osRelease': results.get('osRelease'),
               'arch': results.get('arch'), 'nodeVersion': results.get('nodeVersion'),
               'elapsedSeconds': elapsed, 'deadlineSeconds': timeout_seconds,
               'runnerExitCode': exit_code, 'stopCode': stop_code, 'lastActiveCase': active,
               'nativeInput': 'NOT_TESTED', 'liveProvider': 'NOT_TESTED', 'counts': {
                   status: sum(case['status'] == status for case in cases)
                   for status in ('PASS', 'FAIL', 'NOT_TESTED')}, 'receipt': str(root)}
    document(root / 'summary.json', {**summary, 'cases': cases})
    return summary
