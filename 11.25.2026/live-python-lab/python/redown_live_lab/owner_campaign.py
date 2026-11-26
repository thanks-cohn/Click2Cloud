"""Owner campaigns reuse the Laboratory scheduler and production publication path."""
from collections import Counter
from contextlib import contextmanager
from decimal import Decimal, InvalidOperation
import hashlib
import heapq
import os
import random
from pathlib import Path
import shutil
import subprocess
import sys
import time
import uuid

from .download_output import verify_disk
from .errors import LabError
from .evidence import Journal, atomic_bytes, atomic_document, document, environment, exclusive, stamp
from .fixtures import content_type
from .inventory import inventory, name_key, ordinary_directory, relative_path, source_path
from .location_audit import load_plan, project_audit, scan
from .manifest import canonical, digest, read_json
from .runner import Scheduler, operation_id
from .transport import connect


MAX_INT = 2**53 - 1
TRANSIENT = {'HTTP_429', 'HTTP_502', 'HTTP_503', 'HTTP_504', 'EXPLORER_NETWORK_ERROR',
             'EXPLORER_REQUEST_TIMEOUT', 'NETWORK_ERROR', 'REQUEST_TIMEOUT', 'TRANSIENT_API_FAILURE'}
MAX_ATTEMPTS = 3
MAX_TIMER_SECONDS = 2_147_483
MAX_FILE_BYTES = (5 * 1024 - 1) * 1024**2
SHARE = ['resolved-manifest.json', 'operations.ndjson', 'checkpoint.json', 'summary.json', 'SUMMARY.txt']
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
            if row['sha256'] and event['state'] == 'PASS' and readback.get('clientSha256') == row['sha256']:
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


def workload_verdict(plan):
    expected = plan['expectedSelectionFiles']
    observed = len(plan['inventory'])
    return {'status': 'PASS' if observed and not plan['inventoryIssues'] and expected in (None, observed) else 'FAIL',
            'expectedFiles': expected, 'eligibleFiles': observed, 'inventoryIssues': len(plan['inventoryIssues']),
            'code': ('EXPECTED_FILE_COUNT_MISMATCH' if expected not in (None, observed) else
                     'INVENTORY_HAS_ERRORS' if plan['inventoryIssues'] else 'NO_ELIGIBLE_FILES' if not observed else None)}


def valid_sha(value):
    return isinstance(value, str) and len(value) == 64 and all(c in '0123456789abcdef' for c in value)


def download_outcomes(plan, events, window=None):
    rows = {row['scenarioId']: row for row in plan['inventory']}
    states = {}
    for event in events:
        if window is not None and event.get('windowId') != window:
            continue
        row = rows.get(event.get('scenarioId'))
        if not row:
            continue
        operation = row['operationId']
        if event['event'] in ('downloadIntent', 'downloadPublishRequested'):
            states[operation] = {'state': 'UNCERTAIN', 'code': 'DOWNLOAD_INTENT_WITHOUT_RESULT'}
        if event['event'] == 'downloadRecovered':
            states[operation] = {'state': 'PASS', 'readback': event['readback']}
        if event['event'] != 'result':
            continue
        readback = event.get('readback') or {}
        observed_hash = readback.get('clientSha256')
        if (valid_sha(observed_hash) and row['sha256'] in (None, observed_hash) and
                readback.get('clientBytes') == row['sizeBytes'] and event['state'] == 'PASS'):
            states[operation] = {'state': 'PASS', 'readback': readback}
        elif event.get('action') == 'download':
            states[operation] = {'state': 'UNCERTAIN' if readback.get('localEvidence') == 'PUBLICATION_UNCONFIRMED' else
                                 'FAIL' if event['state'] == 'PASS' else event['state'], 'code': event['code']}
    return states


def offline_campaign_status(root, plan):
    summary_path = root / 'summary.json'
    summary = read_json(summary_path) if summary_path.is_file() else {}
    journal = Journal(root)
    latest = None
    for event in journal.rows():
        if event['event'] == 'windowStarted':
            latest = event
    if not latest or latest['windowId'] == summary.get('windowId'):
        return summary or {'status': 'IN_PROGRESS_OR_INTERRUPTED', 'workloadVerdict': workload_verdict(plan)}
    window = latest['windowId']
    uploads = publication_outcomes(plan, journal.rows())
    downloads = download_outcomes(plan, journal.rows(), window)
    finished = next((event for event in journal.rows() if event.get('windowId') == window and
                     event['event'] == 'windowFinished'), None)
    checkpoint = root / 'checkpoint.json'
    return {'schema': 'redown.owner-campaign-recovery/1', 'campaignId': plan['campaignId'],
            'manifestDigest': plan['resolvedDigest'], 'windowId': window, 'windowMode': latest['mode'],
            'status': 'IN_PROGRESS_OR_INTERRUPTED', 'terminationReason': 'FINAL_SNAPSHOT_UNAVAILABLE',
            'journalWindowVerdict': finished['state'] if finished else None,
            'workloadVerdict': workload_verdict(plan), 'plannedFiles': len(plan['inventory']),
            'uploadStates': dict(Counter(uploads.get(row['operationId'], {}).get('state', 'PENDING') for row in plan['inventory'])),
            'downloadStates': dict(Counter(downloads.get(row['operationId'], {}).get('state', 'PENDING') for row in plan['inventory'])),
            'lastCheckpoint': str(checkpoint) if checkpoint.is_file() else None,
            'lastValidSummary': str(summary_path) if summary else None}


