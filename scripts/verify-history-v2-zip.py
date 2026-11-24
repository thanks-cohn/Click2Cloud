"""Independently verify a ZIP and, optionally, the deterministic browser fixture IDs."""
import hashlib
import json
import sys
import zipfile
from collections import Counter
from pathlib import Path

path = Path(sys.argv[1])
expected = int(sys.argv[2]) if len(sys.argv) == 3 else None
with zipfile.ZipFile(path) as archive:
    assert archive.namelist() == ['history.jsonl', 'manifest.json']
    assert archive.testzip() is None
    manifest = json.loads(archive.read('manifest.json'))
    assert manifest['schemaVersion'] == manifest['exporterVersion'] == 1
    dataset, = manifest['files']
    assert dataset['name'] == 'history.jsonl'
    info = archive.getinfo(dataset['name'])
    assert dataset['bytes'] == info.file_size
    assert dataset['crc32'] == f'{info.CRC:08x}'
    integrity = dataset['integrity']
    assert integrity['algorithm'] == 'SHA-256 chain'
    assert integrity['initialDigest'] == '32 zero bytes'
    digest = bytes(32)
    with archive.open(info) as data:
        while block := data.read(integrity['blockBytes']):
            digest = hashlib.sha256(digest + block).digest()
    assert digest.hex() == integrity['digest']
    previous = None
    written = 0
    providers, outcomes, proofs = Counter(), Counter(), Counter()
    with archive.open(info) as data:
        for line in data:
            item = json.loads(line)
            key = (item['orderAt'], item['recordId'])
            assert previous is None or previous > key
            if expected is not None:
                assert item['recordId'] == f'fixture:{expected - written - 1}'
            previous = key
            written += 1
            providers[item.get('provider') or 'unavailable'] += 1
            outcomes[item.get('status') or 'unavailable'] += 1
            proofs[(item.get('verification') or {}).get('level') or 'unavailable'] += 1
    assert manifest['expectedRecords'] == manifest['writtenRecords'] == written
    assert expected is None or expected == written
    assert manifest['providers'] == providers
    assert manifest['outcomes'] == outcomes
    assert manifest['proofs'] == proofs
    print(json.dumps({'records': written, 'dataBytes': info.file_size, 'sha256Chain': digest.hex(), 'crc32': dataset['crc32']}))
