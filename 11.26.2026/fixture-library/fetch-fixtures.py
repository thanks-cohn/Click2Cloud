"""Pinned synthetic sample downloader. Offline plan by default; never executes or extracts."""
import argparse, hashlib, json, shutil, time
from pathlib import Path, PurePosixPath
from urllib.request import urlopen, Request

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

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--profile", choices=["smoke","small","normal","large","malformed","all"], default="smoke")
    p.add_argument("--max-total-mib", type=int, default=64)
    p.add_argument("--download", action="store_true")
    a = p.parse_args()
    if a.max_total_mib < 1:
        p.error("positive byte budget required")
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
    required = sum(r["bytes"] for r in pending)
    if shutil.disk_usage(root).free < required + 1024*MIB:
        raise SystemExit("Insufficient free space; preserve at least 1 GiB for system operation")
    for r in pending:
        target = destination(root,r["path"])
        target.parent.mkdir(parents=True,exist_ok=True)
        tmp = target.with_name(target.name+".part")
        h = hashlib.sha256()
        size = 0
        if r["url"] != "https://loremfile.dev/"+r["path"]:
            raise SystemExit("Unexpected fixture URL")
        try:
            with urlopen(Request(r["url"],headers={"Accept-Encoding":"identity"}),timeout=30) as response, tmp.open("xb") as out:
                if not response.geturl().startswith("https://loremfile.dev/"):
                    raise ValueError("unexpected redirect")
                while True:
                    b = response.read(128*1024)
                    if not b: break
                    size += len(b)
                    if size > r["bytes"]: raise ValueError("size exceeded")
                    h.update(b); out.write(b)
            if size != r["bytes"] or h.hexdigest()!=r["sha256"]:
                raise ValueError("fixture checksum or length mismatch")
            tmp.replace(target)
        except Exception:
            # Leave partial files visible for diagnosis; never promote them to fixtures.
            raise
        print("VERIFIED",r["path"],size,flush=True)
        time.sleep(0.15)
    print("Fixture acquisition complete; no cloud transfer was performed.")

if __name__ == "__main__":
    main()
