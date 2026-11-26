"""Read-only bounded corpus inventory, adapted from the included REDOWN inventory."""
import hashlib
import os
import re
import stat
import time
import unicodedata
from pathlib import Path, PurePosixPath

from .errors import LabError
from .fixtures import extension_format
from .transport import CHUNK_BYTES

if os.name == 'nt':
    from . import windows_source
else:
    windows_source = None

RESERVED = frozenset(('con', 'prn', 'aux', 'nul', 'conin$', 'conout$',
                      *(f'com{i}' for i in '123456789¹²³'), *(f'lpt{i}' for i in '123456789¹²³')))
INTERNAL = frozenset(('.redown', '.redown-beta-uploads', '.redown-python-lab'))
FILE_ID = ('st_dev', 'st_ino')
FILE_METADATA = ('st_size', 'st_mtime_ns')


def relative_path(value, empty=False):
    if empty and value == '':
        return value
    if not isinstance(value, str) or not value:
        raise LabError('INVALID_RELATIVE_PATH')
    try:
        encoded = value.encode('utf-8')
    except UnicodeError:
        raise LabError('INVALID_RELATIVE_PATH') from None
    if len(encoded) > 1024 or re.search(r'[\x00-\x1f\x7f\\:<>|?*"]', value):
        raise LabError('INVALID_RELATIVE_PATH', value)
    for part in value.split('/'):
        if (not part or part == '.' or part == '..' or part != part.strip() or part.endswith('.')
                or part.split('.')[0].casefold() in RESERVED or part.casefold() in INTERNAL
                or len(part.encode('utf-16-le')) // 2 > 255):
            raise LabError('INVALID_RELATIVE_PATH', value)
    return value


def name_key(value):
    return unicodedata.normalize('NFC', value).casefold()


def linked(info):
    return stat.S_ISLNK(info.st_mode) or bool(getattr(info, 'st_file_attributes', 0) & 0x400)


def ordinary_directory(directory):
    root = Path(os.path.abspath(directory))
    for path in (*reversed(root.parents), root):
        info = path.lstat()
        if linked(info) or not stat.S_ISDIR(info.st_mode):
            raise LabError('UNSAFE_SOURCE_DIRECTORY')
    return root


def source_path(root, name):
    relative_path(name)
    return root.joinpath(*PurePosixPath(name).parts)


def source_error(code, stage, reason, attributes=(), error=None):
    detail = {'stage': stage, 'reason': reason, 'attributes': list(attributes)}
    if error is not None:
        detail['errno'] = error.errno
        if getattr(error, 'winerror', None) is not None:
            detail['winerror'] = error.winerror
    return LabError(code, detail)


def check_source(info, stage):
    if linked(info) or not stat.S_ISREG(info.st_mode):
        raise source_error('LINK_OR_NONREGULAR', stage, 'UNSAFE_FILE',
                           ('st_mode', 'st_file_attributes'))
    if not info.st_ino:
        raise source_error('SOURCE_IDENTITY_UNAVAILABLE', stage, 'FILE_ID_UNAVAILABLE', ('st_ino',))


def check_binding(expected, observed, stage):
    check_source(observed, stage)
    fields = FILE_ID + FILE_METADATA
    # CPython deprecates Windows stat ctime. Bind path and fd through the
    # device/file index and size/mtime, as in the original REDOWN inventory.
    if windows_source is None:
        fields += ('st_ctime_ns',)
    changed = [field for field in fields if getattr(expected, field) != getattr(observed, field)]
    if changed:
        reason = 'IDENTITY_MISMATCH' if any(field in FILE_ID for field in changed) else 'METADATA_MISMATCH'
        raise source_error('SOURCE_CHANGED', stage, reason, changed)


def chunks(path, size, stop=lambda: None, *, before=None):
    """Read exactly size bytes and verify the opened file and its path binding."""
    stage = 'before-open'
    try:
        stop()
        ordinary_directory(path.parent)
        if before is None:
            before = path.lstat()
        check_source(before, stage)
        if before.st_size != size:
            raise source_error('SOURCE_CHANGED', stage, 'SIZE_MISMATCH', ('st_size',))
        stage = 'open'
        flags = os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0) | getattr(os, 'O_NONBLOCK', 0)
        fd = os.open(path, flags) if windows_source is None else windows_source.open_fd(path)
        with os.fdopen(fd, 'rb', buffering=0) as handle:
            opened = os.fstat(fd)
            check_binding(before, opened, stage)
            change_time = windows_source.change_time(fd) if windows_source is not None else None
            ordinary_directory(path.parent)
            stage = 'read'
            remaining = size
            while remaining:
                stop()
                part = handle.read(min(CHUNK_BYTES, remaining))
                if not part:
                    raise source_error('SOURCE_CHANGED', stage, 'TRUNCATED_READ', ('st_size',))
                remaining -= len(part)
                yield part
            stop()
            stage = 'after-read'
            if handle.read(1):
                raise source_error('SOURCE_CHANGED', stage, 'EXTRA_BYTES', ('st_size',))
            check_binding(opened, os.fstat(fd), stage)
            if windows_source is not None and windows_source.change_time(fd) != change_time:
                raise source_error('SOURCE_CHANGED', stage, 'METADATA_MISMATCH', ('ChangeTime',))
            stage = 'after-read-path'
            ordinary_directory(path.parent)
            check_binding(before, path.lstat(), stage)
    except FileNotFoundError as error:
        if before is not None:
            raise source_error('SOURCE_CHANGED', stage, 'PATH_DISAPPEARED', error=error) from None
        raise source_error('LOCAL_FILE_UNREADABLE', stage, 'PATH_MISSING', error=error) from None
    except OSError as error:
        raise source_error('LOCAL_FILE_UNREADABLE', stage, 'READ_OR_INSPECTION_FAILED', error=error) from None


