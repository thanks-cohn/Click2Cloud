"""Owner campaigns reuse the Laboratory scheduler and production publication path."""
from collections import Counter
from contextlib import contextmanager
from decimal import Decimal, InvalidOperation
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import uuid

from .errors import LabError
from .evidence import Journal, atomic_document, document, environment, exclusive, stamp
from .fixtures import content_type
from .inventory import inventory, ordinary_directory
from .location_audit import load_plan, project_audit, scan
from .manifest import canonical, digest, read_json
from .runner import Scheduler, operation_id
from .transport import connect


MAX_INT = 2**53 - 1
MAX_TIMER_SECONDS = 2_147_483
MAX_FILE_BYTES = (5 * 1024 - 1) * 1024**2
SHARE = ['resolved-manifest.json', 'operations.ndjson', 'summary.json', 'SUMMARY.txt']
WINDOW_EVIDENCE = ['summary.json', 'effective-policy.json', 'benchmark.json', 'location-audit.json', 'audit-observations.ndjson']
STOP_CODES = {'CANCELLATION_REQUESTED', 'CAMPAIGN_TRANSFER_DEADLINE', 'RUN_OR_PHASE_TIMEOUT',
              'LAB_TRANSFER_DEADLINE', 'LAB_TRANSFER_ADMISSION_CLOSED', 'LAB_AUTHORIZATION_EXPIRED',
              'LAB_BUDGET_EXCEEDED', 'LAB_RUN_REQUIRED', 'LAB_SPOOL_UNAVAILABLE', 'AUTH_SESSION_CHANGED',
              'PAIRING_REQUIRED', 'EXTENSION_DISCONNECTED', 'EXTENSION_UNAVAILABLE', 'TIMEOUT_UNCERTAIN'}


def ceil_div(value, unit):
    return (value + unit - 1) // unit


def approved_cost(value):
    try:
        amount = Decimal(value)
    except InvalidOperation:
        raise LabError('INVALID_COST_BUDGET') from None
    if not amount.is_finite() or amount < 0 or amount * 1_000_000 > MAX_INT:
        raise LabError('INVALID_COST_BUDGET')
    micros = amount * 1_000_000
    if micros != micros.to_integral_value():
        raise LabError('INVALID_COST_BUDGET', 'Use at most six fractional USD digits.')
    return int(micros)


def announce(message):
    print(message, file=sys.stderr, flush=True)


def input_binding(path):
    return hashlib.sha256(os.fsencode(os.path.normcase(os.fspath(path)))).hexdigest()


@contextmanager
def claim(directory, identity):
    directory.mkdir(mode=0o700, exist_ok=True)
    ordinary_directory(directory)
    lock_path = directory / (identity + '.lock')
    if lock_path.is_symlink():
        raise LabError('UNSAFE_CAMPAIGN_CLAIM')
    # The OS holds the cross-process lease until this process/span ends, even
    # on crash. A released lease never implies a cloud operation did not commit.
    with lock_path.open('a+b') as lock:
        lock.seek(0, os.SEEK_END)
        if lock.tell() == 0:
            lock.write(b'\0')
            lock.flush()
        lock.seek(0)
        try:
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            raise LabError('CAMPAIGN_ALREADY_ACTIVE') from None
        yield


def freeze(root, files, issues, empty, target, args, binding):
    run_id = target['campaignId']
    prefix_bytes = len(target['prefix'].encode('utf-8'))
    eligible = []
    for row in files:
        path = row['path']
        leaf = path.rsplit('/', 1)[-1]
        if (prefix_bytes + len(path.encode('utf-8')) > 1024 or
                prefix_bytes + len('.redown-beta-uploads/') + 37 + len(leaf.encode('utf-8')) > 1024):
            issues.append({'path': path, 'kind': 'file', 'state': 'FAIL', 'code': 'REMOTE_KEY_TOO_LONG'})
            continue
        folder = path.split('/', 1)[0] if '/' in path else None
        eligible.append({**row, 'remotePath': path, 'expectedKey': target['prefix'] + path,
                         'folderJobId': str(uuid.uuid5(uuid.UUID(run_id), 'folder/' + folder)) if folder else None,
                         'contentType': content_type(row['format']), 'scenarioId': 'owner/1/transfer/' + row['id'],
                         'operationId': operation_id(run_id, 'owner/1/transfer/' + row['id'], 'upload')})
    plan = {'schema': 'redown.owner-campaign/1', 'campaignId': run_id, 'target': target,
            'createdAt': stamp(), 'operationMode': args.operations, 'verification': args.verification,
            'retainDownloads': args.retain_downloads, 'expectedSelectionFiles': args.expect_files,
            'inventory': eligible, 'inventoryIssues': issues, 'emptyDirectories': empty}
    plan['resolvedDigest'] = digest(plan)
    document(root / 'resolved-manifest.json', plan)
    document(root / 'private-source-binding.json', {'sourceBinding': binding})
    return plan


