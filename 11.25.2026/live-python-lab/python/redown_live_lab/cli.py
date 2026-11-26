"""The stable Windows CMD interface for the REDOWN Python Laboratory."""
import argparse
import json
import os
import sys
import time
import uuid
from pathlib import Path

from . import PROTOCOL, __version__
from .errors import LabError
from .evidence import compare, document, exclusive, load_run, projection, stamp
from .fixtures import GENERATOR
from .install_host import install
from .inventory import inventory, ordinary_directory, relative_path
from .manifest import OFFLINE_CAPABILITIES, SCHEMA, build_plan, money, read_json, validate
from .runner import reconcile, run
from .transport import ExtensionClient, connect

DEFAULT_WORKSPACE = 'lab-local'
MIB = 1024**2
EXIT_CODES = {'PASS': 0, 'READY': 0, 'REGISTERED': 0, 'PAIRED': 0, 'NOT_NEEDED': 0,
              'CANCELLATION_REQUESTED': 0, 'FAIL': 1, 'BLOCKED': 2, 'UNCERTAIN': 3, 'CANCELLED': 130}


def output(data):
    print(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False), flush=True)


def workspace():
    root = Path.cwd() / DEFAULT_WORKSPACE
    root.mkdir(mode=0o700, exist_ok=True)
    ordinary_directory(root)
    paths = {name: root / name for name in ('input', 'manifests', 'runs')}
    for path in paths.values():
        path.mkdir(mode=0o700, exist_ok=True)
        ordinary_directory(path)
    return paths


def under(base, path, *, create=False):
    if path is None:
        return base
    value = Path(path)
    candidate = Path(os.path.abspath(value if value.is_absolute() or value.is_relative_to(Path(DEFAULT_WORKSPACE))
                                        else base / value))
    if not candidate.is_relative_to(base):
        raise LabError('PRIVATE_WORKSPACE_REQUIRED', str(base))
    if create:
        current = base
        for part in candidate.relative_to(base).parts:
            relative_path(part)
            current /= part
            current.mkdir(mode=0o700, exist_ok=True)
            ordinary_directory(current)
    return candidate


def files_needed(args, doc, paths):
    if args.input:
        return ordinary_directory(args.input)
    if any(row['kind'] == 'corpus' for row in doc['fixtures']):
        return ordinary_directory(Path.cwd() / DEFAULT_WORKSPACE / doc['local']['sourceRoot'])
    return paths['input']


def execution_options(parser, *, manifest=True):
    if manifest:
        parser.add_argument('--manifest', required=True, help='Path to a versioned JSON manifest.')
    parser.add_argument('--input', help='Explicit source directory when using a local corpus.')
    parser.add_argument('--output', help='Optional group directory inside lab-local/runs.')
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--dry-run', action='store_true', help='Plan only. Default behavior.')
    modes.add_argument('--session', action='store_true', help='Check a paired session without submitting writes.')
    modes.add_argument('--live', action='store_true', help='Approve this run’s scoped Cloudflare QA writes.')
    parser.add_argument('--plan-receipt', help='Optional new JSON file inside lab-local/runs for preflight evidence.')
    parser.add_argument('--approve-cost-usd', type=float, help='Maximum modeled run cost in USD (required with --live).')


