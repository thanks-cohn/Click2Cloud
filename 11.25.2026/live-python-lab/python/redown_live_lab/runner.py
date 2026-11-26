"""One scheduler for every profile, drop folder, and checked-in manifest."""
import hashlib
import sys
import time
import uuid
from pathlib import Path

from .errors import LabError
from .evidence import Journal, document, environment, load_run, projection, save_summary, snapshot
from .fixtures import generate
from .inventory import chunks, ordinary_directory, source_error, source_path
from .manifest import build_plan, digest, resolve
from .transport import CHUNK_BYTES


def operation_id(run_id, scenario, direction):
    return str(uuid.uuid5(uuid.UUID(run_id), f'{scenario}/{direction}'))


def source_chunks(row, seed, source, stop):
    if row['kind'] == 'corpus':
        data = chunks(source_path(source, row['path']), row['sizeBytes'], stop)
    else:
        content = generate(row['format'], row['sizeBytes'], seed, row['id'])
        data = (content[offset:offset + CHUNK_BYTES] for offset in range(0, len(content), CHUNK_BYTES))
    hashed = hashlib.sha256()
    for part in data:
        hashed.update(part)
        yield part
    if hashed.hexdigest() != row['sha256']:
        raise source_error('SOURCE_CHANGED', 'local-staging', 'DIGEST_MISMATCH', ('sha256',))


class Progress:
    def __init__(self, journal, total):
        self.journal, self.total = journal, total
        self.finished = self.bytes = 0
        self.last = 0
        self.max_uploads = self.max_downloads = 0
        self.activity = set()

    def callback(self, scenario, direction, size):
        def emit(value):
            phase, observed = value['phase'], value['bytes']
            if observed and phase in ('uploading', 'verifying', 'committing', 'reading'):
                self.activity.add((scenario, direction, phase))
            upload = int(bool(observed) and direction == 'upload' and phase in ('uploading', 'verifying', 'committing'))
            download = int(bool(observed) and direction == 'download' and phase == 'reading')
            self.max_uploads = max(self.max_uploads, upload)
            self.max_downloads = max(self.max_downloads, download)
            now = time.monotonic()
            if now - self.last < 1.0:
                return
            self.last = now
            info = {'scenarioId': scenario, 'phase': phase, 'bytes': observed, 'totalBytes': size,
                    'filesFinished': self.finished, 'filesTotal': self.total, 'verifiedBytes': self.bytes,
                    'activeUploads': upload, 'activeDownloads': download}
            self.journal.append('progress', **info)
            print(f'[{self.finished}/{self.total} operations] {scenario} {phase} '
                  f'{observed}/{size} bytes · active uploads {upload} · active reads {download}',
                  file=sys.stderr, flush=True)
        return emit


