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
from .install_host import install, registration_status
from .inventory import inventory, ordinary_directory, relative_path
from .manifest import OFFLINE_CAPABILITIES, SCHEMA, build_plan, money, read_json, validate
from .runner import reconcile, run
from .owner_campaign import MAX_INT, MAX_TIMER_SECONDS, campaign, check_downloads, existing_campaign, offline_campaign_status, selection_campaign
from .location_audit import check as check_location, load_plan
from .transport import ExtensionClient, connect

DEFAULT_WORKSPACE = 'lab-local'
MIB = 1024**2
EXIT_CODES = {'PASS': 0, 'READY': 0, 'REGISTERED': 0, 'PAIRED': 0, 'NOT_NEEDED': 0,
              'CANCELLATION_REQUESTED': 0, 'FAIL': 1, 'BLOCKED': 2, 'UNCERTAIN': 3, 'CANCELLED': 130,
              'INCOMPLETE': 3, 'AUDIT_INCOMPLETE': 3}


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


def integer_flag(maximum=MAX_INT):
    def parse_integer(raw):
        value = int(raw)
        if not 1 <= value <= maximum:
            raise argparse.ArgumentTypeError(f'expected an integer between 1 and {maximum}')
        return value
    return parse_integer


def campaign_options(command, *, transfer=False):
    seconds = integer_flag(MAX_TIMER_SECONDS)
    command.add_argument('--live', action='store_true', required=True, help='Explicitly use the paired cloud scope.')
    command.add_argument('--approve-cost-usd', required=True, help='Maximum modeled cost in USD within the trusted session ceiling.')
    command.add_argument('--authorization-minutes', type=integer_flag(MAX_TIMER_SECONDS // 60), default=75,
                         help='Minimum total duration approved while pairing, minutes (default 75).')
    command.add_argument('--benchmark-seconds', type=seconds, default=2400,
                         help='Measurement window in seconds (default 2400).')
    command.add_argument('--execution-seconds', type=seconds, default=3600,
                         help='Execution ceiling from admission, including audit, seconds (default 3600).')
    command.add_argument('--transfer-seconds', type=seconds, default=300,
                         help='Absolute ceiling per file transfer, seconds (default 300).')
    command.add_argument('--inactivity-seconds', type=seconds, default=120,
                         help='Abort after this many seconds without reported phase or byte progress (default 120).')
    command.add_argument('--request-seconds', type=integer_flag(30), default=30,
                         help='Authenticated metadata/GET request timeout, seconds (1–30, default 30).')
    command.add_argument('--upload-seconds', type=seconds, default=300,
                         help='Temporary provider PUT timeout, seconds (default 300).')
    command.add_argument('--verification-seconds', type=seconds, default=300,
                         help='Production staging read-back phase timeout, seconds (default 300).')
    command.add_argument('--audit-seconds', type=seconds, default=300,
                         help='Time reserved for independent scoped metadata listing, seconds (default 300).')
    for flag, units in (('audit-requests', 'provider requests'), ('audit-operations', 'relay operations'),
                        ('audit-traffic-bytes', 'modeled bytes'), ('file-budget', 'upload file attempts'),
                        ('provider-requests', 'provider requests'), ('operation-budget', 'operations'),
                        ('traffic-bytes', 'modeled bytes'), ('temp-disk-bytes', 'temporary browser disk bytes')):
        command.add_argument('--' + flag, type=integer_flag(), help=f'Campaign ceiling in {units} (default derived from plan).')
    command.add_argument('--concurrency', type=integer_flag(), default=1,
                         help='Concurrent file slots. This build supports one Laboratory slot.')
    if transfer:
        command.add_argument('--admit-partial', action='store_true', help='Leave work outside this grant budget pending.')
        command.add_argument('--execution', choices=('completion', 'timed'), default='completion',
                             help='Completion continues beyond the measured window within execution and grant deadlines.')
    else:
        command.set_defaults(execution='completion', admit_partial=False)
    command.add_argument('--retry-reserve', type=int, choices=range(9), default=2,
                         help='Additional upload and read attempts to reserve when approved ceilings allow (default 2 each).')
    command.set_defaults(expect_files=None, retain_downloads=False)


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
    doctor.add_argument('--diagnostics', action='store_true', help='Print a shareable diagnostic report without private scope fields.')
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
    owner = commands.add_parser('campaign', help='Inventory, upload and independently audit one dropped folder tree.')
    campaign_options(owner, transfer=True)
    owner.add_argument('--input', help='Input container (default lab-local/input).')
    owner.add_argument('--output', help='Group under lab-local/runs (default lab-local/runs).')
    owner.add_argument('--inventory-seconds', type=integer_flag(MAX_TIMER_SECONDS), default=1800,
                       help='Maximum source inventory time before admission, seconds (default 1800).')
    owner.add_argument('--operations', choices=('upload', 'round-trip'), default='upload')
    owner.add_argument('--verification', choices=('production', 'sha256'), default='production',
                       help='Default production confirmation does not read final object content.')
    owner.add_argument('--retain-downloads', action='store_true', help='Retain copies only for SHA-256 readback.')
    owner.add_argument('--expect-files', type=integer_flag(), help='Expected selection count for acceptance.')
    owner.add_argument('--new-run', action='store_true', help='Deliberately allocate a fresh prefix despite unfinished local evidence.')
    continuation = commands.add_parser('continue-campaign', help='Continue an owner campaign in its exact approved prefix.')
    campaign_options(continuation, transfer=True)
    continuation.add_argument('--run', required=True)
    continuation.add_argument('--input', help='Original input directory (default lab-local/input).')
    continuation.add_argument('--clear-cancel', action='store_true', help='Continue after an explicit cancellation marker.')
    audit = commands.add_parser('audit-location', help='Independently list the exact frozen QA prefix. Reads metadata only.')
    campaign_options(audit)
    audit.add_argument('--run', required=True)
    download = commands.add_parser('download-campaign', help='Read and SHA-256 verify original published keys with no cloud writes.')
    campaign_options(download, transfer=True)
    download.add_argument('--run', required=True)
    download.add_argument('--retain-downloads', action='store_true')
    download.add_argument('--resume-downloads', action='store_true')
    download.add_argument('--clear-cancel', action='store_true')
    selection = commands.add_parser('download-selection', help='Read from the exact existing folder approved in REDOWN Settings.')
    campaign_options(selection, transfer=True)
    selection.add_argument('--output', help='Group under lab-local/runs.')
    selection.add_argument('--run', help='Exact run directory when resuming.')
    selection.add_argument('--resume-downloads', action='store_true', help='Keep confirmed files and resume remaining reads.')
    selection.add_argument('--clear-cancel', action='store_true')
    selection.add_argument('--retain-downloads', action='store_true', help='Publish under retained-downloads and reopen each final file.')
    selection.add_argument('--download-to', help='Existing authorized local directory for a new independent results folder.')
    selection.add_argument('--expect-files', type=integer_flag())
    selection.add_argument('--inventory-seconds', type=integer_flag(MAX_TIMER_SECONDS), default=120)
    selection.add_argument('--inventory-requests', type=integer_flag(), default=200)
    selection.add_argument('--inventory-traffic-bytes', type=integer_flag(), default=16 * MIB)
    checker = commands.add_parser('check-location', help='Verify the frozen plan and observed keys from local receipts, offline.')
    checker.add_argument('--run', required=True)
    checker.add_argument('--audit', help='Specific location-audit.json under the run, defaults to its latest window.')
    disk = commands.add_parser('check-downloads', help='Reopen retained campaign files and verify paths, sizes and SHA-256 offline.')
    disk.add_argument('--run', required=True)
    audit_window = disk.add_mutually_exclusive_group()
    audit_window.add_argument('--window', help='Optional receipt window ID (default latest).')
    audit_window.add_argument('--all-windows', action='store_true', help='Check copies retained across continuation windows.')
    comparison = commands.add_parser('compare', help='Compare stable scenarios and explain changed workloads and environments.')
    comparison.add_argument('--before', required=True)
    comparison.add_argument('--after', required=True)
    comparison.add_argument('--output', help='Optional new JSON filename inside lab-local/runs.')
    result = parser.parse_args(argv)
    if result.command == 'campaign' and (result.operations == 'round-trip' and result.verification != 'sha256' or
                                         result.retain_downloads and result.verification != 'sha256'):
        parser.error('round-trip and retained downloads require --verification sha256.')
    if result.command == 'download-selection' and (bool(result.run) != result.resume_downloads or result.run and (result.output or result.download_to)):
        parser.error('Use --output for a new selection or --run with --resume-downloads.')
    if result.command == 'download-selection' and result.download_to:
        result.retain_downloads = True
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
            print(f'Inventory in progress: {row["files"]} files, {row["bytes"]} bytes hashed', file=sys.stderr, flush=True)
            clock = now

    files, empty = inventory(source, max_files=args.max_files, max_file_bytes=args.max_file_bytes,
                             max_total_bytes=args.max_total_bytes, max_entries=args.max_entries,
                             seconds=args.seconds, excluded=(paths['manifests'], paths['runs']), progress=progress)
    print(f'Inventory complete: {len(files)} files, {sum(row["sizeBytes"] for row in files)} bytes hashed',
          file=sys.stderr, flush=True)
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
    try:
        document(target, doc)
    except FileExistsError:
        raise LabError('MANIFEST_ALREADY_EXISTS', {
            'stage': 'manifest-write', 'recovery': 'Use a new --manifest filename to preserve the existing file.'
        }) from None
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
            try:
                document(destination, review)
            except FileExistsError:
                raise LabError('PLAN_RECEIPT_ALREADY_EXISTS', {
                    'stage': 'plan-receipt-write', 'recovery': 'Use a new --plan-receipt filename.'
                }) from None
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


def doctor_diagnostics(session):
    started = time.monotonic()
    report = {
        'schema': 'redown.python-lab.cli-diagnostics/1', 'correlationId': str(uuid.uuid4()),
        'runnerVersion': __version__, 'protocol': PROTOCOL, 'status': 'READY',
        'nativeRegistration': registration_status(), 'session': 'NOT_REACHED', 'startup': None,
        'providerRoundTrip': 'NOT_TESTED_BY_DIAGNOSTICS',
    }
    if session:
        try:
            with connect() as client:
                report.update(session='PASS', startup=client.describe().get('diagnostics'))
        except LabError as error:
            report.update(status='BLOCKED', session='UNAVAILABLE', code=error.code,
                          recovery='Open Python Laboratory Settings, check readiness and export diagnostics there.')
            if isinstance(error.detail, dict):
                report.update(detail=error.detail)
    report['elapsedMs'] = round((time.monotonic() - started) * 1000)
    return report


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors='backslashreplace')
    started = time.monotonic()
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
            if args.diagnostics:
                report = doctor_diagnostics(args.session)
                output(report)
                return EXIT_CODES[report['status']]
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
        claims = paths['runs'].parent / '.campaign-claims'
        if args.command == 'campaign':
            source = ordinary_directory(args.input or paths['input'])
            output_dir = under(paths['runs'], args.output)
            if output_dir.is_relative_to(source) or source.is_relative_to(output_dir):
                raise LabError('CORPUS_WORKSPACE_OVERLAP')
            output_dir = under(paths['runs'], args.output, create=True)
            outcome = campaign(args, source, output_dir, claims, started=started)
            output(outcome)
            return EXIT_CODES[outcome['status']]
        if args.command == 'download-selection':
            if not args.live:
                raise LabError('EXPLICIT_LIVE_CONFIRMATION_REQUIRED')
            destination = (ordinary_directory(under(paths['runs'], args.run)) if args.resume_downloads
                           else under(paths['runs'], args.output, create=True))
            outcome = selection_campaign(args, destination, started=started)
            output(outcome)
            return EXIT_CODES[outcome['status']]
        if args.command in ('continue-campaign', 'audit-location', 'download-campaign', 'check-location'):
            root = ordinary_directory(under(paths['runs'], args.run))
            if args.command == 'check-location':
                latest = read_json(root / 'summary.json') if not args.audit else {}
                selector = args.audit or latest.get('latestLocationAudit')
                if not selector and latest.get('locationAudit') and latest.get('windowPath'):
                    selector = latest['windowPath'] + '/location-audit.json'
                if not selector:
                    raise LabError('LOCATION_AUDIT_NOT_AVAILABLE')
                audit = root / selector
                audit = Path(os.path.abspath(audit))
                if not audit.is_relative_to(root):
                    raise LabError('RECEIPT_PATH_OUTSIDE_CAMPAIGN')
                outcome = check_location(root, audit)
            else:
                mode = {'continue-campaign': 'continue', 'audit-location': 'audit', 'download-campaign': 'download'}[args.command]
                source = (args.input or paths['input']) if mode == 'continue' else None
                outcome = existing_campaign(args, root, source, claims, mode, started=started)
            output(outcome)
            return EXIT_CODES[outcome['status']]
        if args.command in ('corpus', 'plan', 'validate', 'run'):
            return workspace_pipeline(args, paths)
        if args.command == 'compare':
            left, right = (under(paths['runs'], path) for path in (args.before, args.after))
            for artifact in (left, right):
                ordinary_directory(artifact.parent if artifact.is_file() else artifact)
            result = compare(left, right)
            if args.output:
                destination = under(paths['runs'], args.output)
                ordinary_directory(destination.parent)
                document(destination, result)
            output(result)
            return 1 if result['counts'].get('REGRESSION') else 0

        root = ordinary_directory(under(paths['runs'], args.run))
        frozen_doc = read_json(root / 'resolved-manifest.json')
        if frozen_doc.get('schema') == 'redown.owner-campaign/1':
            if args.command == 'cancel':
                try:
                    exclusive(root / 'cancel.request', (stamp() + '\n').encode('utf-8'))
                except FileExistsError:
                    pass
                output({'status': 'CANCELLATION_REQUESTED', 'run': str(root)})
                return 0
            if args.command == 'check-downloads':
                if args.window and str(uuid.UUID(args.window)) != args.window:
                    raise LabError('INVALID_WINDOW_ID')
                data = check_downloads(root, args.window, all_windows=args.all_windows)
                output(data)
                return EXIT_CODES[data['status']]
            if args.command in ('report', 'status'):
                data = offline_campaign_status(root, load_plan(root))
                output({**data, 'receiptBundle': str(root), 'operationReceipts': str(root / 'operations.ndjson')})
                return 0
            raise LabError('USE_CONTINUE_CAMPAIGN_OR_AUDIT_LOCATION')
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
