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
| Attack rolls | Partial | `SR25_RULES_CONTRACT.js`, `SR18_SYSTEMS_LAYER.js`, `SR29_CONDITION_ENGINE.js`, `tools/build_v18.py` | Typed attack resolver; V26 routes 13 shared-roll and ten direct-total V17 solo/multiplayer weapon, opportunity, companion, class-feature, spell and monster attack-vs-AC call sites plus the V18 monster-action resolver into V25; V29.39 routes active solo monster attacks through V25; V29.45–29.47 add solo/multiplayer weapon, player/monster opportunity, and SRD/legacy spell critical parity | Remaining direct-die companion/legacy feature handlers, feature-specific automatic criticals outside weapon/spell paths, attack-source advantage matrix, and companion damage critical ordering still need audit/tests; see `V26_ATTACK_PIPELINE.md` |
| Advantage and disadvantage | Partial | `SR25_RULES_CONTRACT.js`, `SR21_PLAYTEST_HARDENING.js` | Higher/lower d20 selection; cancellation supported; regression tests | Verify all sources, rerolls and stacking/cancellation rules through live action paths |
| Difficulty classes | Partial | `SR23_DUNGEON_MASTER.js`, `SR25_RULES_CONTRACT.js` | Six-band 2024 typical scale; legacy Solo Realms presets isolated behind house-rule switch; DC source recorded | Add complete task-setting guidance and tests for opposed checks, repeat attempts, passive scores and feature-set DCs |
| Initiative and turn order | Partial | V10 solo ordered combat; V13 multiplayer initiative; V13.6 tie-order handling; V29 condition integration | Dexterity checks, Alert bonus, Advantage/Disadvantage, Surprise, identical-monster grouping, fixed encounter order, player-choice ties and Director-resolved mixed/monster ties | Verify inherited Incapacitated states, solo tie handling, disconnect/reconnect and authoritative host concurrency; broaden end-to-end action/turn reset coverage |
| Actions, bonus actions, reactions and movement | Partial | V17 base runtime, V18 systems, V20 tactics | Existing combat action UI, movement/attack paths, reactions in monster features | Central action-economy ledger; validate one action/bonus/reaction per turn, opportunity attacks, ready actions and resource costs |
| Attack range, reach, cover and line of sight | Partial | V17 base runtime, `SR18_SYSTEMS_LAYER.js` | Monster action range/reach parser, LOS gate, multiplayer cover; V20 cover custom rule | Unify solo/multiplayer geometry; make cover semantics edition/profile-aware; test boundary distances and obstruction |
| Damage rolls and critical damage | Partial | V17 base runtime, `SR18_SYSTEMS_LAYER.js`, `SR25_RULES_CONTRACT.js`, `SR29_CONDITION_ENGINE.js`, `SR29_DEATH_SAVES.js` | Solo and multiplayer player weapon and monster opportunity attacks use dice-only critical bonuses; SRD and legacy spell attacks use canonical close-range condition criticals; monster turns carry one-shot critical source markers; Rogue Sneak Attack and Hunter's Mark dice double correctly; downed critical hits route two death-save failures; guard mitigation precedes downed-hit failures | Complete companion and legacy direct-die critical audit; one damage pipeline across all spell/feature/companion paths; full mitigation ordering and rounding tests; live solo and two-device co-op playtests |
| Damage types, resistance, immunity and vulnerability | Partial | `SR18_SYSTEMS_LAYER.js`, V17 base, `SR29_DEATH_SAVES.js` | Typed damage helper and creature resistance/immunity ingestion; Dragonborn's selected draconic lineage contributes resistance through the shared damage multiplier, verified through the live solo monster-damage path | Unified mitigation ordering and end-to-end tests for all player/creature damage routes, immunity, vulnerability, multiple sources and temporary HP |
| Conditions and duration/expiry | Partial | `SR29_CONDITION_ENGINE.js`, `SR18_SYSTEMS_LAYER.js`, V17 adapters | Fifteen-condition 2024 registry; independent instances and durations; legacy migration; Exhaustion levels; condition auto-fail saves; attack-mode and action/movement adapters; canonical Incapacitated action/bonus-action/reaction eligibility; class-specific Action Surge/free-action and legacy class-power dispatch coverage; V18 solo/multiplayer monster action gates; monster Parry and damage-reduction reaction gates; player/remote-party/solo-enemy source-and-duration management panel; Charmed source-specific harm restrictions and charmer Advantage on live NPC social checks; Frightened source-aware blocks for solo/multiplayer tactical hero and monster movement steps plus player/monster teleport planning, while forced displacement remains allowed; Grappled source/reach tracking with pending player challenge invalidation on Incapacitated grappler or live range violation; ; V29.17 corrects attack resolution so Grappled alone does not impose Disadvantage with automatic release on Incapacitated grappler or target beyond reach; Long Rest preservation; solo theater-of-the-mind player Shove Push/Prone outcomes; player and monster save-based repeat-save attachment for supported effects; automatic damage-triggered repeat-save processing through solo-player, multiplayer-player, and creature typed-damage adapters (including temporary HP and downed multiplayer damage); typed per-hit routing for modern solo feature/SRD spell damage, plus compatibility capture for legacy spell-fallback and older solo attack direct HP writes; monster Push/Pull and self-teleport; player spell Push/Pull with collision-aware tactical movement; Misty Step/explicit-range tactical self-teleport through SRD52 and legacy multiplayer paths with LOS, range and occupancy checks; structured and scalar spell-slot consumption guard | Complete anatomy/equipment validation for one-grapple-per-hand/appendage; dynamic Frightened source visibility and abstract/theater-of-the-mind multi-enemy movement pathing; player-selected and companion/non-combat teleport execution (unsupported non-combat teleports now fail closed before resource use); special-case spell displacement; remaining non-combat/alternate direct-position-write audit; player feature timing audit; repeat-save coverage for unsupported monster wording, direct HP writes outside tracked legacy fallback boundaries, and per-hit handling for any remaining multi-hit legacy direct-write actions; cross-device import and live multiplayer playtests; automated grapple metadata save/import round-trip now covers source, reach, escape DC, appendage slot, and repeat-save data; see `V29_CONDITION_ENGINE.md` |
| Death, dying and recovery | Partial | V17 base runtime, `SR29_DEATH_SAVES.js`, V13.1/V13.2 multiplayer lifecycle | Solo/multiplayer death saves; stable recovery; recorded-death windows and spell exclusions; Raise Dead/Resurrection return penalties and caster drawback; Reincarnate species/new-body transform; V29.56 material validation/consumption; V29.58 True Resurrection restoration; V29.59 saved long-cast clock/progress and interruption; V29.64 protects V7 V3 regular/Pact slot pools from the legacy V5 initializer; V29.65 models six-second combat-turn progress through an explicit Magic action on each caster turn, including solo and multiplayer routing | Full 600-turn solo/co-op playtest and persisted clock/reconnect validation; actual placement of a replacement body in an unoccupied world space within 10 feet; alternative revival routes; legacy Long Rest UI path |
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
| Character origins / ancestry / backgrounds | Partial | V17 base character creator, `SR18_SYSTEMS_LAYER.js`, `SR29_DEATH_SAVES.js` | Character creation and ancestry/background selection; Dragonborn is a distinct Humanoid ancestry; its creator requires a selected draconic lineage and stores the corresponding resistance; Reincarnate supports the 2024 1d10 species table and updates supported ancestry-derived data | Complete species trait transfer, player-facing feature selection for all supported ancestries, ability-score origin rules and feature interactions |
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
| Spell saving throws | Partial | V17 base, `SR18_SYSTEMS_LAYER.js`, `SR25_RULES_CONTRACT.js`, `SR29_GRAPPLE_GAMEPLAY.js` | Save-based spell effects, normalized saves, and repeat-save contracts for supported player-originated SRD spells (including Hold Person end-of-turn and Dominate Person damage-triggered repeats) | Complete typed spell-save coverage, all repeat-save spell/monster-feature sources, audit direct HP writes outside tracked legacy fallback boundaries and split any remaining multi-hit legacy direct-write actions into per-hit events, Legendary Resistance and exception tests |
| Spell slots and preparation/known spells | Partial | V17 base rules, `SR29_GRAPPLE_GAMEPLAY.js` | Spell selection/casting and resource state exist; V29 ensures exactly one slot is consumed for successful leveled casts on the SRD52 path and legacy multiplayer path, including structured and migrated scalar legacy slots, and sets the one-leveled-spell-per-turn lock | Full 2024 known/prepared distinctions, slot progression, pact magic, recovery and multiclass rules across every legacy and multiplayer cast path |
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


