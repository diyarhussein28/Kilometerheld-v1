// Kilometerheld — PWA/iOS smoke test (no dependencies, run with `node tests/smoke.mjs`)
// Verifies the static contract of the PWA + iOS changes: files, manifest shape,
// icon dimensions, HTML wiring, service worker, export logic and CSS fixes.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.error('  ✗ ' + name); }
}

console.log('\nFiles');
for (const f of ['manifest.webmanifest', 'sw.js', 'assets/app.js', 'assets/styles.css',
  'assets/icons/apple-touch-icon.png', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png']) {
  check(f + ' exists', existsSync(join(ROOT, f)));
}

console.log('\nManifest');
const manifest = JSON.parse(read('manifest.webmanifest'));
check('name set', typeof manifest.name === 'string' && manifest.name.length > 0);
check('short_name set', typeof manifest.short_name === 'string' && manifest.short_name.length > 0);
check('start_url = ./app.html', manifest.start_url === './app.html');
check('scope = ./', manifest.scope === './');
check('display = standalone', manifest.display === 'standalone');
check('theme_color set', /^#[0-9a-f]{6}$/i.test(manifest.theme_color || ''));
const sizes = manifest.icons.map((i) => i.sizes);
check('icon 192x192', sizes.includes('192x192'));
check('icon 512x512', sizes.includes('512x512'));
check('maskable icon', manifest.icons.some((i) => i.purpose === 'maskable'));

console.log('\nIcons (PNG dimensions)');
function pngSize(p) {
  const b = readFileSync(join(ROOT, p));
  // PNG signature + IHDR: width at offset 16, height at 20 (big-endian uint32).
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
const touch = pngSize('assets/icons/apple-touch-icon.png');
const i192 = pngSize('assets/icons/icon-192.png');
const i512 = pngSize('assets/icons/icon-512.png');
check('apple-touch-icon 180x180', touch.w === 180 && touch.h === 180);
check('icon-192 192x192', i192.w === 192 && i192.h === 192);
check('icon-512 512x512', i512.w === 512 && i512.h === 512);

console.log('\nHTML wiring (all pages)');
const pages = ['index.html', 'app.html', 'agb.html', 'datenschutz.html', 'impressum.html', 'widerruf.html'];
for (const p of pages) {
  const html = read(p);
  check(`${p}: viewport-fit=cover`, html.includes('viewport-fit=cover'));
  check(`${p}: manifest link`, html.includes('rel="manifest"'));
  check(`${p}: apple-touch-icon`, html.includes('apple-touch-icon'));
  check(`${p}: theme-color`, html.includes('name="theme-color"'));
  check(`${p}: apple-mobile-web-app-capable`, html.includes('apple-mobile-web-app-capable'));
  check(`${p}: serviceWorker registration`, html.includes("navigator.serviceWorker.register('sw.js')"));
}

console.log('\nService worker');
const sw = read('sw.js');
check('install handler', sw.includes("addEventListener('install'"));
check('activate handler', sw.includes("addEventListener('activate'"));
check('fetch handler', sw.includes("addEventListener('fetch'"));
check('precaches index + app', ['index.html', 'app.html'].every((f) => sw.includes(f)));
check('precaches styles + app.js', ['assets/styles.css', 'assets/app.js'].every((f) => sw.includes(f)));

console.log('\niOS export logic (app.js)');
const app = read('assets/app.js');
check('iOS detection', app.includes('function isIOS()'));
check('legacy download fallback', app.includes('function legacyDownload'));
check('share sheet (navigator.share)', app.includes('navigator.share({ files:'));
check('capability check (canShare)', app.includes('navigator.canShare'));
check('new-tab fallback for old iOS', app.includes("a.target = '_blank'"));

console.log('\nCSS fixes (styles.css)');
const css = read('assets/styles.css');
check('100dvh (URL-bar fix)', css.includes('100dvh'));
check('safe-area insets', css.includes('env(safe-area-inset-'));
check('16px input anti-zoom rule', /input,\s*select,\s*textarea\s*\{\s*font-size:\s*16px/.test(css));
check('44px touch targets', css.includes('44px'));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
