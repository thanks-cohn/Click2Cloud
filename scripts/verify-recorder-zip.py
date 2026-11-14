# Independent standard-library ZIP/CRC/SHA/JSONL/CSV verifier. Synthetic inputs only.
import csv, hashlib, io, json, sys, zipfile
path, expected, privacy = sys.argv[1], int(sys.argv[2]), sys.argv[3]
with zipfile.ZipFile(path) as z:
    assert z.testzip() is None
    manifest = json.loads(z.read('MANIFEST.json'))
    assert manifest['privacy'] == privacy
    for name, digest in manifest['files'].items():
        assert hashlib.sha256(z.read(name)).hexdigest() == digest, name
    basic = [json.loads(s) for s in z.read('basic-attempts.jsonl').splitlines() if s.strip()]
    rich = [json.loads(s) for s in z.read('full-events.jsonl').splitlines() if s.strip()]
    assert len(rich) == expected == manifest['counts']['richExported']
    assert len({e['sequence'] for e in rich}) == expected
    if manifest['status'] == 'COMPLETE': assert [e['sequence'] for e in rich] == list(range(1, expected + 1))
    assert len(basic) == manifest['counts']['basicExported']
    assert len({e['attemptId'] for e in basic}) == len(basic)
    rows = list(csv.DictReader(io.StringIO(z.read('basic-attempts.csv').decode())))
    assert len(rows) == len(basic)
    for row, attempt in zip(rows, basic):
        for field in rows[0]:
            value = attempt.get(field)
            formatted = 'N/A' if value is None else json.dumps(value, separators=(',', ':'), ensure_ascii=False) if isinstance(value, (dict, list, bool)) else str(value)
            assert row[field] == formatted, (field, row[field], formatted)
    coverage = json.loads(z.read('coverage.json'))
    assert coverage['richExported'] == len(rich) and coverage['basicExported'] == len(basic)
    if privacy == 'SECURE':
        for name in z.namelist(): assert b'PRIVATE_EXPORT_SENTINEL' not in z.read(name), name
print(json.dumps({'path':path,'privacy':privacy,'status':manifest['status'],'basic':len(basic),'rich':len(rich),'bytes':__import__('os').path.getsize(path),'hash':hashlib.sha256(open(path,'rb').read()).hexdigest(),'integrity':'PASS'}))
