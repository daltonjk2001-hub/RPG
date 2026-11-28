# V26 — Unified Attack Resolution Audit

## Scope

V26 routes the 13 active V17 attack-vs-AC comparisons that consume the shared `sr11RollAttack` result into the V25 typed attack resolver. The build keeps the legacy roll producer responsible for choosing the d20 result and applying existing attack modifiers, advantage/disadvantage, and feature bonuses. V25 now owns the final attack success / natural-1 miss / natural-20 critical decision against the AC already calculated by the caller.

The conversion is performed by the reproducible builder after it removes the V17 IIFE wrapper. Each legacy comparison has an exact expected occurrence count; the build fails closed if the call-site inventory changes without an audit update. The V18 `sr18ResolveMonsterAction` attack path also now consumes the same typed attack-record result directly, with no duplicate legacy hit fallback. A second exact-count builder migration covers ten direct-die companion/class-feature attacks that previously compared their precomputed total to AC without natural-1/20 handling.

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

## Direct-total companion and class-feature call sites

| Owner | Attack path | V26 change |
|---|---|---|
| `enemyTurn` | Companion attacks during the legacy enemy phase | Companion total is decomposed into d20 plus its recorded attack modifier and passed to V25 |
| `sr3EnemyStrike` | Companion attacks in the early combat loop | Uses the typed total adapter |
| `sr3DeathSave` | Companion attacks while the hero is downed | Uses the typed total adapter |
| `sr4EnemyPhase` | Ally attacks during the enemy phase | Uses the typed total adapter |
| `sr5TacticalAction` | Companion attack including a queued bonus | Uses the typed total adapter with the queued bonus preserved |
| `sr6PlayerAttack` | Companion follow-up attacks after player weapon actions | Uses the typed total adapter |
| `sr7EnemyTurn` | Non-temporary companion attacks | Uses the typed total adapter; missing bonus data fails closed |
| `sr9EnemyPhase` | Companion attacks and Monk Focus strikes | Uses the typed total adapter |
| `sr10CompanionTurn` | Explicit companion command | Uses the typed total adapter |

The ten direct-total comparisons are guarded by exact expression counts in the build. Natural 20 now succeeds as an attack and natural 1 misses even when the modified total would otherwise meet AC. Existing damage rolls and action sequencing remain in their owner functions; companion critical bonus-damage dice are still an open rules item.

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


## V29 follow-up — active critical-hit paths audited

The V29.45–V29.47 passes extend the original V26 hit-resolution migration into the active damage paths:

- Solo and multiplayer player weapon attacks use the canonical Paralyzed/Unconscious critical rule within 5 feet. Weapon dice, Rogue Sneak Attack dice, and Hunter's Mark dice receive critical extra dice without doubling flat modifiers.
- Solo and multiplayer monster attacks use source-aware critical markers. Multiplayer monster turn attacks and opportunity attacks apply dice-only critical damage; the existing V13.2 downed-hit handler remains the sole owner of multiplayer death-save failure increments.
- The complete SRD spell resolver and legacy multiplayer spell attack resolver now apply condition-based criticals within 5 feet and add only the damage dice terms.
- Player opportunity attacks reuse the canonical multiplayer player weapon resolver. Monster opportunity attacks against a moving player now preserve natural-20 dice-only critical damage.
- Seeded regression coverage includes non-natural-20 Paralyzed-target spell criticals, solo Rogue Sneak Attack, multiplayer Fighter Extra Attack, monster downed criticals, and monster opportunity attacks.

## Remaining attack/damage audit

1. Companion direct-die attacks and older companion/feature handlers still need a reachability inventory and an explicit critical-damage policy; do not assume their fixed-damage expressions are dice.
2. Cleave/Nick, class-feature and other direct-roll legacy paths still need reachability and critical-order audits.
3. Complete the seeded matrix for Help, Vex, invisibility, Dodge, threatened ranged attacks, range, reach, cover, and condition interactions across solo and multiplayer.
4. Damage-type mitigation ordering (resistance, immunity, vulnerability, guard, temporary HP), rounding, and every spell/feature/companion source still need a unified end-to-end audit.
5. Automated tests do not replace human solo and two-device co-op playtests; these paths remain Partial until those are completed.
