"""Prepare disposable sources and check installed-extension round-trip receipts."""
import argparse
import hashlib
import json
from pathlib import Path

from redown_live_lab import __version__
from redown_live_lab.errors import LabError
from redown_live_lab.evidence import Journal, load_run
from redown_live_lab.fixtures import ASSET_SIZES, generate
from redown_live_lab.inventory import digest_file, ordinary_directory, relative_path
from redown_live_lab.manifest import read_json


def prepare():
    root = ordinary_directory(Path.cwd() / 'lab-local') / 'windows-acceptance-03323'
    root.mkdir()
    corpus = {
        'two': {'one.txt': b'first baseline!\r\n', 'nested/two.txt': b'second baseline!\r\n'},
        'five': {
            'large.png': generate('png', 989488, 3323, 'windows-png'),
            'nested/photo.jpg': generate('jpg', ASSET_SIZES['jpg'], 3323, 'windows-jpg'),
            'nested/旅行.txt': b'stable Windows text\r\n',
            'nested/archives/sample.zip': generate('zip', 2048, 3323, 'windows-zip'),
            'zero.txt': b'',
        },
    }
    reports = {}
    for name, sources in corpus.items():
        for rel, data in sources.items():
            path = root / name / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open('xb') as target:
                target.write(data)
        reports[name] = [{'path': rel, 'sizeBytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
                         for rel, data in sorted(sources.items())]
    (root / 'five' / 'nested' / 'empty-directory').mkdir()
    return {'status': 'PREPARED', 'version': __version__, 'corpora': reports}


def check(run, expected):
    root = ordinary_directory(run)
    summary = read_json(root / 'summary.json')
    context, frozen, _ = load_run(root)
    environment = context['environment']
    if (summary['state'] != 'PASS' or environment['evidenceClass'] != 'installed-extension-cloudflare'
            or environment['extensionVersion'] != __version__ or environment['runnerVersion'] != __version__
            or environment['engineVersion'] != '3+1.1' or environment['protocol'] != '1.0.0'):
        raise LabError('INSTALLED_PASS_REQUIRED')
    planned = {row['scenarioId']: row['fixture'] for row in frozen['schedule']}
    results = [row for row in Journal(root).rows() if row['event'] == 'result']
    if len(results) != expected or len(planned) != expected or {r['scenarioId'] for r in results} != planned.keys():
        raise LabError('SCENARIO_COUNT_MISMATCH')
    if max(summary['observedActiveUploads'], summary['observedActiveDownloads']) != 1:
        raise LabError('OBSERVED_CONCURRENCY_MISMATCH')
    copies = ordinary_directory(root / 'downloads')
    verified = []
    for result in results:
        fixture = planned[result['scenarioId']]
        observed = result['readback'] or {}
        upload = result['upload']
        ack = upload['receipt'] or {}
        expected_key = context['target']['prefix'] + fixture['remotePath']
        if (result['state'] != 'PASS' or result['code'] != 'UPLOAD_SHA256_VERIFIED'
                or not upload['requested'] or not upload['acknowledged']
                or ack.get('key') != expected_key or observed.get('key') != expected_key
                or ack.get('size') != fixture['sizeBytes'] or observed.get('clientBytes') != fixture['sizeBytes']
                or not observed.get('etag') or observed['etag'] != ack.get('etag')
                or observed.get('version') is not None and observed['version'] != ack.get('version')
                or observed.get('sha256') != fixture['sha256'] or observed.get('clientSha256') != fixture['sha256']):
            raise LabError('ROUND_TRIP_RECEIPT_MISMATCH')
        relative = '/'.join(result['scenarioId'].split('/')[:3]) + '/' + fixture['remotePath']
        saved = copies.joinpath(*relative_path(relative).split('/'))
        if Path(observed['savedCopy']) != saved:
            raise LabError('SAVED_COPY_PATH_MISMATCH')
        file_hash, _ = digest_file(saved, fixture['sizeBytes'])
        if file_hash != fixture['sha256']:
            raise LabError('SAVED_COPY_SHA256_MISMATCH')
        verified.append({'fixtureId': fixture['id'], 'bytes': fixture['sizeBytes'],
                         'sourceSha256': fixture['sha256'], 'r2Sha256': observed['sha256'],
                         'cliSha256': observed['clientSha256'], 'savedCopySha256': file_hash})
    if sum(item['bytes'] for item in verified) != summary['verifiedBytes']:
        raise LabError('VERIFIED_BYTE_COUNT_MISMATCH')
    return {'status': 'PASS', 'scenarioCount': len(verified), 'extensionVersion': environment['extensionVersion'],
            'commit': environment['commit'], 'sourceDigest': environment['sourceDigest'], 'verified': verified}


def main():
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('prepare')
    verify = commands.add_parser('check')
    verify.add_argument('--run', required=True, type=Path)
    verify.add_argument('--files', required=True, type=int, choices=range(1, 31), metavar='1..30')
    args = parser.parse_args()
    try:
        report = prepare() if args.command == 'prepare' else check(args.run, args.files)
    except FileExistsError:
        print(json.dumps({'status': 'BLOCKED', 'code': 'ACCEPTANCE_DIRECTORY_ALREADY_EXISTS'}))
        return 2
    except (OSError, LabError, KeyError, TypeError, ValueError) as error:
        code = error.code if isinstance(error, LabError) else 'ACCEPTANCE_RECEIPT_UNREADABLE'
        print(json.dumps({'status': 'BLOCKED', 'code': code}))
        return 2
    print(json.dumps(report, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
