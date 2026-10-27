// A short fingerprint of every file the service worker caches (except sw.js itself).
// The cache name carries it, so any change to the app gives phones a fresh cache.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function shellFiles(root) {
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');
  return [...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1] || 'index.html');
}

export function shellHash(root) {
  const hash = createHash('sha256');
  for (const f of [...new Set(shellFiles(root))].sort()) {
    hash.update(f);
    // Line endings differ between Windows checkouts and GitHub; hash the text the same either way.
    const buf = readFileSync(join(root, f));
    hash.update(/\.(png)$/.test(f) ? buf : buf.toString('utf8').replace(/\r\n/g, '\n'));
  }
  return hash.digest('hex').slice(0, 10);
}
