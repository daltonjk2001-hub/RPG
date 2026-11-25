# Solo Realms V18.1 — GitHub Repository

Solo Realms is a free, offline-first D&D-inspired campaign game. V18.1 remains the stable runtime foundation for spell resolution, stat-block combat, improvisation, persistent world simulation and save/recovery. V19 adds configurable Director personalities and reactive NPC/faction memory. The V20 gameplay layer connects seven systems into an in-game action loop: Director adjudication, class identity, exploration/survival, tactical play, social interaction, a living world and a persistent adventure campaign. The research PDFs are development references only; they are not presented to players as the game experience.

## Repository contents

- `Solo_Realms_V18_Main.html` — standalone single-file game for local browser play.
- `pwa/` — canonical installable Progressive Web App source.
- `docs/` — generated exact mirror of `pwa/`, used as the GitHub Pages publication directory. Do not edit `docs/` independently; the build regenerates it.
- `source/` — V17 base runtime, V18 rules layer, V19 Director layers, V20 gameplay engine, and assembled runtime.
- `build-inputs/Solo_Realms_V17_Main.html` — the one retained V17 HTML shell required by the reproducible build. Other historical release backups are intentionally excluded.
- `tools/build_v18.py` — rebuilds the standalone HTML, assembled runtime, and PWA entry point from the tracked inputs.
- `tests/` — automated regression suites and the test runner.
- `V18_SETUP.md` — installation, rules-library, campaign, and save instructions.
- `V18_SYSTEMS_DESIGN.md` — V18 architecture and implementation notes.
- `V19_DIRECTOR_STUDIO.md` — Director Studio profiles, mixer, behavior contract, and tests.
- `V20_GAMEPLAY_DESIGN.md` — the seven-system player-facing gameplay loop and integration boundaries.
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
6. After starting a campaign, use the **What do you do?** panel in Adventure to resolve free-form actions, travel, social scenes, investigations, tactical approaches, survival actions, and campaign objectives.

## Build and test

Requirements: Python 3 and Node.js. From the repository root, run:

```bash
bash tests/run_v18.sh
```

The runner rebuilds the standalone and PWA outputs, synchronizes `docs/` from `pwa/`, and executes the V18/V19 regression suites plus the V20 seven-system gameplay suite. A successful automated run does not replace Android installation testing, real two-device multiplayer testing, or extended human playtesting. See `V18_TEST_REPORT.md` for the current verification scope.

## Cost and connectivity

The game, repository, local solo play, and reference-pack downloads are free. The default Director is procedural and runs locally. An optional external generative-AI provider configuration inherited from the base project is not required for play and may have its own provider charges. Online multiplayer requires internet connectivity and the PeerJS signaling service.

## Licensing and attribution

The included SRD 5.2.1 reference material is attributed under CC BY 4.0. See `V18_ATTRIBUTION.md` for details. The attribution document identifies the third-party sources and their licenses; it does not assign a license to the original Solo Realms code.