## V29.26 initiative condition inheritance

- Audited the existing V13 multiplayer initiative engine against SRD 5.2.1. The Initiative rule grants Disadvantage when a creature is Incapacitated; Paralyzed, Petrified, Stunned, and Unconscious include Incapacitated.
- The initiative helper already recognized direct Incapacitated, Paralyzed, and Stunned conditions, but omitted Petrified and Unconscious when those conditions were stored as their own canonical names.
- Updated the canonical V17 build input so Petrified and Unconscious also impose Initiative Disadvantage. Invisible still grants Advantage, and Advantage/Disadvantage cancel normally.
- Added five multiplayer regression assertions covering direct Incapacitated, Petrified, Unconscious, Invisible, and Invisible plus Petrified cancellation.
- The initiative/turn-order system remains **Partial**: this correction does not certify every solo tie path or physical multiplayer disconnect/reconnect and concurrent-host behavior.


## V29.27 multiplayer tied-turn handoff

- The V13.6 multiplayer initiative system already supports party-selected ordering for tied player characters and Director-resolved ordering for monster or mixed ties.
- Auditing the host message path found that changing the first tied hero could change the active actor without invalidating the cached active-turn key. That could leave the newly active hero with the previous hero's turn initialization state.
- Added an explicit active-actor comparison after a tie reorder. When the active hero changes, the host clears the cached turn key and re-enters the authoritative actor processor so the new hero receives their own turn reset. Reordering later tied heroes leaves the current hero's resources untouched.
- Added two regression assertions for active-actor-change detection and preserving the active turn when only later tied heroes are reordered.
- Full device-level verification remains outstanding; automated tests do not substitute for two-device turn handoff/reconnect testing.


