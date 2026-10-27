// Run after changing any app file: node tools/bump-cache.mjs
// Rewrites the cache name in sw.js so installed apps download the new version.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shellHash } from './shell-hash.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(ROOT, 'sw.js');
const name = `vt-${shellHash(ROOT)}`;
writeFileSync(file, readFileSync(file, 'utf8').replace(/const CACHE = '[^']*';/, `const CACHE = '${name}';`));
console.log(`sw.js cache: ${name}`);
