# V27 — Unified Saving-Throw Pipeline

## Scope

V27 extends the V25 typed d20 contract to the saving-throw paths that previously calculated `d20 + bonus >= DC` directly. It preserves the separate death-saving-throw procedure and keeps caller-owned effects (cover, Advantage/Disadvantage, spell damage, half damage, conditions and resource consumption) outside the shared resolver.

## Rules contract

- An ordinary saving throw adds its applicable ability modifier and proficiency/other bonuses, then compares the total with the effect's DC. Natural 1 and natural 20 do not have general automatic failure/success rules for ordinary saves.
- A target that lacks the ability score used for the save automatically fails that save.
- The Paralyzed and Unconscious conditions cause automatic failure of Strength and Dexterity saving throws.
- A saving throw's outcome and effect are defined by the feature/spell/monster action that caused it. This implementation does not infer a complete effect solely from a narrative label.
- Death saves are specialized: natural 20 restores 1 HP, natural 1 causes two failures, and 10+ is a success. They do not route through the ordinary save resolver.

Primary rules references:
- [2024 Basic Rules — Playing the Game](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game)
- [2024 Basic Rules — Rules Glossary](https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary)
- [SRD 5.2.1 CC-BY 4.0](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf)

## V25 services extended

`source/SR25_RULES_CONTRACT.js` now provides:

| Service | Responsibility |
|---|---|
| `sr25ResolveSavingThrow` | Resolve one or two d20 results against a save DC; supports Advantage/Disadvantage and explicit automatic failure |
| `sr25HasSaveAbility` | Verify that the target has a valid 1–30 score for the required ability |
| `sr25ResolveCreatureSavingThrow` | Resolve a creature save and automatically fail if the required score is absent |
| `sr25ResolveSavingThrowTotal` | Adapt a legacy modified total back into a typed save result |
| `sr25SavingThrowTotalSuccess` | Boolean adapter for legacy code that only needs the outcome |

The general `autoFail` flag only affects `saving-throw` mechanics. It cannot turn an attack into an automatic miss or suppress an attack critical.

## Migrated V17 call sites

The reproducible build migrates the following six ordinary save paths. Every source expression has an exact expected occurrence count; the build stops if the legacy text changes unexpectedly.

| Owner / function | Save path | V27 behavior retained |
|---|---|---|
| `sr131Maneuver` | Target resists a grapple or shove | Chosen Strength/Dexterity save, selected ability, numeric total, DC and existing log text are preserved |
| `sr12CastSpell` | Area `saveControl` spell | Per-target ability, save bonus, spell DC, condition application and resist log remain in the caller |
| `sr14CastSpell` | Legacy structured spell effects | `saveTarget` returns typed success alongside its numeric total, DC and ability |
| `sr14CastSpellComplete` | Current structured spell effects | Same typed result mapping for the complete V14 spell path |
| `sr12SpellDamage` | Damage/control spell save | Dexterity-save Advantage from Dodge, half-damage rule, cover adjustment, damage and condition behavior remain in the caller |
| `sr14RunFeature` | Turn Undead | Wisdom save outcome now uses the typed resolver before applying Frightened/Turned effects |

## Player saves against monster effects

The V25 wrapper around `sr133HeroSave` now sends the original d20 result(s), save proficiency, ability modifier and cover adjustment through the typed save resolver. It preserves the existing Dexterity-save Advantage/Disadvantage rules and condition-based automatic failure.

The V25 wrapper around `sr14SavingThrow` now:
- checks for the required ability score;
- applies the Paralyzed/Unconscious Strength/Dexterity auto-failure rule;
- normalizes the final result after V18 active save bonuses;
- retains the original selected d20 and numeric modifier/total for the player-facing result.

The V18 active-effect wrapper was corrected so adding a temporary saving-throw bonus cannot replace the typed save outcome with a separate total comparison.

## Death saves remain specialized

`sr12DeathSave` remains a dedicated routine. The builder does not rewrite it as an ordinary save. Its natural-20 recovery and natural-1 two-failure behavior are protected by a V27 regression assertion. Stabilization, death thresholds, damage while downed and multiplayer downed-state handling remain governed by the existing death/downed procedures and need additional dedicated audit coverage.

## Regression evidence added

`tests/solo_realms_v27_saving_throw_test.cjs` checks:
- ordinary save natural 1/20 total-vs-DC behavior;
- missing-ability automatic failure;
- normal, Advantage and Disadvantage saves;
- explicit condition auto-failure and isolation from attack rules;
- direct-total save adapter behavior;
- Paralyzed/Unconscious player saves and missing-score player saves;
- natural-1 success when the modified total meets the DC;
- V18 temporary save bonuses;
- generated-runtime migration of all six legacy manual save paths;
- absence of the old manual save expressions;
- preservation of specialized death-save logic.

## Still partial / not claimed complete

1. Legendary Resistance and other monster-specific save exceptions do not yet have a complete structured resource/effect transaction.
2. The player-facing option to voluntarily fail a saving throw is not yet wired through the UI/Director request contract.
3. The exhaustive V17 direct-save inventory is limited to the six identified manual paths plus the `sr133HeroSave` and `sr14SavingThrow` service paths. New or obscure feature-specific saves may still exist.
4. Damage-on-save ordering, half-damage rounding, resistance/vulnerability/immunity, temporary HP and condition expiry need a single end-to-end effect pipeline.
5. Real browser/device, solo campaign, and two-device multiplayer playtests remain release requirements.

Status must remain **Partial** until the remaining exceptions, resources, effect pipeline and live-play evidence are complete.