def target_for(caps, run_id):
    return {key: caps[key] for key in ('scopeId', 'provider', 'accountId', 'bucketName')} | {
        'prefix': caps['prefix'] + run_id + '/', 'campaignId': run_id}


def validate_scope(plan, caps):
    if target_for(caps, plan['campaignId']) != plan['target']:
        raise LabError('CAMPAIGN_SCOPE_MISMATCH', {'useRecoveryScope': plan['target']})
    if caps.get('campaign', {}).get('campaignId') not in (None, plan['campaignId']):
        raise LabError('CAMPAIGN_SCOPE_MISMATCH', {'useRecoveryScope': plan['target']})


def publication_outcomes(plan, events, through_window=None):
    rows = {row['scenarioId']: row for row in plan['inventory']}
    states = {}
    found_window = through_window is None
    for event in events:
        if event.get('windowId') == through_window:
            found_window = True
        elif through_window and found_window:
            break
        row = rows.get(event.get('scenarioId'))
        if not row:
            continue
        key = row['operationId']
        prior = states.get(key, {})
        kind = event['event']
        if kind == 'intent' and not prior.get('productionConfirmed'):
            states[key] = {**prior, 'state': 'UNCERTAIN', 'code': 'INTENT_WITHOUT_TERMINAL_RECEIPT', 'hasIntent': True}
        if kind in ('uploadAcknowledged', 'recoveredPublication'):
            receipt = event['receipt']
            valid = (receipt.get('operationId') == key and receipt.get('key') == row['expectedKey'] and
                     receipt.get('size') == row['sizeBytes'] and isinstance(receipt.get('etag'), str) and
                     isinstance(receipt.get('version'), str) and bool(receipt['etag']) and bool(receipt['version']))
            earlier = prior.get('receipt')
            conflicting = bool(prior.get('conflictingPublicationEvidence') or earlier and earlier != receipt)
            states[key] = {**prior, 'state': 'PASS' if valid and not conflicting else 'UNCERTAIN',
                           'receipt': earlier if conflicting and earlier else receipt,
                           'productionConfirmed': valid and not conflicting, 'hasIntent': True,
                           'conflictingPublicationEvidence': conflicting,
                           'code': 'DUPLICATE_PUBLICATION_EVIDENCE' if conflicting else 'PRODUCTION_UPLOAD_RECEIPT'}
        if kind == 'result' and event.get('action') in ('upload', 'download'):
            state = {**prior}
            readback = event.get('readback') or {}
            if event['state'] == 'PASS' and readback.get('clientSha256') == row['sha256']:
                state['independentSha256Verified'] = True
            if event['action'] == 'upload':
                if not prior.get('productionConfirmed'):
                    state['state'] = ('PENDING' if not prior.get('hasIntent') and event['code'] in STOP_CODES
                                      else event['state'])
                    state['code'] = event['code']
                if state.get('state') == 'UNCERTAIN':
                    state['hasIntent'] = prior.get('hasIntent', False) or event['upload']['requested']
            if state:
                states[key] = state
        if kind == 'recoveredNoCommit' and not prior.get('productionConfirmed'):
            states[key] = {'state': 'PENDING', 'code': 'PRODUCTION_CHECKPOINT_PROVES_NO_COMMIT', 'hasIntent': False}
    if not found_window:
        raise LabError('CAMPAIGN_WINDOW_UNKNOWN')
    return states


