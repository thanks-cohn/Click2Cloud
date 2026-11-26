"""Deterministic small fixtures and opaque owner-file MIME classification."""
import hashlib
import io
import struct
import zlib
from importlib.resources import files
from zipfile import ZIP_STORED, ZipFile, ZipInfo

from .errors import LabError

GENERATOR = 'redown-small-fixtures/1'
MAX_GENERATED_BYTES = 8 * 1024**2
ASSET_SIZES = {'jpg': 947, 'gif': 1654, 'webp': 382, 'mp4': 6904, 'webm': 4937, 'mp3': 4510}
ASSETS = {'jpg': 'thumbnail.jpg', 'gif': 'thumbnail.gif', 'webp': 'thumbnail.webp',
          'mp4': 'clip.mp4', 'webm': 'clip.webm', 'mp3': 'tone.mp3'}
MIME = {
    'txt': 'text/plain', 'md': 'text/markdown', 'csv': 'text/csv',
    'json': 'application/json', 'yaml': 'application/yaml', 'xml': 'application/xml',
    'svg': 'image/svg+xml', 'png': 'image/png', 'jpg': 'image/jpeg', 'gif': 'image/gif',
    'webp': 'image/webp', 'pdf': 'application/pdf', 'zip': 'application/zip',
    'cbz': 'application/vnd.comicbook+zip', 'mp4': 'video/mp4', 'webm': 'video/webm',
    'mp3': 'audio/mpeg', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'binary': 'application/octet-stream',
}
FORMAT_ALIASES = {'jpeg': 'jpg', 'yml': 'yaml', 'markdown': 'md'}


def extension_format(path):
    from pathlib import PurePosixPath
    suffix = PurePosixPath(path).suffix.lower().lstrip('.')
    label = FORMAT_ALIASES.get(suffix, suffix)
    return label if label in MIME else 'unknown'


def content_type(label):
    return MIME.get(label, 'application/octet-stream')


def fingerprint(seed, fixture_id):
    return hashlib.sha256(f'{GENERATOR}\0{seed}\0{fixture_id}'.encode()).hexdigest()


def _text(fmt, stamp, size):
    if size == 0 and fmt == 'txt':
        return b''
    templates = {
        'txt': f'REDOWN fixture {stamp}\n',
        'md': f'# REDOWN fixture\n\nDeterministic sample {stamp}.\n',
        'csv': f'name,value\nfixture,{stamp}',
        'json': f'{{"fixture":"{stamp}"}}',
        'yaml': f'fixture: "{stamp}"\n',
        'xml': f'<?xml version="1.0" encoding="UTF-8"?><fixture>{stamp}</fixture>',
        'svg': f'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="40"><title>{stamp}</title>'
               '<rect x="4" y="4" width="56" height="32" rx="4" fill="#287a7b"/></svg>',
    }
    value = templates[fmt].encode()
    if size < len(value):
        raise LabError('GENERATOR_SIZE_UNSUPPORTED')
    if fmt == 'csv':
        # Fill a value cell, preserving two columns and exact length.
        return value + b'a' * (size - len(value))
    return value + b' ' * (size - len(value))


def _png(size, stamp):
    def chunk(kind, payload):
        return struct.pack('>I', len(payload)) + kind + payload + struct.pack('>I', zlib.crc32(kind + payload))
    color = bytes.fromhex(stamp[:6])
    pixels = b''.join(b'\0' + color * 12 for _ in range(12))
    start = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 12, 12, 8, 2, 0, 0, 0))
             + chunk(b'IDAT', zlib.compress(pixels, level=0)))
    end = chunk(b'IEND', b'')
    gap = size - len(start) - len(end)
    if gap == 0:
        return start + end
    if gap < 12:
        raise LabError('GENERATOR_SIZE_UNSUPPORTED')
    return start + chunk(b'raNd', b'\0' * (gap - 12)) + end


def _pdf(size, stamp):
    stream = f'BT /F1 12 Tf 45 700 Td (REDOWN fixture {stamp}) Tj ET'.encode()
    objects = [
        b'<< /Type /Catalog /Pages 2 0 R >>',
        b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
        f'<< /Length {len(stream)} >>\nstream\n'.encode() + stream + b'\nendstream',
        b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ]
    header = b'%PDF-1.4\n'
    positions = []
    for number, obj in enumerate(objects, 1):
        positions.append(len(header))
        header += str(number).encode() + b' 0 obj\n' + obj + b'\nendobj\n'
    trailer = (b'xref\n0 6\n0000000000 65535 f \n'
               + b''.join(f'{offset:010d} 00000 n \n'.encode() for offset in positions)
               + b'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n')
    remaining = size - len(header) - len(trailer) - len(b'0000000000\n%%EOF\n')
    if remaining < 0:
        raise LabError('GENERATOR_SIZE_UNSUPPORTED')
    xref = len(header) + remaining
    return header + b'\n' * remaining + trailer + f'{xref:010d}\n%%EOF\n'.encode()


def _zip(fmt, size, stamp):
    plain = f'REDOWN fixture {stamp}\n'.encode()
    rows = {'fixture.txt': plain}
    if fmt == 'cbz':
        rows = {'001.png': _png(1024, stamp)}
    if fmt == 'docx':
        rows = {
            '[Content_Types].xml': b'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            b'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            b'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            b'</Types>',
            '_rels/.rels': b'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            b'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
            b'Target="word/document.xml"/></Relationships>',
            'word/document.xml': b'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            b'<w:body><w:p><w:r><w:t>' + plain.strip() + b'</w:t></w:r></w:p><w:sectPr/></w:body></w:document>',
        }
    out = io.BytesIO()
    with ZipFile(out, 'w', compression=ZIP_STORED) as archive:
        for name, data in rows.items():
            item = ZipInfo(name, date_time=(2000, 1, 1, 0, 0, 0))
            item.create_system = 3
            item.external_attr = 0o100644 << 16
            archive.writestr(item, data)
    base = out.getvalue()
    extra = size - len(base)
    if not 0 <= extra <= 65535:
        raise LabError('GENERATOR_SIZE_UNSUPPORTED')
    return base[:-2] + struct.pack('<H', extra) + b' ' * extra


def generate(fmt, size, seed, fixture_id):
    # A byte-generation capability, independent of the manifest format and live cap.
    if not 0 <= size <= MAX_GENERATED_BYTES:
        raise LabError('GENERATOR_SIZE_UNSUPPORTED')
    stamp = fingerprint(seed, fixture_id)[:24]
    if fmt in ASSETS:
        value = files(__package__).joinpath('assets', ASSETS[fmt]).read_bytes()
        if len(value) != size:
            raise LabError('GENERATOR_SIZE_UNSUPPORTED', {'format': fmt, 'availableBytes': len(value)})
        return value
    if fmt in ('txt', 'md', 'csv', 'json', 'yaml', 'xml', 'svg'):
        return _text(fmt, stamp, size)
    if fmt == 'png':
        return _png(size, stamp)
    if fmt == 'pdf':
        return _pdf(size, stamp)
    if fmt in ('zip', 'docx', 'cbz'):
        return _zip(fmt, size, stamp)
    if fmt == 'binary':
        pattern = bytes.fromhex(fingerprint(seed, fixture_id))
        return (pattern * ((size + len(pattern) - 1) // len(pattern)))[:size]
    raise LabError('GENERATOR_FORMAT_UNSUPPORTED')
