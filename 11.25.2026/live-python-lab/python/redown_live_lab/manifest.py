"""Versioned manifest parsing, deterministic resolution and budget preflight.

Duplicate JSON keys and hook-level semantic constraints complement the public
schema. The file format can express sizes and concurrency beyond this engine.
"""
import hashlib
import json
import math
import re
import shutil
from decimal import Decimal
from pathlib import Path

from .errors import LabError
from .fixtures import ASSET_SIZES, GENERATOR, MAX_GENERATED_BYTES, MIME, content_type, generate
from .inventory import digest_file, name_key, ordinary_directory, relative_path, source_path

SCHEMA = 'redown.live-lab.workload/1'
MAX_MANIFEST_BYTES = 64 * 1024**2
MAX_INT = 2**53 - 1
ID = re.compile(r'[A-Za-z0-9][A-Za-z0-9._-]{0,79}\Z')
HASH = re.compile(r'[0-9a-f]{64}\Z')
BUDGET_KEYS = ('files', 'totalBytes', 'trafficBytes', 'tempDiskBytes', 'providerRequests',
               'seconds', 'costUsd', 'inventoryEntries')
OPS = frozenset(('upload', 'download', 'metadata', 'list', 'copy', 'move', 'rename',
                 'delete', 'mkdir', 'search', 'preview', 'publicUrl', 'trueRemoteSave'))
OFFLINE_CAPABILITIES = {
    'limits': {'maxFileBytes': 8 * 1024**2, 'maxDiskBytes': 8 * 1024**2,
               'maxTrafficBytes': 640 * 1024**2, 'maxFiles': 250, 'maxProviderRequests': 8192,
               'maxOperations': 1500, 'concurrency': 1, 'uploadRequests': 256,
               'readRequests': 8, 'statRequests': 8, 'listRequests': 1, 'uploadTrafficFactor': 4,
               'chunkBytes': 128 * 1024, 'maxTransferSeconds': 90, 'maxRunSeconds': 3600},
    'operations': ['upload', 'download', 'metadata', 'list'],
    'evidenceClass': 'offline-capability-model',
}
# Conservative pay-as-you-go estimates (USD), with every modeled provider
# request charged as Class A. The live grant separately meters actual calls.
COST_PER_REQUEST = Decimal('0.000009')
COST_PER_BYTE_MONTH = Decimal('0.000000000015')


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, allow_nan=False,
                      separators=(',', ':')).encode('utf-8')


def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def unique_object(pairs):
    """Historical REDOWN manifest parsing contract."""
    value = {}
    for key, item in pairs:
        if key in value:
            raise LabError('DUPLICATE_JSON_KEY', key)
        value[key] = item
    return value


def _constant(_):
    raise LabError('INVALID_JSON_NUMBER')


def manifest_bytes(path):
    path = Path(path)
    if not path.is_file():
        raise LabError('MANIFEST_FILE_REQUIRED')
    with path.open('rb') as stream:
        raw = stream.read(MAX_MANIFEST_BYTES + 1)
    if len(raw) > MAX_MANIFEST_BYTES:
        raise LabError('MANIFEST_BYTE_LIMIT')
    return raw


def read_json(path):
    raw = manifest_bytes(path)
    try:
        return json.loads(raw.decode('utf-8-sig'), object_pairs_hook=unique_object, parse_constant=_constant)
    except (UnicodeError, ValueError, RecursionError):
        raise LabError('INVALID_MANIFEST_JSON') from None


def shape(value, required, optional=()):
    if not isinstance(value, dict) or not set(required) <= value.keys() or set(value) - set(required) - set(optional):
        raise LabError('INVALID_MANIFEST_FIELDS', {'required': list(required), 'optional': list(optional)})


def integer(value, field, minimum=0):
    if type(value) is not int or not minimum <= value <= MAX_INT:
        raise LabError('INVALID_MANIFEST_INTEGER', field)
    return value


def money(value):
    if type(value) not in (int, float) or not 0 <= value <= 1000000 or not math.isfinite(value):
        raise LabError('INVALID_COST_BUDGET')
    return Decimal(str(value))