def retained_output(root):
    private = root / 'private-download-output.json'
    return (ordinary_directory(read_json(private)['directory']) if private.is_file() else
            root / 'retained-downloads')


def receipt_copy(root, relative):
    if relative.startswith('retained-downloads/'):
        return source_path(retained_output(root), relative.removeprefix('retained-downloads/'))
    return source_path(root, relative)


def local_publications(plan, events, window=None):
    lookup = {row['scenarioId']: row for row in plan['inventory']}
    requested = {}
    for event in events:
        if window is not None and event.get('windowId') != window:
            continue
        row = lookup.get(event.get('scenarioId'))
        if not row or event['event'] != 'downloadPublishRequested':
            continue
        relative = event.get('savedCopy')
        if not isinstance(relative, str) or not relative.endswith('/'+row['remotePath']):
            continue
        if (event.get('key') == row['expectedKey'] and event.get('size') == row['sizeBytes'] and
                valid_sha(event.get('sha256')) and row['sha256'] in (None, event['sha256']) and
                all(event.get(key) == value for key, value in row.get('remoteIdentity', {}).items())):
            requested[row['operationId']] = {'savedCopy': relative, 'clientSha256': event['sha256'],
                                            'clientBytes': event['size'], 'independentSourceSha256': row['sha256'] is not None}
    return requested


def check_downloads(root, window=None, *, all_windows=False):
    plan = load_plan(root)
    if window is None and not all_windows and not plan.get('selectionInventoryDigest'):
        latest = offline_campaign_status(root, plan)
        window = latest.get('windowId')
    journal = Journal(root)
    observed = download_outcomes(plan, journal.rows(), window)
    publications = local_publications(plan, journal.rows(), window)
    failures, copies, recovered = [], 0, 0
    for row in plan['inventory']:
        operation = row['operationId']
        acknowledged = observed.get(operation, {}).get('readback', {})
        requested = publications.get(operation, {})
        proof = acknowledged or requested
        relative = proof.get('savedCopy')
        try:
            prefix = 'retained-downloads/' if plan.get('selectionInventoryDigest') else 'window-receipts/'
            if not relative or not relative.startswith(prefix):
                raise LabError('NO_RETAINED_COPY_EVIDENCE')
            disk = verify_disk(receipt_copy(root, relative), row['sizeBytes'], row['sha256'] or proof['clientSha256'])
            copies += int(disk['diskBytes'] == row['sizeBytes'])
            recovered += int(not acknowledged)
        except (OSError, LabError) as error:
            failures.append({'operationId': operation, 'relativePath': row['remotePath'],
                             'code': error.code if isinstance(error, LabError) else 'DOWNLOAD_OUTPUT_UNAVAILABLE'})
    workload = workload_verdict(plan)
    return {'schema': 'redown.download-disk-audit/1', 'windowId': window, 'receiptBundle': str(root),
            'status': 'PASS' if copies and not failures and workload['status'] == 'PASS' else 'FAIL',
            'workloadVerdict': workload, 'checkedFiles': copies, 'recoveredPublicationFiles': recovered,
            'errors': failures}


