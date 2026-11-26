"""Adapted from the included Python REDOWN native transport (bounded frames)."""
import base64
import binascii
import hashlib
import json
import os
import re
import socket
import time

from . import PROTOCOL
from .errors import LabError
from .native_host import atomic_private_json, private_directory, read_frame, write_frame

CHUNK_BYTES = 128 * 1024
CODE = re.compile(r'[A-Z][A-Z0-9_]{1,79}\Z')


def connect():
    for attempt in range(5):
        try:
            return ExtensionClient()
        except LabError as error:
            if error.code != 'LAB_CLIENT_BUSY' or attempt == 4:
                raise
            time.sleep(0.1 * (attempt + 1))


class ExtensionClient:
    """An authenticated socket with a single active transfer and typed failures."""

    def __init__(self, code=None):
        self.socket = None
        self.stream = None
        stage = 'native-endpoint'
        try:
            directory = private_directory()
            endpoint = json.loads((directory / 'connection.json').read_text(encoding='utf-8'))
            if not isinstance(endpoint, dict) or endpoint.get('version') != 1 or endpoint.get('host') != '127.0.0.1':
                raise LabError('EXTENSION_UNAVAILABLE', {'stage': stage, 'reason': 'NATIVE_ENDPOINT_INVALID'})
            if endpoint.get('expiresAt', 0) <= time.time():
                raise LabError('EXTENSION_UNAVAILABLE', {'stage': stage, 'reason': 'NATIVE_ENDPOINT_EXPIRED'})
            stage = 'pairing'
            if code is None:
                try:
                    saved = json.loads((directory / 'ticket.json').read_text(encoding='utf-8'))
                except FileNotFoundError:
                    raise LabError('PAIRING_REQUIRED') from None
                if not isinstance(saved, dict) or saved.get('relayId') != endpoint.get('relayId'):
                    raise LabError('PAIRING_REQUIRED')
                if saved.get('expiresAt', 0) <= time.time() * 1000:
                    raise LabError('LAB_AUTHORIZATION_EXPIRED')
            stage = 'native-socket'
            self.socket = socket.create_connection(('127.0.0.1', int(endpoint['port'])), timeout=40)
            self.stream = self.socket.makefile('rwb', buffering=0)
            stage = 'native-handshake'
            write_frame(self.stream, {'key': endpoint['key']})
            if 'clientId' not in read_frame(self.stream):
                raise LabError('LOCAL_AUTH_DENIED')
            stage = 'pairing'
            result = self.query('pair', code=code, ticket=None if code is not None else saved['ticket'])
            self.scope_id = result['scopeId']
            self.expires_at = result['expiresAt']
            if code is not None:
                atomic_private_json(directory / 'ticket.json', {**result, 'relayId': endpoint['relayId']})
        except (OSError, ValueError, TypeError, KeyError, EOFError) as error:
            self.close()
            if isinstance(error, FileNotFoundError) and stage == 'native-endpoint':
                reason = 'NATIVE_ENDPOINT_MISSING'
            elif isinstance(error, ConnectionRefusedError):
                reason = 'NATIVE_SOCKET_REFUSED'
            elif isinstance(error, TimeoutError):
                reason = 'NATIVE_SOCKET_TIMEOUT'
            elif isinstance(error, EOFError):
                reason = 'NATIVE_SOCKET_CLOSED'
            else:
                reason = 'NATIVE_LOCAL_STATE_UNAVAILABLE'
            raise LabError('EXTENSION_UNAVAILABLE', {'stage': stage, 'reason': reason}) from None
        except BaseException:
            self.close()
            raise

    def query(self, method, **inputs):
        if self.stream is None:
            raise LabError('EXTENSION_DISCONNECTED')
        try:
            write_frame(self.stream, {'method': method, 'input': inputs})
            result = read_frame(self.stream)
        except KeyboardInterrupt:
            # The stream may be between frame boundaries. Closing it lets the
            # extension cancel the disconnected lease without a second RPC.
            self.close()
            raise
        except socket.timeout:
            self.close()
            raise LabError('TIMEOUT_UNCERTAIN') from None
        except (OSError, EOFError):
            self.close()
            raise LabError('EXTENSION_DISCONNECTED', {'stage': 'native-socket', 'reason': 'NATIVE_SOCKET_CLOSED'}) from None
        except ValueError:
            self.close()
            raise LabError('INVALID_FRAME') from None
        if result.get('apiVersion') != PROTOCOL:
            self.close()
            raise LabError('WIRE_VERSION_MISMATCH')
        if result.get('state') == 'failed':
            code = result.get('error', {}).get('code')
            raise LabError(code if isinstance(code, str) and CODE.fullmatch(code) else 'INVALID_PROVIDER_RESPONSE')
        if result.get('state') != 'available' or not isinstance(result.get('data'), dict):
            raise LabError('INVALID_PROVIDER_RESPONSE')
        return result['data']

    def close(self):
        if self.stream is not None:
            self.stream.close()
            self.stream = None
        if self.socket is not None:
            self.socket.close()
            self.socket = None

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()

    def describe(self):
        result = self.query('describe')
        if result.get('protocol') != PROTOCOL or result.get('scopeId') != self.scope_id:
            raise LabError('WIRE_VERSION_MISMATCH')
        return result

    def cleanup(self, method, **inputs):
        try:
            self.query(method, **inputs)
        except LabError:
            pass

    def wait(self, identity, *, notify, stop):
        while True:
            stop()
            result = self.query('poll', id=identity)
            notify(result['progress'])
            if result['state'] == 'terminal':
                return result['result']
            if result['state'] != 'running':
                raise LabError('INVALID_TRANSFER_STATE')
            time.sleep(0.20)

    def stage(self, identity, row, timeout, chunks, notify, stop):
        result = self.query('uploadOpen', id=identity, path=row['remotePath'], size=row['sizeBytes'],
                            sha256=row['sha256'], timeout=timeout, contentType=row['contentType'])
        if result != {'id': identity, 'chunkBytes': CHUNK_BYTES}:
            raise LabError('WIRE_VERSION_MISMATCH')
        count = 0
        for chunk in chunks:
            stop()
            answer = self.query('uploadAppend', id=identity, offset=count,
                                bytesBase64=base64.b64encode(chunk).decode('ascii'))
            count += len(chunk)
            if answer['bytes'] != count:
                raise LabError('STREAM_SIZE_MISMATCH')
            notify({'phase': 'local-staging', 'bytes': count})
        if count != row['sizeBytes']:
            raise LabError('SOURCE_CHANGED')

    def read(self, identity, row, timeout, receipt, output, notify, stop, publication=None):
        receipt = receipt or {}
        self.query('readOpen', id=identity, path=row['remotePath'], size=row['sizeBytes'],
                   etag=receipt.get('etag'), version=receipt.get('version'), timeout=timeout)
        try:
            observed = self.wait(identity, notify=notify, stop=stop)
            if observed['state'] != 'PASS':
                return observed
            return self.pull(identity, row, observed, output, notify, stop, publication)
        except (KeyboardInterrupt, LabError, OSError):
            self.cleanup('cancel', id=identity)
            raise
        finally:
            self.cleanup('closeTransfer', id=identity)

    def pull(self, identity, row, observed, output, notify, stop, publication=None):
        from .download_output import DownloadOutput

        count, digest = 0, hashlib.sha256()
        with DownloadOutput(output) as sink:
            while True:
                stop()
                frame = self.query('pull', id=identity, offset=count)
                try:
                    value = base64.b64decode(frame['bytesBase64'], validate=True)
                except (binascii.Error, KeyError, ValueError):
                    raise LabError('INVALID_FRAME_BYTES') from None
                if len(value) > CHUNK_BYTES or not value and not frame['done']:
                    raise LabError('STREAM_SIZE_MISMATCH')
                count += len(value)
                if count != frame['offset'] or count > row['sizeBytes']:
                    raise LabError('STREAM_SIZE_MISMATCH')
                digest.update(value)
                sink.write(value)
                notify({'phase': 'verified-bytes-to-cli', 'bytes': count})
                if frame['done']:
                    break
            calculated = digest.hexdigest()
            trusted = row.get('sha256')
            if count != row['sizeBytes'] or calculated != observed['sha256'] or trusted is not None and calculated != trusted:
                raise LabError('READBACK_SHA256_MISMATCH')
            stop()
            if output is not None and publication:
                publication('downloadPublishRequested', count, calculated)
            try:
                disk = sink.publish(count, calculated, stop)
            except (LabError, OSError):
                if sink.published:
                    raise LabError('DOWNLOAD_PUBLICATION_UNCONFIRMED') from None
                raise
        return {**observed, 'clientSha256': calculated, 'clientBytes': count,
                'savedCopy': str(output) if output is not None else None,
                'independentSourceSha256': trusted is not None, **disk}
