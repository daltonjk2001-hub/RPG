# Solo Realms V18.1 — GitHub Repository

Solo Realms is a free, offline-first D&D-inspired campaign game. V18 remains the stable runtime foundation for spell resolution, stat-block combat, improvisation, persistent world simulation and save/recovery. V19 adds configurable Director personalities and reactive NPC/faction memory. V20 connects seven gameplay systems into an in-game action loop. V21 hardens that experience across beginner, developing, experienced, veteran, expert and level-20 legacy stages.

The game is the player-facing experience. Research PDFs and the SRD library are development/reference inputs, not the player's destination.

## Repository contents

- `Solo_Realms_V18_Main.html` — standalone single-file game for local browser play.
- `pwa/` — canonical installable Progressive Web App source.
- `docs/` — generated exact mirror of `pwa/`, used as the GitHub Pages publication directory. Do not edit `docs/` independently; the build regenerates it.
- `source/` — V17 base runtime, V18 rules layer, V19 Director layers, V20 gameplay engine, V21 player-stage hardening, and assembled runtime.
- `build-inputs/Solo_Realms_V17_Main.html` — the retained V17 HTML shell required by the reproducible build.
- `tools/build_v18.py` — rebuilds the standalone HTML, assembled runtime, PWA entry point and Pages mirror from tracked inputs.
- `tests/` — automated regression suites and the complete test runner.
- `V18_SETUP.md` — installation, rules-library, campaign, and save instructions.
- `V18_SYSTEMS_DESIGN.md` — V18 architecture and implementation notes.
- `V19_DIRECTOR_STUDIO.md` — Director Studio profiles, mixer, behavior contract, and tests.
- `V20_GAMEPLAY_DESIGN.md` — the seven-system player-facing gameplay loop and integration boundaries.
- `V21_PLAYTEST_REPORT.md` — player-stage findings, fixes, boundaries, and V21 regression coverage.
- `source/SR20_GAMEPLAY_ENGINE.js` — additive V20 seven-system gameplay implementation.
- `source/SR21_PLAYTEST_HARDENING.js` — additive V21 onboarding, action/check, objective, travel and legacy improvements.
- `V18_TEST_REPORT.md` — automated test results and remaining live-testing limitations.
- `V18_ATTRIBUTION.md` — third-party content attribution.

## Quick start

1. Open `Solo_Realms_V18_Main.html` in a modern browser for local play.
2. To install the PWA, publish the files inside `pwa/` to an HTTPS host and open the hosted page.
3. Connect to the internet when installing the SRD reference library or using multiplayer. Local single-player play and an already-installed reference pack work offline.
4. Open **More → Rules & Settings → Rules Guide** and select **Install free library** to cache the rules, spells, creatures, and conditions.
5. Open **Save Center** in the top bar for eight manual save slots, recovery, and portable JSON backup.
6. After starting a campaign, use **What do you do?** in Adventure for free-form actions, exploration, social scenes, travel, survival, tactics and campaign objectives. The Director can infer an approach, or the player can choose a skill, challenge tier, roll condition and objective focus.

New low-level characters receive an optional first-session guide. At level 20, characters can earn a separate legacy rank and archive campaigns without raising the normal level cap or adding automatic combat-stat power.

## Build and test

Requirements: Python 3 and Node.js. From the repository root, run:

```bash
bash tests/run_v18.sh
```

The runner rebuilds the standalone and PWA outputs, synchronizes `docs/` from `pwa/`, and executes the inherited V18/V19 regression suites plus V20 and V21 gameplay suites. A successful automated run does not replace Android installation testing, real two-device multiplayer testing, combat-balance checks, or extended human campaigns. See `V18_TEST_REPORT.md` and `V21_PLAYTEST_REPORT.md` for verification scope.

On a successful push to `main`, the hardening workflow rebuilds and tests first, then commits the generated standalone, assembled runtime, PWA and Pages outputs if they changed. This keeps the published artifacts aligned with canonical source.

## Cost and connectivity

The game, repository, local solo play, and reference-pack downloads are free. The default Director is procedural and runs locally. An optional external generative-AI provider configuration inherited from the base project is not required for play and may have its own provider charges. Online multiplayer requires internet connectivity and the PeerJS signaling service.

## Licensing and attribution

The included SRD 5.2.1 reference material is attributed under CC BY 4.0. See `V18_ATTRIBUTION.md` for details. The attribution document identifies the third-party sources and their licenses; it does not assign a license to the original Solo Realms code.