def reconcile_disk_downloads(plan, journal, retain):
    prior = download_outcomes(plan, journal.rows())
    publications = local_publications(plan, journal.rows())
    if not retain:
        return {key: proof['state'] for key, proof in prior.items() if proof['state'] == 'PASS'}
    states = {}
    for row in plan['inventory']:
        operation = row['operationId']
        acknowledged = prior.get(operation, {}).get('readback')
        proof = acknowledged or publications.get(operation)
        if not proof or not proof.get('savedCopy'):
            continue
        try:
            disk = verify_disk(receipt_copy(journal.root, proof['savedCopy']), row['sizeBytes'], proof['clientSha256'])
        except (LabError, OSError):
            continue
        states[operation] = 'PASS'
        if not acknowledged:
            journal.append('downloadRecovered', scenarioId=row['scenarioId'], operationId=operation,
                           readback={**proof, **disk})
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
    requested_limits = {'files': args.file_budget, 'providerRequests': args.provider_requests,
                        'trafficBytes': args.traffic_bytes, 'diskBytes': args.temp_disk_bytes,
                        'operations': args.operation_budget}
    retries = 0
    read_headroom = capability.get('readSelection', {}).get('remainingReadAttempts', MAX_INT)
    if rows and not is_audit:
        extra = {'files': bool(upload_count), 'operations': int(bool(upload_count)) * 2 + bool(read_count),
                 'providerRequests': (baseline['uploadRequests'] + baseline['statRequests']) * bool(upload_count)
                                     + baseline['readRequests'] * bool(read_count),
                 'trafficBytes': largest * (baseline['uploadTrafficFactor'] * bool(upload_count) + bool(read_count))}
        for _ in range(min(args.retry_reserve,max(0,read_headroom-read_count))):
            proposed = {key: value + extra.get(key, 0) for key, value in budget.items()}
            cost = proposed['providerRequests'] * 9 + ceil_div(proposed['trafficBytes'] * 15, 1_000_000)
            if cost > policy['costMicros'] or any(
                proposed[key] > min(capability['headroom'][key], requested_limits[key]
                                    if requested_limits.get(key) is not None else MAX_INT) for key in proposed
            ):
                break
            budget.update(proposed)
            retries += 1
    modeled_cost = budget['providerRequests'] * 9 + ceil_div(budget['trafficBytes'] * 15, 1_000_000)
    local_evidence_bytes = 131_072 + 20_480 * len(plan['inventory'])
    local_required = local_evidence_bytes + (total if read_count and args.retain_downloads else 0)
    local_available = shutil.disk_usage(output).free
    blockers = []
    if read_count > read_headroom:
        blockers.append({'code': 'LAB_READ_FILE_BUDGET_EXCEEDED', 'required': read_count, 'available': read_headroom})
    if args.authorization_minutes > capability['authorizedMinutes']:
        blockers.append({'code': 'LAB_AUTHORIZATION_DURATION_SHORTFALL', 'requestedMinutes': args.authorization_minutes,
                         'approvedMinutes': capability['authorizedMinutes']})
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
                    'reservedRetriesPerDirection': retries,
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
        self.selection = bool(plan.get('selectionInventoryDigest'))
        self.download_root = retained_output(root) if self.selection else window / 'downloads'
        self.retain = retain

    def copy_reference(self, path):
        if self.selection:
            return 'retained-downloads/' + Path(path).relative_to(self.download_root).as_posix()
        return super().copy_reference(path)

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



class CampaignRetries:
    """Keep healthy files moving while eligible attempts wait for backoff."""
    def __init__(self, scheduler, journal, reserve, admission_end):
        self.scheduler = scheduler
        self.journal = journal
        self.remaining = {'upload': reserve, 'download': reserve}
        self.admission_end = admission_end
        self.queue = []
        self.serial = 0
        self.throttle_until = 0

    def schedule(self, row, entry, result, attempt, file_deadline):
        direction = entry['operation']
        code = result['code']
        if code not in TRANSIENT or result['state'] in ('PASS', 'CANCELLED', 'BLOCKED'):
            return False
        hint = result.get('retryAfterMs') or 0
        delay = max(hint / 1000, min(8, 0.25 * 2**(attempt - 1)) * random.uniform(0.75, 1.25))
        now = time.monotonic()
        reason = None
        if attempt >= MAX_ATTEMPTS:
            reason = 'ATTEMPT_LIMIT'
        elif not self.remaining[direction]:
            reason = 'RETRY_RESERVE_EXHAUSTED'
        elif now + delay + 1 >= min(file_deadline, self.admission_end):
            reason = 'RETRY_DEADLINE'
        fields = {'operationId': operation_id(self.scheduler.run_id, row['scenarioId'],
                                             'upload' if direction == 'upload' else 'read'),
                  'scenarioId': row['scenarioId'], 'direction': direction, 'attempt': attempt, 'code': code}
        if reason:
            self.journal.append('retryExhausted', **fields, reason=reason)
            return False
        self.remaining[direction] -= 1
        self.serial += 1
        next_at = now + delay
        self.journal.append('retryScheduled', **fields, nextAttempt=attempt + 1, delayMs=round(delay * 1000),
                            nextEligibleAtEpochMs=round((time.time() + delay) * 1000), remaining=dict(self.remaining))
        if code == 'HTTP_429':
            self.throttle_until = max(self.throttle_until, next_at)
        heapq.heappush(self.queue, (next_at, self.serial, row, entry, attempt + 1, file_deadline))
        return True

    def wait_until(self, next_at):
        while time.monotonic() < next_at:
            self.scheduler.stop()
            time.sleep(min(0.1, max(0, next_at - time.monotonic())))

    def ready(self, *, drain=False):
        while self.queue and (drain or self.queue[0][0] <= time.monotonic()):
            next_at, _, row, entry, attempt, file_deadline = heapq.heappop(self.queue)
            self.wait_until(max(next_at, self.throttle_until))
            self.scheduler.stop()
            if time.monotonic() + 1 >= min(file_deadline, self.admission_end):
                self.journal.append('retryExhausted', scenarioId=row['scenarioId'], direction=entry['operation'],
                                    attempt=attempt, code='RETRY_DEADLINE')
                continue
            yield row, entry, attempt, file_deadline


