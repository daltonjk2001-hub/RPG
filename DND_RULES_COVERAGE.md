# D&D Core Rules Coverage Dashboard — Solo Realms

This dashboard maps the D&D reference PDF's Parts I–III and Appendices A–B to the current Solo Realms implementation. It is a coverage ledger, not a claim of full D&D rules parity.

**Status definitions**

- **Implemented** — named behavior, validation, tests and real player-path integration are present for the stated scope.
- **Partial** — code exists, but one or more mechanics, exceptions, tests, persistence paths or integrations are incomplete.
- **Missing** — no dedicated implementation is currently established.
- **Needs live verification** — automated coverage exists or the code is present, but browser/device/human play has not confirmed it.

## Part I — Core game engine

| PDF area / mechanic | Status | Primary code owner | Current evidence | Gap / next acceptance criterion |
|---|---|---|---|---|
| Core campaign loop and three pillars | Partial | `SR20_GAMEPLAY_ENGINE.js`, `SR21_PLAYTEST_HARDENING.js`, `SR23_DUNGEON_MASTER.js` | Exploration, social, travel, tactical, survival and campaign action modes; V21 objectives; Director-first input | Complete the exploration/social encounter procedures, failure-forward outcomes, and human playtest across all pillars |
| D20 ability checks | Partial | `SR25_RULES_CONTRACT.js`, `SR21_PLAYTEST_HARDENING.js` | Typed resolver integrated into V21 action checks; no natural-1/20 automatic outcomes; proficiency/expertise service | Trace every check caller and all feature-specific exceptions; add contests/group checks and per-skill validation |
| Saving throws | Partial | `SR25_RULES_CONTRACT.js`, `SR18_SYSTEMS_LAYER.js`, `tools/build_v18.py` | V27 typed ordinary saves, missing-ability and condition auto-failure, specialized death saves; V28 adds no-roll voluntary failure, one-shot creature choice, parsed/structured Legendary Resistance with persisted daily uses and Long Rest reset helper | Finish player-facing voluntary-failure choice UI; wire daily-use reset to a full monster Long Rest lifecycle; improve tactical Director selection of when to spend Legendary Resistance; audit remaining save callers and all feature exceptions |
| Attack rolls | Partial | `SR25_RULES_CONTRACT.js`, `SR18_SYSTEMS_LAYER.js`, `tools/build_v18.py` | Typed attack resolver; V26 routes 13 shared-roll and ten direct-total V17 solo/multiplayer weapon, opportunity, companion, class-feature, spell and monster attack-vs-AC call sites plus the V18 monster-action resolver into V25 | Remaining direct-die companion/legacy feature handlers, feature-specific automatic criticals, attack-source advantage matrix and damage critical ordering still need audit/tests; see `V26_ATTACK_PIPELINE.md` |
| Advantage and disadvantage | Partial | `SR25_RULES_CONTRACT.js`, `SR21_PLAYTEST_HARDENING.js` | Higher/lower d20 selection; cancellation supported; regression tests | Verify all sources, rerolls and stacking/cancellation rules through live action paths |
| Difficulty classes | Partial | `SR23_DUNGEON_MASTER.js`, `SR25_RULES_CONTRACT.js` | Six-band 2024 typical scale; legacy Solo Realms presets isolated behind house-rule switch; DC source recorded | Add complete task-setting guidance and tests for opposed checks, repeat attempts, passive scores and feature-set DCs |
| Initiative and turn order | Partial | V17 base combat runtime, V18/V20 systems | Existing turn-based combat and multiplayer initiative structures | Full 2024 combat turn/action economy parity and deterministic concurrency verification |
| Actions, bonus actions, reactions and movement | Partial | V17 base runtime, V18 systems, V20 tactics | Existing combat action UI, movement/attack paths, reactions in monster features | Central action-economy ledger; validate one action/bonus/reaction per turn, opportunity attacks, ready actions and resource costs |
| Attack range, reach, cover and line of sight | Partial | V17 base runtime, `SR18_SYSTEMS_LAYER.js` | Monster action range/reach parser, LOS gate, multiplayer cover; V20 cover custom rule | Unify solo/multiplayer geometry; make cover semantics edition/profile-aware; test boundary distances and obstruction |
| Damage rolls and critical damage | Partial | V17 base runtime, `SR18_SYSTEMS_LAYER.js`, `SR25_RULES_CONTRACT.js` | Typed damage application; monster attack natural-20 critical adds extra damage dice | One damage pipeline for player, monster and spell damage; correct critical dice by damage source; ordering and rounding tests |
| Damage types, resistance, immunity and vulnerability | Partial | `SR18_SYSTEMS_LAYER.js`, V17 base | Typed damage helper and creature resistance/immunity ingestion | Unified mitigation order and end-to-end tests for resistance, immunity, vulnerability, multiple sources and temporary HP |
| Conditions and duration/expiry | Partial | `SR29_CONDITION_ENGINE.js`, `SR18_SYSTEMS_LAYER.js`, V17 adapters | Fifteen-condition 2024 registry; independent instances and durations; legacy migration; Exhaustion levels; condition auto-fail saves; attack-mode and action/movement adapters; canonical Incapacitated action/bonus-action/reaction eligibility; V18 solo/multiplayer monster action gates; monster Parry and damage-reduction reaction gates; player/remote-party/solo-enemy source-and-duration management panel; Grappled source/reach tracking with automatic release on Incapacitated grappler or target beyond reach; Long Rest preservation; solo theater-of-the-mind player Shove Push/Prone outcomes; player and monster save-based repeat-save attachment for supported effects; monster Push/Pull and self-teleport; player spell Push/Pull with collision-aware tactical movement; Misty Step/explicit-range tactical self-teleport with LOS, range and occupancy checks; structured and scalar spell-slot consumption guard | Complete anatomy/equipment validation for one-grapple-per-hand/appendage; player-selected and companion/non-combat teleport; special-case spell displacement; remaining legacy direct-position-write audit; player feature timing audit; repeat-save coverage for unsupported monster wording and direct HP mutation paths; cross-device import and live multiplayer playtests; automated grapple metadata save/import round-trip now covers source, reach, escape DC, appendage slot, and repeat-save data; see `V29_CONDITION_ENGINE.md` |
| Death, dying and recovery | Partial | V17 base runtime, `SR18_SYSTEMS_LAYER.js` | Existing death/HP state in base gameplay | Complete dedicated death-save procedure, natural 1/20 exceptions, stabilization, healing at 0 HP and persistence tests |
| Encounter balance / challenge rating | Partial | V17 base bestiary and monster conversion | Monster stat-block import, multiattack, legendary actions and morale | Encounter calculator, action-economy analysis, XP budgets and verified balance data |
| Rest, time and resource recovery | Partial | `SR20_GAMEPLAY_ENGINE.js`, `SR21_PLAYTEST_HARDENING.js` | Four-hour travel watches, camp/rest, supplies and fatigue | Formal short/long rest eligibility, per-class recovery, interrupted rest and resource restoration rules |

