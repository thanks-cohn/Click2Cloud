// Explicit allowlist: never imports the retired scenario atlas.
for(const p of ['menu-compiler','canonical-menu','engine','chrome-registrar','persistence','universal-file-api','glaciaring','boundary-instrumentation','final-v3p1','oauth-v3p1','external-recovery-v3p1'])await import('./'+p+'.test.mjs');
