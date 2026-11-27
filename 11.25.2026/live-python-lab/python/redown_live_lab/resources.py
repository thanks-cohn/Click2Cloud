"""Bounded local resource samples for explicit Laboratory campaigns."""
import errno
import os
from pathlib import Path
import shutil
import time

from .errors import LabError

MIB = 1024 * 1024
DISK_RESERVE = 4 * MIB
MEMORY_RESERVE = 32 * MIB
SAMPLE_SECONDS = 5
MAX_JOURNAL_SAMPLES = 256


def local_resource_error(error):
    if isinstance(error, MemoryError):
        return 'LOCAL_MEMORY_EXHAUSTED'
    if error.errno in (errno.ENOSPC, errno.EDQUOT):
        return 'LOCAL_DISK_EXHAUSTED'
    return 'LOCAL_IO_FAILED'


if os.name == 'nt':
    import ctypes
    from ctypes import wintypes

    class MemoryStatus(ctypes.Structure):
        _fields_ = [('length', wintypes.DWORD), ('load', wintypes.DWORD)] + [
            (field, ctypes.c_ulonglong) for field in ('totalPhysical', 'availablePhysical', 'totalPageFile',
                'availablePageFile', 'totalVirtual', 'availableVirtual', 'availableExtendedVirtual')]

    class ProcessMemory(ctypes.Structure):
        _fields_ = [('cb', wintypes.DWORD), ('pageFaultCount', wintypes.DWORD)] + [
            (field, ctypes.c_size_t) for field in ('peakWorkingSet', 'workingSet', 'quotaPeakPaged',
                'quotaPaged', 'quotaPeakNonPaged', 'quotaNonPaged', 'pagefile', 'peakPagefile', 'privateUsage')]

    _kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    _memory_status = _kernel.GlobalMemoryStatusEx
    _memory_status.argtypes = (ctypes.POINTER(MemoryStatus),)
    _memory_status.restype = wintypes.BOOL
    _open_process = _kernel.OpenProcess
    _open_process.argtypes = (wintypes.DWORD, wintypes.BOOL, wintypes.DWORD)
    _open_process.restype = wintypes.HANDLE
    _close_handle = _kernel.CloseHandle
    _close_handle.argtypes = (wintypes.HANDLE,)
    _close_handle.restype = wintypes.BOOL
    _process_memory = ctypes.WinDLL('psapi', use_last_error=True).GetProcessMemoryInfo
    _process_memory.argtypes = (wintypes.HANDLE, ctypes.POINTER(ProcessMemory), wintypes.DWORD)
    _process_memory.restype = wintypes.BOOL


def _linux_kib(path, fields):
    values = {}
    try:
        with Path(path).open(encoding='ascii') as source:
            for line in source:
                name, _, value = line.partition(':')
                if name in fields:
                    values[fields[name]] = int(value.split()[0]) * 1024
    except (OSError, ValueError, UnicodeError):
        pass
    return values


def process_memory(pid):
    if os.name == 'nt':
        handle = _open_process(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
        if not handle:
            return {}
        try:
            info = ProcessMemory(ctypes.sizeof(ProcessMemory))
            if _process_memory(handle, ctypes.byref(info), info.cb):
                return {'workingSetBytes': info.workingSet, 'peakWorkingSetBytes': info.peakWorkingSet,
                        'privateCommitBytes': info.privateUsage}
        finally:
            _close_handle(handle)
        return {}
    return _linux_kib(f'/proc/{pid}/status', {'VmRSS': 'workingSetBytes', 'VmHWM': 'peakWorkingSetBytes',
                                             'RssAnon': 'anonymousResidentBytes'})


def system_memory():
    if os.name == 'nt':
        info = MemoryStatus(ctypes.sizeof(MemoryStatus))
        if _memory_status(ctypes.byref(info)):
            return {'availablePhysicalBytes': info.availablePhysical, 'availableCommitBytes': info.availablePageFile}
        return {}
    return _linux_kib('/proc/meminfo', {'MemAvailable': 'availablePhysicalBytes'})


def sample_resources(path):
    return {**system_memory(), 'freeDiskBytes': shutil.disk_usage(path).free, **process_memory(os.getpid())}


class CampaignResources:
    def __init__(self, path, journal):
        self.path, self.journal = path, journal
        self.next_at, self.sample_count = 0, 0
        self.latest, self.start, self.minima, self.peaks = {}, {}, {}, {}

    def observe(self, stage, *, attempt_count=0, force=False, required_disk=DISK_RESERVE, guard=True):
        now = time.monotonic()
        if now >= self.next_at or force:
            self.latest = sample_resources(self.path)
            if not self.sample_count:
                self.start = self.latest
            self.sample_count += 1
            self.next_at = now + SAMPLE_SECONDS
            for key, value in self.latest.items():
                if key in ('availablePhysicalBytes', 'availableCommitBytes', 'freeDiskBytes'):
                    self.minima[key] = min(self.minima.get(key, value), value)
                else:
                    self.peaks[key] = max(self.peaks.get(key, value), value)
            if self.sample_count <= MAX_JOURNAL_SAMPLES or stage == 'end':
                self.journal.append('resourceSample', stage=stage, attemptedOperations=attempt_count, **self.latest)
        if not guard:
            return
        low = [(key, value, MEMORY_RESERVE) for key, value in self.latest.items()
               if key in ('availablePhysicalBytes', 'availableCommitBytes') and value < MEMORY_RESERVE]
        if self.latest['freeDiskBytes'] < required_disk:
            low.append(('freeDiskBytes', self.latest['freeDiskBytes'], required_disk))
        if low:
            fields = [{'metric': key, 'availableBytes': value, 'minimumBytes': threshold}
                      for key, value, threshold in low]
            self.journal.append('resourceRejected', stage=stage, requiredHeadroom=fields)
            raise LabError('LOCAL_RESOURCE_HEADROOM_LOW', {'requiredHeadroom': fields})

    def summary(self):
        return {'sampleCount': self.sample_count, 'minimumObserved': self.minima, 'peakObserved': self.peaks,
                'start': self.start, 'end': self.latest, 'sampleIntervalSeconds': SAMPLE_SECONDS,
                'localDiskReserveBytes': DISK_RESERVE, 'physicalAndCommitReserveBytes': MEMORY_RESERVE}
