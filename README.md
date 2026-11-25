# Solo Realms V18.1 — GitHub Repository

Solo Realms is a free, offline-first D&D-inspired campaign game. V18.1 remains the stable runtime foundation for spell resolution, stat-block combat, improvisation, persistent world simulation and save/recovery. V19 adds configurable Director personalities and reactive NPC/faction memory. V20 connects seven systems into an in-game action loop: Director adjudication, class identity, exploration/survival, tactical play, social interaction, a living world and a persistent adventure campaign. V21 adds player-stage guidance, objective safeguards, and a separate level-20 Legacy Chronicle. V23 makes natural-language intent the primary Adventure interaction: the Director decides when a check is needed and selects the provisional skill/DC, while deterministic rules still resolve dice and state. The research PDFs are development references only; they are not presented to players as the game experience.

## Repository contents

- `Solo_Realms_V18_Main.html` — standalone single-file game for local browser play.
- `pwa/` — canonical installable Progressive Web App source.
- `docs/` — generated exact mirror of `pwa/`, used as the GitHub Pages publication directory. Do not edit `docs/` independently; the build regenerates it.
- `source/` — V17 base runtime, V18 rules layer, V19 Director layers, V20 gameplay/layout engines, V21 player-stage hardening, and assembled runtime.
- `build-inputs/Solo_Realms_V17_Main.html` — the one retained V17 HTML shell required by the reproducible build. Other historical release backups are intentionally excluded.
- `tools/build_v18.py` — rebuilds the standalone HTML, assembled runtime, and PWA entry point from the tracked inputs.
- `tests/` — automated regression suites and the test runner.
- `V18_SETUP.md` — installation, rules-library, campaign, and save instructions.
- `V18_SYSTEMS_DESIGN.md` — V18 architecture and implementation notes.
- `V19_DIRECTOR_STUDIO.md` — Director Studio profiles, mixer, behavior contract, and tests.
- `V20_GAMEPLAY_DESIGN.md` — the seven-system player-facing gameplay loop and integration boundaries.
- `V21_PLAYTEST_REPORT.md` — automated player-stage, campaign, and endurance coverage plus live-test limitations.
- `source/SR21_PLAYTEST_HARDENING.js` — additive V21 onboarding, action, objective, travel, and legacy systems.
- `source/SR23_DUNGEON_MASTER.js` — Director-first action planning, conservative no-roll adjudication, bounded continuity events, and optional read-only AI narration.
- `V23_DM_DESIGN.md` — adjudication policy, design rationale, research references, and explicit limitations.
- `source/SR20_GAMEPLAY_ENGINE.js` — additive V20 gameplay implementation.
- `V18_CHANGELOG.md` — V18 and V18.1 changes.
- `V18_TEST_REPORT.md` — automated test results and remaining live-testing limitations.
- `V18_ATTRIBUTION.md` — third-party content attribution.

## Quick start

1. Open `Solo_Realms_V18_Main.html` in a modern browser for local play.
2. To install the PWA, publish the files inside `pwa/` to an HTTPS host and open the hosted page.
3. Connect to the internet when installing the SRD reference library or using multiplayer. Local single-player play and an already-installed reference pack work offline.
4. Open **More → Rules & Settings → Rules Guide** and select **Install free library** to cache the rules, spells, creatures, and conditions.
5. Open **Save Center** in the top bar for eight manual save slots, recovery, and portable JSON backup.
6. After starting a campaign, use **What do you do?** in Adventure to resolve free-form actions, travel, social scenes, investigations, tactical approaches, survival actions, and campaign objectives. New characters receive an optional first-session guide; the player controls can explicitly set skill, difficulty, roll state, and objective.

## Build and test

Requirements: Python 3 and Node.js. From the repository root, run:

```bash
bash tests/run_v18.sh
```

The runner rebuilds the standalone and PWA outputs, synchronizes `docs/` from `pwa/`, and runs the V18/V19 compatibility, V20 gameplay/layout, V21 player-stage/endurance, V22 data-integrity, and V23 Director-first gameplay suites. The latest completed V23 regression passed 739/739 numbered assertions under both Node 22 and Node 20, plus release-integrity verification; the cache-migration assertions are included in the current rerun. Automated level bands are gameplay proxies, not real-world tabletop experience. Android installation/touch testing, real two-device multiplayer, and human playtests still require real devices and players. See `V18_TEST_REPORT.md`, `V21_PLAYTEST_REPORT.md`, and `V23_DM_DESIGN.md`.

## Cost and connectivity

The game, repository, local solo play, and reference-pack downloads are free. The default Director is procedural and runs locally. An optional external generative-AI provider configuration inherited from the base project is not required for play and may have its own provider charges. Online multiplayer requires internet connectivity and the PeerJS signaling service.

## Licensing and attribution

The included SRD 5.2.1 reference material is attributed under CC BY 4.0. See `V18_ATTRIBUTION.md` for details. The attribution document identifies the third-party sources and their licenses; it does not assign a license to the original Solo Realms code.


## V22 data integrity and runtime modules

V22 adds a bounded, compatibility-aware save validator and an exact legacy-reward ID ledger. The visible legacy milestone list remains limited to the latest 100 entries, while the separate ledger preserves every claimed reward ID through save/load and JSON export/import. V3/V17-style saves remain supported when their required character fields are valid. The save validator works on a normalized copy and rejects malformed, oversized, excessively deep, or reserved-key data before replacing an active campaign.

The V22 implementation is split into `source/SR22_SAVE_GUARD.js` and `source/SR22_LEGACY_LEDGER.js`. These are namespaced modules with explicit inputs and outputs; the existing V18/V21 function names remain as small compatibility adapters. See `ARCHITECTURE_V22.md` for the module boundary and incremental refactor policy. Run `bash tests/run_v18.sh` to include the V22 data-integrity suite.


## V23 Director-first gameplay

The Adventure page now prioritizes one natural-language action field. Skill, challenge, mode, roll-state, target and objective overrides are available only in collapsed advanced controls. Routine unopposed actions can resolve without checks; meaningful uncertainty uses the automatic Director plan. The Director's mechanical ruling is still resolved by the existing deterministic game engine. See V23_DM_DESIGN.md for rules policy, continuity design, research links, and what still requires a future backend or human testing.
