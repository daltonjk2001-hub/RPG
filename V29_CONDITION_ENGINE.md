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

## Multiplayer player-versus-player grapple flow

The multiplayer grapple adapter now supports a connected party member as the grapple target, not only the selected monster. The attacker selects a living connected hero within 5 feet; the host resolves the Unarmed Strike attack roll against that hero's AC and consumes the attacker's Action on a hit or miss.

On a hit against another player, the host stores a pending, source-linked save challenge with the attacker, target, escape DC, reach, size, and hand-capacity snapshot. The target hero receives the response controls on their own combat client and chooses Strength or Dexterity. The guest sends a bounded COMBAT response to the host; the host verifies that the responding peer owns the targeted hero and that the challenge is still pending, then resolves the selected save through the canonical creature saving-throw resolver. Pending challenges are pruned when either participant disconnects or is defeated, or when the combat round advances before the response; this prevents an abandoned prompt from locking the attacker's turn. A disconnected target must initiate a new grapple after reconnecting rather than resuming a cancelled save prompt. A successful save resists the grapple; a failed save creates the normal V29 Grappled instance with the attacker's source ID and escape DC. The initiator cannot take another action while awaiting the response. In tactical multiplayer combat, a grappler can move one square at a time while dragging a single held creature into the square they vacated. Dragging a creature that is not Tiny or at least two sizes smaller costs twice the normal movement (including difficult-terrain and stand-up costs); the size exceptions retain normal movement cost. The solo abstract-movement and multiplayer tactical hero-movement adapters explicitly reject voluntary movement by a Grappled hero and direct them to spend an action to escape. Because the tactical grid allows only one creature per square, a grappler's movement is blocked while they hold multiple creatures rather than overlapping tokens. Forced displacement does not drag the other participant; normal reach reconciliation releases the grapple if they are separated beyond reach.

This is host-authoritative application logic and automated regression coverage. It does not replace physical two-device latency, reconnect/resume, or mobile-client playtesting; those remain required before declaring multiplayer timing complete. Cancelled prompts are not resumed after reconnect.

## Rules and integration delivered

- A single registry and status service cover the fifteen conditions, derived Incapacitated/Prone state, Speed-zero state, condition immunity, and the condition-driven Strength/Dexterity saving-throw failure matrix.
- Paralyzed, Petrified, Stunned, and Unconscious automatically fail Strength and Dexterity saves; the V25 creature-save resolver enforces this without changing other saving-throw abilities.
- Incapacitating applications end concentration. Player attack and spellcasting paths are guarded; solo and multiplayer monster action resolution and legendary actions consult the canonical action gate. Monster Parry and damage-reduction reactions consult the canonical reaction gate and cannot trigger while Incapacitated.
- Blinded sight-dependent and Deafened hearing-dependent checks can be represented as automatic failures in the skill-mode service. Blinded does not auto-fail an unspecified Perception check, because that check may rely on hearing or another sense; the calling action must identify the sense it requires. Frightened modifiers require confirmed line of sight to the source rather than assuming an unknown source is visible.
- Poisoned, Frightened, Prone, Restrained, Blinded, Invisible, and target-condition effects feed the shared attack-mode logic for the V7 and V11 attack paths. Advantage and Disadvantage cancel rather than accumulate.
- Prone gives Advantage to any attack made from within 5 feet and Disadvantage to attacks made from farther away. Movement through the legacy player-movement adapter spends the existing half-speed allowance to stand and then removes Prone.
- Paralyzed and Unconscious targets can receive an automatic critical hit from any attack roll that hits within 5 feet. The player grid Attack action, V11 attack path, and V7 enemy attack path now use the shared V29 predicate without adding a second extra die on a natural 20.
- Petrified targets gain Poisoned condition immunity and resistance to all damage through the existing damage adapter; the condition status service reports these effects. Stunned does not set Speed to 0 under the 2024 rules.
- Charmed and Frightened source restrictions are applied when the source ID is recorded with the condition instance. The recorded charmer receives Advantage on actual NPC social checks. Source-aware Frightened gates prevent solo/multiplayer heroes and monsters from taking tactical grid steps or planning teleports closer to a confirmed visible source. Forced displacement remains allowed. These rules are intentionally not guessed when an imported/legacy condition has no identifiable source.
- The V10 initiative round-end condition cleanup now calls the canonical expiry service instead of deleting legacy strings. The other retained condition helpers are compatibility adapters into the same engine.
- Grappled condition instances retain their grappler identity and grapple reach. Reconciliation releases only the affected instance when the grappler is Incapacitated or the target-to-grappler distance exceeds that instance's reach; other independent grapples on the same target remain intact.

## Player-facing condition management

The V29 adventure view now includes a Condition Management panel for the player character, active remote multiplayer party members during multiplayer combat, and active combat enemies. It displays each active condition instance with its source and remaining round duration, supports applying timed or permanent conditions, records source creature IDs for source-specific effects, and removes one selected instance without erasing other applications. Grappled entries display the grappler and stored reach; the panel accepts a custom reach (default 5 feet) and exposes a Release grapple control. Exhaustion is displayed as a level and can be reduced one level at a time. The Frightened source line-of-sight flag is explicit; an unknown source is not assumed visible. The panel resolves remote party members by stable multiplayer player ID and supports applying, inspecting, and removing their independent condition instances. Dedicated character/combat/enemy status views and automatic inference of every spell, feature, or monster-effect duration remain unfinished.

## Grapple lifecycle

The 2024 Rules Glossary ends a Grappled condition if its grappler has the Incapacitated condition or if the distance between the target and grappler exceeds the grapple's range. A grappler can also release the target without an action. V29 stores the grappler creature ID and the applicable reach on each grapple instance. Monster action application records the source creature and parsed reach; manual condition application exposes a reach field with a 5-foot default for an ordinary close grapple.

The reconciliation service operates on the current combat participant set. It checks for an Incapacitated grappler and compares known combat positions using the game distance helper; when a grapple ends, it removes only the matching instance. It is invoked after condition application, supported solo and multiplayer enemy movement adapters, monster actions, and before condition status/attack adjudication. If a legacy save has no identifiable grappler, or positions are unavailable, V29 preserves the instance rather than guessing that the grapple has ended. A grappler can release a specific instance through the condition panel or release service.

