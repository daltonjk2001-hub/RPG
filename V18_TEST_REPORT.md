# Solo Realms V18 test report

**Result: 433 / 433 automated assertions passed.**

Tested on the packaged V18 source in a Node.js VM with simulated browser DOM, localStorage, IndexedDB and download/network fixtures. The run command is `bash tests/run_v18.sh`. The runner now invokes `tools/build_v18.py` first, so the tested HTML/PWA artifacts are regenerated from the tracked repository source files on every run.

| Suite | Passed | Total | Coverage |
|---|---:|---:|---|
| Multiplayer / initiative | 179 | 179 | Versioned protocol 20, authenticated joins, shared state and initiative ordering regressions |
| Legacy progression / Director | 37 | 37 | Inherited character progression, campaign flow and procedural offline Director baseline |
| UI | 19 | 19 | Simplified navigation, combat controls, rendered V18 identity and Save Center entry |
| PWA | 15 | 15 | Manifest, install shell, V18 service-worker cache, icons, offline navigation contract, and exact GitHub Pages mirror validation |
| Rules / campaign | 58 | 58 | Retained V14 rules, spells, creatures, classes, progression and campaign behavior |
| Character resources | 30 | 30 | Retained V15.2 class resources and Hit Dice coverage |
| Reactive DM | 19 | 19 | Retained V16 NPC memory, companion behavior, consequences, rivals and protocol compatibility |
| Library reliability | 28 | 28 | V17 library install/restore, reference downloads, JSON backup import and restart behavior |
| V18 integrated systems | 45 | 45 | Spell effect inference, typed damage, monster Multiattack execution, ranged attacks and Parry, recharge cooldowns, improvisation, world state, eight save slots, recovery, restore/import, restore safety and invalid-save rejection |
| Save database resilience | 3 | 3 | IndexedDB initialization retry, transient failure recovery and post-retry save write |
| **Total** | **433** | **433** | |

Additional checks passed:
- `node --check source/solo_realms_v18.js`
- `node --check pwa/sw.js`
- Main HTML contains one self-contained inline game script and no `<script src>` dependency.
- PWA manifest, V18 service-worker cache namespace and 192/512 icons validate.
- Main HTML and PWA entry both identify V18.
- Standalone and PWA application scripts are byte-for-byte identical after each build.
- The build completes from the clean repository inputs without relying on a generated V18 HTML file.

## V18.1.1 hardening verification

The build now regenerates the GitHub Pages `docs/` directory as an exact mirror of canonical `pwa/` output. The PWA suite verifies the complete file list and byte-for-byte equality, preventing a successful source build from leaving the published site stale. Project documentation now identifies `build-inputs/` as the retained V17 shell location.

## V18.1 maintenance verification

The V18.1 packaging maintenance run also confirmed that the build completes using only files contained in the bundle, that the standalone and PWA embed byte-for-byte identical game scripts, and that a second rebuild produces identical hashes for the generated release files. The PWA metadata, service-worker registration, cache namespace, icons and attribution path were checked.

## What this does and does not prove

These are automated regression tests and simulated browser storage/download flows. They do **not** prove that every browser, Android device, or real-world network behaves identically. A headless Chromium smoke test was attempted in the build environment, but its browser policy blocked both local-file and localhost navigation (`ERR_BLOCKED_BY_ADMINISTRATOR`), so no successful live browser run is claimed. A full two-device multiplayer session, Android installation, real upstream SRD download, and a long human-played campaign still need live playtesting.

V18 implements a broad data-driven spell resolver and stat-block combat layer, not a manually authored handler for every spell, monster trait, or optional tabletop rule. Some unusual cases may still require interpretation or additional special handling. The default Director remains procedural/offline; it is not a hosted language-model Dungeon Master. Save slots and recovery are browser-local; portable JSON export/import is provided, but automatic cloud sync is not.


## Repository packaging note

The GitHub repository package tracks only the V17 HTML shell required by the build under `build-inputs/`. Other historical HTML backups, archived version documents, and captured test-output logs are excluded.

## V18.1.2 cross-system hardening verification

GitHub Actions run [#45532271595](https://github.com/daltonjk2001-hub/RPG/actions/runs/45532271595) completed successfully on the consolidated hardening branch. The workflow rebuilt the standalone game, PWA and GitHub Pages mirror, then ran all ten regression suites: **431 / 431 assertions passed** in the original V18.1.2 hardening run.

New focused checks cover ranged stat-block attack parsing, preserving melee-only Parry reactions, recharge cooldown tracking, recovery from a transient IndexedDB initialization failure, retrying the database open, and completing a save write after the retry. The existing progression, NPC/companion memory, spell, world, legacy campaign, multiplayer and PWA suites also passed.

This is automated regression evidence in a simulated browser environment. It does not replace live browser/device checks, two-device multiplayer playtesting, or a long-running campaign compatibility test using a user's real save files.


## Post-merge deep verification

After merge commit [ee04cce](https://github.com/daltonjk2001-hub/RPG/commit/ee04cce42c733b31e2fa806e5aeda8038ac26a23), the main-branch GitHub Actions run [#45532721593](https://github.com/daltonjk2001-hub/RPG/actions/runs/45532721593) rebuilt the standalone game, PWA and GitHub Pages mirror and passed all ten suites. The post-merge suite totals were 179, 37, 19, 15, 58, 30, 19, 28, 43 and 3 assertions respectively (**431 / 431**).

A further regression assertion was then added to exercise the destructive-restore guard under simultaneous IndexedDB recovery-write failure and localStorage fallback failure. The expected behavior is that restore rejects and leaves the currently active campaign unchanged. A further combat review found that a recharge ability included in a monster's Multiattack sequence could bypass the cooldown filter. The solo and multiplayer Multiattack paths now omit recharge actions that have not recharged, while still allowing other ready attacks in the sequence. A dedicated regression assertion covers that case. Together these changes raise the V18 integrated systems suite to 45 checks and the complete suite total to **433**; GitHub Actions run [#45533289921](https://github.com/daltonjk2001-hub/RPG/actions/runs/45533289921) completed successfully on the verification branch: all 45 integrated systems checks and all 3 save database resilience checks passed, for **433 / 433 assertions across ten suites**. The workflow rebuilt the standalone HTML, PWA and Pages mirror and passed the build/package checks.

The GitHub Pages deployment workflow [#45532721292](https://github.com/daltonjk2001-hub/RPG/actions/runs/45532721292) also completed successfully for the merge commit. The external Pages URL could not be independently fetched by the available browser inspection service, so successful deployment is confirmed by GitHub Actions, while direct browser rendering remains a manual check.
