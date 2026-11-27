"""Compare frozen expected keys, production outcomes, and independent scoped observations."""
from collections import Counter, defaultdict
import time

from .errors import LabError
from .evidence import Journal
from .manifest import digest, read_json


TRANSIENT_LIST_CODES = {'HTTP_429', 'HTTP_500', 'HTTP_502', 'HTTP_503', 'HTTP_504', 'NETWORK_ERROR'}


def scan(client, journal, prefix, stop):
    cursor, seen = '', set()
    pages = 0
    while True:
        for attempt in range(3):
            stop()
            try:
                page = client.query('auditList', cursor=cursor)
                break
            except LabError as error:
                if error.code not in TRANSIENT_LIST_CODES or attempt == 2:
                    raise
                journal.append('auditRetry', code=error.code)
                time.sleep(0.5 * (2 ** attempt))
        entries, next_cursor, calls = page.get('entries'), page.get('cursor'), page.get('providerCalls')
        if (not isinstance(entries, list) or not isinstance(next_cursor, str) or
                type(calls) is not int or calls not in (0, 1) or next_cursor and next_cursor in seen):
            raise LabError('AUDIT_PAGINATION_INVALID')
        for item in entries:
            key, size = item.get('key'), item.get('size')
            if not isinstance(key, str) or not key.startswith(prefix) or type(size) is not int or size < 0:
                raise LabError('AUDIT_PROVIDER_RESPONSE_INVALID')
            if item.get('staging') != key[len(prefix):].startswith('.redown-beta-uploads/'):
                raise LabError('AUDIT_PROVIDER_RESPONSE_INVALID')
        pages += 1
        journal.append('auditPage', page=pages, providerCalls=calls, entries=entries, exhausted=not next_cursor)
        if not next_cursor:
            return page.get('inventoryDigest')
        seen.add(next_cursor)
        cursor = next_cursor


def project_audit(plan, outcomes, events, *, complete, reason=None):
    prefix = plan['target']['prefix']
    expected = {row['expectedKey']: row for row in plan['inventory']}
    observed, staging = defaultdict(list), []
    pages = provider_calls = 0
    for event in events:
        if event['event'] != 'auditPage':
            continue
        pages += 1
        provider_calls += event['providerCalls']
        for item in event['entries']:
            if item['staging']:
                staging.append(item)
            else:
                observed[item['key']].append(item)
    published = Counter()
    renamed, result, conflicting_publications = [], [], []
    for key, row in expected.items():
        operation = row['operationId']
        production = outcomes.get(operation, {})
        receipt = production.get('receipt') or {}
        matches = observed.get(key, [])
        actual = matches[0] if len(matches) == 1 else None
        confirmed = (production.get('productionConfirmed') is True and receipt.get('operationId') == operation and
                     receipt.get('key') == key and receipt.get('size') == row['sizeBytes'] and
                     bool(receipt.get('etag')) and bool(receipt.get('version')))
        if receipt.get('key'):
            published[receipt['key']] += 1
            if receipt['key'] != key:
                renamed.append({'operationId': operation, 'expectedKey': key, 'publishedKey': receipt['key']})
        if production.get('conflictingPublicationEvidence'):
            state = 'DUPLICATE_PUBLICATION_EVIDENCE'
            conflicting_publications.append(key)
        elif len(matches) > 1:
            state = 'DUPLICATE_LISTING_KEY'
        elif actual is None:
            state = 'MISSING' if complete else 'UNOBSERVED'
        elif actual['size'] != row['sizeBytes']:
            state = 'SIZE_CHANGED'
        elif not confirmed:
            state = 'PUBLICATION_UNCERTAIN'
        elif ((actual.get('etag') and actual['etag'] != receipt['etag']) or
              (actual.get('version') and actual['version'] != receipt['version'])):
            state = 'IDENTITY_CHANGED'
        elif not actual.get('etag'):
            state = 'IDENTITY_UNAVAILABLE'
        else:
            state = 'MATCHED'
        result.append({'operationId': operation, 'sourceRelativePath': row['path'], 'expectedKey': key,
                       'expectedBytes': row['sizeBytes'], 'productionConfirmed': confirmed,
                       'publicationReceipt': receipt or None, 'observed': actual, 'state': state,
                       'publicationState': production.get('state', 'PENDING'),
                       'independentContentSha256Verified': bool(production.get('independentSha256Verified'))})
    duplicates = sorted(key for key, rows in observed.items() if len(rows) > 1)
    duplicate_commits = sorted({key for key, count in published.items() if count > 1} | set(conflicting_publications))
    unexpected = sorted(set(observed) - set(expected))
    counts = Counter(row['state'] for row in result)
    inventory_issues = len(plan['inventoryIssues'])
    expected_count = plan.get('expectedSelectionFiles')
    selection_matches = expected_count is None or expected_count == len(expected)
    location_reasons = [code for present, code in (
        (not complete, reason or 'SCOPED_LISTING_INCOMPLETE'),
        (counts.get('MATCHED', 0) != len(expected), 'FROZEN_KEYS_NOT_ALL_MATCHED'),
        (duplicates, 'DUPLICATE_LISTING_KEYS'), (duplicate_commits, 'DUPLICATE_PUBLICATION_EVIDENCE'),
        (renamed, 'PUBLICATION_LOCATION_MISMATCH'), (unexpected, 'UNEXPECTED_KEYS'),
        (staging, 'STAGING_OBJECTS_REMAIN'),
    ) if present]
    workload_reasons = [code for present, code in (
        (inventory_issues, 'INVENTORY_HAS_ERRORS'), (not selection_matches, 'EXPECTED_FILE_COUNT_MISMATCH'),
    ) if present]
    location_status = 'INCOMPLETE' if not complete else 'FAIL' if location_reasons else 'PASS'
    # Preserve the original combined verdict for existing readers and receipts.
    state = 'AUDIT_INCOMPLETE' if not complete else 'FAIL' if location_reasons or workload_reasons else 'PASS'
    return {'schema': 'redown.location-audit/1', 'state': state, 'reason': reason, 'scope': plan['target'],
            'locationVerdict': {'status': location_status, 'reasonCodes': location_reasons},
            'combinedReasonCodes': location_reasons + workload_reasons,
            'manifestDigest': plan['resolvedDigest'], 'completeScopedListing': complete,
            'observation': 'Independent R2 Object API listing; pages are not an atomic snapshot',
            'independentContentHashPerformedByAudit': False, 'pages': pages, 'successfulProviderPageCalls': provider_calls,
            'expectedCount': len(expected), 'expectedSelectionFiles': expected_count,
            'observedUniqueCount': len(observed), 'matchedCount': counts.get('MATCHED', 0), 'inventoryIssueCount': inventory_issues,
            'expectedBytes': sum(row['sizeBytes'] for row in expected.values()),
            'observedBytes': sum(rows[0]['size'] for rows in observed.values() if len(rows) == 1),
            'fileStates': dict(counts), 'duplicateListingKeys': duplicates, 'duplicatePublicationKeys': duplicate_commits,
            'unexpectedKeys': unexpected, 'renamedOrMislocatedPublications': renamed, 'stagingLeftovers': staging,
            'stagingBytes': sum(row['size'] for row in staging), 'files': result,
            'observedInventory': [item for key in sorted(observed) for item in observed[key]]}


