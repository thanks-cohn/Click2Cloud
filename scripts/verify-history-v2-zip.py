"""Independently validate the generated ZIP using Python's standard library."""
import hashlib
import json
import sys
from zipfile import ZipFile

file, raw_count = sys.argv[1:]
count = int(raw_count)
with ZipFile(file) as archive:
    assert archive.testzip() is None
    assert set(archive.namelist()) == {"manifest.json", "history.jsonl"}
    manifest = json.loads(archive.read("manifest.json"))
    assert manifest["schema"] == "redown.history-export/1"
    assert manifest["expectedRecords"] == count == manifest["writtenRecords"]
    digest = hashlib.sha256()
    seen = 0
    with archive.open("history.jsonl") as rows:
        for index, line in enumerate(rows):
            digest.update(line)
            row = json.loads(line)
            expected = count - index - 1
            assert row["recordId"] == f"synthetic:{expected:07}"
            assert row["sortAt"] == 1700000000000 + (expected // 4) * 60000
            assert "secret-fixture" not in line.decode()
            seen += 1
    assert seen == count
    assert manifest["files"][0]["sha256"] == digest.hexdigest()
    print(json.dumps({"crc":"PASS","sha256":digest.hexdigest(),"orderedIdentities":seen}))
