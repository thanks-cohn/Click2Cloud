// Import in this process: the managed executor's isolated test children can
// report a file exit without running its registered node:test cases.
import {readdir} from 'node:fs/promises';
for (const file of (await readdir(new URL('.',import.meta.url))).filter(f=>f.endsWith('.test.mjs')).sort()) {
  await import(new URL(file,import.meta.url));
}
