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
