// Used by BOTH the actual Portal menu and native Chrome menu.
// Source URL or page browsing provenance must never be sent to cloud providers.
export class UnverifiedSaveError extends Error {
  constructor(message = 'Provider did not confirm the upload') {
    super(message);
    this.name = 'UnverifiedSaveError';
  }
}
export async function dispatchSave({ intent, file }, { providers }) {
  if (!intent?.provider || !file?.filename || !(file.bytes instanceof Uint8Array)) {
    throw new TypeError('Save requires a provider intent, filename and Uint8Array bytes');
  }
  const adapter = providers?.[intent.provider];
  if (!adapter || typeof adapter.upload !== 'function') {
    throw new TypeError('Provider adapter is not connected: ' + intent.provider);
  }
  // Pass strictly minimal metadata + source file bytes + destination.
  const receipt = await adapter.upload({
    destination: { bucket: intent.bucket ?? null, path: intent.path ?? '', destinationId: intent.destinationId ?? null },
    filename: file.filename,
    contentType: file.contentType ?? 'application/octet-stream',
    bytes: file.bytes
  });
  if (receipt?.confirmed !== true) throw new UnverifiedSaveError();
  return Object.freeze({
    provider: intent.provider,
    filename: file.filename,
    receiptId: receipt.id ?? null,
    confirmed: true
  });
}
