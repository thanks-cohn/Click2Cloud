const channel = 'redown-basic-v1';
const genericFailure = 'The browser could not start the download or the download was cancelled.';
const failures = {
  EXPORT_TOO_LARGE: 'The retained diagnostics exceed the 16 MiB local export limit. No events were deleted.',
  STORAGE_UNAVAILABLE: 'Other cloud provider diagnostics are unavailable. Try again after storage is available.',
  DOWNLOAD_CANCELLED: 'Download cancelled.',
  CANCELLED: 'Download cancelled.',
};

export function createBasicDiagnosticsExport({runtime, confirm}) {
  let button, status, pending = false, result = '';
  function paint() {
    button.disabled = pending;
    button.setAttribute('aria-busy', String(pending));
    status.textContent = result;
  }
  async function download() {
    if (pending) return;
    if (!confirm('Export private RAW diagnostics for Google Drive, OneDrive, and Dropbox? Review the ZIP before sharing.')) {
      result = 'Export cancelled.';
      paint();
      return;
    }
    pending = true;
    result = 'Preparing the diagnostics ZIP…';
    paint();
    try {
      const reply = await runtime.sendMessage({channel, api: 1, op: 'diagnostics.exportZip', input: {}});
      const id = reply?.value?.downloadId;
      if (reply?.ok === true && Number.isSafeInteger(id) && id >= 0) {
        result = 'Download initiated. Check your browser downloads for progress.';
      } else {
        const code = reply?.error?.code;
        result = Object.hasOwn(failures, code) ? failures[code] : genericFailure;
      }
    } catch {
      result = genericFailure;
    } finally {
      pending = false;
      paint();
    }
  }
  return {
    mount(host) {
      host.innerHTML = `<p id="basic-diagnostics-description" class="muted">Google Drive, OneDrive, and Dropbox. The RAW ZIP contains private diagnostic data.</p>
        <button id="export-basic-diagnostics" type="button" aria-describedby="basic-diagnostics-description">Export Other Cloud Provider Diagnostics</button>
        <p id="basic-diagnostics-status" class="muted" role="status" aria-atomic="true"></p>`;
      button = host.querySelector('#export-basic-diagnostics');
      status = host.querySelector('#basic-diagnostics-status');
      button.addEventListener('click', download);
      paint();
    },
  };
}