def options_budget(args, caps, plan, rows, mode, output):
    capability = caps.get('campaign')
    if not capability or capability['policyVersion'] != 1:
        raise LabError('UPGRADED_LAB_SESSION_REQUIRED')
    is_audit = mode == 'audit'
    upload_count = 0 if is_audit or mode == 'download' else len(rows)
    read_count = 0 if is_audit or mode != 'download' and plan['verification'] != 'sha256' else len(rows)
    total = sum(row['sizeBytes'] for row in rows)
    largest = max((row['sizeBytes'] for row in rows), default=0)
    baseline = caps['limits']
    audit_pages = max(1, ceil_div(len(plan['inventory']), capability['auditPageSize']))
    audit_seconds = args.audit_seconds
    audit = {'seconds': audit_seconds, 'providerRequests': args.audit_requests or 3 * (audit_pages + 2),
             'operations': args.audit_operations or 8 * (audit_pages + 2),
             'trafficBytes': args.audit_traffic_bytes or 2 * 1024**2 + len(plan['inventory']) * 8192}
    if not is_audit and mode == 'download':
        audit = dict.fromkeys(audit, 0)
    if not is_audit and mode != 'download' and not audit_seconds:
        raise LabError('CAMPAIGN_AUDIT_REQUIRED')
    required = {'files': upload_count, 'trafficBytes': total * (baseline['uploadTrafficFactor'] * bool(upload_count) + bool(read_count)),
                'diskBytes': largest, 'providerRequests': baseline['uploadRequests'] * upload_count + baseline['readRequests'] * read_count,
                'operations': upload_count + read_count, 'seconds': audit_seconds if is_audit else args.execution_seconds}
    budget = {key: value + (audit.get(key, 0) if key != 'seconds' else 0) for key, value in required.items()}
    if args.execution == 'timed' and mode not in ('download', 'audit') and args.benchmark_seconds <= 0:
        raise LabError('INVALID_CAMPAIGN_TIME')
    if (not is_audit and budget['seconds'] <= audit['seconds'] or budget['seconds'] <= 0 or
            any(not 1 <= value <= args.transfer_seconds for value in (args.inactivity_seconds, args.request_seconds,
                  args.upload_seconds, args.verification_seconds)) or not 1 <= args.request_seconds <= 30):
        raise LabError('INVALID_CAMPAIGN_TIMEOUTS', {'controlRequestMaximumSeconds': 30})
    policy = {'budget': budget, 'audit': audit, 'execution': 'audit' if is_audit else args.execution,
              'benchmarkSeconds': args.benchmark_seconds, 'transferSeconds': args.transfer_seconds,
              'inactivitySeconds': args.inactivity_seconds, 'requestSeconds': args.request_seconds,
              'uploadSeconds': args.upload_seconds, 'verificationSeconds': args.verification_seconds,
              'costMicros': approved_cost(args.approve_cost_usd)}
    modeled_cost = budget['providerRequests'] * 9 + ceil_div(budget['trafficBytes'] * 15, 1_000_000)
    local_evidence_bytes = 131_072 + 20_480 * len(plan['inventory'])
    local_required = local_evidence_bytes + (total if read_count and args.retain_downloads else 0)
    local_available = shutil.disk_usage(output).free
    blockers = []
    if args.authorization_minutes > capability['authorizedMinutes']:
        blockers.append({'code': 'LAB_AUTHORIZATION_DURATION_SHORTFALL', 'requestedMinutes': args.authorization_minutes,
                         'approvedMinutes': capability['authorizedMinutes']})
    requested_limits = {'files': args.file_budget, 'providerRequests': args.provider_requests,
                        'trafficBytes': args.traffic_bytes, 'diskBytes': args.temp_disk_bytes,
                        'operations': args.operation_budget}
    for field, value in budget.items():
        approved = capability['headroom'][field]
        operator = requested_limits.get(field)
        if value > approved:
            blockers.append({'code': 'LAB_AUTHORIZATION_SHORTFALL', 'field': field, 'required': value, 'available': approved})
        if operator is not None and value > operator:
            blockers.append({'code': 'CLI_CEILING_SHORTFALL', 'field': field, 'required': value, 'available': operator})
    if largest > capability['maxFileBytes']:
        blockers.append({'code': 'PRODUCTION_FILE_SIZE_LIMIT', 'required': largest, 'available': capability['maxFileBytes']})
    available_cost = min(policy['costMicros'], capability['approved']['costMicros'])
    if modeled_cost > available_cost or policy['costMicros'] > capability['approved']['costMicros']:
        blockers.append({'code': 'MODELED_COST_SHORTFALL', 'requiredMicros': modeled_cost,
                         'cliCeilingMicros': policy['costMicros'], 'approvedMicros': capability['approved']['costMicros']})
    if local_required > local_available:
        blockers.append({'code': 'LOCAL_RECEIPT_DISK_SHORTFALL', 'required': local_required, 'available': local_available})
    if not plan['inventory']:
        blockers.append({'code': 'NO_ELIGIBLE_FILES'})
    return policy, {'schema': 'redown.campaign-policy/1', 'status': 'BLOCKED' if blockers else 'READY',
                    'target': plan['target'], 'plannedInputFiles': len(plan['inventory']), 'remainingFiles': len(rows),
                    'plannedInputBytes': sum(row['sizeBytes'] for row in plan['inventory']), 'remainingBytes': total,
                    'largestPendingFileBytes': largest, 'modeledCostMicros': modeled_cost, 'policy': policy,
                    'approved': capability['approved'], 'remainingAtPreflight': capability['headroom'],
                    'requestedAuthorizationMinutes': args.authorization_minutes, 'grantedAuthorizationMinutes': capability['authorizedMinutes'],
                    'grantExpiresAtEpochMs': caps['expiresAt'], 'grantReadyAtEpochMs': caps['checkedAt'],
                    'operatorCeilings': requested_limits, 'blockedBy': blockers, 'browserDiskAtStartupBytes': capability['headroom']['diskBytes'],
                    'localDiskRequiredEstimateBytes': local_required, 'localDiskObservedFreeBytes': local_available,
                    'expectedProviderListPages': audit_pages if audit['seconds'] else None,
                    'concurrency': {'mode': 'fixed', 'requested': args.concurrency, 'effective': 1},
                    'source': 'Explicit flags or CLI defaults; browser grant is enforced independently'}