class Scheduler:
    def __init__(self, client, root, manifest, plan, source, run_id, prefix):
        self.client, self.root, self.manifest = client, root, manifest
        self.journal = Journal(root)
        self.source, self.run_id, self.prefix = source, run_id, prefix
        self.download_root = root / manifest['local']['destinationRoot']
        self.progress = Progress(self.journal, len(plan['schedule']))
        self.verified = {}
        self.plan = plan
        self.end = time.monotonic() + plan['effectiveBudget']['seconds']
        self.phase_end = self.end

    def stop(self):
        if (self.root / 'cancel.request').exists():
            raise LabError('CANCELLATION_REQUESTED')
        if time.monotonic() >= min(self.end, self.phase_end):
            raise LabError('RUN_OR_PHASE_TIMEOUT')

    def execute(self, entry, transfer_seconds):
        scenario, op = entry['scenarioId'], entry['operation']
        row, step = entry.get('fixture'), entry['step']
        start = time.monotonic()
        result = {'state': 'FAIL', 'code': 'OPERATION_FAILED'}
        ack = None
        pending = False
        requested = acknowledged = False
        try:
            self.stop()
            if op == 'upload':
                id_ = operation_id(self.run_id, scenario, 'upload')
                send = self.progress.callback(scenario, 'upload', row['sizeBytes'])
                try:
                    self.client.stage(id_, row, transfer_seconds,
                                      source_chunks(row, self.manifest['seed'], self.source, self.stop), send, self.stop)
                    self.stop()
                    self.journal.append('intent', scenarioId=scenario, operationId=id_,
                                        key=self.prefix + row['remotePath'], size=row['sizeBytes'], sha256=row['sha256'])
                    pending = requested = True
                    self.client.query('uploadStart', id=id_)
                    response = self.client.wait(id_, notify=send, stop=self.stop)
                    if response['state'] == 'ACKNOWLEDGED':
                        ack = response['receipt']
                        acknowledged = True
                        self.journal.append('uploadAcknowledged', scenarioId=scenario, receipt=ack)
                    elif response['state'] != 'UNCERTAIN':
                        pending = False
                    if response['state'] == 'CONFLICT' and step.get('expect') == 'CONFLICT':
                        expected = self.verified.get(row['remotePath'])
                        if expected is None:
                            raise LabError('PREVIOUS_VERIFICATION_REQUIRED')
                        expected_row = {**row, **row['verifiedExisting']}
                    elif ack:
                        expected = ack
                        expected_row = row
                    else:
                        result = response if response['state'] != 'CONFLICT' else {'state': 'FAIL', 'code': response['code']}
                        return self.finish(entry, result, start, ack, requested, acknowledged)
                except BaseException:
                    self.client.cleanup('cancel', id=id_)
                    raise
                finally:
                    self.client.cleanup('closeTransfer', id=id_)
                verification = self.read(scenario, expected_row, transfer_seconds, expected, step.get('retain'))
                if verification['state'] == 'PASS':
                    self.verified[row['remotePath']] = verification
                    unexpected = ack is not None and step.get('expect') == 'CONFLICT'
                    code = ('EXPECTED_CONFLICT_BUT_COMMITTED' if unexpected else
                            'CONFLICT_PRESERVED' if ack is None else 'UPLOAD_SHA256_VERIFIED')
                    result = {'state': 'FAIL' if unexpected else 'PASS', 'code': code, 'readback': verification}
                else:
                    result = {**verification, 'state': 'UNCERTAIN' if ack else verification['state']}
            elif op == 'download':
                result = self.read(scenario, row, transfer_seconds, self.verified.get(row['remotePath']), step.get('retain'))
            elif op == 'metadata':
                observed = self.client.query('metadata', path=row['remotePath'])['object']
                expected = self.verified.get(row['remotePath'])
                match = (observed and observed['key'] == self.prefix + row['remotePath']
                         and observed['size'] == row['sizeBytes'] and expected and expected['etag'] == observed['etag']
                         and (observed['version'] is None or expected['version'] is None
                              or observed['version'] == expected['version']))
                result = {'state': 'PASS' if match else 'FAIL',
                          'code': 'METADATA_MATCH' if match else 'METADATA_MISMATCH', 'metadata': observed}
            elif op == 'list':
                result = self.list(entry)
        except KeyboardInterrupt:
            result = {'state': 'UNCERTAIN' if pending else 'CANCELLED', 'code': 'CANCELLATION_REQUESTED'}
        except (LabError, OSError) as error:
            code = error.code if isinstance(error, LabError) else 'LOCAL_IO_FAILED'
            if code == 'READBACK_SHA256_MISMATCH':
                state = 'FAIL'
            elif pending:
                state = 'UNCERTAIN'
            elif code in ('CANCELLATION_REQUESTED', 'RUN_OR_PHASE_TIMEOUT'):
                state = 'CANCELLED'
            elif code in ('LAB_BUDGET_EXCEEDED', 'LAB_AUTHORIZATION_EXPIRED', 'PAIRING_REQUIRED'):
                state = 'BLOCKED'
            else:
                state = 'FAIL'
            result = {'state': state, 'code': code}
            if isinstance(error, LabError) and code in ('SOURCE_CHANGED', 'SOURCE_IDENTITY_UNAVAILABLE',
                                                        'LOCAL_FILE_UNREADABLE', 'LINK_OR_NONREGULAR'):
                result['diagnostic'] = error.detail
        return self.finish(entry, result, start, ack, requested, acknowledged)

    def finish(self, entry, result, start, ack, requested, acknowledged):
        row = entry.get('fixture')
        observed = result.get('readback') or (result if 'clientSha256' in result else None)
        self.journal.append('result', scenarioId=entry['scenarioId'], action=entry['operation'],
                            phase=entry['phase'], fixtureId=row['id'] if row else None,
                            expected=entry['step'].get('expect', 'PASS'), state=result['state'], code=result['code'],
                            fixture={'size': row['sizeBytes'], 'sha256': row['sha256'], 'path': row['path']} if row else None,
                            intendedKey=self.prefix + row['remotePath'] if row else None,
                            upload={'requested': requested, 'acknowledged': acknowledged, 'receipt': ack},
                            readback=observed, metadata=result.get('metadata'), listing=result.get('listing'),
                            diagnostic=result.get('diagnostic'),
                            durationMs=round((time.monotonic() - start) * 1000))
        self.progress.finished += 1
        self.progress.bytes += observed['clientBytes'] if observed else 0
        return result

    def read(self, scenario, row, timeout, receipt, retain):
        self.stop()
        id_ = operation_id(self.run_id, scenario, 'read')
        output = self.download_root / scenario.split('/')[0] / scenario.split('/')[1] / scenario.split('/')[2] / row['remotePath'] if retain else None
        notify = self.progress.callback(scenario, 'download', row['sizeBytes'])
        result = self.client.read(id_, row, timeout, receipt, output, notify, self.stop)
        if result['state'] == 'PASS' and result['key'] != self.prefix + row['remotePath']:
            raise LabError('READBACK_SCOPE_MISMATCH')
        return result

    def list(self, entry):
        step, cursor, seen, found = entry['step'], '', set(), set()
        folder = step.get('folder', '')
        prefix = self.prefix + (folder + '/' if folder else '')
        expected = set()
        for fixture in entry['fixtures']:
            tail = (self.prefix + fixture['remotePath']).removeprefix(prefix)
            first, separator, _ = tail.partition('/')
            expected.add((prefix + first + separator, bool(separator)))
        for page in range(1, step.get('maxPages', 1) + 1):
            self.stop()
            data = self.client.query('list', folder=folder, cursor=cursor)
            found.update((row['key'], row['folder']) for row in data['entries'])
            if expected <= found:
                return {'state': 'PASS', 'code': 'LIST_EXPECTATIONS_PRESENT',
                        'listing': {'pages': page, 'expectedKeys': sorted(expected), 'entries': len(found)}}
            cursor = data['cursor']
            if not cursor or cursor in seen:
                break
            seen.add(cursor)
        return {'state': 'FAIL', 'code': 'LIST_EXPECTATIONS_MISSING',
                'listing': {'pages': page, 'missingKeys': sorted(expected - found)}}

    def run(self):
        phase_outcomes, active, operation_result = {}, None, 'PASS'
        phases = {phase['id']: phase for phase in self.manifest['phases']}
        stop = False
        for entry in self.plan['schedule']:
            phase = phases[entry['phase']]
            if active != phase['id']:
                active = phase['id']
                phase_outcomes[active] = 'PASS'
                self.phase_end = time.monotonic() + phase['timeoutSeconds']
            if stop or any(phase_outcomes.get(dep) != 'PASS' for dep in phase['dependsOn']):
                phase_outcomes[active] = 'NOT_RUN'
                self.journal.append('result', scenarioId=entry['scenarioId'], action=entry['operation'],
                                    phase=active, state='NOT_RUN', code='PRIOR_FAILURE_OR_STOP')
                continue
            result = self.execute(entry, phase['transferSeconds'])
            state = result['state']
            if state == 'PASS':
                continue
            phase_outcomes[active] = state
            if operation_result == 'PASS' or state in ('UNCERTAIN', 'CANCELLED'):
                operation_result = state
            stop = (phase['onFailure'] == 'stop' or state in ('UNCERTAIN', 'CANCELLED', 'BLOCKED')
                    or result['code'] in ('CANCELLATION_REQUESTED', 'RUN_OR_PHASE_TIMEOUT'))
        return operation_result