def digest_file(path, size, stop=lambda: None, *, before=None):
    digest, signature = hashlib.sha256(), b''
    for part in chunks(path, size, stop, before=before):
        if not signature:
            signature = part[:32]
        digest.update(part)
    return digest.hexdigest(), signature


def format_hint(signature):
    for prefix, kind in ((b'\x89PNG\r\n\x1a\n', 'png'), (b'\xff\xd8\xff', 'jpg'),
                         (b'GIF8', 'gif'), (b'%PDF-', 'pdf'), (b'PK\x03\x04', 'zip'),
                         (b'\x1aE\xdf\xa3', 'webm'), (b'ID3', 'mp3')):
        if signature.startswith(prefix):
            return kind
    if signature.startswith(b'RIFF') and signature[8:12] == b'WEBP':
        return 'webp'
    if signature[4:8] == b'ftyp':
        return 'iso-base-media'
    return 'unidentified'


def inventory(directory, *, max_files, max_file_bytes, max_total_bytes, max_entries,
              seconds, excluded=(), progress=lambda _: None):
    root = ordinary_directory(directory)
    for other in excluded:
        other = Path(os.path.abspath(other))
        if other.is_relative_to(root) or root.is_relative_to(other):
            raise LabError('CORPUS_WORKSPACE_OVERLAP', str(root))
    files, empty, seen_paths, pending = [], [], {}, [root]
    entries = total = 0
    deadline = time.monotonic() + seconds

    def stop():
        if time.monotonic() >= deadline:
            raise LabError('INVENTORY_TIMEOUT')

    while pending:
        directory = pending.pop()
        ordinary_directory(directory)
        names = []
        with os.scandir(directory) as listing:
            for entry in listing:
                stop()
                entries += 1
                if entries > max_entries:
                    raise LabError('CORPUS_ENTRY_LIMIT', max_entries)
                names.append(entry.name)
        if not names and directory != root:
            empty.append(directory.relative_to(root).as_posix())
        for basename in sorted(names):
            path = directory / basename
            rel = relative_path(path.relative_to(root).as_posix())
            folded = name_key(rel)
            previous = seen_paths.setdefault(folded, rel)
            if previous != rel:
                raise LabError('CORPUS_PATH_COLLISION', [previous, rel])
            info = path.lstat()
            if linked(info):
                raise LabError('LINK_OR_REPARSE_POINT', rel)
            if stat.S_ISDIR(info.st_mode):
                pending.append(path)
                continue
            if not stat.S_ISREG(info.st_mode):
                raise LabError('LINK_OR_NONREGULAR', rel)
            size = info.st_size
            if len(files) >= max_files or size > max_file_bytes or total + size > max_total_bytes:
                raise LabError('CORPUS_FILE_OR_BYTE_LIMIT', rel)
            digest, signature = digest_file(path, size, stop, before=info)
            total += size
            files.append({'id': 'file-' + hashlib.sha256(rel.encode()).hexdigest()[:24],
                          'kind': 'corpus', 'path': rel, 'format': extension_format(rel),
                          'formatHint': format_hint(signature), 'sizeBytes': size, 'sha256': digest,
                          'target': 'qa'})
            progress({'files': len(files), 'bytes': total})
    return sorted(files, key=lambda row: row['path']), sorted(empty)
