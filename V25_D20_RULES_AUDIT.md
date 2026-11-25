# V25 — D20 Rules Discrepancy Inventory

Audit scope: the live V18–V24 code layers and their retained regression suites, with the V25 resolver layered last by the reproducible build. This is the initial inventory for backlog task S0.1; it identifies the known active call paths and known contradictory tests. It is not a claim that every possible branch in the retained V17 monolith has been exhaustively enumerated.

## Authoritative mechanic matrix

| Mechanic | Natural 1 | Natural 20 | Resolution |
|---|---|---|---|
| Ability check | No automatic failure | No automatic success | Add applicable modifiers and compare the total with the DC |
| Saving throw | No general automatic failure | No general automatic success | Add applicable modifiers and compare the total with the DC; feature-specific exceptions remain possible |
| Attack roll | Automatic miss | Automatic hit and critical hit | Compare total with AC except for the natural-1/20 attack rules |
| Death saving throw | Specialized exception: two failures | Specialized exception: regain 1 HP | Must remain a dedicated saving-throw procedure rather than a generic save |

The natural-1/natural-20 rules above follow the 2024 Basic Rules / SRD 5.2.1. They are not a blanket rule for every d20 test. Reference: [2024 Basic Rules — Playing the Game](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game), [Sage Advice Compendium](https://media.dndbeyond.com/compendium-images/sac/SAC2025.pdf).

## Observed implementation and call-site inventory

| Code owner / path | Observed role | V25 disposition | Remaining gap |
|---|---|---|---|
| `source/solo_realms_v17.js` | Retained base implementations for `sr11RollAttack`, `sr14AbilityCheck`, and `sr14SavingThrow` | Compatibility adapters remain; V25 normalizes legacy ability-check/save outcomes | Base monolith still needs a complete call-site-level inventory and phased replacement |
| `source/SR18_SYSTEMS_LAYER.js` — `sr18ResolveMonsterAction` | Monster save-based actions and monster attack-vs-AC resolution | Monster attack comparison now calls `sr25ResolveAttack`; natural 20 adds a critical damage die; natural 1 misses. Saving throws flow through the normalized save adapter | Player weapon attacks and all spell attack callers still need a unified call-site audit |
| `source/SR18_SYSTEMS_LAYER.js` — spell effects | Saving throws, concentration saves, condition and damage effects | Existing save calls receive V25 total-vs-DC normalization | Spell-specific exception catalog and full damage/effect service extraction remain incomplete |
| `source/SR20_GAMEPLAY_ENGINE.js` — `sr20ResolvePlayerAction` | Integrated skill, travel, tactical and campaign checks | House-rule effects are now profile-gated | Older V20 action resolver still has its own calculation path; it is retained for Enhanced compatibility |
| `source/SR21_PLAYTEST_HARDENING.js` — `sr21CanonicalCheck` | Main V21 ability-check resolution, advantage/disadvantage and fatigue integration | Final check now uses `sr25ResolveAbilityCheck`; ability/proficiency/skill modifiers are exposed as pure services | Group checks, contests, and feature-granted d20 exceptions are not yet extracted |
| `source/SR21_PLAYTEST_HARDENING.js` — `sr21ResolvePlayerAction` | Converts Director/player intent to checks, no-roll outcomes and campaign consequences | Records ruleset ID and DC provenance; V25 controls strict vs Enhanced DC guidance | No-roll contract, failure-consequence envelope and action transaction still require typed integration |
| `source/SR23_DUNGEON_MASTER.js` — `sr23ResolvePlayerAction` | Director plan and no-roll gate before V21 resolution | Director proposes; V21/V25 resolve. Corrected “very easy” matching precedence | Every action type still needs a typed request/result mapping |
| `source/SR24_CUSTOM_AI_DM.js` | Optional connected model proposes structured plans/narration | Model output is validated before deterministic resolution; it does not roll or commit mechanics | More adversarial plan validation and stale-response/campaign-revision tests remain |

## Known discrepancy and test disposition

| Finding | Earlier evidence | V25 action | Status |
|---|---|---|---|
| Natural 1/20 were incorrectly treated as automatic ability-check/save results in legacy V18 expectations | `tests/solo_realms_v18_rules_campaign_test.cjs` assertions for four combinations | Replaced with total-vs-DC assertions; V25 normalizes legacy runtime result objects | Corrected in source/tests; CI pending |
| V21 ability-check suite already expected total-vs-DC semantics | `tests/solo_realms_v21_hardening_test.cjs` natural 1 and 20 assertions | Preserved and now selects the Enhanced profile explicitly for legacy feature tests | Test compatibility addressed; CI pending |
| Custom DC presets (5/8/12/16/20/25) were mixed with the official typical DC ladder (5/10/15/20/25/30) | V21 presets and V23 Director guidance | Separate persisted profile settings and labels; strict profile uses the 2024 typical scale | Corrected at V25 rules-contract boundary; broader DC text interpretation remains partial |
| “Very easy” could match “easy” first | `sr23DifficultyDC` pattern order | Reordered and added regression tests for DC 5 vs DC 10 | Corrected in source/tests; CI pending |
| Class edge, cover, flank and fatigue adjustments looked like baseline rules | V20/V21 gameplay and test cases | Explicit persisted house-rule switches and two campaign profiles | Corrected for the named gameplay paths; not a general exhaustive 2014/2024 edition switch |

## 2014 / 2024 edition boundary

V25 currently provides a 2024 SRD 5.2.1 core profile and a Solo Realms Enhanced legacy profile. **The Enhanced profile is not a faithful 2014 rules profile.** A separate 2014 profile is not implemented. It must be introduced with its own edition-specific rules registry and tests; do not label the Enhanced profile “2014.”

## Open audit work

1. Finish the V17 monolith call-site index for every player attack, monster attack, spell attack, saving throw, death save, contest, and advantage source.
2. Trace every class feature and spell that changes a d20 roll, including rerolls, minimum die results, extra dice, and specific automatic success/failure.
3. Route remaining attack/save callers through typed V25 requests without bypassing range, cover, advantage, resources or action economy.
4. Add seeded end-to-end cases for spell attacks, contests/group checks, death saves, condition expiry, damage resistance/immunity/vulnerability, and save/load round-trips.
5. Keep any untraced or untested path marked partial until its source, unit tests, integration tests, persistence tests and player-facing result are all present.

## Current validation state

Source and regression changes are committed on `feature/sr25-rules-contract` and proposed in [PR #27](https://github.com/daltonjk2001-hub/RPG/pull/27). The GitHub PR head has not yet reported a workflow run or status check. Therefore no V25 test is represented here as passed until the repository CI executes it.
