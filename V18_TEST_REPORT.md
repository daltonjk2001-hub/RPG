# Solo Realms V18 test report

**Result: 422 / 422 automated assertions passed.**

Tested on the packaged V18 source in a Node.js VM with simulated browser DOM, localStorage, IndexedDB and download/network fixtures. The run command is `bash tests/run_v18.sh`. The runner now invokes `tools/build_v18.py` first, so the tested HTML/PWA artifacts are regenerated from the tracked repository source files on every run.

| Suite | Passed | Total | Coverage |
|---|---:|---:|---|
| Multiplayer / initiative | 179 | 179 | Versioned protocol 20, authenticated joins, shared state and initiative ordering regressions |
| Legacy progression / Director | 37 | 37 | Inherited character progression, campaign flow and procedural offline Director baseline |
| UI | 19 | 19 | Simplified navigation, combat controls, rendered V18 identity and Save Center entry |
| PWA | 14 | 14 | Manifest, install shell, V18 service-worker cache, icons and offline navigation contract |
| Rules / campaign | 58 | 58 | Retained V14 rules, spells, creatures, classes, progression and campaign behavior |
| Character resources | 30 | 30 | Retained V15.2 class resources and Hit Dice coverage |
| Reactive DM | 19 | 19 | Retained V16 NPC memory, companion behavior, consequences, rivals and protocol compatibility |
| Library reliability | 28 | 28 | V17 library install/restore, reference downloads, JSON backup import and restart behavior |
| V18 integrated systems | 38 | 38 | Spell effect inference, typed damage, monster Multiattack execution, improvisation, world state, eight save slots, recovery, restore/import and invalid-save rejection |
| **Total** | **422** | **422** | |

Additional checks passed:
- `node --check source/solo_realms_v18.js`
- `node --check pwa/sw.js`
- Main HTML contains one self-contained inline game script and no `<script src>` dependency.
- PWA manifest, V18 service-worker cache namespace and 192/512 icons validate.
- Main HTML and PWA entry both identify V18.
- Standalone and PWA application scripts are byte-for-byte identical after each build.
- The build completes from the clean repository inputs without relying on a generated V18 HTML file.

## V18.1 maintenance verification

The V18.1 packaging maintenance run also confirmed that the build completes using only files contained in the bundle, that the standalone and PWA embed byte-for-byte identical game scripts, and that a second rebuild produces identical hashes for the generated release files. The PWA metadata, service-worker registration, cache namespace, icons and attribution path were checked.

## What this does and does not prove

These are automated regression tests and simulated browser storage/download flows. They do **not** prove that every browser, Android device, or real-world network behaves identically. A headless Chromium smoke test was attempted in the build environment, but its browser policy blocked both local-file and localhost navigation (`ERR_BLOCKED_BY_ADMINISTRATOR`), so no successful live browser run is claimed. A full two-device multiplayer session, Android installation, real upstream SRD download, and a long human-played campaign still need live playtesting.

V18 implements a broad data-driven spell resolver and stat-block combat layer, not a manually authored handler for every spell, monster trait, or optional tabletop rule. Some unusual cases may still require interpretation or additional special handling. The default Director remains procedural/offline; it is not a hosted language-model Dungeon Master. Save slots and recovery are browser-local; portable JSON export/import is provided, but automatic cloud sync is not.


## Repository packaging note

The GitHub repository package tracks only the V17 HTML shell required by the build under `build-inputs/`. Other historical HTML backups, archived version documents, and captured test-output logs are excluded.