The canonical V29 service reacquires the normalized condition instance after live grapple reconciliation before storing escape metadata, preserving the escape DC. Grapple initiation follows the 2024 sequence: a successful Unarmed Strike hit and legal size/hand/reach check are followed by the target's choice of a Strength or Dexterity saving throw against 8 + the grappler's Strength modifier + proficiency bonus; only a failed save applies Grappled. The target can later use an action to make a Strength (Athletics) or Dexterity (Acrobatics) check against that DC. V29.1 now connects this sequence to the solo combat UI: Unarmed Strike grapple attempts resolve against AC, let Director-controlled targets use their stronger legal save, apply the canonical condition on a failed save, and offer an action-based escape. The solo abstract-distance movement adapter charges the doubled movement cost while dragging and keeps every creature held by the grappler adjacent; when multiple targets are held, the most restrictive size-based movement cost applies. Director-controlled targets select their stronger legal Strength or Dexterity save, and the roll is resolved through the canonical saving-throw service so condition auto-failures, Exhaustion, and Dexterity-save Disadvantage are retained. Free-hand calculation recognizes unarmed state, one-handed and two-handed main-hand weapons, off-hand weapons, and an equipped-shield flag or equipped shield inventory record. The solo and multiplayer player grapple paths are connected. V29.2 now reconciles grapple release after multiplayer hero movement, shove maneuvers, weapon-mastery Push, spell resolution (so any spell implementation that changes position is followed by a reach check), multiplayer monster movement, and monster actions. Abstract-distance solo combat also releases a grapple when forced displacement takes either participant beyond stored reach. Solo and multiplayer monsters now spend their action attempting a source-specific Athletics/Acrobatics escape against the stored DC; explicit monster skill bonuses are preserved by the canonical ability-check resolver. V29.3 supports both save-based monster grapple actions and attack-on-hit grapple actions, parses an explicit escape DC when present, and tracks occupied monster appendage slots using declared anatomy or a conservative fallback. Appendage allocation now selects the first genuinely free slot instead of deriving the slot from the number of active grapples, so releasing an earlier grapple cannot cause a later grapple to duplicate a surviving slot. Legacy grapple instances without slot metadata conservatively reserve an available slot. Remaining work is remote player-versus-player save-choice/turn integration, complete anatomy data for unusual creatures and multi-target grapple actions, exact player equipment/shield state, direct position writes outside these adapters, actual teleport execution, monster Push/Pull displacement, and live multiplayer timing, and live multiplayer timing.

## Forced-displacement and teleport audit

The V29.4 audit distinguishes post-resolution reconciliation from actual movement implementation:

- The grapple adapter calls both abstract-distance and tactical-position reconciliation after `sr14CastSpellComplete`. This is a safety hook for spell implementations that mutate position; it is not evidence that every teleport or displacement spell currently performs its movement.
- The spell-effect classifier recognizes teleport descriptions as `kind: 'teleport'`, but `sr18ApplySpellUtility` currently handles only utility, temporary-HP, buff, armor, resistance, and invisibility categories in its cast-completion allowlist. It does not execute teleport movement or request a destination.
- The monster-action resolver currently resolves damage, saving throws, and inferred conditions. Its inspected action-resolution path does not apply parsed Push/Pull displacement. Existing shove, weapon-mastery Push, and movement adapters have separate grapple reconciliation hooks.
- The known movement adapters reconcile after solo enemy movement, multiplayer enemy stepping, multiplayer hero movement, monster action completion, shove maneuvers, weapon-mastery Push, and spell completion. Direct writes to participant positions outside those adapters remain an unclosed integration risk.

The V29.5 displacement transaction and V29.11 player-teleport path close the supported tactical cases: monster Push/Pull, monster self-teleport, player spell Push/Pull, and player self-teleport for Misty Step or teleport descriptions with an explicit numeric range. Player teleport searches for a visible, unoccupied square within range, uses deterministic safe placement that maximizes distance from the nearest living enemy, commits to the solo or multiplayer hero position, and reconciles source-linked grapples. Tactical teleports without a supported range/destination rule (including companion-destination spells such as Dimension Door) are rejected before action or slot use. This is not a player-selected destination interface and does not implement non-combat travel teleport; those cases remain Partial. Unsupported non-combat teleport effects are now rejected before spending resources, rather than falling through to the legacy placeholder position.

## V29.5 forced displacement

The monster action resolver applies described Push/Pull displacement after the relevant attack hits or the target fails its saving throw.

- **Multiplayer tactical combat:** a shared grid-step planner derives direction from source and target positions, applies the described distance in 5-foot steps, and stops before missing, blocked, or occupied cells.
- **Solo theater-of-the-mind combat:** the resolver updates the monster's abstract separation from the hero, increasing it for Push and decreasing it for Pull without allowing negative distance.
- **Grapples:** successful position/distance commits invoke abstract and tactical grapple reconciliation.

Regression coverage checks tactical Push distance, Pull direction, blocked/occupied-square stopping, solo abstract Push, solo abstract Pull, and zero-distance clamping.

Monster teleport actions now have a destination-selection layer: the planner searches within the stated range, rejects the current square and illegal/occupied destinations, requires line of sight, and prefers a legal destination that closes distance to the target. Solo theater-of-the-mind teleport actions update abstract monster separation. Tactical multiplayer teleport commits a selected grid position and reconciles grapples. Regression tests cover legal destination choice, blocked-destination rejection, stated range, and solo abstract relocation.

## V29.9 player-originated solo Shove

Solo theater-of-the-mind combat now exposes both 2024 Shove outcomes: push the target 5 feet away or knock it Prone. The target makes its stronger legal Strength or Dexterity save against the attacker's Shove DC (8 + Strength modifier + proficiency bonus); a successful save prevents the effect. The push updates abstract separation and immediately reconciles source-linked grapple reach. The tactical multiplayer Shove path remains in place, and Weapon Mastery Push continues to update solo abstract distance.

Player-originated spell Push/Pull is also connected for supported save-based control/damage spells and attack-on-hit descriptions: the resolver identifies the target's failed save (or successful attack), applies the parsed distance in solo abstract combat or collision-aware tactical movement, and reconciles source-linked grapples. Movement-only control spells no longer inherit an invented Restrained condition from the legacy fallback.

Regression coverage exercises solo Shove Push/Prone, successful-save resistance, grapple release, player-facing controls, Push/Pull description parsing, failed-save gating, movement-only control classification, and abstract spell Push/Pull.

Still open: player-selected teleport destinations; companion, long-range, and non-combat travel teleports; special-case spell movement that does not use the supported Push/Pull wording or save/hit structure; every monster feature wording; and a complete audit of legacy direct position writes. V29.11 covers player self-teleport for Misty Step and explicit-range descriptions in tactical combat only. Unsupported tactical teleport effects are rejected before resource consumption rather than approximated.

## V29.10 monster repeat-save integration

Monster save-based actions now attach the canonical repeat-save contract when their description explicitly specifies a supported repeat trigger and the target fails the initial save. The condition instance retains its monster source ID, source name, save ability, DC, trigger, and end-on-success behavior. The integration uses the same V29 repeat-save processor already used by player-originated spells, so a successful end-of-turn or damage-triggered repeat removes only that condition instance.