## Part II — Character creation and mechanics

| PDF area / mechanic | Status | Primary code owner | Current evidence | Gap / next acceptance criterion |
|---|---|---|---|---|
| Six abilities and ability modifiers | Partial | V17 base, `SR25_RULES_CONTRACT.js` | Pure score-to-modifier helper and save validation for six scores | Verify all derived stats, score caps, temporary bonuses and every character-sheet consumer |
| Proficiency bonus progression | Partial | `SR25_RULES_CONTRACT.js` | Pure level 1–20 progression helper and tests | Verify all level-dependent class features, multiclass proficiency and monster/save DCs |
| Skills and skill proficiency | Partial | `SR20_GAMEPLAY_ENGINE.js`, `SR21_PLAYTEST_HARDENING.js`, `SR25_RULES_CONTRACT.js` | Skill-to-ability map, proficiency and expertise stacking | Tool proficiencies, overlapping proficiencies, custom backgrounds and all skill-specific feature modifiers |
| Expertise | Partial | `SR20_GAMEPLAY_ENGINE.js`, `SR21_PLAYTEST_HARDENING.js`, `SR25_RULES_CONTRACT.js` | Expertise doubles proficiency in tested V20/V21 paths | Feature eligibility by class/level, multiclass and duplicate expertise handling |
| Core classes (12) | Partial | `SR18_SYSTEMS_LAYER.js`, V17 base | Twelve class records represented and selection exposed | Full 2024 class progression, features, resources, multiclassing and class-specific acceptance tests |
| Subclasses | Partial | V17 base rules/character catalog | Subclass selection data exposed | Every supported subclass feature, level gate, resource and interaction needs implementation/tests |
| Character origins / ancestry / backgrounds | Partial | V17 base character creator | Character creation and ancestry/background selection exist | Complete 2024 origin options, ability score rules, traits and feature interactions |
| Leveling and XP | Partial | V17 base, `SR21_PLAYTEST_HARDENING.js` | Level 1–20 XP thresholds; level-20 Legacy Chronicle separated from combat level | Class feature/ASI/feat milestones and multiclass progression parity |
| Feats and ability score improvements | Partial | V17 rules catalog | Feat/ASI-related data and character options exist | Validate feat prerequisites, exact effects, level eligibility and stacking |
| Equipment, armor, shields and weapons | Partial | V17 inventory/combat | Inventory, AC, gear and equipment systems exist | Full item catalog, don/doff, mastery properties, ammunition, improvised weapons and encumbrance |
| Weapon mastery | Partial | V17 base / V18 rules layer | Some weapon and combat support present | Full 2024 mastery properties, unlock gates, tactical effects and test corpus |
| Class resources and feature uses | Partial | V17 base / V18 rules layer | Several class resources and limited-use features represented | Complete per-class resource ledger, recharge timing and multiclass interactions |

