"""Pinned synthetic sample downloader. Offline plan by default; never executes or extracts."""
import argparse
import hashlib
import json
import os
import shutil
import tempfile
import time
from pathlib import Path, PurePosixPath
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

BASE = Path(__file__).resolve().parent
MIB = 1024 * 1024

def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for b in iter(lambda: stream.read(128 * 1024), b""):
            h.update(b)
    return h.hexdigest()

def destination(root, name):
    p = PurePosixPath(name)
    if p.is_absolute() or any(x in ("", ".", "..") for x in p.parts) or "\\" in name or ":" in name:
        raise ValueError("unsafe fixture path")
    target = root.joinpath(*p.parts)
    if not target.resolve().is_relative_to(root.resolve()):
        raise ValueError("path escapes fixture root")
    return target

def approved_url(url):
    parts = urlsplit(url)
    return (parts.scheme == 'https' and parts.hostname == 'loremfile.dev' and
            parts.port in (None, 443) and not parts.username and not parts.password and not parts.fragment)


class FixtureRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not approved_url(newurl):
            raise ValueError('unexpected fixture redirect')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch(row, target, partials, disk_reserve):
    if row['url'] != 'https://loremfile.dev/' + row['path'] or not approved_url(row['url']):
        raise ValueError('unexpected fixture URL')
    opener = build_opener(FixtureRedirect())
    for attempt in range(3):
        if shutil.disk_usage(partials).free < row['bytes'] + disk_reserve:
            raise OSError('insufficient disk space for the next pinned fixture')
        fd, name = tempfile.mkstemp(prefix='redown-fixture-', suffix='.part', dir=partials)
        temporary = Path(name)
        hashed, size = hashlib.sha256(), 0
        try:
            with os.fdopen(fd, 'wb') as out, opener.open(Request(row['url'],headers={'Accept-Encoding':'identity'}),timeout=30) as response:
                if not approved_url(response.geturl()):
                    raise ValueError('unexpected fixture redirect')
                while chunk := response.read(128*1024):
                    size += len(chunk)
                    if size > row['bytes']:
                        raise ValueError('pinned fixture size exceeded')
                    if shutil.disk_usage(partials).free < len(chunk) + disk_reserve:
                        raise OSError('insufficient disk space while acquiring fixture')
                    hashed.update(chunk)
                    out.write(chunk)
                out.flush()
                os.fsync(out.fileno())
            if size != row['bytes'] or hashed.hexdigest() != row['sha256']:
                raise ValueError('fixture checksum or length mismatch')
            try:
                if os.name == 'nt':
                    temporary.rename(target)  # Windows rename exclusive on destination.
                else:
                    os.link(temporary,target) # Atomic no-clobber publication on the same filesystem.
            except FileExistsError:
                if not target.is_file() or target.stat().st_size != size or digest(target) != row['sha256']:
                    raise ValueError('a different file already occupies the fixture path') from None
            return size
        except (HTTPError, URLError, TimeoutError) as error:
            if attempt == 2 or isinstance(error, HTTPError) and error.code not in (408,429,500,502,503,504):
                raise
            time.sleep(0.5*(2**attempt))
        finally:
            temporary.unlink(missing_ok=True)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--profile", choices=["smoke","small","normal","large","malformed","all"], default="smoke")
    p.add_argument("--max-total-mib", type=int, default=64)
    p.add_argument("--disk-reserve-mib", type=int, default=0, help="Free space to retain during acquisition")
    p.add_argument("--download", action="store_true")
    a = p.parse_args()
    if a.max_total_mib < 1 or a.disk_reserve_mib < 0:
        p.error("a positive byte budget and nonnegative disk reserve are required")
    rows = json.loads((BASE/"catalog.json").read_text(encoding="utf-8"))["fixtures"]
    if a.profile == "smoke":
        preferred = ["mp4/360p-5s.mp4","webm/720p-5s-vp9.webm","mp4/720p-5s.mp4","mp4/1080p-10s.mp4"]
        selected = [r for r in rows if r["path"] in preferred]
        seen = {r["format"] for r in selected}
        for r in sorted(rows, key=lambda r:(r["bytes"],r["path"])):
            if not r["edge"] and r["format"] not in seen and r["bytes"] <= MIB:
                selected.append(r); seen.add(r["format"])
    elif a.profile == "malformed":
        selected = [r for r in rows if r["edge"]]
    elif a.profile == "all":
        selected = rows
    else:
        lo, hi = {"small":(0,MIB),"normal":(MIB,8*MIB),"large":(8*MIB,100*MIB)}[a.profile]
        selected = [r for r in rows if not r["edge"] and lo <= r["bytes"] < hi]
    root = a.output.resolve()
    if root == BASE or root.is_relative_to(BASE):
        raise SystemExit("Use separate writable output, e.g. lab-local/fixture-input")
    total = sum(r["bytes"] for r in selected)
    print(json.dumps({"profile":a.profile,"count":len(selected),"bytes":total,"download":a.download},indent=2))
    if total > a.max_total_mib*MIB:
        raise SystemExit("Budget exceeded; select a smaller profile or explicitly raise --max-total-mib")
    if not a.download:
        return
    root.mkdir(parents=True,exist_ok=True)
    pending = []
    for r in selected:
        target = destination(root,r["path"])
        if target.exists():
            if not target.is_file() or target.stat().st_size != r["bytes"] or digest(target) != r["sha256"]:
                raise SystemExit(f"Existing file mismatch; not overwriting {target}")
        else:
            pending.append(r)
    partials = root.with_name(root.name + '.redown-fixture-partials')
    partials.mkdir(mode=0o700, exist_ok=True)
    if partials.is_symlink() or partials.resolve() != partials:
        raise SystemExit('Choose a fixture destination without symlink or reparse-point staging paths')
    disk_reserve = a.disk_reserve_mib*MIB
    required = sum(r['bytes'] for r in pending)
    abandoned = sum(path.stat().st_size for path in partials.glob('redown-fixture-*.part') if path.is_file() and not path.is_symlink())
    if shutil.disk_usage(partials).free < required + disk_reserve:
        raise SystemExit(f'Insufficient disk space; {required} pending bytes, {disk_reserve} reserved bytes, {abandoned} abandoned partial bytes')
    if abandoned:
        print(f'Abandoned partial bytes outside the input: {abandoned}',flush=True)
    for row in pending:
        target = destination(root,row['path'])
        target.parent.mkdir(parents=True,exist_ok=True)
        size = fetch(row,target,partials,disk_reserve)
        print('VERIFIED',row['path'],size,flush=True)
    print("Fixture acquisition complete; no cloud transfer was performed.")

if __name__ == "__main__":
    main()