The resolver attaches repeat-save metadata only after the condition has actually been applied; successful initial saves, immune targets, and unsupported descriptions do not receive a repeat-save record. Regression coverage exercises a monster-applied Frightened condition, source identity, parsed Wisdom DC, and successful end-of-turn removal.

This does not yet cover every monster feature wording, effects applied outside the save-based monster-action resolver, or direct HP mutations that bypass the connected damage adapters.

## V29.11 player tactical teleport and spell-slot compatibility

Misty Step and teleport descriptions with an explicit numeric distance now use a V29 tactical self-teleport transaction during active combat. The planner observes the existing 5-foot grid model, rejects occupied and blocked squares, requires line of sight, respects the stated maximum distance, and deterministically prefers a legal destination that increases separation from the nearest living enemy. It commits the solo hero position or the multiplayer hero-position entry, then reconciles source-linked grapples. Misty Step's compact installed reference record omits its distance, so its standard 30-foot range is explicitly mapped by name.

The current cast UI does not let a player select an arbitrary destination. Teleports that need a companion target or a destination rule not represented by the current grid model (for example, Dimension Door) are rejected before the legacy cast resolver can spend an action or slot. Non-combat travel teleports remain outside this tactical implementation.

The V18 cast path also has a slot-consumption compatibility defect: structured slot records are compared with a numeric value, and the legacy scalar-slot sentinel is zero. V29 now checks the selected slot before and after a successful cast and ensures exactly one slot is consumed for structured level maps and legacy scalar saves. If a scalar save is normalized into a level map during rendering, V29 decrements the corresponding level-specific slot in that migrated map. Non-reaction leveled casts set the one-leveled-spell-per-turn lock. Failed casts and ritual casts do not consume a slot. Regression coverage includes the actual Misty Step cast, a blocked second leveled spell in the same turn, scalar-slot migration, and unsupported Dimension Door rejection without resource loss.

The direct-position-write audit reviewed the base runtime's position assignments and the additive V18/V29 movement adapters. V29.11 routes the SRD52 spell path through the validated player-teleport transaction; V29.12 also intercepts the legacy multiplayer spell fallback, suppresses its old direct-position write, and commits the same prevalidated destination after the legacy cast/resource flow. Supported movement commits reconcile source-linked grapples. Non-combat travel teleport and remaining legacy position writes outside these supported cast paths remain explicit audit items rather than being counted as complete.

## V29.12 legacy multiplayer teleport and slot compatibility

The older multiplayer spell fallback now receives the same tactical teleport safeguards as the SRD52 cast path. Before invoking the legacy resolver, V29 verifies the teleport range and finds a visible, unoccupied destination. It temporarily suppresses the fallback's direct coordinate write while allowing the existing legacy spellbook, slot, and concentration checks to run, then commits the prevalidated destination through the V29 movement adapter and reconciles grapple reach.

The legacy slot consumer now accepts structured level-slot records instead of treating them as numbers. The fallback also preserves Bonus Action timing for Misty Step, sets the leveled-spell turn lock, and avoids marking the Action as spent when the spell is a Bonus Action. Unsupported legacy teleports outside tactical multiplayer are rejected instead of reaching a legacy branch that assumes a multiplayer grid. Regression coverage confirms the legacy Misty Step path uses range/line-of-sight/occupancy validation, consumes exactly one structured slot, preserves Bonus Action timing, and updates the authoritative hero position.

## V29.13 class-power dispatch and Action Surge timing

The central hero-action wrapper previously classified both legacy `power` and newer `power-class` dispatch tokens as Bonus Actions before the class-specific resolver could inspect which feature was being used. That incorrectly blocked Fighter Action Surge when the character had already spent their Bonus Action, despite Action Surge requiring no action. Both tokens now defer resource classification to the existing class-power adapter. That adapter applies the correct per-class timing: Fighter Action Surge is free (but still condition-gated), Cleric/Warlock class powers use an Action, and the other legacy class powers retain their Bonus Action behavior. The newer `actionSurge` feature route remains consistent with this rule. Regression coverage exercises the original `power` action, the `power-class` multiplayer dispatcher, direct class-power use, and the modern feature route after both ordinary resources have been spent.

## Duration and repeat-save semantics

A timed condition instance has its own round count. Reapplying a condition creates a new instance unless the caller explicitly supplies the same instance ID to refresh it. Permanent legacy conditions remain permanent. Round-boundary ticks use the combat round identity, skip the application round, and do not decrement the same instance twice in one cycle. This is an adapter for the current solo and multiplayer turn models, not a claim that every spell duration or start/end-of-turn effect is fully modeled.

Player-originated spell conditions can carry a repeat-save contract on their own condition instance. The resolver parses supported SRD spell text for the save ability and trigger, stores the spell's save DC and source, and resolves the repeat save through the V25 creature saving-throw contract. It currently supports end-of-turn repeats (including **Hold Person**) and damage-triggered repeats (including **Dominate Person**). A successful repeat save removes only the matching condition instance; a failed save leaves it active. Per-turn/damage event keys prevent a duplicate repeat save from being resolved twice for the same trigger. Damage-triggered repeats now run automatically after resolved damage through the solo-player, multiplayer-player, and creature typed-damage adapters. The player adapters count HP and temporary-HP loss (including damage absorbed by temporary HP), exclude damage fully prevented by Guard, and count damage that causes a failed death save for an already-downed multiplayer hero. The creature adapter counts positive HP loss. Modern solo feature, SRD spell, subclass-bonus, and critical-bonus damage paths now route through the typed creature adapter; Eldritch Blast invokes it once per beam. A compatibility bridge captures remaining legacy spell-fallback, solo tactical-attack, and older player-attack direct HP writes; it aggregates direct HP loss per target per action. Direct writes outside those tracked boundaries remain an audit item. Damage event keys include a timestamp and sequence, and attempted outcomes are saved so reloads cannot reroll the same event.

Reaction spells now consume the creature's Reaction without spending or overwriting its Action or Bonus Action. The action-economy adapters distinguish Bonus Action features, ordinary Action features, free Action Surge, Reaction features, readied/opportunity attacks, and reaction-timed spells. Action Surge is labeled and treated as a no-action feature rather than a Bonus Action; V29.13 also ensures both legacy class-power dispatch tokens reach the class-specific timing gate instead of being prematurely rejected as Bonus Actions.

The current game has more than one combat adapter, and not every old feature path uses the same turn lifecycle. The V18 monster action, legendary-action, Parry, and damage-reduction reaction adapters now consult the canonical V29 action/reaction eligibility service. V29 consolidates the known V7/V10/V11 condition application and expiry helpers, but a full event-sourced combat timeline and exhaustive timing audit across every feature and multiplayer encounter remain future work.

## V29.17 — Correct Grappled attack semantics