def reconcile_attempt(client, row, journal, result):
    """Only the production checkpoint can permit reuse of an upload intent."""
    if result.get('productionConfirmed') or not (result['state'] == 'UNCERTAIN' or result['code'] in TRANSIENT):
        return result
    status = client.query('campaignOutcome', id=row['operationId'], path=row['remotePath'], size=row['sizeBytes'])
    if status['state'] == 'ACKNOWLEDGED':
        receipt = status['receipt']
        journal.append('recoveredPublication', scenarioId=row['scenarioId'], receipt=receipt)
        return {'state': 'PASS', 'code': 'PRODUCTION_UPLOAD_RECONCILED', 'productionConfirmed': True, 'receipt': receipt}
    if status['state'] == 'NOT_COMMITTED':
        return {**result, 'state': 'FAIL', 'precommitRetrySafe': True}
    return {**result, 'state': 'UNCERTAIN', 'precommitRetrySafe': False}


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
        readback = event.get('readback') or {}
        hash_value = readback.get('clientSha256')
        verified = (event['event'] == 'result' and event['state'] == 'PASS' and valid_sha(hash_value) and
                    readback.get('clientBytes') == row['sizeBytes'] and row['sha256'] in (None, hash_value))
        acknowledged = event['event'] in ('uploadAcknowledged', 'recoveredPublication')
        if verified and row['sha256'] and elapsed <= cutoff:
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
    selection = plan.get('selectionInventoryDigest')
    read_mode = mode == 'download'
    audit_only = mode == 'audit'
    requires_readback = plan['verification'] == 'sha256'
    planned = plan['inventory']
    pending = [row for row in planned if not prior.get(row['operationId'], {}).get('productionConfirmed') or
               requires_readback and not prior.get(row['operationId'], {}).get('independentSha256Verified')]
    states = reconcile_disk_downloads(plan, journal, args.retain_downloads) if read_mode and args.resume_downloads else {}
    candidates = ([row for row in planned if row['operationId'] not in states] if read_mode else [] if audit_only else pending)
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
                'observedResultsInWindow': 0, 'observedDownloadBytes': 0, 'downloadStates': {}}
    atomic_document(checkpoint, progress)
    next_checkpoint = time.monotonic() + 2

    errors = list(preflight['blockedBy'])
    already_delivered = read_mode and bool(planned) and len(states) == len(planned)
    admission, usage, audit = None, None, None
    last_download_states = dict(states)
    provider_deadline = None
    transfer_end_ms = None
    if not errors and not already_delivered:
        try:
            # Re-observe remaining grant time at admission on the extension side.
            preparation_ms = round((time.monotonic() - started) * 1000)
            if selection:
                admission = client.query('admitReadSelection', runId=plan['campaignId'], phase='download',
                                         inventoryDigest=selection,
                                         readFiles=max(1, len(candidates) + preflight['reservedRetriesPerDirection']),
                                         policy=policy, preparationMs=preparation_ms)
            else:
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
            if not selection:
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
            retries = CampaignRetries(scheduler, journal, preflight['reservedRetriesPerDirection'], admission_end)

            def execute_attempt(row, entry, attempt, file_deadline):
                operation = row['operationId']
                action = entry['operation']
                reading = action == 'download'
                baseline_end = scheduler.phase_end
                scheduler.phase_end = min(baseline_end, file_deadline)
                scheduler.attempt = attempt
                try:
                    retries.wait_until(retries.throttle_until)
                    scheduler.stop()
                    timeout = max(1, min(args.transfer_seconds, int(file_deadline - time.monotonic() + 1)))
                    logical_id = operation_id(plan['campaignId'], row['scenarioId'], 'read') if reading else operation
                    attempt_id = str(uuid.uuid5(uuid.UUID(logical_id), f'attempt/{window_id}/{attempt}'))
                    journal.append('attemptStarted', scenarioId=row['scenarioId'], operationId=logical_id,
                                   direction=action, attempt=attempt, attemptId=attempt_id)
                    result = scheduler.execute(entry, timeout)
                    if not reading and not result.get('productionConfirmed') and (
                            result['code'] in TRANSIENT or
                            result['state'] == 'UNCERTAIN' and retries.remaining['upload'] and result['code'] not in STOP_CODES):
                        result = reconcile_attempt(client, row, journal, result)
                    will_retry = (reading or result.get('precommitRetrySafe')) and retries.schedule(
                        row, entry, result, attempt, file_deadline)
                    if not reading and result.get('receipt') and requires_readback:
                        readback = entry_for(row, 'download', plan['retainDownloads'], result['receipt'])
                        if result['code'] == 'PRODUCTION_UPLOAD_RECONCILED':
                            execute_attempt(row, readback, 1, file_deadline)
                        elif result['state'] != 'PASS':
                            will_retry = retries.schedule(row, readback, result, 1, file_deadline)
                finally:
                    scheduler.phase_end = baseline_end
                progress['observedResultsInWindow'] += 1
                if not reading and (result['state'] == 'PASS' or result.get('productionConfirmed')):
                    progress['productionConfirmedFiles'] += 1
                if reading or result.get('readback'):
                    observed = result.get('readback') or result
                    progress['observedDownloadBytes'] += observed.get('clientBytes', 0)
                    states = progress['downloadStates']
                    states[result['state']] = states.get(result['state'], 0) + 1
                if read_mode:
                    last_download_states[operation] = result['state']
                if result['code'] in STOP_CODES or result['code'] in ('HTTP_401', 'HTTP_403'):
                    errors.append({'code': result['code'], 'operationId': operation})
                    return False
                if result['code'] == 'HTTP_429' and not will_retry:
                    errors.append({'code': 'THROTTLED_WITHOUT_RETRY_BUDGET', 'operationId': operation})
                    return False
                return True

            proceed = True
            for row in candidates:
                operation = row['operationId']
                current = prior.get(operation, {})
                if not read_mode:
                    if current.get('productionConfirmed'):
                        if not requires_readback or current.get('independentSha256Verified'):
                            continue
                    elif current and current['state'] != 'PENDING':
                        continue
                if time.monotonic() >= admission_end:
                    errors.append({'code': 'CAMPAIGN_TRANSFER_DEADLINE'})
                    proceed = False
                    break
                scheduler.stop()
                reading = read_mode or current.get('productionConfirmed')
                if reading and not selection and not current.get('productionConfirmed'):
                    last_download_states[operation] = 'UNVERIFIED_REMOTE_SOURCE'
                    journal.append('result', scenarioId=row['scenarioId'], action='download', state='NOT_RUN',
                                   code='UNVERIFIED_REMOTE_SOURCE', intendedKey=row['expectedKey'])
                    continue
                action = 'download' if reading else 'upload'
                retain = args.retain_downloads if read_mode else plan['retainDownloads']
                entry = entry_for(row, action, retain, row.get('remoteIdentity') if selection else current.get('receipt'))
                if not execute_attempt(row, entry, 1, time.monotonic() + args.transfer_seconds):
                    proceed = False
                    break
                for retry in retries.ready():
                    if not execute_attempt(*retry):
                        proceed = False
                        break
                if time.monotonic() >= next_checkpoint:
                    atomic_document(checkpoint, progress)
                    next_checkpoint = time.monotonic() + 2
                if not proceed:
                    break
            if proceed:
                for retry in retries.ready(drain=True):
                    if not execute_attempt(*retry):
                        break
                    if time.monotonic() >= next_checkpoint:
                        atomic_document(checkpoint, progress)
                        next_checkpoint = time.monotonic() + 2
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
    status_counts = (Counter(last_download_states.get(row['operationId'], 'PENDING') for row in planned) if read_mode else
                     Counter(latest.get(row['operationId'], {}).get('state', 'PENDING') for row in planned))
    acked = [row for row in planned if latest.get(row['operationId'], {}).get('productionConfirmed')]
    verified = sum(latest.get(row['operationId'], {}).get('independentSha256Verified', False) for row in planned)
    window_mode = 'download' if read_mode else 'audit' if audit_only else plan['operationMode']
    elapsed_ms = round((time.monotonic() - started) * 1000)
    score = benchmark(plan, (event for event in journal.rows() if event.get('windowId') == window_id),
                      args, window_mode, elapsed_ms if transfer_end_ms is None else transfer_end_ms)
    document(window / 'benchmark.json', score)
    if any(error['code'] == 'CANCELLATION_REQUESTED' for error in errors):
        status = 'CANCELLED'
    elif preflight['blockedBy'] or admission is None and not already_delivered:
        status = 'BLOCKED'
    elif read_mode:
        status = 'PASS' if all(last_download_states.get(row['operationId']) == 'PASS' for row in planned) else 'INCOMPLETE'
    elif audit_only:
        status = (audit or {}).get('state', 'AUDIT_INCOMPLETE')
    elif audit and audit['completeScopedListing'] and audit['matchedCount']==len(planned) and not (
            audit['unexpectedKeys'] or audit['stagingLeftovers'] or audit['duplicatePublicationKeys'] or
            audit['duplicateListingKeys'] or audit['renamedOrMislocatedPublications']) and len(acked) == len(planned) and (
            not requires_readback or verified == len(planned)):
        status = 'PASS'
    else:
        status = 'INCOMPLETE'
    transfer_status = status
    workload = workload_verdict(plan)
    if status == 'PASS' and workload['status'] != 'PASS':
        status = 'FAIL'
    termination = (errors[0]['code'] if errors else workload['code'] if status == 'FAIL' else
                   'COMPLETED' if status == 'PASS' else 'NOT_ALL_OPERATIONS_VERIFIED')
    journal.append('windowFinished', state=status, transferState=transfer_status, terminationReason=termination, errors=errors)
    old_summary = read_json(root / 'summary.json') if (root / 'summary.json').is_file() else {}
    audit_path = (window.relative_to(root) / 'location-audit.json').as_posix() if audit else old_summary.get('latestLocationAudit')
    share = SHARE + [item.relative_to(root).as_posix() for name in WINDOW_EVIDENCE
                     for item in sorted((root / 'window-receipts').glob('*/' + name))]
    share.append((window.relative_to(root) / 'summary.json').as_posix())
    summary = {'schema': 'redown.owner-campaign-receipt/1', 'status': status, 'campaignId': plan['campaignId'],
               'target': plan['target'], 'manifestDigest': plan['resolvedDigest'], 'finishedAt': stamp(), 'windowId': window_id,
               'windowMode': window_mode, 'transferVerdict': transfer_status, 'workloadVerdict': workload,
               'terminationReason': termination, 'selectionInventoryDigest': selection, 'preflight': preflight, 'admission': admission, 'usage': usage, 'errors': errors,
               'plannedFiles': len(planned), 'inventoryIssues': len(plan['inventoryIssues']), 'statusCounts': dict(status_counts),
               'productionConfirmedFiles': len(acked), 'productionConfirmedBytes': sum(row['sizeBytes'] for row in acked),
               'cumulativeIndependentSha256Files': verified, 'downloadStatesInWindow': dict(Counter(last_download_states.values())),
               'locationAudit': {k: audit[k] for k in ('state','completeScopedListing','matchedCount','observedUniqueCount',
                                  'stagingBytes','independentContentHashPerformedByAudit')} if audit else None,
               'elapsedMs': elapsed_ms, 'benchmark': score, 'windowPath': window.relative_to(root).as_posix(),
               'share': sorted(set(share)), 'latestLocationAudit': audit_path, 'retainedDownloads': bool(args.retain_downloads if read_mode else plan['retainDownloads'])}
    lines = [f"REDOWN campaign {plan['campaignId']}", f"Result {status} · transfer {transfer_status} · workload {workload['status']} ({termination})",
             f"Destination {plan['target']['bucketName']}/{plan['target']['prefix']}",
             f"Production-confirmed {len(acked)} of {len(planned)} eligible files ({summary['productionConfirmedBytes']} bytes)",
             f"Location audit {(summary['locationAudit'] or {}).get('state', 'NOT_RUN')}",
             f"Benchmark {score['filesWithinWindow']} files in {score['measuredMs']/1000:.3f} seconds ({score['metric']})",
             f"Proof files {', '.join(summary['share'])}", f"Window {window.relative_to(root).as_posix()}"]
    if errors:
        lines.append('Blockers ' + ', '.join(error['code'] for error in errors))
    if status in ('INCOMPLETE', 'UNCERTAIN', 'CANCELLED', 'AUDIT_INCOMPLETE') and admission is not None:
        audit_only_next = audit_only or len(acked) == len(planned) and (not requires_readback or verified == len(planned))
        action = 'download-selection' if selection else 'download-campaign' if read_mode else 'audit-location' if audit_only_next else 'continue-campaign'
        command = [r'lab-local\.venv\Scripts\redown-lab.exe', action, '--run', str(root),
                   '--authorization-minutes', str(args.authorization_minutes), '--audit-seconds', str(args.audit_seconds),
                   '--approve-cost-usd', str(args.approve_cost_usd), '--live']
        if action == 'continue-campaign':
            command.extend(('--input', str(source)))
        if read_mode:
            command.append('--resume-downloads')
            if (root / 'cancel.request').exists():
                command.append('--clear-cancel')
        if read_mode and args.retain_downloads:
            command.append('--retain-downloads')
        if action != 'audit-location':
            command.extend(('--execution', args.execution, '--execution-seconds', str(args.execution_seconds),
                            '--retry-reserve', str(args.retry_reserve),
                            '--benchmark-seconds', str(args.benchmark_seconds), '--transfer-seconds', str(args.transfer_seconds),
                            '--inactivity-seconds', str(args.inactivity_seconds), '--request-seconds', str(args.request_seconds),
                            '--upload-seconds', str(args.upload_seconds), '--verification-seconds', str(args.verification_seconds)))
            if args.admit_partial:
                command.append('--admit-partial')
            if action == 'continue-campaign' and (root / 'cancel.request').exists():
                command.append('--clear-cancel')
        if selection:
            command.extend(('--inventory-seconds', str(args.inventory_seconds), '--inventory-requests', str(args.inventory_requests),
                            '--inventory-traffic-bytes', str(args.inventory_traffic_bytes)))
        for field in ('audit_requests', 'audit_operations', 'audit_traffic_bytes'):
            if getattr(args, field) is not None:
                command.extend(('--' + field.replace('_','-'), str(getattr(args, field))))
        summary['continuationCommand'] = subprocess.list2cmdline(command)
        lines.append('Continuation CMD: ' + summary['continuationCommand'])
    try:
        document(window / 'summary.json', summary)
        atomic_document(root / 'summary.json', summary)
        atomic_bytes(root / 'SUMMARY.txt', ('\n'.join(lines) + '\n').encode('utf-8'))
    except OSError as error:
        raise LabError('LOCAL_RECEIPT_WRITE_FAILED', {'receiptBundle': str(root), 'errno': error.errno,
                                                     'journal': str(journal.path)}) from None
    for line in lines:
        announce(line)
    announce(f'Receipt bundle {root}')
    if selection and args.retain_downloads:
        announce(f'Retained downloads {retained_output(root)}')
    return {**summary, 'receiptBundle': str(root)}


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
            if mode == 'download' and args.clear_cancel:
                (root / 'cancel.request').unlink(missing_ok=True)
            return run_window(args, client, caps, root, plan, source, mode, started)