## V29.28 solo turn resource refresh

- The solo V10 ordered-turn controller reset movement, Action, and Reaction when the hero's next turn began, but omitted the Bonus Action and the once-per-turn Sneak Attack marker.
- Added both resets to the canonical solo hero-turn initializer. This prevents a spent Bonus Action from remaining unavailable across later rounds and allows Sneak Attack to be used again on a later turn.
- Expanded the existing V10 initiative regression to begin with the Bonus Action and Sneak Attack already spent, then verify both refresh alongside movement, Action, and Reaction.
- This corrects the solo turn-start ledger only; exhaustive class-feature-specific timing and all action/bonus-action/reaction edge cases remain Partial.


## V29.29 multiplayer Reaction timing

- The multiplayer round-boundary routine previously restored every hero and monster Reaction together. This could restore a Reaction before that creature reached the start of its next turn.
- Removed the blanket round-boundary refresh. Heroes refresh Reaction in their own turn initializer; monsters now refresh immediately when their own initiative actor/group begins, including when the creature is then skipped for Incapacitated.
- Defeated monsters are not granted a refreshed Reaction.
- Added regression assertions for active monster refresh, defeated-monster exclusion, and no premature hero/monster refresh at round boundaries.
- The action-economy audit remains Partial pending full feature-specific timing and live multiplayer testing.


## V29.30 multiplayer Incapacitated turn eligibility

