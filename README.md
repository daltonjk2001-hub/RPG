# Solo Realms V18.1 — GitHub Repository

Solo Realms is a free, offline-first D&D-inspired campaign game. V18.1 remains the stable runtime foundation for spell resolution, stat-block combat, improvisation, persistent world simulation and save/recovery. V19 adds configurable Director personalities and reactive NPC/faction memory. V20 connects seven systems into an in-game action loop: Director adjudication, class identity, exploration/survival, tactical play, social interaction, a living world and a persistent adventure campaign. V21 adds player-stage guidance, objective safeguards, and a separate level-20 Legacy Chronicle. V23 makes natural-language intent the primary Adventure interaction: the local Director or an optional connected model decides when a check is needed and proposes the skill/DC, while deterministic rules still resolve dice and state. V24 adds The Chronicler provider-neutral AI DM gateway. V25 persists each campaign's rules profile, separates the 2024 SRD 5.2.1 baseline from explicitly selectable Solo Realms house rules, and standardizes typed d20 checks. V26 routes inventoried legacy attacks through the shared attack resolver; V27 extends typed resolution to ordinary saves and condition-based failure; V28 adds voluntary save failure and tracked Legendary Resistance. V29 centralizes condition records, independent durations, 2024 condition effects and Exhaustion handling. The research PDFs are development references only; they are not presented to players as the game experience.

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
- `source/SR25_RULES_CONTRACT.js` — persisted 2024 SRD / Solo Realms Enhanced campaign profiles, house-rule controls, typed mechanic requests, and deterministic d20 resolution.
- `source/SR29_CONDITION_ENGINE.js` — canonical 2024 condition registry, independent condition instances/durations, Exhaustion rules, legacy adapters, and condition-driven combat/save effects.
- `V25_RULES_CONTRACT.md` — rules-profile migration, d20 semantics, house-rule definitions, and current implementation boundaries.
- `V26_ATTACK_PIPELINE.md` — the 13 shared-roll and ten direct-total migrated attack-vs-AC call sites.
- `V27_SAVING_THROW_PIPELINE.md` — the migrated ordinary save paths, missing-ability and condition auto-failure rules, and death-save boundary.
- `V25_D20_RULES_AUDIT.md` — known d20 discrepancy inventory and active/legacy call-path audit.
- `DND_RULES_COVERAGE.md` — status dashboard mapping core D&D rules to code owners, tests and outstanding acceptance criteria.
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
6. After starting a campaign, use **What do you do?** in Adventure to resolve free-form actions, travel, social scenes, investigations, tactical approaches, survival actions, and campaign objectives. The Adventure rules panel shows the saved campaign profile and house-rule switches. New characters receive an optional first-session guide; normal play uses the Director-first input, while deliberate overrides are available under collapsed advanced controls.

## Build and test

Requirements: Python 3 and Node.js. From the repository root, run:

```bash
bash tests/run_v18.sh
```

The runner rebuilds the standalone and PWA outputs, synchronizes `docs/` from `pwa/`, and runs the V18/V19 compatibility, V20 gameplay/layout, V21 player-stage/endurance, V22 data-integrity, V23 Director-first gameplay, V25 rules-contract, V26 attack-routing, V27/V28 saving-throw suites, and the V29 condition-engine suite, plus the D&D core-rules coverage ledger. The full V23 regression now contains 757 numbered assertions, including 59 dedicated Director-first checks; CI runs the complete suite under Node 20 and Node 22, followed by release-integrity verification. Automated level bands are gameplay proxies, not real-world tabletop experience. Android installation/touch testing, real two-device multiplayer, and human playtests still require real devices and players. See `V18_TEST_REPORT.md`, `V21_PLAYTEST_REPORT.md`, and `V23_DM_DESIGN.md`.

## Cost and connectivity

The game, repository, local solo play, and reference-pack downloads are free. The default Director is procedural and runs locally. An optional external generative-AI provider configuration inherited from the base project is not required for play and may have its own provider charges. Online multiplayer requires internet connectivity and the PeerJS signaling service.

## Licensing and attribution

