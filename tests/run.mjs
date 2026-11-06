// Import in this process: the managed executor's isolated test children can
// report a file exit without running its registered node:test cases.
import {readdir} from 'node:fs/promises';
// Superseded API v1 and historical auth-export contracts; current replacements
// are final-v3p1, oauth-v3p1 and the real-browser domain-service checks.
const superseded=new Set(['engine-api-focused.test.mjs','cloudflare-oauth.test.mjs','oauth-focused.test.mjs']);
for (const file of (await readdir(new URL('.',import.meta.url))).filter(f=>f.endsWith('.test.mjs')&&!superseded.has(f)).sort()) {
  await import(new URL(file,import.meta.url));
}