A rules audit found that the canonical attack-state resolver incorrectly imposed Disadvantage on a Grappled attacker when attacking a creature other than its grappler. The 2024 Grappled condition sets Speed to 0; it does not impose attack Disadvantage. That penalty belongs to Restrained. V29.17 removes the extra attack modifier from the shared resolver while retaining the existing Grappled movement restriction and source/reach lifecycle.

Regression coverage now checks both attack-state resolution and actual attack-roll output: a creature that is only Grappled receives no attack Disadvantage against either its grappler or another target. Existing Restrained tests continue to verify its own attack and Dexterity-save penalties.

This is a targeted correction, not a claim that all attack-condition interactions are complete. The full regression and release-hardening workflows must pass on the updated branch before this increment is considered verified.

## V29.18 — Frightened movement parity for monsters

The source-aware movement gate now covers solo monster AI movement, multiplayer monster path steps, and monster teleport destinations in addition to player tactical movement and player self-teleport planning. When a Frightened creature has a confirmed visible source in the combat participant set, a voluntary move or teleport that reduces distance to that source is rejected. Forced displacement is deliberately not blocked.

Regression coverage checks solo and multiplayer monster movement, solo and multiplayer monster teleportation, player movement/teleport, and the forced-movement exception.

## Verification

tests/solo_realms_v29_condition_engine_test.cjs covers registry presence, separate durations, legacy migration, immunity, derived conditions, Exhaustion, automatic save failure, action/bonus-action/reaction eligibility, monster Parry and damage-reduction reaction gates, attack Advantage/Disadvantage, critical-hit boundaries, sensory checks, source-specific Charmed/Frightened behavior, concentration loss, source-specific removal, grapple reach boundaries, incapacitated-grappler release, instance-specific release, and current-combat reconciliation. V29.11–V29.12 add actual SRD52 and legacy multiplayer Misty Step casting, 30-foot range/line-of-sight/occupancy checks, sparse terrain, multiplayer grapple release after teleport, unsupported companion teleport rejection, structured and scalar spell-slot consumption, Bonus Action preservation, and the one-leveled-spell-per-turn lock. V29.13 adds regression coverage for Fighter Action Surge through both legacy class-power dispatch routes and the modern feature route. V29.15 adds live NPC social-check Advantage for the recorded Charmed source and source-aware Frightened movement checks for solo/multiplayer tactical steps, voluntary player teleport planning, and forced-displacement exceptions. V29.16 rejects unsupported non-combat teleport before resource use and prevents the legacy placeholder-position write. V29.17 corrects Grappled attack semantics so Grappled alone does not impose Disadvantage. V29.18 extends source-aware Frightened movement restrictions to solo/multiplayer monster movement and teleportation; the V29 suite now covers 264 assertions.

V29.10 persistence regression also exports, normalizes, and validates a grappled condition instance while checking that its source ID, reach, escape DC, appendage slot, and repeat-save contract survive the save/import pipeline.

Run the complete repository suite with: bash tests/run_v18.sh

## Explicit remaining gaps

The condition dashboard remains **Partial** until the remaining acceptance criteria are met:

1. Add dedicated character/combat/enemy status views; the condition panel now includes remote multiplayer party members during multiplayer combat.
2. Audit every player-facing bonus-action and reaction feature path and make every harmful spell/feature path honor the Charmed source restriction. The canonical eligibility service and V18 monster Parry/damage-reduction reaction gates are implemented; player-side feature-specific reaction dispatch remains to be traced and verified.
3. Route every ability check, saving throw, initiative roll, and attack path—including Director-proposed and multiplayer actions—through Exhaustion and condition modifiers.
4. Complete the remaining grapple acceptance work: physical two-device save-choice/turn timing; complete anatomy and equipment data for unusual appendages, shields, and off-hand configurations; player-selected destinations, companion/non-combat teleport, and unparsed special-case spell displacement; remaining non-combat/alternate direct-position-write audit; and cross-device save/import verification. Solo and multiplayer player-versus-player initiation, monster grapple resolution, escape, drag costs, solo Shove, supported spell Push/Pull, monster Push/Pull, monster self-teleport, and supported player tactical self-teleport through both SRD52 and legacy multiplayer cast paths are implemented and regression-tested. Automatic release for an Incapacitated grappler or a target moved beyond stored reach remains implemented and covered.
5. Complete dynamic Frightened source visibility updates and abstract theater-of-the-mind/multi-enemy movement cases. Solo/multiplayer tactical hero and monster movement steps, plus player and monster tactical teleport planning, now reject destinations closer to a confirmed visible source; forced displacement remains allowed.
6. Extend repeat-save coverage to monster feature wording and condition sources not handled by the save-based monster-action resolver; finish auditing direct HP mutations outside tracked legacy fallback boundaries and multi-hit legacy direct-write actions. The solo-player, multiplayer-player, and creature typed-damage adapters now automatically invoke damage-triggered repeat saves after resolved damage; modern solo feature and spell damage routes through the typed adapter per hit.
7. Perform full save/import compatibility verification and human playtests across standalone, PWA, Android touch, and two-device multiplayer.

No claim of complete 2024 D&D rules coverage should be made until those integration and live-verification gates pass.


## V29.19 — Revalidate pending player grapple challenges

A pending player-versus-player grapple save prompt is only a provisional challenge, not an already-established Grappled condition. The host now cancels it if the grappler becomes Incapacitated or if the current tactical positions place the participants beyond the stored grapple reach before the target responds. This prevents a delayed client response from applying a grapple after forced displacement or other movement invalidates the attempt. Regression coverage exercises both cancellation reasons; challenges without usable position data retain the previous behavior and still rely on the saved attempt context.

## V29.20–V29.25 — equipment and anatomy hardening

- Hand occupancy now distinguishes equipment slots from inventory records: an unequipped off-hand item or shield does not consume a hand, while an equipped shield does.
- Main-hand and off-hand object configurations respect explicit `equipped:false` / `isEquipped:false` flags. Slot-based configurations count as equipped unless explicitly disabled.
- A shield already represented in the off-hand slot is counted once, not twice.
- Hand Crossbow is explicitly kept one-handed even when other crossbow families use two hands; weapon metadata remains authoritative for other custom weapons.
- Creature grapple capacity now distinguishes grasping appendages from locomotion/sensory anatomy. Wings, legs, fins, tails, horns, and similar non-grasping parts are not automatically counted; explicit `canGrapple`, `grappleCapable`, and `usableForGrapple` metadata can identify unusual anatomy.
- Explicit `grappleAppendageCount` / `grappleAppendages` remain authoritative. Unknown anatomy continues to use the conservative fallback rather than assuming every appendage can hold a creature.
- Added 12 regression assertions for custom equipment slots, unequipped inventory shields, equipped shields, hand-crossbow handling, appendage capability flags, and non-grasping anatomy.

Verification is pending for the new commit. These changes do not replace the outstanding live multiplayer/device tests or the broader rules-coverage work.