The included SRD 5.2.1 reference material is attributed under CC BY 4.0. See `V18_ATTRIBUTION.md` for details. The attribution document identifies the third-party sources and their licenses; it does not assign a license to the original Solo Realms code.


## V29 — Canonical condition engine

V29 introduces one 2024 condition registry and normalizes legacy string/object conditions into independently timed instances. Reapplying a condition preserves separate applications without stacking its effect; Exhaustion remains cumulative, with −2 to D20 Tests and −5 feet of Speed per level and death at level 6. The build migrates the legacy initiative expiry path, preserves conditions through Long Rests, routes condition-driven attack/save effects through shared services, and corrects close-melee critical-hit handling. The coverage ledger remains Partial because player-facing status/duration controls, exhaustive action/reaction and spell/feature routing, grapple lifecycle, repeat saves, multiplayer timing and live playtests remain open. See V29_CONDITION_ENGINE.md.

## V22 data integrity and runtime modules

V22 adds a bounded, compatibility-aware save validator and an exact legacy-reward ID ledger. The visible legacy milestone list remains limited to the latest 100 entries, while the separate ledger preserves every claimed reward ID through save/load and JSON export/import. V3/V17-style saves remain supported when their required character fields are valid. The save validator works on a normalized copy and rejects malformed, oversized, excessively deep, or reserved-key data before replacing an active campaign.

The V22 implementation is split into `source/SR22_SAVE_GUARD.js` and `source/SR22_LEGACY_LEDGER.js`. These are namespaced modules with explicit inputs and outputs; the existing V18/V21 function names remain as small compatibility adapters. See `ARCHITECTURE_V22.md` for the module boundary and incremental refactor policy. Run `bash tests/run_v18.sh` to include the V22 data-integrity suite.



## Complete end-state design

V23 is the first Director-first foundation, not the completed game. The full destination is defined in three canonical documents:

1. **Complete game design** — the player experience, DM responsibilities, rules, story/campaign model, living world, NPCs, memory, connected/offline modes, and completion criteria.
2. **Target technical architecture** — domain boundaries, transaction and event contracts, authoritative rules services, AI gateway, memory, and persistence.
3. **Implementation roadmap** — the build sequence, dependencies, acceptance gates, and an explicit list of what V23 has and has not delivered.

Read these before adding another standalone gameplay feature. New work should advance the roadmap's next foundation phase instead of creating disconnected systems.

## V23 Director-first gameplay

The Adventure page now prioritizes one natural-language action field. Skill, challenge, mode, roll-state, target and objective overrides are available only in collapsed advanced controls. Routine unopposed actions can resolve without checks; meaningful uncertainty uses the automatic Director plan. The local Director always works offline. A configured connected model may propose a validated ruling and then narrate the completed result, but the existing deterministic game engine remains authoritative for dice and state. See V23_DM_DESIGN.md for rules policy, continuity design, research links, and what still requires a future backend or human testing.

## V24 — The Chronicler custom AI Dungeon Master

V24 adds a provider-neutral, server-side AI Director gateway and the custom **The Chronicler** campaign-DM contract. The connected Director has bounded adjudication, narration, in-world conversation, and scene/quest/encounter generation roles. The browser never receives or stores a provider API key. Model proposals are validated, and the deterministic game engine remains authoritative for dice, combat, spells, character resources, rewards, progression, and saved campaign state. The offline Director remains available when no gateway is configured or the service is unavailable.

The gateway is in the worker/ directory; see [CUSTOM_AI_DUNGEON_MASTER.md](CUSTOM_AI_DUNGEON_MASTER.md) for provider research, model choices, security boundaries, deployment instructions, and evaluation criteria. The default recommended model is GPT-6.2 Sol, configured on the Worker, not the browser. You must deploy the Worker and add your provider API key as a server secret before connected AI is available. Provider usage may incur charges. Never add a provider key to GitHub Pages files, campaign saves, localStorage, or sessionStorage.
- `V28_SPECIAL_SAVING_THROWS.md` — voluntary save failure, Legendary Resistance resource tracking, integration boundaries, and regression evidence.
- `V29_CONDITION_ENGINE.md` — the condition-instance model, 2024 condition integrations, automated evidence, and remaining coverage gaps.