- Audited the multiplayer actor processor for conditions that inherit Incapacitated. The previous turn-skip gate recognized direct Incapacitated, Stunned, and Paralyzed records but omitted Petrified and Unconscious records stored under their own names.
- Added one shared incapacitation predicate covering Incapacitated, Stunned, Paralyzed, Petrified, and Unconscious, and applied it to player, grouped-monster, and legacy single-monster turn processing.
- Monster Reactions still refresh at the start of their own turn before the incapacitation gate skips their actions.
- Added two regression assertions covering all five incapacitating conditions and ensuring ordinary conditions such as Poisoned/Prone do not suppress a turn.


## V29.31 initiative modifier isolation

- Alert's Initiative bonus now falls back to the acting character's own level when a character record lacks a cached proficiency-bonus field. It no longer risks borrowing the host/local character's proficiency bonus for a remote party member.
- Monster Initiative modifier resolution now ignores explicit null modifier fields and correctly falls back to the monster's Dexterity score.
- Added two regression assertions for remote Alert proficiency calculation and nullable monster modifier fallback.


## Initiative audit — remaining explicit gap

- The 2024 Alert feat's Initiative Proficiency bonus is implemented and now uses the correct character-level proficiency bonus.
- The separate Alert Initiative Swap benefit is **not yet implemented**. It requires a willing-ally confirmation step immediately after initiative rolls and before the first combat turn; a silent host-side swap would not satisfy the rule's consent requirement.
- Keep Initiative and turn order marked Partial until that consent flow, solo/companion adjudication, and physical multiplayer timing are completed and tested.


## V29.32 legacy class-power action costs

- Audited the older multiplayer `sr12ClassPower` route still reachable through the generic class-ability button.
- Corrected Action Surge so it does not require or consume a Bonus Action; it grants the additional Action and can be used after the Bonus Action has already been spent.
- Corrected the legacy Cleric Divine Spark path to consume an Action, and the Warlock Eldritch Blast path to check/consume an Action rather than being blocked by a spent Bonus Action.
- Arcane Recovery is now rejected during combat and no longer consumes a Bonus Action; it remains a Short Rest feature.
- Updated the Action Surge feature label and added three regression assertions covering Fighter, Cleric, and Wizard costs. Broader class-feature timing remains Partial.


## V29.33 Ready action economy gate

- The legacy multiplayer Ready action previously bypassed the Action-spent check and forcibly set `reactionAvailable=true`, allowing a character to Ready after spending their Action or regain a Reaction that had already been used.
- Ready now requires an unused Action and an available Reaction, consumes the Action, marks the readied attack, and preserves (rather than refreshes) the Reaction.
- Added three regression assertions covering valid Ready, spent Action, and spent Reaction cases.
- The current Ready trigger model remains simplified (it waits for the next qualifying enemy strike); full player-defined trigger/action resolution remains open.


## V29.34 Potion of Healing action cost

- Verified against SRD 5.2.1: drinking or administering a Potion of Healing is a Bonus Action.
- The legacy multiplayer potion path previously consumed the Action. It now checks and consumes the Bonus Action, so a character can drink/administer a potion after using their Action but cannot do so after spending their Bonus Action.
- Added two regression assertions for both cases. The central Action ledger no longer classifies potions as Action-costing commands.


## V29.35 solo Potion of Healing turn behavior

- The solo combat potion path also treated drinking a Potion of Healing as an immediate turn-ending action. Updated it to consume only the Bonus Action during combat, preserve the current turn, and leave the Action available; outside combat it remains usable without a combat action cost.
- Solo use now rejects a potion after the Bonus Action is spent and does not consume the item on rejection.
- Added two V10 regression assertions for same-turn continuation and Bonus Action exhaustion.


## V29.36 Potion use while incapacitated

- Both solo and multiplayer potion paths now reject self-use by a creature at 0 HP, marked Unconscious, or carrying an Incapacitated condition (including inherited conditions).
- A conscious ally can still administer a potion to an unconscious target; the actor's condition, not the recipient's, governs whether the Bonus Action can be taken.
- Added regression assertions for incapacitated self-use in both combat modes.


## V29.37 — Monster automatic critical-hit parity