def identifier(value, field):
    if not isinstance(value, str) or not ID.fullmatch(value):
        raise LabError('INVALID_MANIFEST_ID', field)
    return value


def distinct_id(value, seen, field):
    name = identifier(value, field)
    if name in seen:
        raise LabError('DUPLICATE_ID', name)
    seen.add(name)
    return name


def array(value, field, nonempty=True):
    if not isinstance(value, list) or nonempty and not value:
        raise LabError('INVALID_MANIFEST_ARRAY', field)
    return value


def sized(row, seed, instance):
    if 'sizeBytes' in row:
        return row['sizeBytes']
    low, high = row['sizeRange']['min'], row['sizeRange']['max']
    entropy = int(digest([GENERATOR, seed, instance, 'size']), 16)
    return low + entropy % (1 + high - low)


def validate(document):
    shape(document, ('schemaVersion', 'id', 'seed', 'generator', 'local', 'targets', 'fixtures', 'phases', 'budget'),
          ('notes', 'emptyFolders'))
    if document['schemaVersion'] != SCHEMA:
        raise LabError('MANIFEST_VERSION_UNSUPPORTED')
    identifier(document['id'], 'workload')
    integer(document['seed'], 'seed')
    if document['generator'] != GENERATOR:
        raise LabError('GENERATOR_VERSION_UNSUPPORTED')
    shape(document['local'], ('sourceRoot', 'destinationRoot'))
    relative_path(document['local']['sourceRoot'])
    destination = relative_path(document['local']['destinationRoot'])
    if name_key(destination.split('/')[0]) in {
        'manifest.json', 'resolved-manifest.json', 'source-inventory.json', 'run.json',
        'summary.json', 'summary.txt', 'operations.ndjson', 'cancel.request', 'recovery',
    }:
        raise LabError('LOCAL_ARTIFACT_PATH_COLLISION', destination)
    if not isinstance(document['targets'], dict) or not document['targets']:
        raise LabError('INVALID_REMOTE_ALIASES')
    for alias, path in document['targets'].items():
        identifier(alias, 'target')
        relative_path(path, empty=True)
    if 'notes' in document and not isinstance(document['notes'], str):
        raise LabError('INVALID_MANIFEST_NOTES')
    empty = set()
    for folder in array(document.get('emptyFolders', []), 'emptyFolders', False):
        key = name_key(relative_path(folder))
        if key in empty:
            raise LabError('CORPUS_PATH_COLLISION', folder)
        empty.add(key)
    shape(document['budget'], BUDGET_KEYS)
    for field in BUDGET_KEYS:
        (money(document['budget'][field]) if field == 'costUsd' else
         integer(document['budget'][field], field, 1 if field in ('files', 'seconds', 'inventoryEntries') else 0))
    groups = set()
    for row in array(document['fixtures'], 'fixtures'):
        shape(row, ('id', 'kind', 'path', 'format', 'target'),
              ('count', 'sizeBytes', 'sizeRange', 'sha256', 'formatHint'))
        distinct_id(row['id'], groups, 'fixture')
        if not isinstance(row['target'], str) or row['target'] not in document['targets']:
            raise LabError('UNKNOWN_REMOTE_ALIAS', row['id'])
        if row['kind'] not in ('generated', 'corpus') or not isinstance(row['format'], str) or row['format'] not in {*MIME, 'unknown'}:
            raise LabError('INVALID_FIXTURE_KIND_OR_FORMAT', row['id'])
        relative_path(row['path'])
        count = integer(row.get('count', 1), 'count', 1)
        if row['kind'] == 'corpus':
            if (count != 1 or not isinstance(row.get('sha256'), str) or not HASH.fullmatch(row['sha256'])
                    or 'sizeBytes' not in row or '{index}' in row['path']):
                raise LabError('CORPUS_IDENTITY_REQUIRED', row['id'])
        elif (row['format'] == 'unknown' or 'sha256' in row or 'formatHint' in row
              or count > 1 and '{index}' not in row['path']):
            raise LabError('INVALID_GENERATED_FIXTURE', row['id'])
        if 'formatHint' in row and not isinstance(row['formatHint'], str):
            raise LabError('INVALID_FORMAT_HINT', row['id'])
        if ('sizeBytes' in row) == ('sizeRange' in row):
            raise LabError('EXACT_OR_RANGE_SIZE_REQUIRED', row['id'])
        if 'sizeBytes' in row:
            integer(row['sizeBytes'], 'sizeBytes')
        else:
            shape(row['sizeRange'], ('min', 'max'))
            minimum = integer(row['sizeRange']['min'], 'sizeRange.min')
            integer(row['sizeRange']['max'], 'sizeRange.max', minimum)
    phases = set()
    for phase in array(document['phases'], 'phases'):
        shape(phase, ('id', 'dependsOn', 'direction', 'concurrency', 'cycles', 'timeoutSeconds',
                      'transferSeconds', 'onFailure', 'recovery', 'steps'), ('fault', 'isolateCycles'))
        dependencies = array(phase['dependsOn'], 'dependsOn', False)
        if any(not isinstance(item, str) or item not in phases for item in dependencies) or len(set(dependencies)) != len(dependencies):
            raise LabError('INVALID_PHASE_DEPENDENCY', phase['id'])
        if name_key(phase['id']) in {name_key(id_) for id_ in phases}:
            raise LabError('DUPLICATE_ID', phase['id'])
        distinct_id(phase['id'], phases, 'phase')
        relative_path(phase['id'])
        for field in ('concurrency', 'cycles', 'timeoutSeconds', 'transferSeconds'):
            integer(phase[field], field, 1)
        if (phase['direction'] not in ('upload', 'download', 'bidirectional', 'control')
                or phase['onFailure'] not in ('stop', 'continue')
                or phase['recovery'] not in ('read-only', 'none')
                or not isinstance(phase.get('fault', 'none'), str)
                or type(phase.get('isolateCycles', False)) is not bool):
            raise LabError('INVALID_PHASE_POLICY', phase['id'])
        steps = set()
        directions = set()
        for step in array(phase['steps'], 'steps'):
            shape(step, ('id', 'operation', 'fixtures', 'verify'),
                  ('directory', 'retain', 'expect', 'folder', 'maxPages', 'isolateCycles'))
            if name_key(step['id']) in {name_key(id_) for id_ in steps}:
                raise LabError('DUPLICATE_ID', step['id'])
            distinct_id(step['id'], steps, 'step')
            relative_path(step['id'])
            operation = step['operation']
            if not isinstance(operation, str) or operation not in OPS:
                raise LabError('UNKNOWN_OPERATION', step['id'])
            if operation in ('upload', 'download'):
                directions.add(operation)
            ids = array(step['fixtures'], 'step.fixtures')
            if (any(not isinstance(value, str) or value != '*' and value not in groups for value in ids)
                    or len(set(ids)) != len(ids) or '*' in ids and len(ids) != 1):
                raise LabError('INVALID_SCENARIO_FIXTURES', step['id'])
            relative_path(step.get('directory', ''), empty=True)
            if type(step.get('isolateCycles', False)) is not bool:
                raise LabError('INVALID_CYCLE_POLICY', step['id'])
            if type(step.get('retain', False)) is not bool or ('retain' in step and operation not in ('upload', 'download')):
                raise LabError('INVALID_RETAIN_POLICY', step['id'])
            if step['verify'] != {'upload': 'sha256', 'download': 'sha256', 'metadata': 'identity',
                                  'list': 'contains'}.get(operation, 'provider'):
                raise LabError('INVALID_VERIFICATION_POLICY', step['id'])
            if step.get('expect', 'PASS') not in (('PASS', 'CONFLICT') if operation == 'upload' else ('PASS',)):
                raise LabError('INVALID_EXPECTED_OUTCOME', step['id'])
            if operation == 'list':
                relative_path(step.get('folder', ''), empty=True)
                integer(step.get('maxPages', 1), 'maxPages', 1)
            elif 'folder' in step or 'maxPages' in step:
                raise LabError('INVALID_LIST_POLICY', step['id'])
        actual = 'bidirectional' if len(directions) > 1 else next(iter(directions), 'control')
        if phase['direction'] != actual:
            raise LabError('PHASE_DIRECTION_MISMATCH', phase['id'])
    return document


