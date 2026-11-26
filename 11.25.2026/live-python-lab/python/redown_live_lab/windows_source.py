"""Windows source handles with an exact file binding and read-only sharing."""
import ctypes
import msvcrt
import os
from ctypes import wintypes

GENERIC_READ = 0x80000000
FILE_SHARE_READ = 0x1
OPEN_EXISTING = 3
FILE_FLAG_OPEN_REPARSE_POINT = 0x200000
FILE_BASIC_INFO = 0
INVALID_HANDLE_VALUE = wintypes.HANDLE(-1).value


class FileBasicInfo(ctypes.Structure):
    _fields_ = [(name, ctypes.c_int64) for name in
                ('creation_time', 'last_access_time', 'last_write_time', 'change_time')]
    _fields_ += [('attributes', wintypes.DWORD)]


kernel32 = ctypes.WinDLL('kernel32', use_last_error=True)
create_file = kernel32.CreateFileW
create_file.argtypes = (wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, wintypes.LPVOID,
                        wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE)
create_file.restype = wintypes.HANDLE
close_handle = kernel32.CloseHandle
close_handle.argtypes = (wintypes.HANDLE,)
close_handle.restype = wintypes.BOOL
get_file_information = kernel32.GetFileInformationByHandleEx
get_file_information.argtypes = (wintypes.HANDLE, ctypes.c_int, wintypes.LPVOID, wintypes.DWORD)
get_file_information.restype = wintypes.BOOL


def open_fd(path):
    # Refuse concurrent writers/deletes while staging. Windows can defer its
    # last-write timestamp update until the last writing handle closes.
    handle = create_file(os.fspath(path), GENERIC_READ, FILE_SHARE_READ, None,
                         OPEN_EXISTING, FILE_FLAG_OPEN_REPARSE_POINT, None)
    if handle == INVALID_HANDLE_VALUE:
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        return msvcrt.open_osfhandle(handle, os.O_RDONLY | os.O_BINARY | os.O_NOINHERIT)
    except BaseException:
        close_handle(handle)
        raise


def change_time(fd):
    info = FileBasicInfo()
    if not get_file_information(msvcrt.get_osfhandle(fd), FILE_BASIC_INFO,
                                ctypes.byref(info), ctypes.sizeof(info)):
        raise ctypes.WinError(ctypes.get_last_error())
    return info.change_time
