"""Build or check a benign deterministic transfer workload entirely offline."""
import argparse
import hashlib
import html
import json
from pathlib import Path
from urllib.parse import quote


def files(count, native):
    for number in range(count):
        content = (f'ReDown Part 1 QA fixture {number:04}\n'.encode() * (1 + number % 19))
        name = f'part1-{number:04}.txt'
        if native:
            yield name, content
        elif number % 27 == 0:
            yield f'Library/Empty/{name}', b''
        else:
            yield f'Library/Section {number % 7}/Café/{name}', content


def create(root, count, native):
    root.mkdir(parents=True, exist_ok=False)
    data_root = root / 'files' if native else root / 'input'
    inventory = []
    for name, data in files(count, native):
        path = data_root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        inventory.append({'path': name, 'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    (root / 'expected.json').write_text(json.dumps(inventory, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    if native:
        for first in range(0, count, 50):
            n = first // 50 + 1
            links = '\n'.join(f'<li><a href="files/{quote(row["path"])}">{html.escape(row["path"])}</a></li>'
                              for row in inventory[first:first + 50])
            next_page = f'<a href="page-{n+1:02}.html">Next 50</a>' if first + 50 < count else ''
            (root / f'page-{n:02}.html').write_text(
                '<!doctype html><meta charset="utf-8"><title>ReDown native save QA</title>'
                f'<h1>Right-click save QA {first+1}–{min(first+50,count)}</h1><ol start="{first+1}">{links}</ol>{next_page}',
                encoding='utf-8')
    print(json.dumps({'root': str(root.resolve()), 'files': count, 'inventory': str((root / 'expected.json').resolve())}))


def check(manifest, output):
    expected = {row['path']: row for row in json.loads(manifest.read_text(encoding='utf-8'))}
    found = {}
    for path in output.rglob('*'):
        if path.is_symlink() or (getattr(path.lstat(), 'st_file_attributes', 0) & 0x400):
            raise SystemExit(f'Unsupported linked output {path.relative_to(output)}')
        if path.is_file():
            with path.open('rb') as stream:
                sha = hashlib.sha256()
                for data in iter(lambda: stream.read(128 * 1024), b''):
                    sha.update(data)
                digest = sha.hexdigest()
            found[path.relative_to(output).as_posix()] = (path.stat().st_size, digest)
    missing = sorted(expected.keys() - found.keys())
    extra = sorted(found.keys() - expected.keys())
    mismatched = sorted(name for name in expected.keys() & found.keys()
                        if found[name] != (expected[name]['size'], expected[name]['sha256']))
    status = not (missing or extra or mismatched)
    print(json.dumps({'state': 'PASS' if status else 'FAIL', 'expectedFiles': len(expected),
                      'observedFiles': len(found), 'missing': missing, 'extra': extra, 'mismatched': mismatched}, indent=2))
    return 0 if status else 1


def main():
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest='command', required=True)
    build = commands.add_parser('create')
    build.add_argument('directory', type=Path)
    build.add_argument('--files', type=int, choices=(100, 555, 1000), default=100)
    build.add_argument('--native', action='store_true')
    verify = commands.add_parser('check')
    verify.add_argument('manifest', type=Path)
    verify.add_argument('output', type=Path)
    args = parser.parse_args()
    if args.command == 'create':
        create(args.directory, args.files, args.native)
        return 0
    return check(args.manifest, args.output)


if __name__ == '__main__':
    raise SystemExit(main())