def run(client, caps, manifest_path, manifest, plan, *, source, runs, approve_cost):
    run_id = str(uuid.uuid4())
    root = runs / run_id
    if plan['status'] != 'READY':
        raise LabError('PREFLIGHT_BLOCKED', plan['blockers'])
    if 'upload' not in {item['operation'] for item in plan['schedule']}:
        raise LabError('NEW_RUN_UPLOAD_REQUIRED', 'Use reconcile to read an already authorized run.')
    root.mkdir(mode=0o700)
    prefix = caps['prefix'] + run_id + '/'
    context = {'runId': run_id, 'environment': environment(caps),
               'target': {'scopeId': caps['scopeId'], 'provider': caps['provider'], 'accountId': caps['accountId'],
                          'bucketName': caps['bucketName'], 'prefix': prefix},
               'overrides': {'input': str(source), 'output': str(runs), 'approvedCostUsd': str(approve_cost)}}
    frozen = snapshot(root, manifest, manifest_path, plan, context)
    print(f'Run {root}', file=sys.stderr, flush=True)
    scheduler = Scheduler(client, root, manifest, plan, source, run_id, prefix)
    journal = scheduler.journal
    journal.append('started', resolvedDigest=frozen['resolvedDigest'], environment=context['environment'])
    state = 'BLOCKED'
    try:
        admission = client.query('admit', runId=run_id, mode='write', budget=plan['effectiveBudget'])
        if admission.get('prefix') != prefix:
            raise LabError('RUN_SCOPE_MISMATCH')
        journal.append('admitted', target=context['target'], budget=admission['budget'])
        state = scheduler.run()
    except KeyboardInterrupt:
        state = 'CANCELLED'
        journal.append('runError', code='CANCELLATION_REQUESTED')
    except (LabError, OSError) as error:
        journal.append('runError', code=error.code if isinstance(error, LabError) else 'LOCAL_IO_FAILED')
    finally:
        client.cleanup('releaseRun')
    counts = scheduler.progress
    return save_summary(root, journal, state, plan['schedule'], runId=run_id, evidencePath=str(root),
                        environment=context['environment'], target=context['target'], resolvedDigest=frozen['resolvedDigest'],
                        verifiedBytes=counts.bytes, requestedConcurrency=max(phase['concurrency'] for phase in manifest['phases']),
                        admittedConcurrency=caps['limits']['concurrency'], observedActiveUploads=counts.max_uploads,
                        observedActiveDownloads=counts.max_downloads, providerActivitySignals=len(counts.activity))


