# V29 — Canonical Condition Engine

## Rules baseline

V29 centralizes condition records and the condition interactions implemented by Solo Realms against the **2024 rules baseline (SRD 5.2.1)**. It does not change existing campaigns to a 2014 rules profile, and it does not claim full condition-rule parity or a completed in-game status interface.

Primary references:

- [D&D 2024 Rules Glossary](https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary)
- [D&D 2024 Playing the Game](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game)
- [System Reference Document 5.2.1](https://www.dndbeyond.com/srd)

## Canonical condition model

source/SR29_CONDITION_ENGINE.js defines the fifteen standard conditions and exposes a deterministic service through globalThis.__SR29_TEST for regression coverage.

Each application is stored as an independent condition instance with an ID, source, permanence, duration, and application phase. Applying the same condition more than once does not overwrite the earlier application. The condition's mechanical effect is queried once regardless of how many active instances exist. Expiry removes only the instance whose duration ended. Legacy string conditions and older {name, rounds} / {name, duration} records are normalized as permanent or timed entries without discarding their prior meaning.

The Exhaustion condition is handled separately as a cumulative level from 0 to 6. Under the 2024 profile, each level imposes a −2 penalty to D20 Tests and reduces Speed by 5 feet; reaching level 6 is fatal. The final Long Rest adapter reduces Exhaustion by one level, avoiding the multiple reductions previously layered into legacy wrappers. Long Rest no longer erases all condition instances as a side effect.

## Rules and integration delivered

- A single registry and status service cover the fifteen conditions, derived Incapacitated/Prone state, Speed-zero state, condition immunity, and the condition-driven Strength/Dexterity saving-throw failure matrix.
- Paralyzed, Petrified, Stunned, and Unconscious automatically fail Strength and Dexterity saves; the V25 creature-save resolver enforces this without changing other saving-throw abilities.
- Incapacitating applications end concentration. The player action paths for attacks and spellcasting are guarded; the initiative enemy path skips incapacitated creatures.
- Blinded sight-dependent and Deafened hearing-dependent checks can be represented as automatic failures in the skill-mode service. The legacy Perception path uses this automatic-failure behavior for Blinded.
- Poisoned, Frightened, Prone, Restrained, Blinded, Invisible, and target-condition effects feed the shared attack-mode logic for the V7 and V11 attack paths. Advantage and Disadvantage cancel rather than accumulate.
- Prone gives Advantage to any attack made from within 5 feet and Disadvantage to attacks made from farther away. Movement through the legacy player-movement adapter spends the existing half-speed allowance to stand and then removes Prone.
- Paralyzed and Unconscious targets can receive an automatic critical hit from any attack roll that hits within 5 feet. The grid attack path and the V7 enemy attack path include this exception without adding a second extra die on a natural 20.
- Petrified targets gain Poisoned condition immunity and resistance to all damage through the existing damage adapter; the condition status service reports these effects. Stunned does not set Speed to 0 under the 2024 rules.
- Charmed and Frightened source restrictions are applied when the source ID is recorded with the condition instance. This is intentionally not guessed when an imported/legacy condition has no identifiable source.
- The V10 initiative round-end condition cleanup now calls the canonical expiry service instead of deleting legacy strings. The other retained condition helpers are compatibility adapters into the same engine.

## Duration semantics

A timed condition instance has its own round count. Reapplying a condition creates a new instance unless the caller explicitly supplies the same instance ID to refresh it. Permanent legacy conditions remain permanent. The turn-phase metadata prevents a condition applied during the current enemy phase from immediately losing a round in that same phase.

The current game has more than one combat adapter, and not every old feature path uses the same turn lifecycle. V29 consolidates the known V7/V10/V11 condition application and expiry helpers, but a full event-sourced combat timeline and exhaustive timing audit across every feature and multiplayer encounter remain future work.

## Verification

tests/solo_realms_v29_condition_engine_test.cjs covers registry presence, separate durations, legacy migration, immunity, derived conditions, Exhaustion, automatic save failure, attack Advantage/Disadvantage, critical-hit boundaries, sensory checks, source-specific Charmed/Frightened behavior, concentration loss, and source-specific removal.

Run the complete repository suite with: bash tests/run_v18.sh

## Explicit remaining gaps

The condition dashboard remains **Partial** until the remaining acceptance criteria are met:

1. Add visible, player-facing condition and source/duration controls to character, combat, and enemy status panels.
2. Complete every bonus-action and reaction gate, and make every harmful spell/feature path honor the Charmed source restriction.
3. Route every ability check, saving throw, initiative roll, and attack path—including Director-proposed and multiplayer actions—through Exhaustion and condition modifiers.
4. Complete grapple-source lifecycle handling, including automatic release when the grappler becomes Incapacitated or is moved out of reach.
5. Complete Frightened source visibility and movement restrictions against exact line of sight and target identity.
6. Add condition-specific repeat-save procedures and full spell/monster-feature effect transactions instead of relying on inferred text or generic durations.
7. Perform full save/import compatibility verification and human playtests across standalone, PWA, Android touch, and two-device multiplayer.

No claim of complete 2024 D&D rules coverage should be made until those integration and live-verification gates pass.
