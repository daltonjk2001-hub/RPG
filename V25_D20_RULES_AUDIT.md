# V25 — D20 Rules Discrepancy Inventory

Audit scope: the live V18–V27 code layers and their retained regression suites, with the V25 typed resolver layered last by the reproducible build. This is the initial inventory for backlog task S0.1; it identifies the known active call paths and known contradictory tests. It is not a claim that every possible branch in the retained V17 monolith has been exhaustively enumerated.

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
| `source/solo_realms_v17.js` | Retained base implementations for `sr11RollAttack`, `sr14AbilityCheck`, and `sr14SavingThrow` | V26 routes 23 inventoried attack comparisons; V27 routes six direct ordinary save paths plus the player/monster save service wrappers | Base monolith still needs a complete call-site-level inventory; unlisted feature-specific saves remain unverified |
| `source/SR18_SYSTEMS_LAYER.js` — `sr18ResolveMonsterAction` | Monster save-based actions and monster attack-vs-AC resolution | Monster attack comparison calls `sr25ResolveAttack`; natural 20 adds a critical damage die; natural 1 misses. Saving throws flow through the normalized save adapter | Direct-roll attack handlers and specialized save paths remain to be inventoried |
| `source/SR18_SYSTEMS_LAYER.js` — spell effects | Saving throws, concentration saves, condition and damage effects | V27 routes the V18 active-save-bonus wrapper back through the typed save resolver; V17 spell save paths are migrated by the reproducible build | Legendary Resistance, voluntary failure UI, spell-specific exceptions and damage/effect transaction remain incomplete; see `V27_SAVING_THROW_PIPELINE.md` |
| `source/SR20_GAMEPLAY_ENGINE.js` — `sr20ResolvePlayerAction` | Integrated skill, travel, tactical and campaign checks | House-rule effects are now profile-gated | Older V20 action resolver still has its own calculation path; it is retained for Enhanced compatibility |
| `source/SR21_PLAYTEST_HARDENING.js` — `sr21CanonicalCheck` | Main V21 ability-check resolution, advantage/disadvantage and fatigue integration | Final check now uses `sr25ResolveAbilityCheck`; ability/proficiency/skill modifiers are exposed as pure services | Group checks, contests, and feature-granted d20 exceptions are not yet extracted |
| `source/SR21_PLAYTEST_HARDENING.js` — `sr21ResolvePlayerAction` | Converts Director/player intent to checks, no-roll outcomes and campaign consequences | Records ruleset ID and DC provenance; V25 controls strict vs Enhanced DC guidance | No-roll contract, failure-consequence envelope and action transaction still require typed integration |
| `source/SR23_DUNGEON_MASTER.js` — `sr23ResolvePlayerAction` | Director plan and no-roll gate before V21 resolution | Director proposes; V21/V25 resolve. Corrected “very easy” matching precedence | Every action type still needs a typed request/result mapping |
| `source/SR24_CUSTOM_AI_DM.js` | Optional connected model proposes structured plans/narration | Model output is validated before deterministic resolution; it does not roll or commit mechanics | More adversarial plan validation and stale-response/campaign-revision tests remain |

## Known discrepancy and test disposition

| Finding | Earlier evidence | V25 action | Status |
|---|---|---|---|
| Natural 1/20 were incorrectly treated as automatic ability-check/save results in legacy V18 expectations and an embedded V14 self-test | `tests/solo_realms_v18_rules_campaign_test.cjs` plus `__SR14_TEST.tests()` legacy checks | Replaced external assertions and adapted the embedded self-test hook to rerun each affected mechanic against the V25 total-vs-DC contract | Corrected in source/tests; CI pending |
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

## V27 ordinary saving-throw routing update

V27 adds typed save adapters for records and legacy totals, missing-ability automatic failure, and the Paralyzed/Unconscious Strength/Dexterity rule. The builder routes six audited manual save sites in grapple/shove, area save-control, both spell-target save closures, save-damage spell resolution, and Turn Undead. Player saves against monster effects are adapted through `sr133HeroSave`; `sr14SavingThrow` is normalized after V18 active save bonuses. Death saves remain on `sr12DeathSave`, outside the ordinary save resolver. See `V27_SAVING_THROW_PIPELINE.md`.

## V26 attack-vs-AC routing update

V26 adds a reproducible-build migration for 13 shared-roll plus ten direct-total attack-vs-AC call sites. The build fails if any of the expected legacy expression counts change. See `V26_ATTACK_PIPELINE.md` for the caller-by-caller mapping and remaining direct-roll paths.

## Current validation state

V25 and V26 are merged to `main`. V27 is proposed separately; its CI result, test count and merge status are recorded in [PR #29](https://github.com/daltonjk2001-hub/RPG/pull/29) after the current branch is opened.