def parse(argv):
    parser = argparse.ArgumentParser(prog='redown-lab', description='REDOWN scoped manifest-driven Python Laboratory')
    parser.add_argument('--version', action='version', version=f'%(prog)s {__version__} (wire {PROTOCOL})')
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('init', help='Create private workspace folders and print absolute paths.')
    register = commands.add_parser('install-host', help='Register the native helper for the preserved REDOWN extension ID.')
    register.add_argument('--extension-id', required=True)
    pair = commands.add_parser('pair', help='Use the one-time code copied from REDOWN Settings.')
    pair.add_argument('--code', required=True)
    doctor = commands.add_parser('doctor', help='Inspect offline or authenticated session capabilities without cloud mutations.')
    doctor.add_argument('--session', action='store_true')
    plan = commands.add_parser('validate', aliases=['plan'], help='Validate a workload and do a read-only preflight.')
    execution_options(plan)
    execute = commands.add_parser('run', help='Plan or execute a manifest.')
    execution_options(execute)
    corpus = commands.add_parser('corpus', help='Inventory dropped files, save a manifest, then plan or execute it.')
    execution_options(corpus, manifest=False)
    corpus.add_argument('--manifest', help='Optional new manifest filename inside lab-local/manifests.')
    corpus.add_argument('--operations', choices=('upload', 'round-trip'), default='round-trip',
                        help='Upload alone or retain an independently verified copy (default).')
    corpus.add_argument('--destination', default='files', help='Relative destination under the exclusive QA run prefix.')
    corpus.add_argument('--concurrency', type=int, default=1)
    corpus.add_argument('--max-files', type=int, default=30)
    corpus.add_argument('--max-file-bytes', type=int, default=8 * MIB)
    corpus.add_argument('--max-total-bytes', type=int, default=64 * MIB)
    corpus.add_argument('--max-entries', type=int, default=10000)
    corpus.add_argument('--traffic-bytes', type=int, default=320 * MIB)
    corpus.add_argument('--temp-disk-bytes', type=int, default=72 * MIB)
    corpus.add_argument('--provider-requests', type=int, default=8192)
    corpus.add_argument('--seconds', type=int, default=900)
    corpus.add_argument('--transfer-seconds', type=int, default=60)
    corpus.add_argument('--cost-budget-usd', type=float, default=0.10)
    for name, help_ in (('status', 'Read incremental progress and outcomes from a run folder.'),
                        ('report', 'Read final run summary and receipt locations.'),
                        ('cancel', 'Request cooperative cancellation of a local run.')):
        command = commands.add_parser(name, help=help_)
        command.add_argument('--run', required=True)
    recovery = commands.add_parser('reconcile', aliases=['resume'],
                                   help='Observe uncertain uploads using the original, frozen scope and no replay.')
    recovery.add_argument('--run', required=True)
    recovery.add_argument('--expected-digest', help='Optional resolved digest from the original receipt.')
    comparison = commands.add_parser('compare', help='Compare stable scenarios and explain changed workloads and environments.')
    comparison.add_argument('--before', required=True)
    comparison.add_argument('--after', required=True)
    comparison.add_argument('--output', help='Optional new JSON filename inside lab-local/runs.')
    result = parser.parse_args(argv)
    if result.command in ('validate', 'plan') and result.live:
        parser.error('validate uses --dry-run or --session.')
    if getattr(result, 'live', False) and result.approve_cost_usd is None:
        parser.error('--live requires --approve-cost-usd.')
    return result


def corpus_manifest(args, paths):
    source = ordinary_directory(args.input or paths['input'])
    if min(args.max_files, args.max_entries, args.seconds, args.concurrency, args.transfer_seconds) < 1 or min(
            args.max_file_bytes, args.max_total_bytes, args.traffic_bytes, args.temp_disk_bytes,
            args.provider_requests) < 0:
        raise LabError('INVALID_CORPUS_BUDGET')
    relative_path(args.destination, empty=True)
    clock = 0

    def progress(row):
        nonlocal clock
        now = time.monotonic()
        if now - clock >= 1:
            print(f'Inventory: {row["files"]} files, {row["bytes"]} bytes hashed', file=sys.stderr, flush=True)
            clock = now

    files, empty = inventory(source, max_files=args.max_files, max_file_bytes=args.max_file_bytes,
                             max_total_bytes=args.max_total_bytes, max_entries=args.max_entries,
                             seconds=args.seconds, excluded=(paths['manifests'], paths['runs']), progress=progress)
    if not files:
        raise LabError('CORPUS_HAS_NO_FILES', {'input': str(source), 'emptyFolders': empty})
    doc = validate({
        'schemaVersion': SCHEMA, 'id': 'owner-corpus', 'seed': 20261125, 'generator': GENERATOR,
        'local': {'sourceRoot': 'input', 'destinationRoot': 'downloads'}, 'targets': {'qa': args.destination},
        'fixtures': files, 'emptyFolders': empty,
        'phases': [{'id': 'corpus', 'dependsOn': [], 'direction': 'upload', 'concurrency': args.concurrency,
                    'cycles': 1, 'timeoutSeconds': args.seconds, 'transferSeconds': args.transfer_seconds,
                    'onFailure': 'stop', 'recovery': 'read-only', 'steps': [
                        {'id': 'verify', 'operation': 'upload', 'fixtures': ['*'], 'verify': 'sha256',
                         'retain': args.operations == 'round-trip'}]}],
        'budget': {'files': args.max_files, 'totalBytes': args.max_total_bytes, 'trafficBytes': args.traffic_bytes,
                   'tempDiskBytes': args.temp_disk_bytes, 'providerRequests': args.provider_requests,
                   'seconds': args.seconds, 'costUsd': args.cost_budget_usd, 'inventoryEntries': args.max_entries},
    })
    target = under(paths['manifests'], args.manifest or f'corpus-{uuid.uuid4()}.json')
    ordinary_directory(target.parent)
    if target.suffix.lower() != '.json':
        raise LabError('MANIFEST_JSON_EXTENSION_REQUIRED')
    document(target, doc)
    print(f'Manifest {target}', file=sys.stderr, flush=True)
    return target, doc, source


