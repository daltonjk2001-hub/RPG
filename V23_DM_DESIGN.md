# Solo Realms V23 — Director-first gameplay design

## Objective

V23 changes the center of the Adventure loop from a player-operated rules form to a Dungeon Master conversation. The player describes intent in ordinary language. The Director determines the likely activity, whether the outcome is meaningfully uncertain, the relevant skill, and the challenge target. The rules engine then rolls and applies state changes. The Director narrates the outcome without becoming a second, competing rules engine.

This is an incremental gameplay change, not a claim that a static GitHub Pages site now hosts a fully autonomous AI Dungeon Master.

## Rules and adjudication policy

The adjudication sequence is:

1. Understand intent. Identify the earliest relevant action in the player's description. Ignore an action negated by the player (for example, "I do not attack; I try to persuade the guard").
2. Check the fiction first. Ask whether the character can do this with the information, tools, position, time, and capabilities already established. Impossible actions are not made possible by a good die roll.
3. Decide whether to roll. An unopposed, routine, or effectively certain action should usually happen without a die roll. A check is for an uncertain outcome where failure would matter. Rest is a time-and-resource activity, not an ability check by default. Safe travel advances the journey clock and resource accounting without inventing a check.
4. Choose the mechanic. For an uncertain non-combat task, choose the most relevant ability/skill and set a DC based on the task and circumstances. The player does not need to select these in normal play.
5. Resolve once. Existing V18/V21 rules code owns the roll, character modifiers, advantage/disadvantage, world-clock changes, NPC/faction updates, and campaign data. A model must never supply a die result or rewrite the mechanical outcome.
6. Explain the result. Show the check (or explain why no check was needed), the outcome, and a concrete situation change. Failure should create a cost, complication, lost opportunity, or changed relationship where appropriate, rather than simply saying "nothing happens".
7. Remember what happened. Record bounded structured events. Keep player theories distinct from established evidence; a character saying "I think the steward did it" must never silently become a world fact.

### Challenge targets

The V23 automatic DC planner uses the official SRD 5.2.1 typical DC ladder: 5 (very easy), 10 (easy), 15 (medium), 20 (hard), 25 (very hard), and 30 (nearly impossible). The planner only chooses an initial target from the text cues it can reliably interpret. More nuanced circumstances still require future contextual adjudication and optional human/DM override.

The rules engine compares the final check total to the DC. A natural 1 or 20 on an ability check does not independently replace that comparison. Attacks and saving throws continue to use their own established mechanics.

## Player-facing interaction

The main Adventure action form presents one primary control: What do you do? The submit action is Ask the Director. Manual mode, skill, difficulty, roll state, target, and objective controls remain available inside a collapsed advanced section for accessibility, house rules, and deliberate overrides. Normal play no longer requires the player to pre-adjudicate their own action.

Combat remains a dedicated rules flow. V23's free-form action adjudicator supports tactical positioning/maneuvers, but it does not replace the existing attack, spell, initiative, monster-turn, or damage systems.

## Offline-first and connected narration

The local Director always works without a network connection. It classifies intent, chooses no-check versus check, selects a provisional skill/DC, calls the existing deterministic action resolver, and writes a bounded action record. Offline narration is intentionally conservative: it describes the result category and leaves room for the player to act, rather than inventing facts to make the prose more exciting.

When a player has explicitly configured a model connection, that model may optionally provide a second-pass narration after the deterministic result exists. The prompt treats the rules result and campaign state as read-only. The model cannot roll dice, award items/XP/gold, inflict damage, alter inventory, advance objectives, introduce NPCs, or change the scene state. A late response is ignored when a newer action has replaced the outcome being narrated. Failures fall back to the already-saved offline result.

A GitHub Pages deployment cannot provide a private provider key or run a persistent model server by itself. A real hosted AI deployment needs a separately operated HTTPS server-side proxy with authentication, rate limits, request validation, logging policy, and secret management. Client-side API keys must not be embedded in the public app.

## Continuity memory

The campaign's V23 events list is an event-oriented record of the player's action and the deterministic result. Each event stores a bounded action description, day, location, relevant NPC/target, mode, check kind, skill/DC/total when applicable, success/complication, and compact tags.

The active log is capped at 240 events. The Director receives a small recent window and up to eight retrieved events for a new narration. Retrieval currently uses simple lexical overlap plus recency and target references; it is not a vector database, a knowledge graph, or a guarantee of complete long-campaign recall.

The memory policy is deliberately conservative:
- Recorded action/result pairs are historical events.
- Evidence references are not the same thing as proof of a theory.
- Player hypotheses remain hypotheses.
- NPC memory is still bounded by what that NPC plausibly observed or learned.
- Old event logs are bounded to protect browser storage and save validation.

The V23 save guard rejects malformed or oversized event lists and retains the existing compatibility path for older saves that do not contain V23 data.

## Narrative and scenario design principles

The Director should not rely on a single linear chain of required actions. Investigation content should distribute independently discoverable clues across multiple people, locations, objects, and events. A failed check should not erase every route to essential information. Use a node-based scenario graph and redundant clue placement so players can approach a mystery in more than one way. This is aligned with the Alexandrian's node-based design and Three Clue Rule.

Campaign continuity needs more than a transcript. Later phases should add explicit entities, facts with provenance, clues, relationships, faction goals, deadlines, clocks, and unresolved threads. Memory writes should be event-driven; retrieval should be relevance-aware and small enough not to drown the current scene in unrelated history. The Generative Agents work motivates experience records, reflection, and retrieval; MemGPT motivates tiered memory rather than putting an ever-growing transcript in every prompt. These are design inspirations, not evidence that V23 already implements those full research architectures.

## Verification

The V23 test suite covers:
- intent order and negation;
- automatic no-check versus meaningful checks;
- skill and DC selection;
- safe travel/rest time advancement;
- preservation of the existing roll and character proficiency resolver;
- prevention of objective/relationship farming on routine no-roll actions;
- bounded event memory and relevant retrieval;
- player-facing control visibility and advanced-control overrides;
- read-only model narration wiring and continuity context.

The repository-wide test runner also retains all V18–V22 rules, multiplayer, PWA, save, stress, data-integrity, and release-integrity suites.

Automated tests cannot validate whether narration is compelling or whether DC choices feel fair across a real table. Android browser/PWA testing, real two-device multiplayer testing, and playtests with new and experienced tabletop players remain release follow-ups.

## Research references

- D&D Systems Reference Document 5.2.1 — https://www.dndbeyond.com/srd — official rules reference and typical DC ladder.
- D&D 2024 Basic Rules: Playing the Game — https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game — d20 tests, checks, and adjudication.
- The Alexandrian: Node-Based Scenario Design — https://www.thealexandrian.net/creations/misc/node-design/node-design.html — scenario structures that preserve multiple routes.
- The Alexandrian: Three Clue Rule / Running Mysteries — https://thealexandrian.net/wordpress/51319/roleplaying-games/running-mysteries-background-revelations — redundant clue design and fair investigations.
- Park et al., Generative Agents (2023) — https://research.google/pubs/generative-agents-interactive-simulacra-of-human-behavior/ — experience records, reflection, retrieval, and planning.
- Packer et al., MemGPT (2023) — https://arxiv.org/abs/2310.08560 — tiered memory management for long-running interactions.
