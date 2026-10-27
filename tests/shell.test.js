import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function listFiles(dir) {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((d) => {
    const rel = `${dir}/${d.name}`;
    return d.isDirectory() ? listFiles(rel) : [rel];
  });
}

test('service worker precaches every app file', () => {
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const shell = [...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]);
  const needed = [
    '', 'index.html', 'manifest.webmanifest',
    ...listFiles('js'), ...listFiles('css'), ...listFiles('icons'),
  ];
  for (const f of needed) assert.ok(shell.includes(f), `sw.js is missing ./${f}`);
  for (const f of shell.filter(Boolean)) assert.ok(existsSync(join(ROOT, f)), `sw.js lists missing file ./${f}`);
});

test('manifest is installable from a GitHub Pages subfolder', () => {
  const m = JSON.parse(readFileSync(join(ROOT, 'manifest.webmanifest'), 'utf8'));
  assert.equal(m.display, 'standalone');
  assert.equal(m.start_url, './');
  assert.equal(m.scope, './');
  assert.ok(m.icons.some((i) => i.sizes === '512x512'));
});

test('index.html links the manifest and Apple icon with relative paths', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(html, /rel="apple-touch-icon" href="\.\/icons\/apple-touch-icon\.png"/);
});
