const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const mainPath = path.join(root, 'Solo_Realms_V18_Main.html');
const pwaDir = path.join(root, 'pwa');
const docsDir = path.join(root, 'docs');
const main = fs.readFileSync(mainPath, 'utf8');
const pwa = fs.readFileSync(path.join(pwaDir, 'index.html'), 'utf8');
const docs = fs.readFileSync(path.join(docsDir, 'index.html'), 'utf8');

function scripts(html) {
  return [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1].trim());
}
function files(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? files(absolute, relative) : [relative];
  });
}
function digest(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function pass(label, condition) {
  if (!condition) throw new Error('FAIL ' + label);
  console.log('PASS ' + label);
}

const mainScripts = scripts(main);
const pwaScripts = scripts(pwa);
const docsScripts = scripts(docs);

pass('Standalone remains a self-contained single-script application', mainScripts.length === 1 && !/<script\s+src=/i.test(main));
pass('PWA contains the same game runtime plus its service-worker registration', pwaScripts.length === 2 && pwaScripts[0] === mainScripts[0] && pwaScripts[1].includes("serviceWorker.register('./sw.js')"));
pass('GitHub Pages HTML is byte-identical to the canonical PWA entry point', docs === pwa && docsScripts.length === 2 && docsScripts[0] === mainScripts[0]);

pass('V21 player-stage hardening is assembled into standalone, PWA and Pages runtimes',
  mainScripts[0].includes("const SR21_VERSION='21.0.0';") && pwaScripts[0] === mainScripts[0] && docsScripts[0] === mainScripts[0]);
pass('V21 skill, difficulty, roll and objective controls are shipped in all player-facing builds',
  ['sr21-skill','sr21-difficulty','sr21-roll-mode','sr21-objective'].every(id => main.includes(id) && pwa.includes(id) && docs.includes(id)));

for (const feature of ['Your first adventure', 'sr20-challenge', 'sr20-skill', 'sr20-roll-state', 'Legacy renown', 'Legend of the Realms']) {
  pass('Standalone, PWA and Pages all include ' + feature,
    main.includes(feature) && pwa.includes(feature) && docs.includes(feature));
}

const pwaManifestBytes = fs.readFileSync(path.join(pwaDir, 'manifest.webmanifest'));
const docsManifestBytes = fs.readFileSync(path.join(docsDir, 'manifest.webmanifest'));
const manifest = JSON.parse(pwaManifestBytes.toString('utf8'));
pass('Pages and PWA manifests are byte-identical and installable', pwaManifestBytes.equals(docsManifestBytes) && manifest.short_name === 'Solo Realms V18' && manifest.display === 'standalone');

const pwaFiles = files(pwaDir);
const docsFiles = files(docsDir);
pass('Pages and PWA contain identical relative file inventories', JSON.stringify(pwaFiles) === JSON.stringify(docsFiles));
for (const relative of pwaFiles) {
  pass('Pages asset matches PWA asset: ' + relative,
    digest(path.join(pwaDir, relative)) === digest(path.join(docsDir, relative)));
}

const serviceWorker = fs.readFileSync(path.join(pwaDir, 'sw.js'), 'utf8');
pass('Service worker cache namespace is versioned for the V18 systems build', serviceWorker.includes('solo-realms-systems-v18'));
for (const [name, dimension] of [['icon-192.png', 192], ['icon-512.png', 512]]) {
  const icon = fs.readFileSync(path.join(pwaDir, 'icons', name));
  pass(name + ' has the expected square PNG dimensions',
    icon.toString('ascii', 1, 4) === 'PNG' && icon.readUInt32BE(16) === dimension && icon.readUInt32BE(20) === dimension);
}

console.log('RESULT release integrity suite passed');