def discover_selection(args, client, caps, root, run_id):
    """Freeze one browser-observed listing with a separate bounded read grant."""
    capability = caps['campaign']
    size_limit = min(args.inventory_traffic_bytes, capability['headroom']['trafficBytes'])
    request_limit = min(args.inventory_requests, capability['headroom']['providerRequests'])
    operations = min(2 * request_limit, capability['headroom']['operations'])
    if not min(size_limit, request_limit, operations):
        raise LabError('LAB_READ_INVENTORY_BUDGET_EXCEEDED')
    reserve = {'seconds': args.inventory_seconds, 'trafficBytes': size_limit,
               'providerRequests': request_limit, 'operations': operations}
    policy = {'budget': {**reserve, 'files': 0, 'diskBytes': 0}, 'audit': reserve, 'execution': 'audit',
              'benchmarkSeconds': args.benchmark_seconds, 'transferSeconds': args.transfer_seconds,
              'inactivitySeconds': args.inactivity_seconds, 'requestSeconds': args.request_seconds,
              'uploadSeconds': args.upload_seconds, 'verificationSeconds': args.verification_seconds,
              'costMicros': approved_cost(args.approve_cost_usd)}
    directory = root / 'inventory-receipts' / str(uuid.uuid4())
    directory.mkdir(parents=True, mode=0o700)
    journal = Journal(directory, filename='audit-observations.ndjson')
    journal.append('inventoryStarted', scope={key: caps[key] for key in ('provider', 'accountId', 'bucketName', 'prefix')},
                   policy=policy)
    admission = None
    try:
        admission = client.query('admitReadSelection', runId=run_id, phase='inventory', inventoryDigest=None,
                                 readFiles=0, policy=policy, preparationMs=0)
        deadline = time.monotonic() + args.inventory_seconds

        def stop():
            if (root / 'cancel.request').exists():
                raise LabError('CANCELLATION_REQUESTED')
            if time.monotonic() >= deadline:
                raise LabError('DOWNLOAD_INVENTORY_DEADLINE')

        inventory_digest = scan(client, journal, caps['prefix'], stop)
        if not valid_sha(inventory_digest):
            raise LabError('LAB_READ_INVENTORY_MISMATCH')
        journal.append('inventoryFinished', state='PASS', inventoryDigest=inventory_digest)
    except (LabError, OSError, KeyboardInterrupt) as error:
        code = (error.code if isinstance(error, LabError) else 'CANCELLATION_REQUESTED'
                if isinstance(error, KeyboardInterrupt) else 'LOCAL_RECEIPT_WRITE_FAILED')
        journal.append('inventoryFinished', state='INCOMPLETE', code=code)
        raise LabError(code, {'receiptBundle': str(root), 'inventoryJournal': str(journal.path)}) from None
    finally:
        if admission:
            client.cleanup('releaseRun')
    rows = [item for event in journal.rows() if event['event'] == 'auditPage' for item in event['entries']]
    return inventory_digest, rows


