# Solo Realms V20 — Seven-system gameplay design

## Product direction

Solo Realms is a game first. Rules documents, reference PDFs and the SRD library are development/reference inputs; they are not the player-facing destination. The player should spend their time making decisions in scenes, taking risks, meeting characters, exploring places and seeing a campaign remember those decisions.

V20 is an additive gameplay layer. It keeps the V18 rules and combat resolver, V19 Director Studio, V19.1 NPC/world memory, character progression, multiplayer transport and Save Center. It adds a unified action loop and durable gameplay state without replacing old campaign fields.

## The seven connected systems

### 1. Director and action resolution

The Adventure view now exposes a free-form action composer. The player describes intent; the engine chooses or accepts an approach, selects a skill, calculates ability/proficiency/class modifiers, applies advantage or disadvantage when provided, rolls a d20 and compares the result to a DC. The visible outcome records the roll and explains whether the action succeeded.

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

## Boundaries still requiring playtesting

The Director is still procedural when no external generative provider is configured. Text classification is heuristic, not open-ended semantic understanding. The class edge is an explicit house rule. Travel supply matching relies on recognizable inventory item names. Tactical cover/flank effects are a small tactical layer, not a grid/pathfinding rewrite. Full campaign balance, multiplayer encounter edge cases, Android installation and long-session save compatibility still require human playtesting.

## Regression coverage

`tests/solo_realms_v20_gameplay_test.cjs` loads the assembled standalone game in the existing simulated browser harness and checks the seven-system loop, character modifiers, objective state, discoveries, social memory, tactical cover/flank, travel supplies, resting, consequences, Director context and Adventure panel structure. It runs through `bash tests/run_v18.sh` after the reproducible build.


## V20.1 player-stage hardening

The player-stage review identified several usability and rules-integration improvements. The V20.1 hardening branch addresses them as follows:

- **Beginner onboarding:** the Adventure panel now provides a dismissible first-adventure walkthrough explaining free-form intent, approach selection and outcome review.
- **Transparent checks:** the action composer exposes automatic or explicit skill selection, normal/advantage/disadvantage roll state, and routine/standard/difficult/expert/legendary challenge tiers. Results show ability, proficiency, Expertise and class-edge contributions.
- **Intent classification:** automatic mode selection prioritizes action verbs and distinguishes talking about a guard from fighting one. When social and tactical intents are both present, the first expressed intent wins.
- **Rules consistency:** V20 skill checks now recognize Expertise as double proficiency, including cases where the character's Expertise record is the only proficiency source.
- **Objective integrity:** objective progress requires at least two meaningful overlapping terms (or an exact one-term phrase), reducing accidental progress from incidental wording. No-roll rest actions do not advance objectives, create failure complications, or farm campaign momentum.
- **Travel time:** one travel action advances one four-hour watch; an eight-hour rest advances two watches. The watch counter is no longer derived from every six arbitrary actions.
- **Legacy progression:** completed objectives award 10 legacy renown and milestone titles at 1, 5, 10 and 20 completions. This is separate from character level and supports continued play after level 20 without inventing a real-world player-tenure clock.
- **Long-session continuity:** the latest 40 detailed action records remain readily available; older records are moved into a compact persistent archive (up to 1,000 entries) and included in Director context.
- **Objective continuity:** the Adventure view keeps every active objective visible and prioritizes unfinished goals; completed entries are pruned before active objectives when the bounded 20-entry ledger fills, while their renown/title milestones remain in legacy history.

The new regression assertions cover guard/social classification, Expertise, challenge tiers, objective matching, legacy context, the new controls and onboarding. These changes remain subject to the full test runner (`bash tests/run_v18.sh`) and live human playtesting before release.

The complete regression runner is now wired to GitHub Actions for the V20.1 hardening branch and pull requests targeting `main`.