def reconcile(client, caps, root):
    prior, frozen, manifest = load_run(root)
    target = prior['target']
    if (target['scopeId'] != caps['scopeId'] or target['bucketName'] != caps['bucketName']
            or target['accountId'] != caps['accountId']
            or target['prefix'] != caps['prefix'] + prior['runId'] + '/'):
        raise LabError('RECOVERY_SCOPE_MISMATCH', target['scopeId'])
    original_source = Path(prior['overrides']['input'])
    inventory, schedule = resolve(manifest, source=original_source, prefix_length=len(target['prefix'].encode()))
    if digest(inventory) != digest(frozen['inventory']) or digest(schedule) != digest(frozen['schedule']):
        raise LabError('FROZEN_INVENTORY_MISMATCH')
    phases = {phase['id']: phase for phase in manifest['phases']}
    prior_view = projection(root, schedule)
    pending = {key for key, row in prior_view['operations'].items() if row['state'] == 'UNCERTAIN'}
    pending.update(prior_view['unfinishedIntents'])
    cases = [entry for entry in schedule if entry['operation'] == 'upload'
             and entry['scenarioId'] in pending and phases[entry['phase']]['recovery'] == 'read-only']
    if not cases:
        return {'state': 'NOT_NEEDED', 'runId': prior['runId'], 'evidencePath': str(root)}
    folder = root / 'recovery'
    folder.mkdir(exist_ok=True)
    recovery_root = folder / str(uuid.uuid4())
    recovery_root.mkdir(mode=0o700)
    journal = Journal(recovery_root)
    journal.append('started', sourceRun=prior['runId'], resolvedDigest=frozen['resolvedDigest'],
                   environment=environment(caps), mode='read-only')
    sizes = [row['fixture']['sizeBytes'] for row in cases]
    request_limit = caps['limits']['readRequests'] * len(cases)
    budget = {'files': 0, 'trafficBytes': sum(sizes), 'diskBytes': max(sizes),
              'providerRequests': request_limit, 'operations': len(cases),
              'seconds': min(frozen['effectiveBudget']['seconds'], caps['headroom']['seconds'])}
    state = 'PASS'
    try:
        admission = client.query('admit', runId=prior['runId'], mode='read', budget=budget)
        if admission['prefix'] != target['prefix']:
            raise LabError('RECOVERY_SCOPE_MISMATCH')
        for entry in cases:
            row, scenario = entry['fixture'], entry['scenarioId']
            original = prior_view['operations'].get(scenario, {})
            receipt = original.get('upload', {}).get('receipt')
            expected = {**row, **row.get('verifiedExisting', {})}
            id_ = operation_id(prior['runId'], scenario, 'recovery-read')
            try:
                observed = client.read(id_, expected, phases[entry['phase']]['transferSeconds'], receipt, None,
                                       lambda _: None, lambda: None)
                verified = observed['state'] == 'PASS' and observed['key'] == target['prefix'] + row['remotePath']
                result, code = ('PASS', 'EXPECTED_BYTES_OBSERVED_NO_REPLAY') if verified else (
                    'UNCERTAIN', observed.get('code', 'RECOVERY_READBACK_INCONCLUSIVE'))
            except (LabError, OSError) as error:
                observed = None
                result, code = 'UNCERTAIN', error.code if isinstance(error, LabError) else 'LOCAL_IO_FAILED'
            if result != 'PASS':
                state = 'UNCERTAIN'
            journal.append('result', scenarioId=scenario, action='reconcile-read', state=result, code=code,
                           intendedKey=target['prefix'] + row['remotePath'], originalSha256=expected['sha256'],
                           readback=observed, providerMutation='NOT_SUBMITTED')
    except KeyboardInterrupt:
        state = 'CANCELLED'
    except LabError as error:
        state = 'BLOCKED'
        journal.append('runError', code=error.code)
    finally:
        client.cleanup('releaseRun')
    return save_summary(recovery_root, journal, state, cases, runId=prior['runId'], evidencePath=str(recovery_root),
                        reconciliation='read-only', sourceResolvedDigest=frozen['resolvedDigest'])