## V29.37 — Monster automatic critical-hit parity

- Monster attack-vs-AC resolution now applies the canonical Paralyzed/Unconscious automatic-critical rule when a hit occurs within 5 feet, in addition to natural-20 critical hits.
- The range check now distinguishes unknown tactical distance from a measured zero-foot distance; missing coordinates no longer silently qualify as being within 5 feet for the automatic-critical rule.
- The combat log identifies these results as critical hits, and the extra damage dice are rolled using the attack's damage expression without doubling flat modifiers.
- Added end-to-end regression coverage for a monster melee hit against a Paralyzed target at 5 feet and a monster ranged hit against an Unconscious target at 10 feet.
- The broader damage pipeline and death-save lifecycle remain Partial; this closes one identified monster-side critical-hit integration gap only.


## V29.38 — Solo death-save lifecycle

- Added `SR29_DEATH_SAVES.js` as the canonical solo death-save service and wired it into the V10 initiative turn loop.
- Downed heroes now roll at the start of their own turns; a natural 20 restores 1 HP, a natural 1 adds two failures, three successes stabilize at 0 HP, and three failures end the chronicle with a death timestamp.
- Stable heroes remain unconscious at 0 HP and are skipped until healing or another effect restores HP. The healing adapter clears downed state and death-save counters when HP rises above 0.
- Damage received at 0 HP causes one failed save, or two on a critical hit; damage equal to maximum HP causes instant death. The multiplayer massive-damage branch now records the timestamp required by Revivify.
- The initiative adapter no longer returns early after an enemy drops the hero to 0 HP; it advances the remaining actors and resolves the death save on the hero's next turn.
- Automated tests cover the new solo procedure, damage/death transitions, initiative wiring, and multiplayer death timestamp.

This is an integration milestone, not a claim that the entire damage/death/revival lifecycle is complete. Remaining work includes a full source-aware critical/damage audit, persistence/import checks for all death states, and live solo/co-op playtests.


## V29.39 — Active solo initiative monster attack parity

- Audited the actual runtime override chain and found that the V11 initiative monster attack replaces the older V10 function. The correction targets the active V11 implementation.
- Hit success now uses the V25 typed attack resolver. The existing V11 attack-roll adapter continues to provide condition-aware Advantage/Disadvantage.
- A hit against a Paralyzed or Unconscious target within 5 feet is now an automatic critical, in addition to a natural 20.
- Critical damage extracts and doubles dice terms only; flat modifiers are applied once.
- End-to-end regression tests call the active solo monster attack function and verify the 5-foot critical case and `1d6+3` damage result.

The wider attack and damage pipelines remain Partial; this closes one active solo monster-attack path, not every legacy companion, player, or spell attack path.


## V29.40 — Timed recovery after stabilization

- When the solo hero reaches three successful death saves, the engine rolls and stores a 1d4-hour stable recovery interval.
- The engine wraps the existing V18 world-clock advancement. Four-hour watches advanced by travel, rest, sleep, downtime, research, or crafting contribute elapsed time; ordinary action ticks do not. Full-day advances count as 24 hours per day.
- When elapsed time reaches the stored interval, the hero regains 1 HP, consciousness, and normal downed-state eligibility. The recovery interval and elapsed time persist with the character save.
- Damage at 0 HP cancels the stable timer and returns the hero to failed death saves. Healing above 0 HP clears the downed state immediately. Long-rest HP recovery also clears stale stable metadata.
- The timed recovery adapter is explicitly limited to solo state; multiplayer stable recovery remains open rather than accidentally applying only to the host hero.
- Regression tests cover the 1d4 interval, partial elapsed time, completion, no advancement from ordinary actions, and a real four-hour world-clock tick.

Death and recovery remain Partial until multiplayer stable recovery, resurrection effects, and live two-device testing are complete.


## V29.48 — Multiplayer stable recovery save/import continuity

- Multiplayer death-save stabilization already stores a 1d4-hour recovery interval on the affected party character; elapsed world-clock time is advanced across the campaign's multiplayer player records, and restored HP/downed state is cleared when the interval completes.
- Added a regression that snapshots the campaign while a remote multiplayer hero is stable with partially elapsed recovery time, runs import normalization and save validation, and verifies the timer and elapsed hours remain intact.
- The regression then resumes from the validated imported state, advances the actual world clock by a travel watch, and confirms the restored hero regains 1 HP and clears stable, unconscious, and timer metadata.
- Full regression and V18 hardening both pass on the tested code commit; the V29 condition-engine suite reports **341/341 assertions passed**.

This closes the automated multiplayer stable-recovery save/import continuity check. It does not replace live two-device reconnect/resume testing. Death/revival coverage remains **Partial** pending the complete remaining damage-source and resurrection-effect audits, plus human solo and co-op playtests.

## V29.49 — Revival eligibility windows and death-state cleanup

- Added a shared revival eligibility validator at the V18 SRD52 spell-cast boundary. A target must be at 0 HP, marked dead, and have a finite recorded `deathAt`; a merely stable or unconscious character is not treated as dead.
- The validator applies the 2024 spell time windows: Revivify 1 minute; Raise Dead and Reincarnate 10 days; Resurrection 100 calendar years; True Resurrection 200 calendar years. Resurrection limits use calendar-year arithmetic rather than a fixed 365-day approximation, and valid pre-1970 Unix timestamps are accepted.
- Explicit ally IDs resolve against the campaign multiplayer roster even if the current combat context has transitioned; this prevents a remote target from silently falling back to the active caster.
- After a successful supported revival that raises HP above 0, the target's dead/downed/stable/unconscious flags, death-save counters, death timestamp, and stable-recovery timer fields are cleared. Ordinary Healing Word cannot revive a target marked dead through the multiplayer roster path.
- Added boundary and cast-path regressions for the one-minute, ten-day, 100-calendar-year and 200-calendar-year cutoffs; missing/future death timestamps; stable-at-0-HP rejection; stale metadata cleanup; and ordinary healing against a dead multiplayer target.
- **Verification on commit `e9d3721183704efd433255102419e8ae18d55c2f`:** full regression and V18 hardening both passed; V29 condition-engine suite reported **351/351 assertions passed**.

This is not a complete resurrection implementation. Spell-specific exclusions and effects still need implementation and tests: old-age death; prior Undead status where applicable; missing vital parts; consumed material component and casting-time enforcement; Raise Dead/Resurrection D20 penalties and the Resurrection caster drawback; Reincarnate's new species body and species-trait replacement; True Resurrection's full restoration/Undead conversion/new-body behavior; and alternate solo-companion, legacy, and party-healing routes. Death/recovery remains **Partial** pending those audits and live solo/two-device co-op playtests.

## V29.50 — Death-return D20 penalties and remote long-cast revival

