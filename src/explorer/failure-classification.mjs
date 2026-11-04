// Source-backed classification of the protected adapter's material rejection branches.
// Matching recognizes gateway evidence; it does not certify hidden provider internals.
export const providerFailureManifest=Object.freeze([
  ['MESSAGE_LOST','r2-adapter.mjs:13','Connection lost before a final result.'],
  ['MESSAGE_TIMEOUT','r2-adapter.mjs:15','No final response.'],
  ['WRITE_CANCELLED_AFTER_DISPATCH','r2-adapter.mjs:16','Cancellation requested after dispatch.'],
  ['READ_CANCELLED','r2-adapter.mjs:16','Operation cancelled.'],
  ['PROVIDER_RESULT_UNCONFIRMED','r2-adapter.mjs:20','Cloudflare did not confirm this request.'],
  ['LISTING_INVALID','r2-adapter.mjs:47','Cloudflare returned an unreadable listing.'],
  ['CURSOR_INVALID','r2-adapter.mjs:49','Cloudflare returned an invalid continuation token.'],
  ['CURSOR_INCOMPLETE','r2-adapter.mjs:51','Cloudflare returned an incomplete page.'],
  ['METADATA_PAGE_LIMIT','r2-adapter.mjs:56','Metadata lookup exceeded its page limit.'],
  ['CURSOR_REPEATED','r2-adapter.mjs:56','Repeated metadata page.'],
  ['STAGING_VERIFY_STALLED','r2-adapter.mjs:67','Upload verification stalled.'],
  ['STAGING_READBACK_FAILED','r2-adapter.mjs:73','Uploaded bytes could not be read back.'],
  ['STAGING_EXTRA_BYTES','r2-adapter.mjs:79','Upload read-back contains extra bytes.'],
  ['STAGING_BYTES_MISMATCH','r2-adapter.mjs:83','Upload read-back differs from the original file.'],
  ['STAGING_SHORT_READ','r2-adapter.mjs:88','Upload read-back ended early.'],
  ['CONFLICT_POLICY_INVALID','r2-adapter.mjs:93','Choose a conflict policy.'],
  ['SELECTION_EMPTY','r2-adapter.mjs:94','Select at least one item.'],
  ['SAME_DESTINATION','r2-adapter.mjs:99','Source and destination are the same.'],
  ['WORKER_CONNECTION_FAILED','r2-adapter.mjs:125','Bucket Worker connection failed'],
  ['ARCHIVE_RESULT_UNCONFIRMED','r2-adapter.mjs:135','Archive extraction was not confirmed.'],
  ['INSPECT_SIZE_LIMIT','r2-adapter.mjs:161','Choose a practice file no larger than 16 MiB'],
  ['INSPECT_READ_FAILED','r2-adapter.mjs:163','The file could not be checked.'],
  ['INSPECT_STREAM_LIMIT','r2-adapter.mjs:165','Practice file exceeds the checking budget.'],
  ['OBJECT_CHANGED_DURING_READ','r2-adapter.mjs:170','The file changed while it was being checked.'],
  ['UPLOAD_INPUT_INVALID','r2-adapter.mjs:180','Choose a local file.'],
  ['UPLOAD_SIZE_LIMIT','r2-adapter.mjs:181','This beta uses the existing 300 MB'],
  ['STAGING_UPLOAD_UNCONFIRMED','r2-adapter.mjs:192','Upload was not confirmed.'],
  ['STAGING_SIZE_MISMATCH','r2-adapter.mjs:194','Uploaded file size could not be verified.'],
  ['FINAL_DESTINATION_UNCONFIRMED','r2-adapter.mjs:200','Final upload destination was not confirmed.'],
  ['STREAM_SINK_REQUIRED','r2-adapter.mjs:208','A streaming sink is required.'],
  ['PREVIEW_SELECTION_INVALID','r2-adapter.mjs:218','Choose a file to preview.'],
  ['PREVIEW_TYPE_UNSUPPORTED','r2-adapter.mjs:219','Inline preview is unavailable'],
  ['PREVIEW_READ_FAILED','r2-adapter.mjs:222','Cloudflare could not read this preview.'],
  ['PREVIEW_SIZE_LIMIT','r2-adapter.mjs:224','Preview exceeds the configured memory budget.'],
  ['FOLDER_DOWNLOAD_UNSUPPORTED','r2-adapter.mjs:231','Folder downloads are not implemented'],
  ['DOWNLOAD_INTERRUPTED','r2-adapter.mjs:246','Chrome interrupted the download:'],
  ['SOURCE_URL_INVALID','r2-adapter.mjs:251','Enter an HTTP or HTTPS source URL without credentials.'],
  ['LOCATION_REQUIRED','file-api.mjs:3','Choose a cloud account and bucket first.'],
  ['OBJECT_PATH_INVALID','file-api.mjs:7','Invalid object path.'],
  ['NAME_WHITESPACE_INVALID','file-api.mjs:12','Leading or trailing spaces in new names'],
  ['NAME_INVALID','file-api.mjs:12','Enter one file or folder name, without slashes.'],
  ['PREFERENCES_UNAVAILABLE','file-api.mjs:22','This adapter has no runtime preferences.'],
  ['BATCH_CONCURRENCY_INVALID','file-api.mjs:43','batchConcurrency must be a positive safe integer.'],
  ['PREFERENCES_INVALID','configuration.mjs:17','Preferences must be an object.'],
  ['PREFERENCE_UNSUPPORTED','configuration.mjs:19','Unsupported option: ']
].map(([code,source,messagePrefix])=>Object.freeze({code,source:'src/explorer/'+source,messagePrefix})));
const httpCodes=Object.freeze({HTTP_400:'PROVIDER_BAD_REQUEST',HTTP_401:'PROVIDER_AUTH_REQUIRED',HTTP_403:'PROVIDER_PERMISSION_DENIED',HTTP_404:'PROVIDER_NOT_FOUND',HTTP_409:'PROVIDER_CONFLICT',HTTP_429:'PROVIDER_RATE_LIMITED'});
export function classifyProviderFailure(result) {
  if(typeof result?.code==='string'){
    if(httpCodes[result.code])return httpCodes[result.code];
    if(/^HTTP_5\d\d$/.test(result.code))return 'PROVIDER_UNAVAILABLE';
  }
  if(typeof result?.error==='string'){
    for(const row of providerFailureManifest)if(result.error.startsWith(row.messagePrefix))return row.code;
  }
  return 'PROVIDER_FAILURE_UNKNOWN';
}
