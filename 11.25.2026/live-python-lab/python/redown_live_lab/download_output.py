"""Publish a complete Laboratory file exclusively, then reopen it for evidence."""
import errno
import hashlib
import os
import stat
import tempfile
from pathlib import Path

from .errors import LabError
from .inventory import chunks, linked, name_key, ordinary_directory, relative_path


def prepare_output(root, relative):
    """Create ordinary descendants inside the campaign's private output tree."""
    parts = relative_path(relative).split('/')
    root = Path(root)
    ordinary_directory(root.parent)
    root.mkdir(mode=0o700, exist_ok=True)
    parent = ordinary_directory(root)
    for part in parts[:-1]:
        parent = parent / part
        parent.mkdir(mode=0o700, exist_ok=True)
        ordinary_directory(parent)
    return parent / parts[-1]


def verify_disk(path, size, expected, stop=lambda: None):
    ordinary_directory(path.parent)
    before = path.lstat()
    if linked(before) or not stat.S_ISREG(before.st_mode) or before.st_size != size:
        raise LabError('DOWNLOAD_DISK_IDENTITY_MISMATCH')
    digest = hashlib.sha256()
    for data in chunks(path, size, stop, before=before):
        digest.update(data)
    calculated = digest.hexdigest()
    if calculated != expected:
        raise LabError('DOWNLOAD_DISK_SHA256_MISMATCH')
    return {'diskSha256': calculated, 'diskBytes': size, 'localEvidence': 'REOPENED_FINAL_SHA256'}


class DownloadOutput:
    def __init__(self, path):
        self.path = path
        self.temporary = None
        self.stream = None
        self.published = False

    def __enter__(self):
        if self.path is not None:
            ordinary_directory(self.path.parent)
            canonical = name_key(self.path.name)
            if any(name_key(item.name) == canonical for item in self.path.parent.iterdir()):
                raise LabError('DOWNLOAD_DESTINATION_CONFLICT')
            self.stream = tempfile.NamedTemporaryFile(mode='wb', dir=self.path.parent,
                                                       prefix='.redown-part-', delete=False)
            self.temporary = Path(self.stream.name)
        return self

    def write(self, data):
        if self.stream is not None:
            self.stream.write(data)

    def publish(self, size, expected, stop):
        if self.stream is None:
            return {}
        self.stream.flush()
        os.fsync(self.stream.fileno())
        self.stream.close()
        stop()
        ordinary_directory(self.path.parent)
        try:
            # The same-filesystem hard link creates the final name atomically
            # and fails if it already exists, including a concurrent publisher.
            os.link(self.temporary, self.path)
            self.published = True
        except FileExistsError:
            raise LabError('DOWNLOAD_DESTINATION_CONFLICT') from None
        except OSError as error:
            if error.errno == errno.ENOSPC:
                raise
            raise LabError('DOWNLOAD_ATOMIC_PUBLICATION_UNAVAILABLE') from None
        if os.name != 'nt':
            directory = os.open(self.path.parent, os.O_RDONLY | os.O_DIRECTORY)
            try:
                os.fsync(directory)
            finally:
                os.close(directory)
        return verify_disk(self.path, size, expected, stop)

    def __exit__(self, *_):
        if self.stream is not None:
            try:
                self.stream.close()
            finally:
                self.temporary.unlink(missing_ok=True)