def freeze_selection(root, run_id, caps, selection_digest, observed, args):
    prefix = caps['prefix']
    issues, empty, rows, names, directories = [], [], [], set(), {}
    for item in sorted(observed, key=lambda entry: entry['key']):
        path, size = item['key'][len(prefix):], item['size']
        if item['staging']:
            continue
        if (not path or path.endswith('/')) and size == 0:
            empty.append(path)
            continue
        try:
            relative_path(path)
            folded = name_key(path)
            parts = path.split('/')
            parents = ['/'.join(parts[:index]) for index in range(1, len(parts))]
            if (folded in names or folded in directories or
                    any(name_key(parent) in names or directories.get(name_key(parent), parent) != parent for parent in parents)):
                raise LabError('DOWNLOAD_PATH_COLLISION')
            if not item['etag'] or size > MAX_FILE_BYTES:
                raise LabError('OBJECT_IDENTITY_UNAVAILABLE' if not item['etag'] else 'PRODUCTION_FILE_SIZE_LIMIT')
        except LabError as error:
            issues.append({'path': path, 'kind': 'file', 'state': 'FAIL', 'code': error.code})
            continue
        names.add(folded)
        directories.update((name_key(parent), parent) for parent in parents)
        row_id = str(uuid.uuid5(uuid.UUID(run_id), path))
        scenario = 'owner/1/transfer/' + row_id
        rows.append({'id': row_id, 'kind': 'remote', 'path': path, 'remotePath': path, 'expectedKey': prefix + path,
                     'scenarioId': scenario, 'operationId': operation_id(run_id, scenario, 'read'), 'sha256': None,
                     'sizeBytes': size, 'remoteIdentity': {key: item[key] for key in ('etag', 'version')}})
    target = {key: caps[key] for key in ('scopeId', 'provider', 'accountId', 'bucketName', 'prefix')} | {'campaignId': run_id}
    plan = {'schema': 'redown.owner-campaign/1', 'campaignId': run_id, 'target': target,
            'createdAt': stamp(), 'operationMode': 'download', 'verification': 'sha256',
            'selectionInventoryDigest': selection_digest, 'retainDownloads': args.retain_downloads,
            'expectedSelectionFiles': args.expect_files, 'inventory': rows, 'inventoryIssues': issues,
            'emptyDirectories': empty}
    plan['resolvedDigest'] = digest(plan)
    document(root / 'resolved-manifest.json', plan)
    return plan


