// Explicit allowlist: never imports the retired scenario atlas.
for(const p of ['menu-compiler','canonical-menu','engine','chrome-registrar','persistence','universal-file-api','glaciaring','boundary-instrumentation','final-v3p1','oauth-v3p1','external-recovery-v3p1','main-merge-compatibility','cloudflare-integration','cloudflare-onboarding','cloudflare-deployment'])await import('./'+p+'.test.mjs');

await import('./p0-repair.test.mjs');

await import('./provider-menu-visibility.test.mjs');

await import("./nov06-native-menu.test.mjs");

await import("./nov06-explorer.test.mjs");

await import("./nov07-auth-shelf.test.mjs");

await import("./workings.test.mjs");
await import('./shelf-message-boundary.test.mjs');

await import('./issue4-v1.test.mjs');

await import('./worker-permission.test.mjs');

await import('./nine-scopes-parity.test.mjs');

await import('./save-receipt-repair.test.mjs');

await import('./redown-restoration.test.mjs');
await import('./restoration-files.test.mjs');

await import('./latest-quick-rules.test.mjs');

await import('./permanent-destinations.test.mjs');

await import('./zero-stutter.test.mjs');

await import("./destination-ready.test.mjs");

await import("./image-gallery.test.mjs");

await import("./boot-login.test.mjs");

await import("./current-recovery.test.mjs");

await import("./reliability-ratchet.test.mjs");

await import('./phased-narrow.test.mjs');

import './composition-remaining.test.mjs';

import './gallery-loading.test.mjs';

import './object-provenance.test.mjs';
await import('./depth-working-save.test.mjs');
await import('./depth-plan-recovery.test.mjs');
await import('./cloudflare-setup-ui.test.mjs');
await import('./cloudflare-destination-recovery.test.mjs');

await import('./debug-preference.test.mjs');

// Isolated two-tier recorder gates; no provider credentials or user profile.
await import('./recorder.test.mjs');

await import('./mv3-import-policy.test.mjs');

await import('./checkout-integrity.test.mjs');

await import('./depth-authority-race.test.mjs');

await import('./depth-fetch-diagnostics.test.mjs');
await import('./recorder-complete-export.test.mjs');
await import('./recorder-native-truth.test.mjs');
await import('./recorder-measurements.test.mjs');