def workspace_pipeline(args, paths):
    if args.command == 'corpus':
        manifest_path, manifest, source = corpus_manifest(args, paths)
    else:
        manifest_path = Path(args.manifest).absolute()
        manifest = validate(read_json(manifest_path))
        source = files_needed(args, manifest, paths)
    runs = under(paths['runs'], args.output, create=True)
    if source.is_relative_to(paths['runs']) or source.is_relative_to(paths['manifests']) or runs.is_relative_to(source):
        raise LabError('CORPUS_WORKSPACE_OVERLAP', str(source))
    approved = money(args.approve_cost_usd) if args.approve_cost_usd is not None else None

    def preflight(caps):
        plan = build_plan(manifest, caps, source=source, runs=runs, approved_cost=approved)
        review = {**plan, 'manifestPath': str(manifest_path), 'source': str(source), 'runOutput': str(runs),
                  'cloudMutation': 'NOT_SUBMITTED', 'evidenceClass': caps['evidenceClass'],
                  'extensionCommit': caps.get('commit'), 'runnerVersion': __version__}
        if args.plan_receipt:
            destination = under(paths['runs'], args.plan_receipt)
            ordinary_directory(destination.parent)
            if destination.suffix.lower() != '.json':
                raise LabError('PLAN_RECEIPT_JSON_EXTENSION_REQUIRED')
            document(destination, review)
        if not args.live or plan['status'] != 'READY':
            output(review)
            return EXIT_CODES[plan['status']]
        outcome = run(client, caps, manifest_path, manifest, plan, source=source, runs=runs, approve_cost=approved)
        output(outcome)
        return EXIT_CODES[outcome['state']]

    if args.session or args.live:
        with connect() as client:
            return preflight(client.describe())
    return preflight(OFFLINE_CAPABILITIES)


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors='backslashreplace')
    args = parse(argv)
    try:
        if args.command == 'install-host':
            output(install(args.extension_id))
            return 0
        if args.command == 'pair':
            with ExtensionClient(code=args.code) as client:
                caps = client.describe()
                output({'status': 'PAIRED', 'scopeId': caps['scopeId'], 'mode': caps['mode'],
                        'expiresAt': caps['expiresAt'], 'version': __version__})
            return 0
        if args.command == 'doctor':
            if args.session:
                with connect() as client:
                    output({'status': 'READY', 'runnerVersion': __version__, **client.describe(),
                            'providerRoundTrip': 'NOT_TESTED_BY_DOCTOR'})
            else:
                output({'status': 'READY', 'runnerVersion': __version__, 'protocol': PROTOCOL,
                        **OFFLINE_CAPABILITIES, 'providerRoundTrip': 'NOT_TESTED_OFFLINE'})
            return 0

        paths = workspace()
        if args.command == 'init':
            output({name: str(path) for name, path in paths.items()})
            return 0
        if args.command in ('corpus', 'plan', 'validate', 'run'):
            return workspace_pipeline(args, paths)
        if args.command == 'compare':
            left, right = (ordinary_directory(under(paths['runs'], path)) for path in (args.before, args.after))
            result = compare(left, right)
            if args.output:
                destination = under(paths['runs'], args.output)
                ordinary_directory(destination.parent)
                document(destination, result)
            output(result)
            return 1 if result['counts'].get('REGRESSION') else 0

        root = ordinary_directory(under(paths['runs'], args.run))
        _, frozen, _ = load_run(root)
        if args.command == 'status':
            output(projection(root, frozen['schedule']))
            return 0
        if args.command == 'report':
            summary = root / 'summary.json'
            if summary.exists():
                data = read_json(summary)
            else:
                data = projection(root, frozen['schedule'])
            output({**data, 'path': str(root), 'operationReceipts': str(root / 'operations.ndjson')})
            return 0
        if args.command == 'cancel':
            if (root / 'summary.json').exists():
                raise LabError('RUN_ALREADY_FINISHED')
            try:
                exclusive(root / 'cancel.request', (stamp() + '\n').encode('utf-8'))
            except FileExistsError:
                pass
            output({'status': 'CANCELLATION_REQUESTED', 'run': str(root)})
            return 0
        if args.expected_digest is not None and args.expected_digest != frozen['resolvedDigest']:
            raise LabError('FROZEN_MANIFEST_DIGEST_MISMATCH')
        with connect() as client:
            outcome = reconcile(client, client.describe(), root)
            output(outcome)
            return EXIT_CODES[outcome['state']]
    except KeyboardInterrupt:
        output({'status': 'CANCELLED', 'code': 'CANCELLATION_REQUESTED'})
        return 130
    except LabError as error:
        output({'status': 'BLOCKED', 'code': error.code, 'detail': error.detail})
        return 2
    except (OSError, ValueError, TypeError, KeyError, RecursionError) as error:
        # Private paths are already in the owner's workspace. Avoid arbitrary
        # exception or provider strings, which may contain credentials.
        output({'status': 'BLOCKED', 'code': 'LOCAL_FILE_OR_CONTRACT_ERROR',
                'errorType': type(error).__name__})
        return 2
