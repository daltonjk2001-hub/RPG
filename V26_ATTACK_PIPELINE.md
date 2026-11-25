# V26 — Unified Attack Resolution Audit

## Scope

V26 routes the 13 active V17 attack-vs-AC comparisons that consume the shared `sr11RollAttack` result into the V25 typed attack resolver. The build keeps the legacy roll producer responsible for choosing the d20 result and applying existing attack modifiers, advantage/disadvantage, and feature bonuses. V25 now owns the final attack success / natural-1 miss / natural-20 critical decision against the AC already calculated by the caller.

The conversion is performed by the reproducible builder after it removes the V17 IIFE wrapper. Each legacy comparison has an exact expected occurrence count; the build fails closed if the call-site inventory changes without an audit update.

## Migrated active call sites

| Owner | Attack path | AC inputs retained at call site | V26 change |
|---|---|---|---|
| `sr11HeroAttack` | Solo player weapon attack | Enemy AC and cover | Uses `sr25AttackSuccess(roll, ac)` |
| `sr12EnemyTurn` | Multiplayer enemy attack against a hero | Hero AC, buffs, pack modifiers and cover | Uses typed attack result |
| `sr12MoveHero` | Opportunity attack during movement | Hero AC and cover | Uses typed attack result; reaction availability remains in the caller |
| `sr12HeroAttack` | Multiplayer player weapon attack | Enemy AC, cover, help and threatened-ranged disadvantage | Uses typed attack result |
| `sr12ClassPower` | Class-granted Eldritch Blast attack | Target AC | Uses typed attack result |
| `sr134WizardRecovery` | Monk Focus / Flurry attacks | Target AC | Uses typed attack result |
| `sr12SpellDamage` | Spell attack effects | Target AC and cover | Uses typed attack result |
| `sr14EnemySpecialTurn` | Monster special attack | Hero AC, buffs and cover | Uses typed attack result |
| `sr14RunFeature` | Eldritch Blast feature resolution | Target AC | Uses typed attack result |
| `sr14CastSpell` | Structured spell attack effects | Target AC | Uses typed attack result |
| `sr14CastSpellComplete` | Completed spell attack effects | Target AC | Uses typed attack result |
| `sr14PledgeButtonHtml` | Monster Multiattack against a player | Hero AC, buffs and cover | Uses typed attack result |

The builder migrates 13 comparisons across five exact legacy expression shapes. The V25 adapter derives the attack modifier from the legacy roll record's `total - r`, so the selected d20 result and caller-applied bonuses remain intact. The caller continues to own damage, critical extra dice, resources, target selection, and state mutation.

## Regression coverage

The V25 suite adds:
- typed roll-record tests for natural 1, natural 20, and ordinary total-vs-AC;
- a runtime inventory assertion that all 13 migrated call sites call V25;
- negative assertions that the old attack-vs-AC expressions no longer appear in the generated standalone runtime.

The full regression runner and V18 hardening runner remain required release gates.

## Explicit remaining attack work

This is not a claim that every possible legacy attack or attack-like action in the V17 history has been migrated. The original monolith contains older, separately implemented direct-die/companion/feature handlers which do not call `sr11RollAttack`; those require a dedicated inventory and must not be silently counted as complete. In particular:

1. Companion attacks that directly compare a d20 total with AC need an explicit attack bonus/critical policy before being moved.
2. Legacy direct-roll weapon, Cleave/Nick, and feature handlers need to be traced to determine whether they are still reachable after later overrides.
3. Attack roll sources such as advantage, disadvantage, Help, Vex, invisibility, Dodge, range, reach, cover, and condition interactions need a seeded end-to-end matrix.
4. Damage critical dice, automatic criticals from conditions/features, resistance/immunity/vulnerability and damage ordering remain separate services.
5. Player spell attacks, monster actions and opportunity attacks require full real-play verification in solo and two-device sessions.

## Current evidence boundary

The V26 change proves that the 13 inventoried shared-roll call sites call the typed resolver in the generated runtime and that the automated build/test runner checks that wiring. It does not prove every feature-specific exception, all direct-die handlers, human tabletop balance, or live multiplayer behavior. Keep those areas Partial until separately audited and tested.