def selection_campaign(args, root, *, started=None):
    started = time.monotonic() if started is None else started
    if args.resume_downloads:
        plan = load_plan(root)
        if not plan.get('selectionInventoryDigest'):
            raise LabError('READ_SELECTION_RECEIPT_REQUIRED')
        if args.expect_files is None:
            args.expect_files = plan['expectedSelectionFiles']
        if plan['retainDownloads']:
            args.retain_downloads = True
        run_id = plan['campaignId']
        previous = offline_campaign_status(root, plan)
        if previous.get('status') == 'PASS':
            return {**previous, 'receiptBundle': str(root)}
    else:
        plan = None
        run_id = str(uuid.uuid4())
        root = root / run_id
        root.mkdir(mode=0o700)
        if args.download_to:
            output = ordinary_directory(args.download_to) / ('redown-' + run_id)
            output.mkdir(mode=0o700)
            document(root / 'private-download-output.json', {'directory': str(output)})
    announce(f'Receipt bundle {root}')
    with claim(root / '.locks', 'window'), connect() as client:
        caps = client.describe()
        if caps['mode'] != 'read-only' or not (caps.get('campaign') or {}).get('readSelection'):
            raise LabError('LAB_READ_SELECTION_SCOPE_REQUIRED', {'receiptBundle': str(root)})
        if plan and any(caps[key] != plan['target'][key] for key in ('provider', 'accountId', 'bucketName', 'prefix')):
            raise LabError('CAMPAIGN_SCOPE_MISMATCH', {'receiptBundle': str(root)})
        if args.clear_cancel:
            (root / 'cancel.request').unlink(missing_ok=True)
        selection_digest, observed = discover_selection(args, client, caps, root, run_id)
        if plan:
            if selection_digest != plan['selectionInventoryDigest']:
                raise LabError('LAB_READ_INVENTORY_CHANGED', {'receiptBundle': str(root)})
        else:
            plan = freeze_selection(root, run_id, caps, selection_digest, observed, args)
        return run_window(args, client, client.describe(), root, plan, None, 'download', started)