## Part III — Magic and spellcasting

| PDF area / mechanic | Status | Primary code owner | Current evidence | Gap / next acceptance criterion |
|---|---|---|---|---|
| Spell reference library | Partial | V17 base, `SR18_SYSTEMS_LAYER.js` | SRD spell pack ingestion and offline cached reference library | Versioned source provenance, complete SRD coverage audit and missing-entry report |
| Spell attack rolls | Partial | V17 base, `SR18_SYSTEMS_LAYER.js` | Spell damage/effect execution exists | Route spell attacks through typed V25 attack resolver and test ranged/close spell attacks |
| Spell saving throws | Partial | V17 base, `SR18_SYSTEMS_LAYER.js`, `SR25_RULES_CONTRACT.js`, `SR29_GRAPPLE_GAMEPLAY.js` | Save-based spell effects, normalized saves, and repeat-save contracts for supported player-originated SRD spells (including Hold Person end-of-turn and Dominate Person damage-triggered repeats) | Complete typed spell-save coverage, all repeat-save spell/monster-feature sources, direct-damage event coverage, Legendary Resistance and exception tests |
| Spell slots and preparation/known spells | Partial | V17 base rules, `SR29_GRAPPLE_GAMEPLAY.js` | Spell selection/casting and resource state exist; V29 ensures exactly one slot is consumed for successful leveled casts on the SRD52 path, including migrated scalar legacy slots, and sets the one-leveled-spell-per-turn lock | Full 2024 known/prepared distinctions, slot progression, pact magic, recovery and multiclass rules across every legacy and multiplayer cast path |
| Casting time, range, components and duration | Partial | V17 parser and spell engine | Parser extracts core spell metadata | Complete components/material costs, target restrictions, duration modes and interruption |
| Concentration | Partial | V17 base, `SR18_SYSTEMS_LAYER.js` | Damage-triggered concentration save and condition logging | Concentration limit, exact DC, multiple damage events, incapacitation and expiry validation |
| Areas of effect and targeting | Partial | `SR18_SYSTEMS_LAYER.js` | Shape/size parsing and multiplayer area targeting | Full templates, grid geometry, origin/line-of-effect and friendly-fire tests |
| Spell damage, healing and conditions | Partial | `SR18_SYSTEMS_LAYER.js` | Damage types, typed damage helper, healing and status-effect inference | Structured per-spell effects; do not infer core mechanics solely from description text |
| Upcasting and scaling | Partial | V17 spell parser / V18 layer | Existing formula supports some upcast scaling | Verify every scaling pattern and class/resource interaction |
| Rituals, components and spell-specific exceptions | Partial | V17 reference/parser | Metadata and some utility classifications | Complete cast procedures and bespoke effects; explicit structured spell definitions |

## Appendix A — Quick reference and Appendix B — Glossary

| Reference area | Status | Primary code owner | Next criterion |
|---|---|---|---|
| Player-facing rules quick reference | Partial | V17 Rules Guide / Rules Library | Generate the quick reference from the same versioned rules registry used by the resolver |
| Rules glossary | Partial | V17 Rules Library | Version terminology and link every term to its authoritative mechanic or condition |
| Unsupported-mechanics explanations | Partial | `SR23_DUNGEON_MASTER.js`, `SR25_RULES_CONTRACT.js` | Show a clear clarification/unsupported response for every unmapped mechanic rather than approximating silently |

## Test and release evidence

| Category | Current status |
|---|---|
| Unit/pure service tests | Partial — V25 tests ability modifiers, proficiency, skill bonuses and typed d20 outcomes |
| Integration tests | Partial — V21 checks and V18 monster attack path call V25 resolvers |
| Persistence/migration tests | Partial — V25 validates V18/V20-style save migration on normalized state; full save/load round-trip for each mechanic remains |
| AI authority tests | Partial — Director model output is validated; typed mechanic mapping not yet universal |
| Browser/PWA parity | Needs live verification — build integration is present; V25 CI run must be green |
| Android/touch/browser QA | Needs live verification |
| Two-device multiplayer | Needs live verification |
| Human/tabletop playtests and balance | Needs live verification |

## Ruleset/version boundary

- `dnd-2024-srd-5.2.1` is the current strict 2024 SRD profile baseline.
- `solo-realms-v24-enhanced` preserves legacy Solo Realms house rules for existing campaigns; it is **not** a formal 2014 5e rules profile.
- A real 2014 profile remains **Missing** until implemented and tested independently.
- This dashboard must be updated as features receive unit, integration, persistence, AI-authority and release evidence. Do not promote a row from Partial merely because a module or UI control exists.