- Monster attack-vs-AC resolution now applies the canonical Paralyzed/Unconscious automatic-critical rule when a hit occurs within 5 feet, in addition to natural-20 critical hits.
- The range check now distinguishes unknown tactical distance from a measured zero-foot distance; missing coordinates no longer silently qualify as being within 5 feet for the automatic-critical rule.
- The combat log identifies these results as critical hits, and the extra damage dice are rolled using the attack's damage expression without doubling flat modifiers.
- Added end-to-end regression coverage for a monster melee hit against a Paralyzed target at 5 feet and a monster ranged hit against an Unconscious target at 10 feet.
- The broader damage pipeline and death-save lifecycle remain Partial; this closes one identified monster-side critical-hit integration gap only.


## V29.38 — Solo death-save lifecycle

- The V10 solo initiative loop now processes a downed hero's death save at the start of that hero's turn and continues the initiative queue instead of freezing when HP reaches 0.
- A natural 20 restores 1 HP and clears unconscious/downed state; a natural 1 adds two failures; three successes stabilize at 0 HP and leave the hero unconscious; three failures end the current chronicle with a recorded death timestamp.
- Healing that restores HP above 0 clears the solo downed/stable state and resets death-save counters.
- Damage received while already at 0 HP records one failed death save, or two for a critical hit; massive damage equal to maximum HP causes instant death.
- Multiplayer massive-damage death now records `deathAt`, so the existing one-minute Revivify eligibility check can recognize this death cause.
- Added regression coverage for solo natural 1/20, stabilization at 0 HP, stable-turn skipping, damage at 0 HP, critical damage, massive damage, initiative integration, and the multiplayer revival timestamp.
- Death and recovery remain Partial until all damage sources, persistence/import, resurrection effects, and live multiplayer behavior are audited.


## V29.39 — Solo initiative monster attack parity

- The active V11 solo initiative monster attack adapter now resolves hit success through the V25 attack contract rather than its remaining direct natural-1/20 comparison.
- It preserves V11's Advantage/Disadvantage roll record and applies the V29 condition-based automatic critical rule against Paralyzed or Unconscious targets within 5 feet.
- Critical damage adds only the dice terms from the monster's damage expression; flat modifiers are applied once.
- Regression tests execute the active solo monster attack function and verify Advantage, the automatic critical, and `1d6+3` damage ordering. The older V10 attack function was not treated as the active path because V11 replaces it.
- Attack coverage remains Partial while companion/legacy attack paths and player/spell damage critical ordering remain under audit.






## V29.42 — Cancel solo stable recovery on damage

- Damage to a solo hero who is already stable at 0 HP now clears the stored 1d4-hour recovery interval before recording the failed death save.
- This prevents a stale recovery timer from remaining on a hero whose stabilization has been interrupted.
- Added a regression with partially elapsed stable recovery, verifying that damage clears both timer fields and resumes the death-save failure count.

## V29.41 — Solo monster critical damage against downed heroes

- The active V11 solo monster attack path now carries a one-shot critical-hit marker into the canonical solo damage handler.
- When a monster critically hits an already-downed hero, the death-save lifecycle records two failed death saves rather than treating the hit as ordinary damage.
- The marker is consumed by the damage transaction so it cannot leak into a later unrelated hit.
- Added an end-to-end regression that executes the actual solo monster attack against an Unconscious hero at 0 HP and verifies two failures and marker cleanup.
- This closes the identified solo monster-attack route only. Player weapon, companion, spell, and other legacy damage paths still require source-aware routing and remain Partial.

## V29.40 — Timed recovery after stabilization

- A solo hero who succeeds on three death saves remains unconscious and stable at 0 HP, with a persisted recovery interval rolled from 1d4 hours.
- Elapsed game time advances the recovery timer through the V18 world clock. Four-hour travel/rest watches and full-day advances count; ordinary action ticks do not.
- When the interval expires, the hero regains consciousness at 1 HP. Healing above 0 HP still clears the downed state immediately; damage while stable cancels the recovery timer and resumes death-save failures.
- Long-rest recovery clears stale stable/downed metadata after HP is restored. Multiplayer stable recovery remains a separate open integration item.
- Regression coverage verifies the rolled interval, partial elapsed time, completion, and integration with the actual four-hour world clock.


