# V29 — Canonical Condition Engine

## Rules baseline

V29 centralizes condition records and the condition interactions implemented by Solo Realms against the **2024 rules baseline (SRD 5.2.1)**. It does not change existing campaigns to a 2014 rules profile, and it does not claim full condition-rule parity or a complete in-game status interface.

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
- Incapacitating applications end concentration. Player attack and spellcasting paths are guarded; solo and multiplayer monster action resolution and legendary actions consult the canonical action gate. Monster Parry and damage-reduction reactions consult the canonical reaction gate and cannot trigger while Incapacitated.
- Blinded sight-dependent and Deafened hearing-dependent checks can be represented as automatic failures in the skill-mode service. Blinded does not auto-fail an unspecified Perception check, because that check may rely on hearing or another sense; the calling action must identify the sense it requires. Frightened modifiers require confirmed line of sight to the source rather than assuming an unknown source is visible.
- Poisoned, Frightened, Prone, Restrained, Blinded, Invisible, and target-condition effects feed the shared attack-mode logic for the V7 and V11 attack paths. Advantage and Disadvantage cancel rather than accumulate.
- Prone gives Advantage to any attack made from within 5 feet and Disadvantage to attacks made from farther away. Movement through the legacy player-movement adapter spends the existing half-speed allowance to stand and then removes Prone.
- Paralyzed and Unconscious targets can receive an automatic critical hit from any attack roll that hits within 5 feet. The player grid Attack action, V11 attack path, and V7 enemy attack path now use the shared V29 predicate without adding a second extra die on a natural 20.
- Petrified targets gain Poisoned condition immunity and resistance to all damage through the existing damage adapter; the condition status service reports these effects. Stunned does not set Speed to 0 under the 2024 rules.
- Charmed and Frightened source restrictions are applied when the source ID is recorded with the condition instance. This is intentionally not guessed when an imported/legacy condition has no identifiable source.
- The V10 initiative round-end condition cleanup now calls the canonical expiry service instead of deleting legacy strings. The other retained condition helpers are compatibility adapters into the same engine.
- Grappled condition instances retain their grappler identity and grapple reach. Reconciliation releases only the affected instance when the grappler is Incapacitated or the target-to-grappler distance exceeds that instance's reach; other independent grapples on the same target remain intact.

## Player-facing condition management

The V29 adventure view now includes a Condition Management panel for the player character, active remote multiplayer party members during multiplayer combat, and active combat enemies. It displays each active condition instance with its source and remaining round duration, supports applying timed or permanent conditions, records source creature IDs for source-specific effects, and removes one selected instance without erasing other applications. Grappled entries display the grappler and stored reach; the panel accepts a custom reach (default 5 feet) and exposes a Release grapple control. Exhaustion is displayed as a level and can be reduced one level at a time. The Frightened source line-of-sight flag is explicit; an unknown source is not assumed visible. The panel resolves remote party members by stable multiplayer player ID and supports applying, inspecting, and removing their independent condition instances. Dedicated character/combat/enemy status views and automatic inference of every spell, feature, or monster-effect duration remain unfinished.

## Grapple lifecycle

The 2024 Rules Glossary ends a Grappled condition if its grappler has the Incapacitated condition or if the distance between the target and grappler exceeds the grapple's range. A grappler can also release the target without an action. V29 stores the grappler creature ID and the applicable reach on each grapple instance. Monster action application records the source creature and parsed reach; manual condition application exposes a reach field with a 5-foot default for an ordinary close grapple.

The reconciliation service operates on the current combat participant set. It checks for an Incapacitated grappler and compares known combat positions using the game distance helper; when a grapple ends, it removes only the matching instance. It is invoked after condition application, supported solo and multiplayer enemy movement adapters, monster actions, and before condition status/attack adjudication. If a legacy save has no identifiable grappler, or positions are unavailable, V29 preserves the instance rather than guessing that the grapple has ended. A grappler can release a specific instance through the condition panel or release service.

The canonical V29 service reacquires the normalized condition instance after live grapple reconciliation before storing escape metadata, preserving the escape DC. Grapple initiation now follows the 2024 sequence: a successful Unarmed Strike hit and legal size/hand/reach check are followed by the target's choice of a Strength or Dexterity saving throw against 8 + the grappler's Strength modifier + proficiency bonus; only a failed save applies Grappled. The target can later use an action to make a Strength (Athletics) or Dexterity (Acrobatics) check against that DC. The service also exposes drag movement-cost calculation. The regression suite covers successful/failed starts, escape success/failure, and movement exemptions for Tiny or two-sizes-smaller targets. These are engine-level operations; they are not yet wired into every player-facing Unarmed Strike, Escape, and movement dispatch path. The one-grapple-per-hand/appendage rule is checked when callers supply the active-grapple list and free-hand count; live equipment/appendage accounting still needs integration. Every player-side forced-movement/teleport caller and live multiplayer timing audit also remain open.

## Duration semantics

A timed condition instance has its own round count. Reapplying a condition creates a new instance unless the caller explicitly supplies the same instance ID to refresh it. Permanent legacy conditions remain permanent. The turn-phase metadata prevents a condition applied during the current enemy phase from immediately losing a round in that same phase.

The current game has more than one combat adapter, and not every old feature path uses the same turn lifecycle. The V18 monster action, legendary-action, Parry, and damage-reduction reaction adapters now consult the canonical V29 action/reaction eligibility service. V29 consolidates the known V7/V10/V11 condition application and expiry helpers, but a full event-sourced combat timeline and exhaustive timing audit across every feature and multiplayer encounter remain future work.

## Verification

tests/solo_realms_v29_condition_engine_test.cjs covers registry presence, separate durations, legacy migration, immunity, derived conditions, Exhaustion, automatic save failure, action/bonus-action/reaction eligibility, monster Parry and damage-reduction reaction gates, attack Advantage/Disadvantage, critical-hit boundaries, sensory checks, source-specific Charmed/Frightened behavior, concentration loss, source-specific removal, grapple reach boundaries, incapacitated-grappler release, instance-specific release, and current-combat reconciliation.

Run the complete repository suite with: bash tests/run_v18.sh

## Explicit remaining gaps

The condition dashboard remains **Partial** until the remaining acceptance criteria are met:

1. Add dedicated character/combat/enemy status views; the condition panel now includes remote multiplayer party members during multiplayer combat.
2. Audit every player-facing bonus-action and reaction feature path and make every harmful spell/feature path honor the Charmed source restriction. The canonical eligibility service and V18 monster Parry/damage-reduction reaction gates are implemented; player-side feature-specific reaction dispatch remains to be traced and verified.
3. Route every ability check, saving throw, initiative roll, and attack path—including Director-proposed and multiplayer actions—through Exhaustion and condition modifiers.
4. Wire the V29 grapple eligibility/start/escape/drag services into every live player Unarmed Strike, Escape action, and movement dispatcher; connect real free-hand/appendage accounting; cover player-side forced movement/teleport and live multiplayer timing. The engine-level services and deterministic regression cases are now present. Automatic release for an Incapacitated grappler or a target moved beyond its stored reach remains implemented and covered.
5. Complete Frightened source visibility and movement restrictions against exact line of sight and target identity.
6. Add condition-specific repeat-save procedures and full spell/monster-feature effect transactions instead of relying on inferred text or generic durations.
7. Perform full save/import compatibility verification and human playtests across standalone, PWA, Android touch, and two-device multiplayer.

No claim of complete 2024 D&D rules coverage should be made until those integration and live-verification gates pass.