def admit_window(args, caps, plan, candidates, mode, window):
    policy, preflight = options_budget(args, caps, plan, candidates, mode, window)
    if not preflight['blockedBy'] or not (args.admit_partial or args.execution == 'timed') or not candidates:
        return candidates, policy, preflight
    # Smaller transfer windows retain the exact original denominator and all
    # audit reservations. A duration, permission or audit shortfall still blocks.
    low, high = 0, len(candidates) - 1
    best = None
    while low <= high:
        count = (low + high) // 2
        fit = candidates[:count]
        estimated, report = options_budget(args, caps, plan, fit, mode, window)
        if report['status'] == 'READY':
            best = fit, estimated, report
            low = count + 1
        else:
            high = count - 1
    if best is None or not best[0]:
        return candidates, policy, preflight
    fit, estimated, report = best
    report['budgetDeferredFiles'] = len(candidates) - len(fit)
    report['fullSelectionBudgetShortfalls'] = preflight['blockedBy']
    return fit, estimated, report


def entry_for(row, action, retain, identity=None):
    return {'scenarioId': row['scenarioId'], 'operation': action, 'phase': 'owner', 'step': {'retain': retain},
            'fixture': row, 'expectedIdentity': identity}


class CampaignScheduler(Scheduler):
    def __init__(self, client, root, window, plan, policy, source, journal, *, retain=False):
        super().__init__(client, root, {'seed': 0, 'local': {'destinationRoot': 'downloads'}},
                         {'effectiveBudget': policy['budget'], 'schedule': plan['inventory'], 'verification': plan['verification']},
                         source, plan['campaignId'], plan['target']['prefix'])
        self.journal = self.progress.journal = journal
        self.download_root = window / 'downloads'
        self.retain = retain

    def stop(self):
        if (self.root / 'cancel.request').exists():
            raise LabError('CANCELLATION_REQUESTED')
        if time.monotonic() >= min(self.end, self.phase_end):
            raise LabError('CAMPAIGN_TRANSFER_DEADLINE')


def recover(client, plan, states, journal, *, reset_noncommit):
    for row in plan['inventory']:
        state = states.get(row['operationId'], {})
        if (not state.get('hasIntent') or state.get('productionConfirmed') or state.get('conflictingPublicationEvidence')
                or state.get('state') != 'UNCERTAIN'):
            continue
        result = client.query('campaignOutcome', id=row['operationId'], path=row['remotePath'], size=row['sizeBytes'])
        if result['state'] == 'ACKNOWLEDGED':
            journal.append('recoveredPublication', scenarioId=row['scenarioId'], receipt=result['receipt'])
        elif result['state'] == 'NOT_COMMITTED' and reset_noncommit:
            journal.append('recoveredNoCommit', scenarioId=row['scenarioId'], operationId=row['operationId'])


def benchmark(plan, events, args, mode, elapsed_ms):
    cutoff = args.benchmark_seconds * 1000
    selected = {row['scenarioId']: row for row in plan['inventory']}
    counted, late, independent = {}, set(), set()
    durations = []
    for event in events:
        row = selected.get(event.get('scenarioId'))
        if not row:
            continue
        elapsed = event['elapsedMs']
        verified = event['event'] == 'result' and (event.get('readback') or {}).get('clientSha256') == row['sha256']
        acknowledged = event['event'] == 'uploadAcknowledged'
        if verified and elapsed <= cutoff:
            independent.add(row['operationId'])
        if acknowledged and mode == 'upload' or verified and mode in ('round-trip', 'download'):
            if elapsed <= cutoff:
                counted[row['operationId']] = row['sizeBytes']
            else:
                late.add(row['operationId'])
        if event['event'] == 'result':
            durations.append(event.get('durationMs', 0))
    durations.sort()
    time_ms = min(cutoff, elapsed_ms)
    total = sum(counted.values())
    return {'metric': {'upload': 'production-confirmed uploads', 'download': 'completed downloads',
                       'round-trip': 'independently verified upload/download pairs', 'audit': 'audit excluded'}[mode],
            'mode': mode, 'windowSeconds': args.benchmark_seconds, 'measuredMs': time_ms,
            'result': 'PASS' if len(counted) == len(selected) and not plan['inventoryIssues'] else 'INCOMPLETE',
            'cutoffReached': elapsed_ms >= cutoff, 'plannedFiles': len(selected), 'filesWithinWindow': len(counted),
            'bytesWithinWindow': total, 'independentSha256WithinWindow': len(independent),
            'distinctCompletionsAfterWindow': len(late - counted.keys()), 'activeTransferMs': sum(durations),
            'filesPerMinute': round(len(counted) * 60_000 / time_ms, 4) if time_ms else None,
            'bytesPerSecond': round(total * 1000 / time_ms, 4) if time_ms else None,
            'latencyMsP50': durations[ceil_div(50 * len(durations), 100) - 1] if durations else None,
            'latencyMsP95': durations[ceil_div(95 * len(durations), 100) - 1] if durations else None}


