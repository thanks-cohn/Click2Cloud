"""Sample the existing no-cloud Lab fault fixture and its process tree."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '11.25.2026/live-python-lab/python'))
from redown_live_lab.resources import process_memory, system_memory  # noqa: E402

MAX_PROCESSES = 128


def processes():
    if os.name == 'nt':
        import ctypes
        from ctypes import wintypes

        class ProcessEntry(ctypes.Structure):
            _fields_ = [('size', wintypes.DWORD), ('usage', wintypes.DWORD), ('pid', wintypes.DWORD),
                        ('heap', ctypes.c_size_t), ('module', wintypes.DWORD), ('threads', wintypes.DWORD),
                        ('parent', wintypes.DWORD), ('priority', wintypes.LONG), ('flags', wintypes.DWORD),
                        ('name', wintypes.WCHAR * 260)]

        kernel = ctypes.WinDLL('kernel32', use_last_error=True)
        snapshot = kernel.CreateToolhelp32Snapshot
        snapshot.argtypes = (wintypes.DWORD, wintypes.DWORD)
        snapshot.restype = wintypes.HANDLE
        first, advance = kernel.Process32FirstW, kernel.Process32NextW
        first.argtypes = advance.argtypes = (wintypes.HANDLE, ctypes.POINTER(ProcessEntry))
        first.restype = advance.restype = wintypes.BOOL
        close = kernel.CloseHandle
        close.argtypes = (wintypes.HANDLE,)
        close.restype = wintypes.BOOL
        handle = snapshot(2, 0)
        if handle == ctypes.c_void_p(-1).value:
            return {}
        try:
            entry = ProcessEntry(ctypes.sizeof(ProcessEntry))
            result = {}
            more = first(handle, ctypes.byref(entry))
            while more:
                result[entry.pid] = (entry.parent, entry.name)
                more = advance(handle, ctypes.byref(entry))
            return result
        finally:
            close(handle)

    result = {}
    for path in Path('/proc').glob('[0-9]*'):
        try:
            stat = (path / 'stat').read_text(encoding='utf-8')
            left, right = stat.index('('), stat.rindex(')')
            result[int(path.name)] = (int(stat[right + 2:].split()[1]), stat[left + 1:right])
        except (OSError, ValueError, IndexError):
            continue
    return result


def descendants(entries, pid):
    children = {}
    for child, (parent, _) in entries.items():
        children.setdefault(parent, []).append(child)
    seen, pending = set(), [pid]
    while pending:
        item = pending.pop()
        if item in seen:
            continue
        seen.add(item)
        pending.extend(children.get(item, ()))
    return seen


def process_role(name):
    lower = name.lower()
    if 'workerd' in lower:
        return 'workerd'
    if 'chrom' in lower:
        return 'chrome'
    if lower.startswith(('python', 'redown-lab', 'py.exe')):
        return 'python'
    if lower in ('node', 'node.exe'):
        return 'node'
    return 'other'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--files', type=int, choices=(8, 24, 100, 555, 1000), required=True)
    parser.add_argument('--sample-seconds', type=float, default=5.0)
    parser.add_argument('--chrome-pid', type=int, help='Optional owner-selected Chrome root PID for parallel local sampling.')
    args = parser.parse_args()
    if not 1 <= args.sample_seconds <= 60:
        parser.error('sample interval must be between 1 and 60 seconds')
    directory = ROOT / 'lab-local' / 'verification' / ('resources-' + uuid.uuid4().hex[:12])
    directory.mkdir(parents=True)
    role_file = directory / 'python-roles.ndjson'
    child_env = {**os.environ, 'REDOWN_RELIABILITY_FAULTS': '1', 'REDOWN_OWNER_FIXTURE_FILES': str(args.files),
                 'REDOWN_LAB_PYTHON': sys.executable, 'REDOWN_FIXTURE_PROFILE_REGISTRY': str(role_file)}
    start = time.monotonic()
    started_at = datetime.now(timezone.utc).isoformat()
    child = subprocess.Popen(['node', 'scripts/verify-python-lab.mjs'], cwd=ROOT, env=child_env)
    print(f'Resource receipts {directory}', file=sys.stderr, flush=True)
    measures, labels, minima = {}, {child.pid: 'node'}, {}
    if args.chrome_pid is not None:
        labels[args.chrome_pid] = 'chrome'
    count, omitted, capture_errors = 0, 0, 0
    try:
        with (directory / 'process-samples.ndjson').open('x', encoding='utf-8') as out:
            while True:
                if role_file.is_file():
                    try:
                        with role_file.open(encoding='utf-8') as registry:
                            for line in registry:
                                if line.endswith('\n'):
                                    row = json.loads(line)
                                    labels[row['pid']] = row['role']
                    except (OSError, ValueError, KeyError):
                        capture_errors += 1
                entries = processes()
                wanted = descendants(entries, child.pid)
                if args.chrome_pid is not None:
                    wanted.update(descendants(entries, args.chrome_pid))
                samples = []
                for pid in sorted(wanted):
                    if pid not in entries:
                        continue
                    role = labels.get(pid, process_role(entries[pid][1]))
                    if role == 'other':
                        continue
                    if pid not in measures and len(measures) >= MAX_PROCESSES:
                        omitted += 1
                        continue
                    counters = process_memory(pid)
                    if not counters:
                        continue
                    row = {'pid': pid, 'role': role, **counters}
                    samples.append(row)
                    measure = measures.setdefault(pid, {'start': row, 'peak': {}, 'end': row, 'samples': 0})
                    measure['end'] = row
                    measure['samples'] += 1
                    for key, value in counters.items():
                        measure['peak'][key] = max(measure['peak'].get(key, value), value)
                system = {**system_memory(), 'freeDiskBytes': shutil.disk_usage(directory).free}
                for key, value in system.items():
                    minima[key] = min(minima.get(key, value), value)
                count += 1
                out.write(json.dumps({'elapsedMs': round((time.monotonic() - start) * 1000),
                                      'system': system, 'processes': samples}) + '\n')
                out.flush()
                try:
                    code = child.wait(timeout=args.sample_seconds)
                except subprocess.TimeoutExpired:
                    continue
                break
    finally:
        if child.poll() is None:
            child.terminate()
            child.wait(timeout=10)
        (directory / 'resource-summary.json').write_text(json.dumps({
            'schema': 'redown.part2.process-resources/1', 'platform': sys.platform, 'startedAt': started_at,
            'fixtureFiles': args.files, 'fixtureExitCode': child.returncode, 'sampleSeconds': args.sample_seconds,
            'samples': count, 'elapsedMs': round((time.monotonic() - start) * 1000),
            'minimumSystemHeadroom': minima, 'processes': list(measures.values()),
            'omittedProcessSamples': omitted, 'captureErrors': capture_errors,
            'chromeSamplingRequested': args.chrome_pid is not None,
        }, indent=2) + '\n', encoding='utf-8')
    return code


if __name__ == '__main__':
    raise SystemExit(main())