def load_plan(root):
    plan = read_json(root / 'resolved-manifest.json')
    recorded = plan.get('resolvedDigest')
    if plan.get('schema') != 'redown.owner-campaign/1' or recorded != digest(
            {key: value for key, value in plan.items() if key != 'resolvedDigest'}):
        raise LabError('FROZEN_MANIFEST_DIGEST_MISMATCH')
    rows = plan['inventory']
    if (len({row['expectedKey'] for row in rows}) != len(rows) or
            len({row['operationId'] for row in rows}) != len(rows) or
            any(row['expectedKey'] != plan['target']['prefix'] + row['remotePath'] for row in rows)):
        raise LabError('CAMPAIGN_EXPECTED_KEYS_INVALID')
    return plan


def check(root, audit_path):
    """Offline validation replays the audit and validates the frozen key set and evidence."""
    from .owner_campaign import publication_outcomes

    plan = load_plan(root)
    audit = read_json(audit_path)
    journal = Journal(audit_path.parent, filename='audit-observations.ndjson')
    page_count, completed = 0, False
    for page in journal.rows():
        if page['event'] != 'auditPage':
            continue
        page_count += 1
        if completed or page['page'] != page_count:
            raise LabError('AUDIT_OBSERVATION_SEQUENCE_INVALID')
        completed = page['exhausted']
    outcomes = publication_outcomes(plan, Journal(root).rows(), through_window=audit['windowId'])
    computed = project_audit(plan, outcomes, journal.rows(), complete=completed, reason=audit['reason'])
    additive = {'locationVerdict', 'combinedReasonCodes'}
    differences = [field for field, value in computed.items() if value != audit.get(field) and
                   (field not in additive or field in audit)]
    if differences:
        raise LabError('AUDIT_RECEIPT_MISMATCH', differences)
    return {'status': audit['state'], 'manifestDigest': plan['resolvedDigest'],
            'locationVerdict': computed['locationVerdict'], 'combinedReasonCodes': computed['combinedReasonCodes'],
            'expectedFiles': audit['expectedCount'], 'observedUniqueFiles': audit['observedUniqueCount'],
            'matchedFiles': audit['matchedCount'], 'expectedBytes': audit['expectedBytes'],
            'observedBytes': audit['observedBytes'], 'fileStates': audit['fileStates'],
            'independentContentHashPerformedByAudit': False}