def frozen_files(plan):
    return [(row['operationId'], row['remotePath'], row['sizeBytes'], row['sha256']) for row in plan['inventory']]


def register_files(client, rows):
    page, size = [], 0
    for row in rows:
        row_size = len(canonical(row)) + 1
        if page and size + row_size > 256_000:
            client.query('registerCampaignFiles', rows=page, final=False)
            page, size = [], 0
        page.append(row)
        size += row_size
    answer = client.query('registerCampaignFiles', rows=page, final=True)
    if not answer.get('sealed') or answer.get('files') != len(rows):
        raise LabError('LAB_FROZEN_FILE_PLAN_MISMATCH')


def run_window(args, client, caps, root, plan, source, mode, started):
    window_id = str(uuid.uuid4())
    window = root / 'window-receipts' / window_id
    window.mkdir(mode=0o700, parents=True)
    journal = Journal(root, start=started, fields={'windowId': window_id})
    journal.repair_tail()
    prior = publication_outcomes(plan, journal.rows())
    read_mode = mode == 'download'
    audit_only = mode == 'audit'
    requires_readback = plan['verification'] == 'sha256'
    planned = plan['inventory']
    pending = [row for row in planned if not prior.get(row['operationId'], {}).get('productionConfirmed') or
               requires_readback and not prior.get(row['operationId'], {}).get('independentSha256Verified')]
    candidates = planned if read_mode else [] if audit_only else pending
    candidates, policy, preflight = admit_window(args, caps, plan, candidates, mode, window)
    if args.concurrency != 1:
        preflight['blockedBy'].append({'code': 'CONCURRENCY_UNSUPPORTED', 'requested': args.concurrency, 'available': 1})
    if args.expect_files is not None and args.expect_files != plan['expectedSelectionFiles']:
        preflight['blockedBy'].append({'code': 'FROZEN_EXPECTED_SELECTION_COUNT_CHANGED'})
    preflight['status'] = 'BLOCKED' if preflight['blockedBy'] else 'READY'
    preflight.update(windowId=window_id, mode=mode, environment=environment(caps),
                     preparationMs=round((time.monotonic() - started) * 1000))
    document(window / 'effective-policy.json', preflight)
    announce(f"QA destination {plan['target']['bucketName']}/{plan['target']['prefix']}")
    announce(f"Preflight {preflight['status']}: {len(planned)} eligible files, {preflight['plannedInputBytes']} bytes; "
             f"{policy['budget']['seconds']} seconds execution, {policy['audit']['seconds']} seconds reserved for audit; "
             f"{policy['budget']['providerRequests']} reserved request units; "
             f"${preflight['modeledCostMicros']/1_000_000:.6f} modeled expense.")
    journal.append('windowStarted', mode=mode, target=plan['target'], resolvedDigest=plan['resolvedDigest'])
    checkpoint = root / 'checkpoint.json'
    progress = {'schema': 'redown.owner-campaign-checkpoint/1', 'status': 'IN_PROGRESS_OR_INTERRUPTED',
                'campaignId': plan['campaignId'], 'windowId': window_id, 'plannedFiles': len(planned),
                'productionConfirmedFiles': sum(item.get('productionConfirmed', False) for item in prior.values()),
                'observedResultsInWindow': 0}
    atomic_document(checkpoint, progress)
    next_checkpoint = time.monotonic() + 2

    errors = list(preflight['blockedBy'])
    admission, usage, audit = None, None, None
    last_download_states = {}
    provider_deadline = None
    transfer_end_ms = None
    if not errors:
        try:
            # Re-observe remaining grant time at admission on the extension side.
            preparation_ms = round((time.monotonic() - started) * 1000)
            bindings = frozen_files(plan)
            file_hasher = hashlib.sha256()
            for row in bindings:
                file_hasher.update(canonical(row) + b'\n')
            admission = client.query('admitCampaign', runId=plan['campaignId'], mode=mode, digest=plan['resolvedDigest'],
                                     fileDigest=file_hasher.hexdigest(), fileCount=len(bindings),
                                     policy=policy, preparationMs=preparation_ms)
            if admission.get('prefix') != plan['target']['prefix'] or admission.get('budget') != policy['budget']:
                raise LabError('CAMPAIGN_BINDING_MISMATCH')
            journal.append('admitted', admission=admission, preparationMs=preparation_ms)
            register_files(client, bindings)
            local_now = time.monotonic()
            browser_now_ms = time.time_ns() // 1_000_000
            provider_deadline = local_now + max(0, min(admission['deadline'], caps['expiresAt']) - browser_now_ms) / 1000
            transfer_end = local_now + max(0, admission['transferDeadline'] - browser_now_ms) / 1000
            scheduler = CampaignScheduler(client, root, window, plan, policy, source, journal, retain=args.retain_downloads)
            scheduler.end = min(provider_deadline, transfer_end)
            admission_end = scheduler.end - 1.0
            if mode in ('continue', 'audit'):
                recover(client, plan, prior, journal, reset_noncommit=(mode == 'continue'))
            prior = publication_outcomes(plan, journal.rows())
            progress['productionConfirmedFiles'] = sum(item.get('productionConfirmed', False) for item in prior.values())
            for row in candidates:
                operation = row['operationId']
                current = prior.get(operation, {})
                if not read_mode:
                    if current.get('productionConfirmed'):
                        if not requires_readback or current.get('independentSha256Verified'):
                            continue
                    elif current and current['state'] != 'PENDING':
                        continue
                try:
                    if time.monotonic() >= admission_end:
                        raise LabError('CAMPAIGN_TRANSFER_DEADLINE')
                    scheduler.stop()
                except LabError as error:
                    errors.append({'code': error.code})
                    break
                reading = read_mode or current.get('productionConfirmed')
                if reading and not current.get('productionConfirmed'):
                    last_download_states[operation] = 'UNVERIFIED_REMOTE_SOURCE'
                    journal.append('result', scenarioId=row['scenarioId'], action='download', state='NOT_RUN',
                                   code='UNVERIFIED_REMOTE_SOURCE', intendedKey=row['expectedKey'])
                    continue
                action = 'download' if reading else 'upload'
                retain = args.retain_downloads if read_mode else plan['retainDownloads']
                entry = entry_for(row, action, retain, current.get('receipt'))
                result = scheduler.execute(entry, args.transfer_seconds)
                progress['observedResultsInWindow'] += 1
                if action == 'upload' and (result['state'] == 'PASS' or result.get('productionConfirmed')):
                    progress['productionConfirmedFiles'] += 1
                if time.monotonic() >= next_checkpoint:
                    atomic_document(checkpoint, progress)
                    next_checkpoint = time.monotonic() + 2
                if read_mode:
                    last_download_states[operation] = result['state']
                if result['code'] in STOP_CODES or result['code'] in ('HTTP_401', 'HTTP_403', 'HTTP_429'):
                    errors.append({'code': result['code'], 'operationId': operation})
                    break
            transfer_end_ms = round((time.monotonic() - started) * 1000)
            atomic_document(checkpoint, progress)
            if policy['audit']['seconds']:
                audit_journal = Journal(window, filename='audit-observations.ndjson', fields={'windowId': window_id})
                audit_journal.append('auditStarted', scope=plan['target'], resolvedDigest=plan['resolvedDigest'])
                audit_deadline = min(time.monotonic() + policy['audit']['seconds'], provider_deadline)

                def audit_stop():
                    if time.monotonic() >= audit_deadline:
                        raise LabError('CAMPAIGN_AUDIT_DEADLINE')

                reason = None
                try:
                    while not client.query('drainCampaign')['drained']:
                        audit_stop()
                        time.sleep(0.2)
                    scan(client, audit_journal, plan['target']['prefix'], audit_stop)
                except KeyboardInterrupt:
                    reason = 'CANCELLATION_REQUESTED'
                except LabError as error:
                    reason = error.code
                except OSError:
                    reason = 'LOCAL_AUDIT_IO_FAILED'
                if reason:
                    errors.append({'code': reason})
                    audit_journal.append('auditError', code=reason)
                latest = publication_outcomes(plan, journal.rows())
                audit = {**project_audit(plan, latest, audit_journal.rows(), complete=reason is None, reason=reason),
                         'windowId': window_id, 'finishedAt': stamp()}
                document(window / 'location-audit.json', audit)
        except KeyboardInterrupt:
            errors.append({'code': 'CANCELLATION_REQUESTED'})
        except LabError as error:
            errors.append({'code': error.code})
        except OSError:
            errors.append({'code': 'LOCAL_IO_FAILED'})
        finally:
            if admission:
                try:
                    usage = client.query('campaignUsage')
                except LabError:
                    errors.append({'code': 'FINAL_BROWSER_USAGE_UNAVAILABLE'})
                client.cleanup('releaseRun')
    else:
        for error in errors:
            journal.append('runError', **error)
    latest = publication_outcomes(plan, journal.rows())
    status_counts = Counter(latest.get(row['operationId'], {}).get('state', 'PENDING') for row in planned)
    acked = [row for row in planned if latest.get(row['operationId'], {}).get('productionConfirmed')]
    verified = sum(latest.get(row['operationId'], {}).get('independentSha256Verified', False) for row in planned)
    window_mode = 'download' if read_mode else 'audit' if audit_only else plan['operationMode']
    elapsed_ms = round((time.monotonic() - started) * 1000)
    score = benchmark(plan, (event for event in journal.rows() if event.get('windowId') == window_id),
                      args, window_mode, elapsed_ms if transfer_end_ms is None else transfer_end_ms)
    document(window / 'benchmark.json', score)
    if any(error['code'] == 'CANCELLATION_REQUESTED' for error in errors):
        status = 'CANCELLED'
    elif preflight['blockedBy'] or admission is None:
        status = 'BLOCKED'
    elif read_mode:
        status = 'PASS' if all(last_download_states.get(row['operationId']) == 'PASS' for row in planned) else 'INCOMPLETE'
    elif audit_only:
        status = (audit or {}).get('state', 'AUDIT_INCOMPLETE')
    elif (audit or {}).get('state') == 'PASS' and len(acked) == len(planned) and (not requires_readback or verified == len(planned)):
        status = 'PASS'
    else:
        status = 'INCOMPLETE'
    journal.append('windowFinished', state=status, errors=errors)
    old_summary = read_json(root / 'summary.json') if (root / 'summary.json').is_file() else {}
    audit_path = (window.relative_to(root) / 'location-audit.json').as_posix() if audit else old_summary.get('latestLocationAudit')
    share = SHARE + [item.relative_to(root).as_posix() for name in WINDOW_EVIDENCE
                     for item in sorted((root / 'window-receipts').glob('*/' + name))]
    share.append((window.relative_to(root) / 'summary.json').as_posix())
    summary = {'schema': 'redown.owner-campaign-receipt/1', 'status': status, 'campaignId': plan['campaignId'],
               'target': plan['target'], 'manifestDigest': plan['resolvedDigest'], 'finishedAt': stamp(), 'windowId': window_id,
               'windowMode': window_mode, 'preflight': preflight, 'admission': admission, 'usage': usage, 'errors': errors,
               'plannedFiles': len(planned), 'inventoryIssues': len(plan['inventoryIssues']), 'statusCounts': dict(status_counts),
               'productionConfirmedFiles': len(acked), 'productionConfirmedBytes': sum(row['sizeBytes'] for row in acked),
               'cumulativeIndependentSha256Files': verified, 'downloadStatesInWindow': dict(Counter(last_download_states.values())),
               'locationAudit': {k: audit[k] for k in ('state','completeScopedListing','matchedCount','observedUniqueCount',
                                  'stagingBytes','independentContentHashPerformedByAudit')} if audit else None,
               'elapsedMs': elapsed_ms, 'benchmark': score, 'windowPath': window.relative_to(root).as_posix(),
               'share': sorted(set(share)), 'latestLocationAudit': audit_path, 'retainedDownloads': bool(args.retain_downloads if read_mode else plan['retainDownloads'])}
    document(window / 'summary.json', summary)
    atomic_document(root / 'summary.json', summary)
    lines = [f"REDOWN campaign {plan['campaignId']}", f'Result {status}',
             f"Destination {plan['target']['bucketName']}/{plan['target']['prefix']}",
             f"Production-confirmed {len(acked)} of {len(planned)} eligible files ({summary['productionConfirmedBytes']} bytes)",
             f"Location audit {(summary['locationAudit'] or {}).get('state', 'NOT_RUN')}",
             f"Benchmark {score['filesWithinWindow']} files in {score['measuredMs']/1000:.3f} seconds ({score['metric']})",
             f"Proof files {', '.join(summary['share'])}", f"Window {window.relative_to(root).as_posix()}"]
    if errors:
        lines.append('Blockers ' + ', '.join(error['code'] for error in errors))
    artifact = root / 'SUMMARY.txt'
    temporary = root / ('.summary-' + window_id)
    try:
        exclusive(temporary, ('\n'.join(lines) + '\n').encode('utf-8'))
        os.replace(temporary, artifact)
    finally:
        temporary.unlink(missing_ok=True)
    for line in lines:
        announce(line)
    announce(f'Receipt bundle {root}')
    reply = {**summary, 'receiptBundle': str(root)}
    if status != 'PASS' and admission is not None and not read_mode:
        audit_only_next = audit_only or len(acked) == len(planned) and (not requires_readback or verified == len(planned))
        action = 'audit-location' if audit_only_next else 'continue-campaign'
        command = [r'lab-local\.venv\Scripts\redown-lab.exe', action, '--run', str(root),
                   '--authorization-minutes', str(args.authorization_minutes), '--audit-seconds', str(args.audit_seconds),
                   '--approve-cost-usd', str(args.approve_cost_usd), '--live']
        if not audit_only_next:
            command.extend(('--input', str(source), '--execution', args.execution, '--execution-seconds', str(args.execution_seconds),
                            '--benchmark-seconds', str(args.benchmark_seconds), '--transfer-seconds', str(args.transfer_seconds),
                            '--inactivity-seconds', str(args.inactivity_seconds), '--request-seconds', str(args.request_seconds),
                            '--upload-seconds', str(args.upload_seconds), '--verification-seconds', str(args.verification_seconds)))
            if args.admit_partial:
                command.append('--admit-partial')
            if (root / 'cancel.request').exists():
                command.append('--clear-cancel')
        for field in ('audit_requests', 'audit_operations', 'audit_traffic_bytes'):
            if getattr(args, field) is not None:
                command.extend(('--' + field.replace('_','-'), str(getattr(args, field))))
        reply['continuationCommand'] = subprocess.list2cmdline(command)
        announce('Continuation CMD: ' + reply['continuationCommand'])
    return reply