- Raise Dead and Resurrection now set `revivalD20Penalty` to 4 on the revived target. Revivify and the other revival spells do not receive this penalty.
- The penalty is applied to the shared canonical ability-check path, legacy ability checks, saving throws, multiplayer hero saves and shared attack rolls. Nested D20 totals and success flags are recalculated after the penalty; natural 20 and natural 1 attack behavior remains intact.
- Each completed Long Rest reduces the penalty by one until it reaches zero. The Long Rest wrapper invokes a deduplicated cohort transaction for the host character, multiplayer roster characters and campaign companions, avoiding duplicate reduction when the same character appears in more than one place.
- The SRD52 spell cast build adapter now resolves an explicitly selected multiplayer ally from the campaign roster even outside tactical combat. This supports hour-long revival spells whose casting time is prohibited during combat.
- Regression coverage includes penalty activation by spell name, ability-check/save/attack totals, nested D20 success recalculation, automatic natural-20 hits, one-point Long Rest decay, deduplicated party/companion recovery, and an end-to-end one-hour Raise Dead cast on a remote party member outside combat.
- **Verification on commit `275824df548f3e936b174f3b3313fe0bf2cb7ea4`:** full regression passed ([run #46022210423](https://github.com/daltonjk2001-hub/RPG/actions/runs/46022210423)); V18 hardening passed ([run #46022210414](https://github.com/daltonjk2001-hub/RPG/actions/runs/46022210414)); V29 condition-engine suite reported **361/361 assertions passed**.

Known boundary: the penalty-recovery transaction is covered and called only after the legacy Long Rest handler reports a completed rest. The Node harness cannot currently execute the full legacy Long Rest implementation because it references `sr15RefreshResources`, which is not defined in that test runtime; direct Long Rest UI integration therefore remains unverified. The legacy failure is kept visible rather than masked by a test stub.

Still not a complete resurrection implementation. The Resurrection caster drawback (no further spellcasting and Disadvantage on D20 Tests until Long Rest when reviving a creature dead for at least 365 days), old-age/Undead/body-integrity exclusions, material consumption, true casting-time completion, Reincarnate species/body trait replacement, True Resurrection's additional restoration/Undead/new-body effects, alternate legacy/companion/party-heal routes, and live solo/two-device co-op testing remain open. Death/recovery remains **Partial**.

## V29.51 — Resurrection caster drawback

- Resurrection now records a caster-only tax when the target's death timestamp is at least 365 days before successful casting. The taxed caster cannot cast spells again until completing a Long Rest and has Disadvantage on D20 Tests.
- The caster tax is independent of the revived target's −4 return penalty. It is enforced before spell resources are spent through modern SRD52 and legacy spell-cast adapters.
- The Disadvantage participates in the shared condition engine for canonical ability checks and attacks; saving-throw and multiplayer hero-save adapters also apply it, while existing Advantage/Disadvantage cancellation is preserved.
- The completed Long Rest recovery cohort clears the caster tax from the host, multiplayer roster and companions, using identity de-duplication. The existing caveat remains: the Node harness cannot execute the entire legacy Long Rest UI chain because `sr15RefreshResources` is undefined in that test runtime; no stub was introduced to conceal this.
- Regressions cover the 365-day threshold, ability-check/attack/save Disadvantage, successful remote Resurrection outside combat, blocked follow-up spellcasting before slot expenditure, and party-wide Long Rest clearing.
- **Verification on commit `19ac75ae4833281caf655312ebe1e8fe2439a6ac`:** [full regression run #46023572498](https://github.com/daltonjk2001-hub/RPG/actions/runs/46023572498) passed; [V18 hardening run #46023572503](https://github.com/daltonjk2001-hub/RPG/actions/runs/46023572503) passed; V29 condition-engine suite **368/368 assertions passed**.

Death/recovery remains **Partial**. The next gaps are spell-specific eligibility and restoration: old-age death, prior-Undead state, missing body parts / vital organs, Reincarnate species/body transformation and trait replacement, material consumption, and actual long casting-time progression. Alternate solo-companion/legacy paths, Long Rest UI integration and live solo/two-device co-op remain open.

## V29.52 — Spell-specific revival exclusions and body-integrity checks

- Added a death snapshot helper. At solo death, multiplayer death-save death, and multiplayer damage death, the runtime snapshots `creatureTypeAtDeath` from explicit creature type metadata; player characters with an `ancestry` and no explicit creature type are recorded as Humanoid. An explicit `diedOfOldAge`, `causeOfDeath`, or legacy `deathCause` value is preserved as a death-cause fact. Current type is not overwritten when an explicit snapshot already exists.
- Eligibility now follows the distinct 2024 spell text rather than applying a blanket rule: Revivify rejects old-age deaths and any recorded missing body part; Raise Dead rejects a target that was Undead at death and fails when a vital part/organ needed for survival is recorded missing; Resurrection rejects old-age deaths and targets that were Undead at death, but accepts missing parts because it restores them; True Resurrection rejects old-age deaths but permits targets that were Undead; Reincarnate requires a Humanoid at death and is not given an unstated old-age or Undead exclusion.
- Body-integrity input is read from `missingBodyParts`, `missingVitalParts`, `vitalPartsIntact`, and the optional `bodyIntegrity` record. Successful Resurrection, True Resurrection, and Reincarnate clear recorded missing-part metadata to reflect body restoration/new-body creation; Raise Dead and Revivify do not.
- Explicit old-age metadata is required: the runtime does **not** infer old-age death from current age or lifespan. Legacy saves without a creature-type snapshot use current creature type when available, or the known player `ancestry` as a Humanoid fallback. Missing-body state is only enforced when recorded; there is not yet a player-facing injury/body-parts editor.
- Regressions cover old-age rejection for Revivify/Resurrection/True Resurrection, no extra old-age ban on Raise Dead/Reincarnate, Undead-at-death restrictions, True Resurrection's Undead eligibility, Reincarnate's Humanoid requirement, missing limbs versus missing vital organs, death snapshot metadata, and Resurrection clearing missing-part records.
- **Verification on commit `69704e6a7bcd72000b402ef846d3587374abea81`:** [full regression run #46025160905](https://github.com/daltonjk2001-hub/RPG/actions/runs/46025160905) passed; [V18 hardening run #46025160722](https://github.com/daltonjk2001-hub/RPG/actions/runs/46025160722) passed; V29 condition-engine suite **378/378 assertions passed**.

Still incomplete: Reincarnate's complete species-specific trait automation and player-facing lineage selection across all supported ancestries; True Resurrection's explicit non-Undead form restoration, poison/magical-contagion neutralization, curse removal, and new-body creation when the original no longer exists; priced/consumed material component ownership and consumption; actual hour-long casting-time progress and interruption; old-age cause entry/inference and player-facing body-injury metadata; alternate companion/legacy healing/revival routes; full Long Rest UI integration; and live solo/two-device co-op acceptance. Death/recovery remains **Partial**.


## V29.53 — Reincarnate species and trait replacement

- Added the 2024 ten-result 1d10 species table and a validated optional DM override while retaining the rolled species in the transformation result.
- The new-body transaction replaces supported ancestry ability-score bonuses, applies/removes the app's Dwarf maximum-HP adjustment, manages ancestry-granted Ember Bolt, resets tracked former-species trait-use state, and initializes supported Dragonborn/Dragonkin/Aasimar trait fields.
- The cast path applies the transformation to an explicitly selected remote campaign ally outside combat. Regressions cover the table, invalid rolls, species replacement, retained class/background/level/feats/proficiencies, supported feature replacement, and a remote Reincarnate cast.
- Full feature parity and a player-facing lineage/trait selection interface for all ten outcomes remain open.

## V29.54 — Dragonborn lineage resistance integration

- The selected Dragonborn draconic damage type now grants resistance through the shared `sr14DamageMultiplier` used by the live monster-damage adapter.
- The wrapper applies resistance only for a matching incoming type and restores the original resistance array immediately, preserving separate equipment, spell, immunity, and vulnerability data.
- Selecting a lineage also initializes the Breath Weapon use maximum from proficiency bonus and clamps saved use counts to that maximum.
- Added an end-to-end regression: a Red-lineage Dragonborn takes half fire damage, takes normal cold damage, and retains its pre-existing necrotic resistance list.


## V29.55 — Dragonborn character-creation lineage selection

- The existing character creator now displays a Draconic Ancestry dropdown only when Dragonborn is selected. It lists all ten supported lineages and their damage types.
- A Dragonborn cannot be created with a blank or unsupported lineage. The chosen lineage is copied into the character's data and converted into the stored damage type used by V29.54 resistance resolution.
- Non-Dragonborn creator flows are unchanged; the hidden lineage input is disabled and is not included in their character data.
- Regressions verify that the rendered creator includes all ten choices and that blank/unsupported lineage names are rejected.


## V29.56 — Resurrection material-component consumption

- Material price lookup now reads the spell's component declaration first, with description/legacy description and explicit numeric material-cost fallbacks.
- The consume marker is read from component text. Description text is a fallback only when it explicitly links consumption to the material component.
- Casting requires one qualifying inventory item whose recorded value meets the full minimum; a consumed component loses exactly one item, while a reusable component remains in inventory.
- Regressions cover a 300 gp consumed diamond, a reusable priced pearl, an under-valued diamond rejection, and a description-only price/consumption fallback.
- The app still does not provide a complete priced-material catalog for all resurrection spells, nor does this implement hour-long casting progression or interruption. Death/recovery remains **Partial**.


## V29.57 — True Resurrection restoration effects

- Successful True Resurrection now restores the target to maximum hit points, removes poison and Poisoned state, clears tracked magical contagions, and lifts tracked curses. It deliberately preserves unrelated conditions and nonmagical diseases.
- A target recorded as Undead at death is restored to its recorded pre-Undead creature type when available; player ancestries use Humanoid as the fallback creature type. Undead flags are cleared and the restoration is recorded.
- When the original body is explicitly recorded as absent/destroyed, the spell creates a replacement-body record, requires the creature's name to be spoken, and records the 10-foot / unoccupied-space placement rule. Because the current noncombat world has no spatial placement interface, the exact world-space placement remains a visible pending step rather than an invented coordinate.
- Regressions cover selective ailment removal, non-Undead restoration, absent-body creation/name requirement, and an end-to-end remote True Resurrection cast with a 25,000 gp consumed diamond.
- True Resurrection and overall death/recovery remain **Partial** until replacement-body world placement and actual long-casting progress/interruption are implemented, plus alternate revival routes and live co-op validation.


## V29.58 — True Resurrection type restoration and component price notation

- Corrected the non-Undead restoration so a target without an existing current creature-type field receives its saved pre-Undead type (or the player Humanoid fallback).
- Material price parsing now accepts the 2024 component notation `25,000+ GP`; the end-to-end True Resurrection cast therefore validates and consumes its 25,000 gp diamond instead of bypassing the minimum-value check.
- Added regressions for the missing current-type field and the exact 25,000+ gp component notation.


## V29.59 — Interruptible long-casting activity

- Spells with a casting time of at least one minute now start a saved pending activity instead of resolving instantly. The spell must be known/prepared, have an available slot, satisfy revival eligibility and have its priced material available before the activity begins.
- Starting a cast does not spend a spell slot or consume a component. Completion routes back through the existing spell resolver, which rechecks current spell/target state and performs the resource transaction only at the end.
- The campaign clock now tracks minute-of-day alongside its existing four-hour watch and day. The Spellbook offers ten-minute focused-casting segments; a one-hour spell therefore takes six segments. The caster can cancel, and starting another action, submitting an action form, or taking combat damage can interrupt the activity.
- Damage forces a Constitution saving throw (DC 10 or half the damage, whichever is higher). A failed save interrupts the cast without expending its slot or material; a successful save maintains focus. Incapacitation also interrupts.
- Regressions cover pending/start state, no early expenditure, minute-clock advancement, completion, interruption, and concentration failure. This is an out-of-combat activity model; the app still does not simulate all 600 six-second combat turns within a one-hour casting time. Death/recovery remains **Partial**.


## V29.60 — Structured spell-slot payment at long-cast completion

- The spell-slot selector returns a structured choice identifying both slot level and whether the slot is regular or Pact Magic. Long-cast pending records now retain that exact choice and its pre-cast count.
- At completion, the payment step checks whether the existing spell resolver already decremented the selected pool. If so, it does not charge again; otherwise it spends exactly one selected regular or pact slot and updates slot totals.
- If the spell cannot resolve or the selected slot is no longer available, completion is not reported as successful. No slot is spent when the cast is interrupted.
- Regression coverage checks regular-slot payment, pact-slot payment, and idempotent no-double-charge behavior. Death/recovery remains **Partial**.


## V29.61 — Completion-time slot accounting

- Pending casts still retain the selected slot level and regular/Pact Magic type. The final slot transaction now snapshots the live slot count immediately before the underlying resolver runs, rather than comparing against a count captured when the cast began.
- If the resolver has already spent one selected slot, the long-cast completion step records that payment and does not spend again. If the resolver leaves the count unchanged, the completion step commits one slot from the saved regular or pact pool.
- End-to-end Raise Dead, Reincarnate, Resurrection and True Resurrection regressions now compare the live before/after slot count and require an exact one-slot decrease, independent of character normalization.


## V29.62 — Normalize spell-slot progression before long casting

- The long-cast preflight now runs the existing character-resource normalization before selecting and recording a slot. This migrates older or test-created slot layouts once, so subsequent render/save cycles preserve spent slots instead of refreshing an unversioned map.
- Reincarnate's regression now declares the rare-oil component as consumed, matching the spell's material rule.
- All four one-hour resurrection-cast regressions now verify both an exact one-slot decrease and that the final spell-slot map still contains the decreased value after the completion save/render cycle.


## V29.63 — V7 spell-slot migration for long casts

- The long-cast preflight now calls the existing V7 `sr7RecalcSlots(caster, false)` for the actual caster when `spellSlotProgressionVersion` is not 3. This matters for remote multiplayer casters: `sr7Ensure()` only migrates the main `state.character`, whereas a long cast may be initiated by a different player in the campaign roster.
- This advances the slot schema once before slot reservation. Subsequent resolver save/render calls preserve the spent regular or Pact Magic slot instead of rebuilding an older slot map and restoring it.
- Raise Dead, Reincarnate, Resurrection and True Resurrection regressions now assert that the V3 progression marker is present as soon as each cast starts, then verify the exact one-slot decrease remains after completion and rendering.
- The prior CI runs passed all other V29 assertions but failed the four post-render slot-persistence checks (408/412).


## V29.64 — Preserve V7 V3 spell slots through save/render

- Root cause of the four remaining long-cast regressions: the legacy V5 `sr5Ensure` migration rebuilt spell slots whenever `spellSlotProgressionVersion !== 2`. That condition also matched V7's newer V3 schema and restored expended slots to their full values during save/render.
- The reproducible V18 builder now changes that legacy initializer to rebuild only when the stored marker is below V2. V7 V3 slot maps and their spent counts are left intact; older saves still migrate forward.
- The V29.63 long-cast preflight continues to normalize the actual local or remote caster's slot pool before reservation. The four end-to-end tests already assert the V3 marker at cast start and the exact one-slot decrease after completion/save/render.
- This is a root-level resource-persistence fix, not a test-only workaround. Death/recovery remains **Partial** for the separately listed world-placement, turn-by-turn activity, alternative revival and live device checks.


## V29.65 — Turn-by-turn Magic actions for minute-plus casting

- The official 2024 rule requires a Magic action on every caster turn for a spell with a casting time of at least one minute, plus ongoing Concentration. Breaking Concentration fails the spell without expending its slot; the caster must start over.
- Pending casts now track exact required and elapsed seconds alongside the campaign minute clock. Out of combat, the existing ten-minute focused-casting control remains available. In combat, the initial casting action and each subsequent caster turn advances exactly six seconds and consumes that turn's Action.
- Solo and multiplayer combat pages expose a dedicated Magic-action continuation control only on the active caster's turn. Other heroes and enemies may act normally. If the caster takes another action or ends their turn without continuing, the activity is interrupted; damage-triggered Constitution saves and incapacitation checks continue to interrupt it.
- At completion, the spell resolver temporarily receives an available Action for validation, then the spent Action is restored. Spell-slot and consumed-material expenditure remain deferred until successful completion.
- Regression coverage verifies a six-second multiplayer Magic action, Action expenditure, no premature slot use, active-turn enforcement, and the combat continuation control. A full 600-turn and live multi-device playtest remain outstanding, so death/recovery remains **Partial**.


## V29.66 — Solo and multiplayer long-cast caster identity

- Corrected caster lookup for a cast started in solo combat: solo combat uses the main character record even though the cast began during combat. Multiplayer casts continue to resolve the caster by roster ID.
- The multiplayer combat panel now recognizes the active local player ID exposed by the runtime/test harness, while still showing the Magic-action button only when the local hero is the active caster.
- Added a solo-combat six-second continuation regression alongside multiplayer active-turn, Action-spending, no-early-slot-spend, and panel-routing checks.


## V29.66 — Long-cast save and multiplayer snapshot persistence

- Added a Save Center snapshot regression while a multiplayer Raise Dead cast is six seconds into its one-minute test duration. The snapshot must retain elapsed/required seconds, selected regular slot level/type, target ID, caster state, world-clock second, and the full multiplayer roster.
- The regression invokes the existing local autosave wrapper through the V18 test harness, finds the saved campaign JSON in the local storage fixture, restores that JSON into the runtime, and verifies that the pending cast resumes at exactly six seconds with the same slot pool and spent Action. The test harness exposes the existing save wrapper; no gameplay save schema or second save format is introduced.
- This validates the generic V18 campaign snapshot and autosave serialization paths without introducing a parallel save format or a special-case copy of long-cast data.


## V29.66 — 600-turn combat casting stress test

- Added a deterministic end-to-end combat stress test using the real multiplayer initiative processor. Raise Dead begins with its first Magic action, then the caster takes the required Magic action on each subsequent initiative turn.
- After 599 actions, the spell must still be pending at exactly 3,594 seconds (59 minutes, 54 seconds), the target must remain dead, and the fifth-level slot must remain reserved. The 600th Magic action must complete at exactly 3,600 seconds, revive the target, spend one slot, and clear the pending cast.
- The fixture uses a harmless high-AC training dummy and deterministic attack rolls so the 600-turn test isolates cast timing and initiative progression. This complements, but does not replace, live solo/two-device playtests.


## V29.68 — Structured generic creature anatomy

- Generic `appendages` arrays and object maps now count clearly grasping structures (hands, arms, tentacles, pseudopods, grasping limbs, and manipulators) even when the record does not redundantly repeat a `canGrapple` capability flag.
- Explicit negative metadata such as `canGrapple: false`, `grappleCapable: false`, `usableForGrapple: false`, or `functional: false` still excludes that appendage. Locomotion and sensory structures such as wings, legs, fins, tails, horns, antennae, heads, and jaws are not inferred to be grasping appendages.
- Added regression coverage for structured array records, named object-map anatomy, and explicit negative capability overrides. Full regression and V18 hardening passed on the current branch head.
- This improves the anatomy data contract but does not complete the creature-by-creature anatomy catalogue. Unusual/custom creatures still need explicit anatomy or `grappleAppendages` data; unknown anatomy retains the conservative fallback. Multi-target dragging remains blocked on the single-occupant tactical grid rather than overlapping creature tokens.


## V29.69 — Custom weapon hand metadata and empty equipment sentinels

- Custom main-hand weapons now recognize numeric hand counts, string handedness values such as `two-handed`, boolean `twoHanded`, and either array- or string-valued weapon properties. Hand Crossbow retains its explicit one-handed exception.
- Empty strings and `none` / `empty` / `unarmed` off-hand sentinels no longer consume a hand. Explicit unequipped flags continue to take precedence.
- Added regressions for custom `handedness: "two-handed"`, string-valued `properties`, and empty/none off-hand values.
- Full regression passed with **429/429 V29 assertions**; V18 hardening passed. Unusual custom equipment records still need real save/import and two-device playtesting; the engine continues to prefer explicit equipped-slot metadata over guessing.