def build_plan(document, caps=None, *, source=None, runs=None, approved_cost=None):
    document = validate(document)
    caps = caps or OFFLINE_CAPABILITIES
    limits = caps['limits']
    budget = document['budget']
    blockers = []
    fixtures = document['fixtures']
    groups = {row['id']: row for row in fixtures}
    count = sum(row.get('count', 1) for row in fixtures)
    if count > budget['files'] or count > limits['maxFiles']:
        blockers.append({'code': 'FILE_BUDGET_OR_CAPABILITY', 'requested': count,
                         'available': min(budget['files'], limits['maxFiles'])})
    sizes = {}
    total_estimate = count > limits['maxFiles']
    for row in fixtures:
        n = row.get('count', 1)
        if total_estimate:
            maximum = row['sizeBytes'] if 'sizeBytes' in row else row['sizeRange']['max']
            sizes[row['id']] = (maximum, maximum * n)
        else:
            amounts = [sized(row, document['seed'], row['id'] if n == 1 else f'{row["id"]}#{index}')
                       for index in range(1, n + 1)]
            sizes[row['id']] = (max(amounts), sum(amounts))
    max_file = max(value[0] for value in sizes.values())
    for row in fixtures:
        maximum, total = sizes[row['id']]
        if row['kind'] != 'generated':
            continue
        asset_size = ASSET_SIZES.get(row['format'])
        if maximum > MAX_GENERATED_BYTES or asset_size is not None and (maximum != asset_size or total != asset_size * row.get('count', 1)):
            blockers.append({'code': 'GENERATOR_SIZE_UNSUPPORTED', 'fixture': row['id'],
                             'format': row['format'], 'requested': maximum, 'available': asset_size or MAX_GENERATED_BYTES})
    if max_file > limits['maxFileBytes']:
        blockers.append({'code': 'FILE_SIZE_UNSUPPORTED', 'requested': max_file, 'available': limits['maxFileBytes']})
    if max_file > limits['maxDiskBytes']:
        blockers.append({'code': 'EXTENSION_SPOOL_CAPABILITY', 'requested': max_file, 'available': limits['maxDiskBytes']})
    if budget['seconds'] > limits['maxRunSeconds']:
        blockers.append({'code': 'RUN_DURATION_UNSUPPORTED', 'requested': budget['seconds'], 'available': limits['maxRunSeconds']})
    estimated = {'files': 0, 'totalBytes': 0, 'trafficBytes': 0, 'providerRequests': 0,
                 'operations': 0, 'copyBytes': 0, 'storageBytes': 0, 'diskBytes': max_file, 'plannedDeletes': 0}
    estimated['totalBytes'] = sum(value[1] for value in sizes.values())
    for phase in document['phases']:
        if phase['concurrency'] > limits['concurrency']:
            blockers.append({'code': 'CONCURRENCY_UNSUPPORTED', 'phase': phase['id'],
                             'requested': phase['concurrency'], 'available': limits['concurrency']})
        if phase['transferSeconds'] > limits['maxTransferSeconds']:
            blockers.append({'code': 'TRANSFER_TIMEOUT_UNSUPPORTED', 'phase': phase['id']})
        if phase.get('fault', 'none') != 'none':
            blockers.append({'code': 'FAILURE_INJECTION_UNSUPPORTED', 'phase': phase['id']})
        for step in phase['steps']:
            op = step['operation']
            if op not in caps['operations']:
                blockers.append({'code': 'OPERATION_UNSUPPORTED', 'phase': phase['id'], 'operation': op})
            selected = fixtures if step['fixtures'] == ['*'] else [groups[id_] for id_ in step['fixtures']]
            n = sum(row.get('count', 1) for row in selected) * phase['cycles']
            size = sum(sizes[row['id']][1] for row in selected) * phase['cycles']
            if op == 'upload':
                estimated['files'] += n
                estimated['operations'] += 2 * n
                estimated['trafficBytes'] += (limits['uploadTrafficFactor'] + 1) * size
                estimated['providerRequests'] += (limits['uploadRequests'] + limits['readRequests']) * n
                if step.get('expect', 'PASS') != 'CONFLICT':
                    estimated['storageBytes'] += size
            elif op == 'download':
                estimated['operations'] += n
                estimated['trafficBytes'] += size
                estimated['providerRequests'] += limits['readRequests'] * n
            elif op == 'metadata':
                estimated['operations'] += n
                estimated['providerRequests'] += limits['statRequests'] * n
            elif op == 'list':
                pages = step.get('maxPages', 1) * phase['cycles']
                estimated['operations'] += pages
                estimated['providerRequests'] += limits['listRequests'] * pages
            elif op == 'delete':
                # A roadmap reservation for an exact conditional cleanup and observation.
                # Discovery still blocks delete until the bridge can enforce it.
                estimated['operations'] += n
                estimated['providerRequests'] += 16 * n
                estimated['plannedDeletes'] += n
            if step.get('retain', False):
                estimated['copyBytes'] += size
    # Pricing intentionally ignores any free tier. Higher quotes can be bound
    # by lowering the approved amount before execution. TTL does not delete objects.
    estimate_cost = estimated['providerRequests'] * COST_PER_REQUEST + estimated['storageBytes'] * COST_PER_BYTE_MONTH
    if estimate_cost > money(budget['costUsd']) or approved_cost is not None and estimate_cost > approved_cost:
        blockers.append({'code': 'COST_BUDGET_EXCEEDED', 'estimateUsd': str(estimate_cost)})
    estimated['localEvidenceBytes'] = 131072 + count * 8192 + estimated['operations'] * 16384
    local_disk = estimated['copyBytes'] + estimated['localEvidenceBytes']
    disk_total = max_file + local_disk
    estimated['tempDiskBytes'] = disk_total
    for field, requested, available in (
        ('totalBytes', estimated['totalBytes'], budget['totalBytes']), ('files', estimated['files'], budget['files']),
        ('trafficBytes', estimated['trafficBytes'], min(budget['trafficBytes'], limits['maxTrafficBytes'])),
        ('providerRequests', estimated['providerRequests'], min(budget['providerRequests'], limits['maxProviderRequests'])),
        ('tempDiskBytes', disk_total, budget['tempDiskBytes']),
        ('operations', estimated['operations'], limits['maxOperations']),
    ):
        if requested > available:
            blockers.append({'code': 'BUDGET_EXCEEDED', 'field': field, 'requested': requested, 'available': available})
    headroom = caps.get('headroom', {})
    for field in ('files', 'diskBytes', 'trafficBytes', 'providerRequests', 'operations'):
        if field in headroom and estimated[field] > headroom[field]:
            blockers.append({'code': 'SESSION_BUDGET_UNAVAILABLE', 'field': field,
                             'requested': estimated[field], 'available': headroom[field]})
    if headroom.get('seconds', 1) < 1:
        blockers.append({'code': 'SESSION_TIME_UNAVAILABLE'})
    if runs is not None and shutil.disk_usage(runs).free < local_disk:
        blockers.append({'code': 'LOCAL_DISK_UNAVAILABLE', 'requested': local_disk})
    result = {'status': 'BLOCKED' if blockers else 'READY', 'manifestDigest': digest(document),
              'workloadId': document['id'], 'generator': GENERATOR, 'estimate': estimated,
              'estimatedCostUsd': str(estimate_cost), 'blockers': blockers,
              'sizeCalculation': 'range upper bounds' if total_estimate else 'resolved sizes',
              'effectiveBudget': {'files': estimated['files'], 'diskBytes': max_file,
                                  'trafficBytes': estimated['trafficBytes'],
                                  'providerRequests': estimated['providerRequests'],
                                  'operations': estimated['operations'],
                                  'seconds': min(budget['seconds'], headroom.get('seconds', budget['seconds']))}}
    if blockers:
        return result
    rows, schedule = resolve(document, source=source, prefix_length=len(caps.get('prefix', '.redown-python-lab/' + 'a' * 36 + '/').encode()) + 37)
    result.update(inventory=rows, schedule=schedule)
    return result


