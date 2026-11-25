# Solo Realms V20 — Seven-system gameplay design

## Product direction

Solo Realms is a game first. Rules documents, reference PDFs and the SRD library are development/reference inputs; they are not the player-facing destination. The player should spend their time making decisions in scenes, taking risks, meeting characters, exploring places and seeing a campaign remember those decisions.

V20 is an additive gameplay layer. It keeps the V18 rules and combat resolver, V19 Director Studio, V19.1 NPC/world memory, character progression, multiplayer transport and Save Center. It adds a unified action loop and durable gameplay state without replacing old campaign fields.

## The seven connected systems

### 1. Director and action resolution

The Adventure view exposes a free-form action composer. The player describes intent; the engine chooses or accepts an approach, selects a skill, calculates ability/proficiency/class modifiers, applies advantage or disadvantage when provided, rolls a d20 and compares the result to a DC. The visible outcome records the roll and explains whether the action succeeded.

The V18 improvisation resolver is consulted first for a compatible skill/DC proposal. V20 supplies a safe fallback when that resolver has no specific proposal. It does not let narration secretly rewrite a check or grant an unearned spell, item or reward.

### 2. Character identity

Checks use the character's ability scores and skill proficiency data. Class identity adds a visible +1 class edge to a short list of characteristic approaches:

- Barbarian: athletics, survival, intimidation
- Bard: persuasion, performance, deception, insight
- Cleric: insight, medicine, religion
- Druid: nature, animal handling, survival
- Fighter: athletics, perception, intimidation
- Monk: acrobatics, insight, stealth
- Paladin: persuasion, religion, intimidation
- Ranger: survival, perception, stealth, nature
- Rogue: stealth, sleight of hand, investigation, deception
- Sorcerer: arcana, persuasion, deception
- Warlock: arcana, intimidation, deception
- Wizard: arcana, investigation, history

The bonus is shown in the outcome. It is a small V20 house-rule layer, not a claim that the bonus is a printed SRD feature. The existing class progression/resource systems remain authoritative for their own features.

### 3. Exploration and survival

Exploration checks can create durable discoveries, leads and world events. Travel advances the existing world clock, tracks watches and consumes carried rations and water when present. Missing provisions increase fatigue and shortage counters. Fatigue is capped at six and imposes a -2 penalty on travel/survival checks once fatigue reaches four.

Survival actions can forage, hunt, fish, gather food or collect/purify water; a successful check adds the corresponding supply to inventory. Making camp/rest reduces fatigue (more when a ration is available) and advances the existing long-rest world clock. This is an additive travel pressure mechanic; it does not automatically change HP or grant a long-rest heal.

### 4. Tactical combat

The existing V18 stat-block monster controller remains in charge of enemy actions, attack rolls, saves, damage, conditions and recharge. V20 adds a tactical-intent check:
- A successful **cover** action grants +2 AC for the current combat round.
- A successful **flank** action lowers the selected/nearest living enemy's AC by 2 until the next round.
- Withdraw and ambush intent are recorded for the Director and encounter continuity.

Tactical state is stored in the encounter and campaign state. The system does not bypass action economy or replace the V18 combat resolver.

### 5. Social interaction

Social actions resolve as explicit skill checks. When an NPC is named or mentioned, the game stores a relationship score and the last exchange on that NPC. Failed social approaches can increase suspicion. The result is also passed into the V19 NPC behavior system so motives, memory and future responses can react to the player's behavior.

### 6. Living world

Every action advances the existing V18 world simulation; travel/rest use the corresponding travel/long-rest tick. World leads and complications are also written as world events. Where available, V19 receives the action through its reactive NPC/faction behavior layer. The Director context now includes V20 journey condition, objectives, leads, consequences, social memory and tactical posture.

### 7. Adventure and campaign continuity

The game imports the current main quest into a V20 objective ledger without replacing the existing quest. Successful actions that clearly overlap an objective's wording can advance it. Every three successful actions create an optional campaign opening. Failed approaches produce unresolved consequences rather than disappearing. Players can add objectives directly from the Adventure panel and close discovered leads as they resolve them.

## Player-facing flow

After a character and campaign are active, the Adventure view shows **What do you do?** The player may let the Director infer the approach or choose exploration, social, travel, tactical, survival or campaign. The player enters an action and optional NPC/target. Quick actions prefill common search, talk, travel and rest prompts. The latest outcome, objectives, discoveries and journey condition remain visible in the scene view.

The panel is deliberately gameplay-oriented. It does not embed the development PDFs or ask players to browse them to make progress.

## Persistence and compatibility

All V20 state is stored under `campaign.sr20`; NPC relationship memories are stored under `npc.sr20`; active combat posture is stored under `combat.sr20Tactics`. The existing `save()` and V18 Save Center snapshot paths serialize the campaign, so V20 state travels with the existing manual slots, recovery snapshots and portable JSON exports. Older saves initialize V20 state lazily when the campaign is opened.

The reproducible build appends `source/SR20_GAMEPLAY_ENGINE.js` after the existing V18/V19 layers and regenerates the standalone HTML, PWA and `docs/` mirror from the same source.

## V21 player-stage hardening

V21 is an additive layer in `source/SR21_PLAYTEST_HARDENING.js`. It addresses the source-based player-stage review:

- Intent phrases for social interactions are considered before combat terms, so incidental references to guards or enemies do not turn ordinary dialogue into tactical actions. Stealthy movement past a guard is treated as exploration unless the player describes an attack/ambush.
- The Adventure composer exposes an explicit skill choice, challenge tier, advantage/disadvantage selector and objective focus. Automatic DCs depend on mode and visible situation cues, not character level.
- V21 delegates the core d20 skill check to the V14/V18 ability-check resolver, retaining established character modifiers and effects; it adds the V20 class edge and fatigue modifier.
- A low-level first-session guide teaches exploration, social interaction, travel and camp actions through play.
- Travel watches advance only on travel; each travel watch consumes carried food and water. A full camp/rest advances eight watches and does not generate campaign momentum.
- Player-created objectives have configurable progress steps. The same action cannot be repeated on the same day to farm progress. Campaign openings are based on completed objectives rather than any three successful actions.
- Named NPC social outcomes update campaign/faction reputation and remain available to Director context.
- Level-20 characters earn a separate Legacy Chronicle through completed objectives and campaign archives. Legacy ranks grant titles and durable history, not free character levels or combat-stat increases. Campaign archives preserve a summary without deleting the active campaign or its save.

The player-stage labels in Director context are level-based experience proxies (new/learning, experienced, veteran, expert, legacy); they are not claims about the actual number of years a person has played tabletop RPGs.

## Boundaries still requiring playtesting

The Director remains procedural/offline unless an external generative provider is configured. Text classification is heuristic, not open-ended semantic understanding. The class edge is an explicit house rule. Travel supply matching relies on recognizable inventory item names. Tactical cover/flank effects are a small tactical layer, not a grid/pathfinding rewrite. Full campaign balance, multiplayer encounter edge cases, Android installation and long-session save compatibility still require human playtesting.

## Regression coverage

`tests/solo_realms_v20_gameplay_test.cjs` checks the seven-system loop. `tests/solo_realms_v21_hardening_test.cjs` adds regression coverage for intent routing, skill/Expertise integration, situational DCs, advantage/disadvantage, tutorial guidance, travel watches, supply use, rest/momentum, objective progress, legacy rewards and campaign archives. Both suites run through `bash tests/run_v18.sh`.
