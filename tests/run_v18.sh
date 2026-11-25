#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
python3 tools/build_v18.py
node --check source/solo_realms_v18.js
node --check pwa/sw.js
for suite in multiplayer legacy ui pwa rules_campaign resource reactive reliability systems; do
  node "tests/solo_realms_v18_${suite}_test.cjs"
done
node - <<'NODE'
const fs=require('node:fs');
const manifest=JSON.parse(fs.readFileSync('pwa/manifest.webmanifest','utf8'));
const main=fs.readFileSync('Solo_Realms_V18_Main.html','utf8');
const pwa=fs.readFileSync('pwa/index.html','utf8');
const sw=fs.readFileSync('pwa/sw.js','utf8');
const scripts=s=>[...s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1].trim());
if(manifest.short_name!=='Solo Realms V18'||manifest.display!=='standalone')throw Error('Invalid V18 PWA manifest');
if(!sw.includes('solo-realms-systems-v18'))throw Error('V18 service worker cache namespace missing');
const mainScripts=scripts(main),pwaScripts=scripts(pwa);
if(mainScripts.length!==1||/<script\s+src=/i.test(main))throw Error('Main HTML is not a single self-contained script document');
if(pwaScripts.length!==2||!pwaScripts[1].includes("serviceWorker.register('./sw.js')"))throw Error('PWA app or service-worker registration script missing');
if(mainScripts[0]!==pwaScripts[0])throw Error('Standalone and PWA application scripts differ');
if(!main.includes("const SR12_VERSION = '18.0.0';")||!main.includes("const SR18_VERSION='18.0.0';"))throw Error('Main HTML version markers missing');
if(!pwa.includes('Solo Realms V18')||!pwa.includes('./manifest.webmanifest'))throw Error('PWA HTML identity or manifest link missing');
if(!fs.existsSync('V18_ATTRIBUTION.md'))throw Error('V18 attribution document missing');
if(fs.readFileSync('README.md','utf8').includes('V14_ATTRIBUTION.md'))throw Error('README contains stale attribution path');
for(const [file,w] of [['pwa/icons/icon-192.png',192],['pwa/icons/icon-512.png',512]]){const b=fs.readFileSync(file);if(b.readUInt32BE(16)!==w||b.readUInt32BE(20)!==w)throw Error(`Invalid PWA icon: ${file}`);}
console.log('PASS V18 build outputs, identical app runtime, PWA manifest, service worker, icons and attribution references');
NODE