def campaign(args, source, output, claims, *, started=None):
    started = time.monotonic() if started is None else started
    source = ordinary_directory(source)
    binding = input_binding(source)
    if output.is_relative_to(source) or source.is_relative_to(output):
        raise LabError('CORPUS_WORKSPACE_OVERLAP')
    with claim(claims, binding):
        pointer = claims / (binding + '.json')
        if pointer.is_file() and not args.new_run:
            previous = Path(read_json(pointer)['run'])
            summary = previous / 'summary.json'
            if previous.is_dir() and (not summary.is_file() or read_json(summary).get('status') != 'PASS'):
                raise LabError('UNFINISHED_CAMPAIGN_EXISTS', {'receiptBundle': str(previous), 'use': 'continue-campaign'})
        issues = []
        files, empty = inventory(source, max_files=MAX_INT, max_file_bytes=MAX_FILE_BYTES, max_total_bytes=MAX_INT,
                                 max_entries=MAX_INT, seconds=args.inventory_seconds, excluded=(output, claims),
                                 issues=issues, bind_identity=True)
        with connect() as client:
            caps = client.describe()
            if caps['mode'] != 'read-write' or caps.get('campaign', {}).get('campaignId'):
                raise LabError('FRESH_READ_WRITE_SCOPE_REQUIRED')
            run_id = str(uuid.uuid4())
            root = output / run_id
            root.mkdir(mode=0o700)
            announce(f'Receipt bundle {root}')
            plan = freeze(root, files, issues, empty, target_for(caps, run_id), args, binding)
            atomic_document(pointer, {'run': str(root)})
            with claim(root / '.locks', 'window'):
                return run_window(args, client, caps, root, plan, source, 'new', started)


def existing_campaign(args, root, source, claims, mode, *, started=None):
    started = time.monotonic() if started is None else started
    plan = load_plan(root)
    binding = read_json(root / 'private-source-binding.json')['sourceBinding'] if mode == 'continue' else None
    with claim(claims, binding or plan['campaignId']):
        if source is not None:
            source = ordinary_directory(source)
            if input_binding(source) != binding:
                raise LabError('CAMPAIGN_SOURCE_CHANGED', {'use': 'Select the original input directory.'})
        # All modes serialize local journals, including a read-only audit or download.
        with claim(root / '.locks', 'window'), connect() as client:
            caps = client.describe()
            validate_scope(plan, caps)
            if mode == 'continue':
                if caps['mode'] != 'read-write':
                    raise LabError('EXACT_READ_WRITE_CONTINUATION_REQUIRED', {'useRecoveryScope': plan['target']})
                if args.clear_cancel:
                    (root / 'cancel.request').unlink(missing_ok=True)
            return run_window(args, client, caps, root, plan, source, mode, started)
