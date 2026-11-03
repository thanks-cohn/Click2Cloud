// Click2Cloud V3+1's reuse boundary for the REDOWN Universal File API.
// The three implementation modules alongside this file were copied unchanged
// from thanks-cohn/REDOWN/extension/beta/ on 2026-11-03.
// Construct a provider with injected, trusted host transports. This module
// deliberately does not create an unauthenticated network or Worker proxy.
import {createFileApi} from './file-api.mjs';
import {createR2Adapter} from './r2-adapter.mjs';

export {createFileApi,location,key,prefix,name,entry} from './file-api.mjs';
export {providerDefaults,operationOptions,validatePreferences,resolveOptions} from './configuration.mjs';
export {createR2Adapter,previewType} from './r2-adapter.mjs';

export function createClick2CloudFileApi({send,http}={}) {
  if (typeof send !== 'function') {
    throw new TypeError('Provide the authenticated REDOWN background-message transport.');
  }
  if (!http || typeof http.request !== 'function' || typeof http.boundedFetch !== 'function') {
    throw new TypeError('Provide the authenticated REDOWN Cloudflare API transport.');
  }
  return createFileApi(createR2Adapter({send,http}));
}
