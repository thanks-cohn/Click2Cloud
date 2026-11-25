#!/usr/bin/env python3
"""Prepare REDOWN cases, run the current batch API on workerd, or verify a real GUI run."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import random
import re
import shutil
import subprocess
import sys
import time
import uuid

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
WORKLOAD = HERE.parent / "workload-plan.json"
VERSION = "0.3.32"
SCENARIOS = ("success", "last-conflict", "keep-both", "cancel", "expired", "restart", "lost-ack",
             "detach", "resume", "quota", "readiness", "concurrent", "duplicate-path", "notification-off",
             "receipt-off", "delayed-verify")
CHUNK = 1024 * 1024
CASES = {
    "03-historical": (24, 10255),
    "05-full-corpus": (240, 388827943),
    "05a-quick-comparable": (308, 2809232),
    "05b-comprehensive-comparable": (569, 3720944),
    "06a-inventory-comparable": (2221, 8000000),
}


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path, value):
    path = Path(path)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def checks_result(checks):
    verdicts = {row["verdict"] for row in checks}
    return next((status for status in ("FAIL", "BLOCKED", "NOT_RUN") if status in verdicts), "PASS")


def check(name, expected, observed, verdict=None):
    return dict(name=name, expected=expected, observed=observed,
                verdict=verdict or ("PASS" if expected == observed else "FAIL"))


def digest(blocks, deadline=None, byte_limit=None):
    hasher = hashlib.sha256()
    count = 0
    for block in blocks:
        if deadline is not None and time.monotonic() >= deadline:
            raise TimeoutError("Verification deadline reached.")
        count += len(block)
        if byte_limit is not None and count > byte_limit:
            raise ValueError("Readback exceeded the declared byte budget.")
        hasher.update(block)
    return count, hasher.hexdigest()


def file_digest(path):
    with path.open("rb") as source:
        return digest(iter(lambda: source.read(CHUNK), b""))


def workload():
    stages = []
    for stage in read_json(WORKLOAD)["stages"]:
        identifier = stage["id"]
        count, total = CASES.get(identifier, (stage["files"], stage.get("total_bytes")))
        stages.append((identifier, count, total))
        if identifier == "05-full-corpus":
            stages.extend((key, *value) for key, value in CASES.items() if key.startswith("05"))
        if identifier == "06-file-count":
            key = "06a-inventory-comparable"
            stages.append((key, *CASES[key]))
    return stages


def fixture_path(index, mode, roots, depth, extension):
    leaf = f"item-{index:05d}.{extension}"
    if mode == "files" or mode == "mixed" and index % 3 == 0:
        return leaf
    folder = f"Folder {index % roots + 1} 旅行"
    # Repeated basenames live in distinct numbered subdirectories.
    folders = [folder, f"Group {index // roots:05d}"]
    folders.extend(f"Nested {level + 1}" for level in range(depth - 1))
    return "/".join([*folders, f"report.{extension}"])


def write_fixture(path, size, rng, extension):
    path.parent.mkdir(parents=True, exist_ok=True)
    prefix = {"json": b'{"redown":true}\n', "yaml": b"redown: true\n"}.get(extension, b"")
    if size and len(prefix) > size:
        prefix = b"0" if extension == "json" else b"#"
    with path.open("xb") as file:
        if size:
            file.write(prefix)
        remaining = size - min(size, len(prefix))
        while remaining:
            length = min(CHUNK, remaining)
            if extension == "bin":
                block = rng.randbytes(length)
            elif extension == "txt":
                line = b"REDOWN synthetic text fixture\n"
                block = (line * (length // len(line) + 1))[:length]
            else:
                block = b" " * length
            file.write(block)
            remaining -= length
    return file_digest(path)[1]


def prepare(directory, count, total, seed, mode, roots, depth, extension, budget):
    if not 1 <= count <= 10_000 or not 0 <= total <= budget:
        raise ValueError("Selection exceeds the configured path or local disk budget.")
    if not 1 <= roots <= 100 or not 1 <= depth <= 12:
        raise ValueError("Use 1–100 roots and a depth of 1–12.")
    directory.parent.mkdir(parents=True, exist_ok=True)
    if total > shutil.disk_usage(directory.parent).free:
        raise ValueError('Generated fixtures exceed available disk space.')
    directory.mkdir(exist_ok=False)
    run_id = uuid.uuid4().hex
    rng = random.Random(seed)
    sizes = [total // count + int(index < total % count) for index in range(count)]
    # Add an empty file without changing the requested aggregate workload.
    if count >= 2:
        sizes[0], sizes[-1] = 0, sizes[-1] + sizes[0]
    files = []
    corpus = directory / "corpus"
    for index, size in enumerate(sizes):
        relative = fixture_path(index, mode, roots, depth, extension)
        sha256 = write_fixture(corpus / relative, size, rng, extension)
        files.append(dict(path=relative, bytes=size, sha256=sha256))
    manifest = dict(schema="redown.upload-lab.expected", version=1, extensionVersion=VERSION, seed=seed,
                    runId=run_id, mode=mode, totalBytes=total, recommendedPrefix=f"redown-test-lab/{run_id}/",
                    folderRoots=sorted({row["path"].split("/")[0] for row in files if "/" in row["path"]}),
                    files=files)
    write_json(directory / "expected.json", manifest)
    return manifest


def validate_manifest(path):
    manifest = read_json(path)
    if manifest.get("schema") != "redown.upload-lab.expected" or manifest.get("version") != 1:
        raise ValueError("Unsupported expected manifest.")
    files = manifest["files"]
    corpus = Path(path).resolve().parent / "corpus"
    paths = set()
    for row in files:
        relative = row["path"]
        parts = relative.split("/")
        if ("\\" in relative or ":" in relative or any(part in ("", ".", "..") for part in parts)
                or relative in paths or not (corpus / relative).resolve().is_relative_to(corpus)):
            raise ValueError("Invalid or duplicate path in expected manifest.")
        paths.add(relative)
        size, sha256 = file_digest(corpus / relative)
        if size != row["bytes"] or sha256 != row["sha256"]:
            raise ValueError(f"Generated file changed since the manifest was recorded: {relative}")
    if not 1 <= len(files) <= 10_000 or sum(row["bytes"] for row in files) != manifest["totalBytes"]:
        raise ValueError("File count or aggregate size does not match the expected manifest.")
    return manifest


def instructions(directory, expected):
    print(f'Fixture folder: "{directory.resolve() / "corpus"}"')
    print(f'Expected manifest: "{directory.resolve() / "expected.json"}"')
    print(f'Dedicated empty QA prefix: {expected["recommendedPrefix"]}')
    if expected["mode"] == "files":
        print("In Files, open the QA folder, choose More > Upload > Upload files, and select all files in corpus.")
    elif expected["mode"] == "folder":
        print("In Files, open the QA folder, choose More > Upload > Upload folders, then select:")
        for folder in expected["folderRoots"]:
            print(f'  "{folder}"')
        print("Use Add another folder for each additional folder. Then choose Start upload once.")
    else:
        print("The mixed selection fixture is for the local API. Use files or folder mode for GUI.")
    print("Wait for the final progress state. In Debug Mode you can opt in to one automatic batch JSON receipt.")
    print("Run verify against that receipt and with separately scoped read-only R2 credentials.")


def run_local(args):
    if args.out.exists() and any(args.out.iterdir()) and not args.resume:
        raise ValueError("Output already exists. Use a new directory or --resume to continue after PASS tiers.")
    args.out.mkdir(parents=True, exist_ok=True)
    stages = workload()
    identifiers = [row[0] for row in stages]
    if args.through:
        chosen = stages[:identifiers.index(args.through) + 1]
    elif args.tier:
        chosen = [stages[identifiers.index(args.tier)]]
    else:
        chosen = [("smoke", args.files, args.bytes)]
    aggregate = dict(schema="redown.upload-lab.run", version=1, extensionVersion=VERSION,
                     seed=args.seed, layer="local-workerd-r2", scenario=args.scenario,
                     rows=[dict(test=name, files=count, bytes=total, verdict="NOT_RUN")
                           for name, count, total in chosen])
    if sum(total for _, _, total in chosen) > args.budget:
        aggregate["rows"][0].update(verdict="BLOCKED", error="Selected tiers cumulatively exceed --budget.")
        aggregate["verdict"] = "BLOCKED"
        write_json(args.out / "summary.json", aggregate)
        raise ValueError("Selected tiers cumulatively exceed --budget.")
    for row in aggregate["rows"]:
        started = time.monotonic()
        case = args.out / row["test"]
        result = case / "integration.json"
        if case.exists():
            if not args.resume or not result.exists() or read_json(result).get("verdict") != "PASS":
                row.update(verdict="BLOCKED", error="Previous attempt did not pass. Preserve it and use a fresh run directory.")
                break
            result_data = read_json(result)
            existing = validate_manifest(case / "expected.json")
            if (existing["seed"] != args.seed or len(existing["files"]) != row["files"]
                    or existing["totalBytes"] != row["bytes"] or existing["mode"] != args.mode
                    or result_data["scenario"] != args.scenario or result_data["extensionVersion"] != VERSION):
                row.update(verdict="BLOCKED", error="Checkpoint does not match this run configuration.")
                break
            row.update(verdict="PASS", resumed=True, receipt=str(result))
            continue
        try:
            prepare(case, row["files"], row["bytes"], args.seed, args.mode, args.roots, args.depth, args.format, args.budget)
            with (case / "integration.log").open("w", encoding="utf-8") as log:
                process = subprocess.run([args.node, str(HERE / "local-provider.mjs"),
                                          str(case / "expected.json"), str(case), args.scenario],
                                         cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, timeout=args.timeout, check=False)
            if result.exists():
                result_data = read_json(result)
                row.update(verdict=result_data["verdict"], receipt=str(result), code=process.returncode)
                if process.returncode and row["verdict"] == "PASS":
                    row.update(verdict="BLOCKED", error="Child process failed after writing its receipt.")
            else:
                row.update(verdict="BLOCKED", error="No integration receipt. Inspect integration.log.", code=process.returncode)
        except (OSError, ValueError, subprocess.TimeoutExpired) as error:
            row.update(verdict="BLOCKED", error=str(error))
        row["elapsedMs"] = round((time.monotonic() - started) * 1000)
        write_json(args.out / "summary.json", aggregate)
        print(f'{row["verdict"]} {row["test"]}')
        if row["verdict"] != "PASS":
            break
    aggregate["verdict"] = checks_result(aggregate["rows"])
    write_json(args.out / "summary.json", aggregate)
    print(f'{aggregate["verdict"]} {args.out / "summary.json"}')
    return 0 if aggregate["verdict"] == "PASS" else 1


def verify_receipt(expected, receipt, prefix, status):
    rows = []
    batch_id = receipt.get("batchId") or ""
    rows.append(check("receipt schema", ["redown.upload-batch", 1, VERSION, True],
                      [receipt.get("schema"), receipt.get("version"), receipt.get("extensionVersion"),
                       bool(re.fullmatch(r"[0-9a-f-]{36}", batch_id))]))
    rows.append(check("receipt pinned prefix", prefix, receipt.get("destination", {}).get("prefix")))
    rows.append(check("batch outcome", status, receipt.get("status")))
    wanted = {file["path"]: file["bytes"] for file in expected["files"]}
    files = receipt.get("files", [])
    rows.append(check("receipt exact intended path and size", wanted,
                      {item["relativePath"]: item["intendedSize"] for item in files}))
    rows.append(check("receipt selection size", [len(wanted)] * 2, [receipt.get("expectedCount"), len(files)]))
    counts = receipt.get("counts", {})
    statuses = {value: sum(item.get("status") == value for item in files)
                for value in ("verified", "failed", "skipped", "unconfirmed", "cancelled", "unprocessed")}
    rows.append(check("receipt counts match file rows", statuses, counts))
    rows.append(check("receipt observed count", len(files) - statuses["unprocessed"], receipt.get("observedCount")))
    proven = [item for item in files if item.get("status") == "verified"]
    if status == "verified":
        rows.append(check("all selected files verified", len(wanted), len(proven)))
    rows.append(check("receipt stable operation IDs and exact provider key", True,
                      len({item.get("operationId") for item in proven}) == len(proven)
                      and all(item.get("operationId") and item.get("observedKey") == prefix + item["relativePath"]
                              and item.get("intendedKey") == item.get("observedKey")
                              and item.get("observedSize") == wanted.get(item["relativePath"])
                              and (item.get("evidence") or {}).get("kind") == "staging-byte-readback-and-final-r2-head"
                              for item in proven)))
    notification = receipt.get("notification", {})
    stamp = notification.get("observedAt")
    rows.append(check("success notice eligibility", status == "verified", notification.get("eligible")))
    if notification.get("state") == "rendered":
        rows.append(check("renderer ACK after batch completion", True,
                          isinstance(stamp, int) and stamp >= receipt.get("finishedAt", float("inf"))))
    elif status == "verified":
        rows.append(check("renderer ACK", "rendered", notification.get("state"), "NOT_RUN"))
    else:
        rows.append(check("renderer suppressed for incomplete batch", "ineligible", notification.get("state")))
    return rows


def verify_r2(expected, args, prefix):
    if not args.read_r2:
        return [check("independent remote inventory and bytes", "R2 readback", None, "BLOCKED")], []
    if not args.bucket or not args.account or not re.fullmatch(r"[a-fA-F0-9]{32}", args.account):
        raise ValueError("R2 readback requires --bucket and the exact 32-character --account ID.")
    if not prefix.startswith("redown-test-lab/") or prefix.count("/") != 2:
        raise ValueError("Use a dedicated redown-test-lab/<run-id>/ prefix for R2 verification.")
    if not os.getenv("AWS_ACCESS_KEY_ID") or not os.getenv("AWS_SECRET_ACCESS_KEY"):
        raise ValueError("Set temporary read-only AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.")
    from boto3 import client
    from botocore.config import Config
    s3 = client("s3", endpoint_url=f"https://{args.account}.r2.cloudflarestorage.com",
                region_name="auto", config=Config(connect_timeout=8, read_timeout=15, retries={"total_max_attempts": 1}))
    bound = time.monotonic() + args.timeout
    wanted = {prefix + row["path"]: row for row in expected["files"]
              if args.expect == 'verified' or row['path'] in args.committed_path}
    raw = []
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=args.bucket, Prefix=prefix):
        if time.monotonic() >= bound:
            raise TimeoutError("R2 inventory deadline reached.")
        raw.extend(page.get("Contents", []))
        if len(raw) > 10_001:
            raise ValueError("R2 inventory exceeds the isolated verification cap.")
    keys = [item["Key"] for item in raw]
    rows = [check("independent R2 exact inventory", sorted(wanted), sorted(keys)),
            check("duplicate listed objects", 0, len(keys) - len(set(keys)))]
    inventory = []
    for item in raw:
        key = item["Key"]
        if key not in wanted:
            inventory.append(dict(key=key, bytes=item["Size"], sha256=None, state="unexpected"))
            continue
        expected_item = wanted[key]
        if time.monotonic() >= bound:
            raise TimeoutError("R2 download deadline reached.")
        if item["Size"] != expected_item["bytes"]:
            inventory.append(dict(key=key, bytes=item["Size"], sha256=None, state="size-mismatch"))
            rows.append(check(f"listed size {key}", expected_item["bytes"], item["Size"]))
            continue
        reply = s3.get_object(Bucket=args.bucket, Key=key, IfMatch=item["ETag"])
        try:
            size, sha256 = digest(reply["Body"].iter_chunks(CHUNK), bound, byte_limit=expected_item["bytes"])
        finally:
            reply["Body"].close()
        inventory.append(dict(key=key, bytes=size, sha256=sha256, state="read"))
        rows.append(check(f"readback {key}", [expected_item["bytes"], expected_item["sha256"]], [size, sha256]))
    return rows, inventory


def verify_gui(args):
    start = time.monotonic()
    expected = validate_manifest(args.expected)
    prefix = args.prefix or expected["recommendedPrefix"]
    if not re.fullmatch(r"redown-test-lab/[a-zA-Z0-9_-]{1,100}/", prefix):
        raise ValueError("Use redown-test-lab/<unique-run-id>/ for this verification.")
    checks, inventory = [], []
    if any(path not in {row["path"] for row in expected["files"]} for path in args.committed_path):
        raise ValueError("--committed-path must reference an expected fixture.")
    if args.receipt:
        receipt = read_json(args.receipt)
        checks.extend(verify_receipt(expected, receipt, prefix, args.expect))
        if args.bucket:
            checks.append(check("receipt pinned bucket", args.bucket, receipt.get("destination", {}).get("bucketName")))
    else:
        checks.append(check("automatic aggregate receipt", "provided", None, "NOT_RUN"))
    try:
        remote, inventory = verify_r2(expected, args, prefix)
        checks.extend(remote)
    except Exception as error:
        # Provider exceptions can contain credentials or signed URLs. Keep a safe classification.
        code = type(error).__name__
        if isinstance(error, ModuleNotFoundError):
            code = "BOTO3_UNAVAILABLE"
        checks.append(check("independent remote inventory and bytes", "R2 readback", code, "BLOCKED"))
    if args.observations:
        observed = read_json(args.observations)
        for name, wanted in {"realPicker": True, "pinnedDestination": True, "progress": True,
                             "consolePaintCount": 1 if args.expect == "verified" else 0, "consolePaintBeforeCompletion": False,
                             "nativeSuccessCount": 0}.items():
            checks.append(check("owner observation " + name, wanted, observed.get(name)))
    else:
        checks.append(check("real picker, progress and Console Era paint", "owner observations", None, "NOT_RUN"))
    report = dict(schema="redown.upload-lab.gui", version=1, extensionVersion=VERSION,
                  runId=expected["runId"], seed=expected["seed"], prefix=prefix,
                  verdict=checks_result(checks), checks=checks, inventory=inventory,
                  elapsedMs=round((time.monotonic() - start) * 1000))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    write_json(args.out, report)
    print(f'{report["verdict"]} {args.out}')
    return 0 if report["verdict"] == "PASS" else 1


def options(parser):
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--files", type=int, default=5)
    parser.add_argument("--bytes", type=int, default=5120)
    parser.add_argument("--seed", type=int, default=20261125)
    parser.add_argument("--mode", choices=("files", "folder", "mixed"), default="folder")
    parser.add_argument("--roots", type=int, default=2)
    parser.add_argument("--depth", type=int, default=2)
    parser.add_argument("--format", choices=("bin", "txt", "json", "yaml"), default="bin")
    parser.add_argument("--budget", type=int, default=512 * CHUNK)
    tiers = parser.add_mutually_exclusive_group()
    tiers.add_argument("--tier", choices=[row[0] for row in workload()])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    gui = commands.add_parser("prepare", help="Generate independent fixtures for the real Chrome picker.")
    options(gui)
    run = commands.add_parser("run", help="Invoke production batch operations against isolated workerd/R2.")
    options(run)
    run.add_argument("--through", choices=[row[0] for row in workload()])
    run.add_argument("--scenario", choices=SCENARIOS, default="success")
    run.add_argument("--timeout", type=int, default=180)
    run.add_argument("--node", default="node")
    run.add_argument("--resume", action="store_true")
    verify = commands.add_parser("verify", help="Verify a real GUI run using its receipt and optional read-only S3.")
    verify.add_argument("--expected", type=Path, required=True)
    verify.add_argument("--receipt", type=Path)
    verify.add_argument("--expect", choices=("verified", "failed", "cancelled", "unconfirmed"), default="verified")
    verify.add_argument("--committed-path", action="append", default=[], help="Expected remote relative path for a partial or failed test. Repeat as needed.")
    verify.add_argument("--observations", type=Path)
    verify.add_argument("--out", type=Path, required=True)
    verify.add_argument("--read-r2", action="store_true")
    verify.add_argument("--account")
    verify.add_argument("--bucket")
    verify.add_argument("--prefix")
    verify.add_argument("--timeout", type=int, default=180)
    args = parser.parse_args()
    try:
        if args.command == "run":
            if args.tier and args.through:
                raise ValueError("Choose one of --tier or --through.")
            return run_local(args)
        if args.command == "verify":
            return verify_gui(args)
        count, total = args.files, args.bytes
        if args.tier:
            _, count, total = next(row for row in workload() if row[0] == args.tier)
        expected = prepare(args.out, count, total, args.seed, args.mode, args.roots, args.depth, args.format, args.budget)
        instructions(args.out, expected)
        return 0
    except (OSError, ValueError, KeyError) as error:
        print(f"BLOCKED {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