## V29.43 — Explicit solo monster attacks against downed heroes

- The active V11 solo monster attack now permits an attack against a hero at 0 HP only when the monster carries the explicit `attackDownedHero` target-intent flag.
- The V11 monster-turn dispatcher no longer suppresses the attack solely because hero HP is 0; the attack-level intent gate remains authoritative.
- When explicitly targeted, the existing Unconscious-target Advantage and close-range automatic-critical rules apply, and the critical damage marker routes two failed death saves through the solo damage handler.
- End-to-end regression verifies the explicit target flag, critical damage against an Unconscious hero at 0 HP, two failed death saves, marker cleanup, and the generated turn-dispatch path.
- The Director/monster decision system still needs to decide when to set `attackDownedHero`; absent that intent, monsters do not attack a downed hero. Player weapon, spell, companion and other legacy damage sources remain to be audited.


## V29.44 — Multiplayer monster critical and downed-damage parity

- Multiplayer enemy attacks now use the canonical Paralyzed/Unconscious critical-hit rule at 5 feet, in addition to natural 20.
- Critical bonus damage adds only the dice terms from the monster's damage expression; flat modifiers remain applied once.
- The active enemy attack carries a one-shot critical marker into the multiplayer hero damage transaction. If the hero was already at 0 HP, ordinary damage adds one failed death save and critical damage adds two; massive damage at or above maximum HP causes instant death.
- Stable recovery metadata is cleared when damage interrupts stabilization. The marker is consumed after each damage transaction, including hits against standing heroes.
- Added an end-to-end multiplayer enemy-turn regression against the party's only downed hero, including an Unconscious critical hit, temporary-HP damage accounting, two death-save failures, and dice-only critical bonus.
- The multiplayer target selector only selects downed heroes when no living/standing party member remains. V13.2 remains the sole owner of multiplayer death-failure increments; V29 supplies the one-shot critical source marker and clears it after the canonical transaction, avoiding duplicate failure counting. Player weapon, companion, spell and legacy damage sources remain under audit.


## V29.45 — Player weapon critical-damage parity

- The active solo V11 weapon attack now uses the canonical condition-critical rule for Paralyzed/Unconscious targets within 5 feet and records a critical result in the attack log.
- Weapon criticals add only the weapon's dice terms. Rogue Sneak Attack and Hunter's Mark dice are doubled on critical hits without doubling flat modifiers.
- Multiplayer weapon attacks use the same condition-critical rule and dice-only bonus damage.
- Added seeded regressions for a solo Rogue's critical weapon/Sneak Attack and a level-5 multiplayer Fighter's two critical Longsword attacks. The latter verifies Extra Attack remains intact and the flat Strength modifier is applied once per strike.
- This closes the active solo/multiplayer weapon paths only. Companion direct-die attacks, opportunity attacks, spell attacks and older feature paths remain under audit.


## V29.46 — Spell attack critical parity

- The complete SRD spell resolver and the legacy multiplayer spell-damage resolver now use the canonical Paralyzed/Unconscious within-5-feet critical rule.
- Spell attack criticals add only the damage dice terms; flat modifiers are not doubled.
- Seeded tests force a non-natural-20 attack roll against a Paralyzed target at 5 feet, proving the critical comes from the condition rather than a natural 20.
- Saving-throw spells and non-attack spell effects do not become critical hits; their damage and save procedures remain separate.

## V29.47 — Multiplayer monster opportunity-attack critical damage

- Multiplayer monster opportunity attacks now apply natural-20 critical damage using dice-only bonus damage.
- The attack records its critical/advantage result, passes a one-shot source marker into the damage transaction, and clears the transient critical source after resolution.
- A seeded movement regression verifies the reaction is consumed, the hero completes the move, and `1d6+3` critical damage applies the extra die without doubling the +3 modifier.
- Player opportunity attacks continue through the canonical multiplayer weapon attack resolver, including condition-based criticals against eligible targets.