def resolve(document, *, source, prefix_length):
    root = None
    groups, results, used_ids = {}, [], set()
    for row in document['fixtures']:
        group = []
        for index in range(1, row.get('count', 1) + 1):
            id_ = row['id'] if row.get('count', 1) == 1 else f'{row["id"]}#{index}'
            if id_ in used_ids:
                raise LabError('DUPLICATE_FIXTURE_INSTANCE', id_)
            used_ids.add(id_)
            path = relative_path(row['path'].replace('{index}', str(index)))
            size = sized(row, document['seed'], id_)
            observation = {**row, 'id': id_, 'path': path, 'sizeBytes': size,
                           'validity': 'GENERATED_FORMAT' if row['kind'] == 'generated' else 'NOT_TESTED',
                           'contentType': content_type(row['format'])}
            if row['kind'] == 'corpus':
                if source is None:
                    raise LabError('CORPUS_SOURCE_REQUIRED')
                if root is None:
                    root = ordinary_directory(source)
                value, _ = digest_file(source_path(root, path), size)
                if value != row['sha256']:
                    raise LabError('SOURCE_CHANGED', path)
            else:
                value = hashlib.sha256(generate(row['format'], size, document['seed'], id_)).hexdigest()
            observation['sha256'] = value
            group.append(observation)
            results.append(observation)
        groups[row['id']] = group
    declared = {}
    spelling = {}
    schedule = []
    for phase in document['phases']:
        for cycle in range(1, phase['cycles'] + 1):
            for step in phase['steps']:
                rows = results if step['fixtures'] == ['*'] else [item for id_ in step['fixtures'] for item in groups[id_]]
                rows_with_paths = []
                for item in rows:
                    dest = '/'.join(part for part in (step.get('directory'), f'cycle-{cycle}' if step.get('isolateCycles', phase.get('isolateCycles')) else '',
                                                     document['targets'][item['target']], item['path']) if part)
                    relative_path(dest)
                    # Final and temporary keys share the same production provider limit.
                    if (prefix_length + len(dest.encode()) > 1024
                            or prefix_length + 21 + 37 + len(dest.encode().split(b'/')[-1]) > 1024):
                        raise LabError('REMOTE_KEY_TOO_LONG', dest)
                    path_parts = dest.split('/')
                    for index in range(1, len(path_parts) + 1):
                        component = '/'.join(path_parts[:index])
                        node_kind = 'file' if index == len(path_parts) else 'directory'
                        folded = name_key(component)
                        previous = spelling.setdefault(folded, (component, node_kind))
                        if previous != (component, node_kind):
                            raise LabError('REMOTE_PATH_COLLISION', [previous[0], component])
                    op = step['operation']
                    if op == 'upload':
                        conflict = step.get('expect') == 'CONFLICT'
                        if conflict != (dest in declared):
                            raise LabError('UPLOAD_PATH_OR_EXPECTATION_CONFLICT', dest)
                        if not conflict:
                            declared[dest] = item
                    elif op in ('download', 'metadata', 'list') and dest not in declared:
                        raise LabError('PRESEEDED_FIXTURE_REQUIRED', dest)
                    observed = {**item, 'remotePath': dest}
                    if op == 'upload' and step.get('expect') == 'CONFLICT':
                        original = declared[dest]
                        observed['verifiedExisting'] = {'sizeBytes': original['sizeBytes'], 'sha256': original['sha256']}
                    rows_with_paths.append(observed)
                scenario = f'{phase["id"]}/{cycle}/{step["id"]}'
                if step['operation'] == 'list':
                    folder = step.get('folder', '')
                    folder_prefix = folder + '/' if folder else ''
                    if not all(row['remotePath'].startswith(folder_prefix) for row in rows_with_paths):
                        raise LabError('LIST_EXPECTATION_OUTSIDE_FOLDER', scenario)
                    schedule.append({'scenarioId': scenario, 'phase': phase['id'], 'cycle': cycle,
                                     'operation': 'list', 'step': step, 'fixtures': rows_with_paths})
                else:
                    for item in rows_with_paths:
                        schedule.append({'scenarioId': f'{scenario}/{item["id"]}', 'phase': phase['id'],
                                         'cycle': cycle, 'operation': step['operation'], 'step': step, 'fixture': item})
    return results, schedule
