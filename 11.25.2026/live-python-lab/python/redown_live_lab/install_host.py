"""Install the exact-origin Chrome native host for the current OS user."""
import json
import os
import re
import stat
import subprocess
import sysconfig
from pathlib import Path

from .errors import LabError
from .native_host import EXTENSION_ID, HOST_NAME, ORIGIN, home, private_directory

WINDOWS_REGISTRY = r'Software\Google\Chrome\NativeMessagingHosts' + '\\' + HOST_NAME


def registration_status():
    """Inspect the current user's Chrome registration without exporting paths."""
    if os.name != 'nt':
        return 'NOT_CHECKED_ON_THIS_PLATFORM'
    import winreg
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, WINDOWS_REGISTRY) as key:
            manifest, kind = winreg.QueryValueEx(key, '')
    except FileNotFoundError:
        return 'CURRENT_USER_REGISTRATION_NOT_FOUND'
    except OSError:
        return 'CURRENT_USER_REGISTRATION_UNREADABLE'
    if kind != winreg.REG_SZ or not manifest:
        return 'NATIVE_MANIFEST_INVALID'
    try:
        record = json.loads(Path(manifest).read_text(encoding='utf-8'))
        if (not isinstance(record, dict) or record.get('name') != HOST_NAME or record.get('type') != 'stdio'
                or record.get('allowed_origins') != [ORIGIN] or not isinstance(record.get('path'), str)):
            return 'NATIVE_MANIFEST_INVALID'
        launcher = Path(record['path'])
        if not launcher.is_absolute() or not launcher.is_file():
            return 'NATIVE_LAUNCHER_NOT_INSTALLED'
    except (OSError, ValueError):
        return 'NATIVE_MANIFEST_UNREADABLE'
    return 'CURRENT_USER_REGISTRATION_PRESENT'


def install(extension_id):
    if extension_id != EXTENSION_ID:
        raise LabError('EXTENSION_ID_MISMATCH')
    launcher = Path(sysconfig.get_path('scripts')) / (
        'redown-lab-native.exe' if os.name == 'nt' else 'redown-lab-native')
    if not launcher.is_file():
        raise LabError('NATIVE_LAUNCHER_NOT_INSTALLED', 'Install the package in the CLI virtual environment first.')
    directory = home()
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    info = directory.lstat()
    if not stat.S_ISDIR(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 0x400:
        raise LabError('UNSAFE_NATIVE_DIRECTORY')
    if os.name == 'nt':
        import winreg
        identity = subprocess.check_output(['whoami', '/user', '/fo', 'csv', '/nh'], text=True)
        sid = re.search(r'S-1-[0-9-]+', identity)
        if sid is None:
            raise LabError('NATIVE_DIRECTORY_ACL_UNAVAILABLE')
        # The historical REDOWN installer also restricts this directory to
        # the OS user. A pip-generated executable avoids shell argument quoting.
        subprocess.run(['icacls', str(directory), '/reset'], check=True, stdout=subprocess.DEVNULL)
        subprocess.run(['icacls', str(directory), '/inheritance:r', '/grant:r',
                        f'*{sid.group()}:(OI)(CI)F'], check=True, stdout=subprocess.DEVNULL)
        manifest = directory / (HOST_NAME + '.json')
    elif os.name == 'posix':
        private_directory()
        config = Path(os.environ.get('XDG_CONFIG_HOME') or Path.home() / '.config')
        manifest = config / 'google-chrome' / 'NativeMessagingHosts' / (HOST_NAME + '.json')
        manifest.parent.mkdir(parents=True, exist_ok=True)
    else:
        raise LabError('NATIVE_INSTALL_UNSUPPORTED')

    from .native_host import atomic_private_json
    atomic_private_json(manifest, {'name': HOST_NAME, 'description': 'REDOWN Python Laboratory',
                        'path': str(launcher), 'type': 'stdio', 'allowed_origins': [ORIGIN]})
    if os.name == 'nt':
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, WINDOWS_REGISTRY) as key:
            winreg.SetValueEx(key, '', 0, winreg.REG_SZ, str(manifest))
    return {'status': 'REGISTERED', 'manifest': str(manifest), 'extensionId': EXTENSION_ID,
            'launcher': str(launcher)}
