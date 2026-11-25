# Solo Realms — Complete End-State Game Design

**Document status:** Target design / north-star specification  
**Baseline:** V23 Director-first foundation  
**Product goal:** A complete, persistent, D&D-inspired campaign experience in which the player primarily talks to a capable Dungeon Master. The game should feel like a living tabletop campaign, not a form-driven RPG, a rules encyclopedia, or a text generator that forgets what it said.

---

## 1. Product vision

Solo Realms is an offline-first, single-player-first fantasy campaign game with an optional connected AI Dungeon Master. A player creates a character, enters a world with its own history and active conflicts, and describes what they want to do in natural language. The Director understands the fiction, applies the correct game rules, operates the world, portrays its inhabitants, remembers consequential events, and presents the result in a compelling way.

The player should feel that there is one consistent Dungeon Master behind the entire experience:

- The player describes intent. The player is not required to classify an action, choose a skill, choose a difficulty, select a roll state, or decide which subsystem owns it.
- The Director responds to what the character actually attempted, not merely to keywords in the text.
- The world has facts, people, places, dangers, resources, and motives that exist whether or not the player is looking at them.
- Characters and factions pursue goals. They do not wait in place for the player to press the right quest button.
- Choices have consequences that remain true later. Failure changes the situation rather than arbitrarily ending an adventure.
- The rules are fair, explainable, consistent, and authoritative. The AI describes and proposes actions; the game engine verifies and applies them.
- Campaigns can be adventurous, mysterious, political, exploratory, dangerous, humorous, heroic, grim, or mixed. The Director adapts its presentation without breaking the underlying world or rules.
- A campaign can last for a few sessions or become a long-running chronicle. The game remembers the important past without stuffing an entire transcript into every model prompt.
- The entire game remains playable offline. Connected AI improves adjudication and narration but is never required for a save to load or a campaign to continue.

### The central experience

The default player loop is:

1. See and understand the current scene.
2. Decide what the character wants, says, investigates, or attempts.
3. Tell the Director in ordinary language.
4. Receive a ruling only when a ruling is needed. The Director resolves uncertainty through the correct mechanic.
5. See what actually changes in the scene and the wider world.
6. Decide what to do next.

This loop is the product. Character sheets, inventories, maps, journals, rules references, options, and settings support it. They must not become the primary way the player operates the game.

### What this game is not

- Not a chatbot that merely writes fantasy prose.
- Not a sequence of quest forms, skill selectors, objective buttons, or pre-authored dialogue trees.
- Not a random story generator in which facts change to fit the latest response.
- Not an AI that can freely award treasure, modify hit points, invent equipment, or rewrite campaign state.
- Not a fully simulated universe in which every person and object consumes a model call every turn.
- Not a requirement that the player learn the rules before beginning.
- Not an online-only product that becomes unusable when a provider is unavailable.

---

## 2. Design principles that govern every system

### 2.1 Fiction first, mechanics second, narration third

The Director first understands the established scene and the player's intention. It then decides what is possible and which mechanic, if any, applies. The game engine resolves that mechanic. Only after the outcome is known does the Director narrate the result.

The system must never ask for a roll simply because the player used an action verb. It must never allow a good roll to make an impossible action possible. It must never narrate an outcome that contradicts the state transition.

### 2.2 One authoritative world

There is one campaign state. The UI, save system, AI context, journal, NPC memories, and world simulation all read from or propose changes to that state. They do not maintain competing versions of what happened.

Every consequential change is applied through a validated command and recorded as an event. A narrative sentence is not itself a state change.

### 2.3 Player agency without plotlessness

The campaign has structure, motives, mysteries, threats, deadlines, and meaningful destinations, but it is not a fixed sequence of scenes. The Director prepares situations and causal relationships, not a required script.

The player can ignore the main threat, pursue a personal goal, negotiate, investigate, travel, establish a base, help an NPC, join a faction, or leave a region. The world responds. The main story may change or conclude differently because of those decisions.

### 2.4 Fairness and visible reasoning

The Director should be able to explain why a check was or was not required, what ability or skill applied, what DC was chosen, what modifiers applied, and what consequences followed. It should not reveal hidden information that the character could not know, but it should explain the mechanical ruling.

### 2.5 The model is not the rules engine

The AI may interpret natural language, propose an adjudication, choose a narration style, portray an NPC, develop a situation, or recommend a validated command. It does not roll dice, directly mutate state, or bypass preconditions. A deterministic engine owns rules, resources, geometry, time, combat, saves, progression, rewards, and persistence.

### 2.6 Consequences over arbitrary punishment

Failure should move the fiction. Appropriate consequences include lost time, a raised alarm, a changed relationship, a resource cost, a partial result, a new danger, a lost opportunity, a rival gaining ground, or a complication. Failure should not automatically mean no information, no progress, or a dead end.

### 2.7 Memory is evidence, not just text

The game distinguishes what happened, what was observed, what an NPC believes, what the player suspects, what has been verified, and what is still unknown. A theory stated by the player never becomes a fact merely because it appeared in a prompt or transcript.

### 2.8 Offline-first as a real mode

The local Director must be a fully playable mode, not a demo shell. When a model is unavailable, the deterministic resolver, world simulation, and conservative narration continue. A provider failure cannot corrupt a campaign or leave the action half-applied.

---

## 3. The final player experience

### 3.1 Main Adventure screen

The default screen is a conversation-centered scene.

**Scene header**
- Current location and region.
- Time of day, weather, and immediate environmental conditions when relevant.
- A small set of meaningful status indicators: health, active danger, party state, and a few relevant resources.
- A scene title or short location description that updates when the situation changes.

**Narrative area**
- The Director describes what the character can perceive.
- NPC dialogue is visually distinct from narration.
- The game distinguishes direct observation from inference, rumor, memory, and speculation.
- Relevant people, objects, clues, threats, and exits can be inspected without forcing a menu flow.
- The response is paced: a few clear paragraphs for ordinary turns, longer set pieces when the scene warrants it.

**Player input**
- One natural-language action field: “What do you do?”
- It accepts movement intentions, dialogue, questions, plans, tactical actions, use of objects, spell intentions, and multi-step plans.
- Enter sends; Shift+Enter adds a line.
- The player can revise or clarify an action before resolution.
- The interface can suggest contextual ideas, but suggestions are optional and never the only valid actions.

**Response controls**
- Continue or clarify only when needed.
- Inspect a named person/place/object.
- Open the character sheet, inventory, journal, map, spellbook, party, or campaign details.
- Rewind is not the default way to correct consequences. A separate save/recovery mechanism protects against mistakes and technical failure.

### 3.2 No mandatory mechanical menus

The main turn must not ask the player to pick:
- exploration/social/tactical/travel/survival mode;
- the skill or ability;
- the DC or challenge tier;
- advantage or disadvantage;
- whether an ability check is appropriate;
- an objective to progress;
- which internal system should handle the action.

These are Director decisions. Advanced overrides remain available for deliberate house rules, accessibility, or a player who wants to control the mechanics. They stay collapsed by default.

### 3.3 Clarification is conversational

The Director asks a short clarification only when materially different interpretations would produce different outcomes. Examples:
- “Are you trying to distract the guard or convince him to let you pass?”
- “Which of the two sealed doors are you examining?”
- “Do you mean the healing potion or the vial you found in the crypt?”

It should not ask for information already known from the current scene or character sheet. It should not turn every action into a questionnaire. When the intent is sufficiently clear, act.

### 3.4 Mechanical transparency

After a check, show a compact expandable roll breakdown:
- mechanic and ability/skill;
- die result(s);
- proficiency, expertise, ability modifier, and other applicable modifiers;
- advantage/disadvantage source;
- target DC or defense;
- final total and outcome.

Ordinary actions should not expose meaningless roll widgets. A no-check ruling can simply say the action succeeds because it is straightforward or explain the obstacle that makes it impossible.

### 3.5 Context-sensitive presentation

The game interface changes with the scene:
- Exploration: readable scene, map, travel status, clues, light, and environmental danger.
- Social scene: NPC dialogue, relevant relationship context, and the immediate conversational exchange.
- Combat: initiative, battlefield, combatants, turn state, movement, actions, reactions, spells, and conditions.
- Rest/downtime: time, resources, recovery, crafting, projects, training, and companion interactions.
- Stronghold/base: facilities, projects, staff, defenses, storage, visitors, and regional influence.

The player still speaks naturally in every mode. The system can expose relevant quick controls without forcing the player to use them.

### 3.6 Supporting screens

All secondary screens must be useful and uncluttered:
- **Character:** abilities, skills, proficiencies, saves, class features, background, species, level, conditions, and progression.
- **Inventory:** equipment, weapons, armor, consumables, containers, currency, carrying rules, and item history.
- **Spellbook:** known/prepared spells, slots, components, concentration, casting details, and effects.
- **Party:** companions, relationship notes, equipment, health, roles, morale, and tactical preferences.
- **Journal:** dated campaign chronicle, discovered clues, established facts, personal goals, rumors, promises, and unresolved leads.
- **Map:** discovered geography, current location, routes, travel estimates, landmarks, and party knowledge.
- **World:** regions, settlements, factions, important people, and current public events.
- **Codex/Rules:** searchable reference material that informs play but is never required to play.
- **Save Center:** versioned save slots, export/import, recovery, and campaign snapshots.
- **Director settings:** tone, narration length, rules strictness, danger, initiative, player agency, content boundaries, and AI connection status.

### 3.7 First-time experience

Character creation is approachable and role-first. The player can choose a concept and let the game propose a valid character, or use advanced custom creation. The Director explains choices in plain language. It does not require reading a rules library.

The first session teaches through play. The opening scene offers clear stakes and a few visible possibilities, but the player can do something unexpected immediately. Tutorial guidance disappears when dismissed or when the player demonstrates familiarity.

---

## 4. The Dungeon Master: complete responsibilities

The Director is a coordinated set of responsibilities with one consistent voice. It is not one unbounded model prompt.

### 4.1 Scene understanding

Before adjudicating an action, it identifies:
- current scene and location;
- character and companion capabilities;
- visible and hidden scene entities;
- established facts and unresolved questions;
- active threats, clocks, deadlines, and environmental conditions;
- recent player intentions and unresolved declared plans;
- what the character can reasonably perceive or know;
- what has changed since the previous turn.

It maintains a structured scene model, not merely a paragraph from the previous assistant message.

### 4.2 Intent interpretation

The Director identifies:
- the intended outcome;
- the target, object, or destination;
- the method and tools;
- any sequence of steps;
- the character's constraints;
- whether the action is an attempt, a question, dialogue, a plan, an instruction to a companion, or a request for information.

It resolves pronouns and references from conversation context. It recognizes negation, conditions, quoted text, hypothetical plans, and corrections. It does not treat “I might attack him” as an attack, or “I do not attack him” as an attack.

A multi-step action is decomposed into steps only when time, uncertainty, or an intermediate result matters. The Director should not resolve a whole dungeon, negotiation, or long journey with one check.

### 4.3 Fictional possibility and adjudication

The Director evaluates:
1. Is the action possible given the fiction?
2. Is the result certain, uncertain, or impossible?
3. If uncertain, is failure meaningful?
4. What is the correct rules mechanic?
5. What ability, skill, tool, proficiency, saving throw, attack, contest, or other rule applies?
6. What DC or defense is appropriate?
7. What would success change?
8. What would failure or partial success change?
9. Is a resource, time cost, world clock, or reaction triggered?

The model proposes. A rule validator and deterministic engine enforce.

### 4.4 Portrayal and voice

The Director:
- uses distinct voices, priorities, vocabulary, and speaking patterns for important NPCs;
- avoids making every character sound like the same assistant;
- gives information consistent with the speaker's knowledge and motives;
- does not speak or decide for the player character;
- does not describe private character thoughts as facts;
- avoids overlong narration after every minor action;
- uses vivid detail when it matters and concise language when it does not;
- adapts tone without breaking established facts.

### 4.5 Improvisation

Unexpected player actions are supported through a situation model. The Director may:
- identify an existing object or opportunity that makes the plan possible;
- determine what preparation or time the plan requires;
- introduce a consequence that logically follows from the world;
- improvise dialogue or behavior consistent with an NPC's motives;
- propose an alternate route without forcing the player to take it.

It must not invent a conveniently placed item, clue, ally, exit, or rule exception simply to make an action succeed.

### 4.6 Session pacing

The Director manages:
- opening and closing scenes;
- transition between travel, exploration, social play, and combat;
- escalation and release;
- quiet character moments;
- callbacks to earlier choices;
- pacing of revelations and rewards;
- meaningful choices at chapter and campaign boundaries.

It avoids both extremes: every turn being a cliffhanger, and long stretches in which nothing responds to the player.

### 4.7 Consistency checks

Before presenting a result, the Director checks:
- all named entities exist or are explicitly being introduced;
- location, time, inventory, hit points, and conditions agree with the engine;
- the narrator does not claim an unseen fact is known;
- NPC knowledge matches observation or a plausible information path;
- quest and faction updates have a supported cause;
- no reward or cost is invented outside the command result;
- a newer action has not superseded an asynchronous narration response.

---

## 5. Rules and adjudication engine

The game targets the 2024 D&D rules framework to the extent supported by its licensed/reference material, with explicit optional house rules. The canonical rules reference is the current SRD version adopted by the project; the implementation must record the ruleset/version on each campaign. The rules guide is reference content, not the player interface.

### 5.1 Mechanic selection

The Director distinguishes at least:
- no roll required;
- ability check, optionally with skill or tool proficiency;
- saving throw;
- attack roll;
- opposed check or contest where the rules call for one;
- spell resolution;
- initiative and turn-based combat;
- passive check or passive score where appropriate;
- resource/time action with no uncertainty roll;
- structured downtime or project resolution.

A weapon attack is not Athletics. A spell attack is not Arcana. A saving throw is not an ability check chosen by the player. A routine action is not a check because a skill name appears in the sentence.

### 5.2 No-roll standard

Do not roll when:
- the character can perform the action and no meaningful uncertainty remains;
- no one or nothing is opposing the attempt;
- failure would add no interesting information or consequence;
- a rule already determines the result;
- the action is normal movement, ordinary conversation, or routine handling of an available object;
- rest or ordinary travel is being resolved through time/resource systems.

Use a roll when:
- the outcome is uncertain;
- meaningful success and failure are both plausible;
- failure changes the situation, costs something, or creates a risk;
- the rules explicitly call for a roll.

A no-roll result can still consume time, resources, or trigger world reactions when the fiction calls for it.

### 5.3 Ability checks

The Director chooses the ability, skill, and tool relevance based on the actual approach. A skill can be paired with a different ability when the fiction supports it. Training matters, but untrained characters can attempt many things. The engine calculates ability, proficiency, expertise, class features, items, effects, conditions, advantage/disadvantage, and other valid modifiers.

Typical DCs are an initial guide, not a keyword lookup table:
- 5 very easy;
- 10 easy;
- 15 medium;
- 20 hard;
- 25 very hard;
- 30 nearly impossible.

The DC is set from actual circumstances, resources, preparation, opposition, and fictional positioning. The model is not allowed to inflate DC merely because the player is creative or to reduce it merely to reward flattering prose.

A roll outcome uses the final total and applicable rule, not a simplistic “natural 20 succeeds at everything” convention. Natural 1/20 behavior is governed by the specific mechanic and ruleset.

### 5.4 Combat

Combat remains a complete tactical rules subsystem, not a prose approximation. The final combat engine must handle:
- initiative and turn order;
- movement, difficult terrain, opportunity attacks, and valid movement paths;
- action, bonus action, reaction, and free interactions;
- melee, ranged, thrown, and improvised weapon attacks;
- reach, range, cover, line of sight, visibility, and targeting;
- Armor Class, attack bonuses, advantage/disadvantage, critical hits, and damage;
- damage types, resistance, vulnerability, immunity, temporary HP, and mitigation;
- conditions, durations, save ends, and stacking rules;
- concentration, spell components, spell range/area/targets, and spell effects;
- grappling, shoving, hiding, stealth, cover, prone, restrained, and other tactical states;
- healing, death saves, stabilization, unconsciousness, and defeat;
- monster action selection, multiattack, reactions, legendary/lair actions where supported;
- enemy morale, retreat, surrender, negotiation, and intelligent tactics;
- environmental hazards, objects, traps, reinforcements, and battlefield objectives.

The tactical map and the rules engine share the same coordinates and occupancy state. A visual marker cannot disagree with the actual target/range calculation. If a combat state is unsupported or invalid, the engine must stop safely rather than silently resolve a different action.

### 5.5 Spellcasting

Spells are data-driven and use a structured rules schema:
- level and casting time;
- range and target;
- components and materials;
- duration and concentration;
- area of effect and geometry;
- saving throw or attack requirement;
- damage/healing/effect;
- upcast scaling;
- ongoing effect and termination conditions.

The engine owns spell slots, known/prepared status, concentration, targeting, saves, damage, conditions, and effect expiration. The Director explains the fiction and asks a targeting clarification when necessary.

### 5.6 Exploration and hazards

Exploration includes more than an Investigation check:
- perception and passive awareness;
- search procedures and clue discovery;
- movement, stealth, noise, visibility, light, and time;
- traps, environmental hazards, doors, locks, secret areas, and obstacles;
- dungeon turns, watches, and procedural pressure where appropriate;
- weather, terrain, elevation, water, temperature, and exposure;
- mapping, navigation, routes, landmarks, and safe/unsafe areas.

The player can inspect, listen, study, experiment, search, track, climb, hide, use tools, test an object, or try an unlisted approach naturally.

### 5.7 Travel and survival

Travel is resolved by route and conditions, not by a generic “travel check” every time. The world tracks:
- route, distance, pace, terrain, elevation, weather, visibility, and hazards;
- time of departure, watches, arrival, rests, and delays;
- food, water, encumbrance, mounts, supplies, and condition where the selected rules mode uses them;
- navigation, scouting, tracking, foraging, hunting, and camp security;
- discoveries, encounters, exhaustion/fatigue, and travel consequences.

The system should support a relaxed mode and a stricter resource mode. The rules setting must be clear and persistent per campaign.

### 5.8 Social interaction

NPCs are not dialogue vending machines. Social mechanics consider:
- the NPC's goals, knowledge, beliefs, attitude, personality, fears, loyalties, and boundaries;
- what the player actually said or demonstrated;
- leverage, evidence, status, gifts, threats, promises, and prior behavior;
- the stakes and risk to the NPC;
- the appropriate check, if a check is meaningful.

Persuasion is not mind control. Intimidation can produce compliance with resentment or retaliation. Deception can succeed while suspicion remains. A failed social check can alter trust, expose a lie, or close one approach while leaving others open.

### 5.9 Progression, rewards, and rest

The game supports a clearly defined progression policy per campaign:
- experience or milestone progression;
- class/level features and proficiency changes;
- hit point growth and resource progression;
- spell and feature unlocks;
- equipment, wealth, consumables, crafting, and treasure;
- quest, faction, personal, and legacy milestones.

Rewards are selected by campaign logic and validated against reward tables and item definitions. A model never writes arbitrary inventory or XP. Resting advances time and applies valid recovery, resource refresh, interrupted-rest rules, and world consequences.

---

## 6. Story, mystery, and campaign structure

### 6.1 Situation-driven design

Campaign content is a network of situations, not a fixed chain of quests. Each situation contains:
- a premise and visible stakes;
- people, factions, places, objects, and known facts;
- hidden facts and secrets;
- goals and plans held by relevant actors;
- clues and ways to discover them;
- active clocks, threats, and deadlines;
- multiple approaches and possible consequences;
- a set of conditions that resolve, transform, or abandon the situation.

The Director can react to an unexpected action because it understands the underlying situation.

### 6.2 Clue and revelation design

Every important conclusion has multiple independent paths. Essential discoveries cannot be locked behind one specific NPC, one die roll, one object, or one player phrase. A failed roll may cost time, expose the party, reveal partial information, or provide a misleading interpretation, but should not erase all paths to the campaign's central truth.

For each mystery:
- define the truth before writing clues;
- define the revelations necessary to understand it;
- attach more than one independently obtainable clue to important revelations;
- distinguish clue discovery from clue interpretation;
- track which clues were seen, understood, doubted, disproved, or shared;
- permit player-generated theories and test them against evidence;
- let wrong conclusions produce believable consequences rather than arbitrary correction.

Use node-based scenarios and redundant clue placement to preserve player agency and prevent chokepoints. The Three Clue Rule is a useful baseline, not a mandate to force exactly three clues into every scene.

### 6.3 Main plot and personal story

Each campaign carries multiple parallel tracks:
- main conflict;
- personal character goal;
- companion arcs;
- faction conflicts;
- local problems and opportunities;
- mysteries and revelations;
- world-level threat or long-term change.

The main plot is not a compulsory quest chain. It can advance while ignored. A character's personal goal can become the campaign's center. Companion and faction stories can overlap or conflict.

### 6.4 Villains and antagonists

A major antagonist has:
- an objective;
- a reason for pursuing it;
- a plan with stages;
- resources and allies;
- limitations and vulnerabilities;
- beliefs and misconceptions;
- reactions to player actions;
- a deadline or pressure clock where suitable;
- a range of outcomes beyond “fight and die.”

Antagonists act off-screen through a world simulation. They do not teleport, gain arbitrary knowledge, or adapt perfectly to the player's unseen actions. Their responses must be traceable to observation, agents, communications, or other information channels.

### 6.5 Foreshadowing and payoff

The Director tracks:
- seeded hints;
- recurring symbols, names, locations, and objects;
- promises and debts;
- NPC callbacks;
- unresolved questions;
- threats that have been signaled but not resolved;
- player choices that can alter later outcomes.

Foreshadowing should be subtle and fair. A callback must be supported by stored facts; it must not appear only because the model invented a connection in the moment.

### 6.6 Consequences and branching

A meaningful decision changes at least one of:
- world state;
- a relationship;
- a faction's resources or stance;
- a deadline or danger clock;
- a location's condition;
- a clue or information pathway;
- available routes;
- a companion's trust or goal;
- the rewards or costs that follow.

Branches need not be permanently separate story trees. The world state can converge naturally while retaining the causes and consequences of player decisions.

### 6.7 Adventure and dungeon generation

A generated adventure is a playable situation graph with:
- a clear premise and hook;
- a small cast of actors with distinct goals;
- locations with meaningful spatial relationships;
- at least one conflict or mystery;
- several entry points and approaches;
- encounter and hazard data;
- clue/revelation relationships;
- rewards and costs appropriate to level and risk;
- escalation clocks;
- resolution states, including unexpected player-created endings.

A dungeon is a spatial environment with purpose, inhabitants, routes, loops, secrets, resources, hazards, and changing occupancy. Rooms should not simply be a sequence of random fights. The dungeon's inhabitants have goals and react to intrusion.

---

## 7. The living world

### 7.1 World simulation layers

The world runs at three levels of detail:

**Immediate simulation**
- Current scene, nearby entities, active combat, and direct consequences.
- Updated on every relevant player action.
- Requires the highest consistency and detail.

**Regional simulation**
- Factions, settlements, important NPCs, trade, patrols, rival parties, travel, threats, and local clocks.
- Advances at meaningful world-time boundaries or when the player interacts with the region.
- Uses deterministic rules and scheduled events, with model assistance only for important choices.

**Distant/background simulation**
- Faraway events, rumors, distant faction progress, seasonal changes, and low-priority agents.
- Advances through coarse summaries and deterministic ticks rather than per-character AI calls.
- Is materialized in detail only when it affects the player or becomes relevant.

The world should feel alive without simulating every inhabitant every second.

### 7.2 NPC simulation

Each significant NPC has:
- stable identity and appearance;
- occupation, role, abilities, and resources;
- personality traits and conversational style;
- goals, needs, fears, loyalties, and boundaries;
- relationships with other entities;
- beliefs and known facts with provenance;
- knowledge sources and observation history;
- current location, schedule, and activity;
- plans, commitments, and open questions;
- memory of player interactions;
- attitude toward the player/party;
- state changes and consequences.

Minor background characters use lighter records. Important recurring NPCs receive richer memory and planning.

### 7.3 NPC autonomy

NPC actions follow a bounded loop:
1. Observe the world events available to the NPC.
2. Update beliefs and relationships only from information the NPC could receive.
3. Select a plausible goal based on role, personality, current needs, and prior commitments.
4. Choose a feasible action from allowed world commands.
5. Apply the action through deterministic validation.
6. Record the event and update the NPC's memory.

An NPC cannot act on secret information without a plausible way of learning it. The Director does not force every NPC to have an interesting dramatic reaction every turn.

### 7.4 Relationships

Relationships are multi-dimensional rather than one universal “friendship” number. Track where relevant:
- trust;
- respect;
- affection;
- fear;
- suspicion;
- obligation/debt;
- rivalry;
- loyalty;
- familiarity.

The values are not a replacement for narrative judgment. They are supporting state that helps maintain continuity. A character can fear the player but respect them; like them but distrust them; owe them but resent them.

### 7.5 Factions and politics

Each faction has:
- purpose and ideology;
- leadership and internal divisions;
- territory and influence;
- members and allies;
- assets, supplies, and currency;
- current goals and plans;
- rivals and relationships;
- public reputation and hidden capabilities;
- active clocks and resource constraints.

Factions respond to player choices and each other. Their plans create world pressure, opportunities, conflict, and rumors. Faction politics are not a static list of reputation scores.

### 7.6 Economy and settlement life

A settlement can track:
- population band and services;
- security, leadership, and stability;
- available goods and scarcity;
- trade routes and supply;
- local factions and tensions;
- important businesses and NPCs;
- prices and special conditions;
- current problems and opportunities.

Do not simulate every transaction. Update supply, demand, and prices when a relevant event, season, route disruption, or faction change justifies it.

### 7.7 Rival adventurers and companions

The world may contain other adventuring groups with:
- party composition and capabilities;
- independent goals;
- known and unknown methods;
- travel and progress;
- relationships and rivalries;
- the ability to help, compete, fail, retreat, or disappear.

Companions have their own personalities, goals, opinions, relationships, and tactical preferences. They can offer ideas and participate in scenes, but they do not take the player's agency or decide the player character's response.

---

## 8. Memory and campaign truth

Memory is a first-class game system, not a text transcript.

### 8.1 Canonical state

The canonical state contains the current truth used by mechanics:
- character and party;
- current location and world time;
- inventory, equipment, spells, resources, health, conditions;
- combat and exploration state;
- NPCs, factions, settlements, and active agents;
- quest/situation states, clues, revelations, and clocks;
- relationships, promises, debts, and commitments;
- campaign settings and ruleset version.

### 8.2 Append-only event history

Every meaningful mutation is recorded as an event:
- event ID and deterministic ordering;
- timestamp/world time;
- actor and target;
- action/command;
- preconditions and resulting state changes;
- location and context;
- mechanical result where applicable;
- source and provenance;
- visibility/knowledge audiences;
- causality links to earlier events.

Events are not silently rewritten. Corrections are new events referencing the corrected event.

### 8.3 Fact and belief ledger

Every important fact has:
- subject, predicate, object/value;
- status: observed, reported, believed, suspected, confirmed, disproved, unknown;
- source and evidence references;
- who knows it;
- when it became known;
- confidence/provenance;
- related events and contradictions.

The player journal can show “known,” “rumored,” and “suspected” separately. NPCs only receive facts available to them.

### 8.4 Tiered memory

**Working memory:** current scene, immediate intent, nearby entities, recent turns, active tactical state.

**Campaign memory:** current situations, open clues, active clocks, important promises, major relationships, recent consequences, and current goals.

**Long-term episodic memory:** event history and specific past interactions, retrieved by relevance, recency, entity, location, topic, and importance.

**Semantic/reflection memory:** concise summaries and inferred patterns derived from events. Every reflection cites the events that support it and can be corrected if contradicted.

**Archive:** older completed arcs, previous campaigns, defeated antagonists, major discoveries, and legacy milestones.

Retrieval is relevance-aware and bounded. It should combine structured filters, entity matching, recency, importance, and semantic similarity where an embedding store is available. A small local implementation can use lexical/structured retrieval offline.

### 8.5 Memory write policy

- Do not store every model sentence as a fact.
- Store state changes and meaningful observed events.
- Store dialogue summaries with speaker, listener, topic, and whether the content was truthful, known, or merely claimed.
- Store commitments, promises, threats, and debts explicitly.
- Store NPC beliefs separately from world truth.
- Periodically synthesize summaries while retaining the supporting event IDs.
- Detect contradictions and mark them for reconciliation rather than overwriting old facts.
- Bound prompt context to only the facts and memories relevant to the current decision.

### 8.6 Save compatibility

The end state uses versioned saves with explicit migrations. A campaign loads even when optional modern systems are missing; migration adds safe defaults. New saves include ruleset version, campaign schema version, world seed, model/provider-independent state, and event history. Export/import must preserve all canonical state and provenance.

The V23 event list is a starter layer, not the final memory architecture. It should evolve into separately testable campaign memory modules without forcing a risky all-at-once rewrite.

---

## 9. AI architecture and authority model

### 9.1 One Director, specialized internal roles

The user experiences one Dungeon Master voice. Internally, requests are handled by bounded responsibilities:
- Intent Interpreter;
- Scene/Context Assembler;
- Rules Adjudicator;
- Situation and Story Planner;
- NPC Portrayal/Dialogue;
- World Simulation Planner;
- Memory Retrieval and Reflection;
- Narration Composer;
- Consistency/Canon Validator.

These may be prompts, model calls, deterministic services, or a combination. They are not separate chatbots that talk to the player. They share a common state model and explicit contracts.

### 9.2 Standard action pipeline

1. Receive the player message and current campaign revision.
2. Parse intent, references, and requested outcome.
3. Retrieve the relevant scene, entities, facts, memories, rules, and constraints.
4. Decide whether clarification is necessary.
5. Produce a structured adjudication plan and proposed commands.
6. Validate the plan against schema, permissions, mechanics, preconditions, and current revision.
7. Resolve dice and rules deterministically.
8. Apply an atomic state transaction.
9. Append events and update relevant memories.
10. Advance appropriate time/world/faction/NPC clocks.
11. Generate a narrative from the committed results.
12. Verify every stated result against committed state.
13. Return the narration, visible roll breakdown, and a natural invitation for the next action.

No model-generated command is applied before validation. If the campaign revision changed while a request was in flight, the command is revalidated or discarded and reconsidered against the new state.

### 9.3 Command/tool contract

The model can request a finite set of commands such as:
- inspect entity;
- move to a reachable location;
- ask an NPC a question;
- propose an ability check;
- request an attack/spell action through a dedicated rules API;
- use an item;
- begin travel;
- advance a rest;
- update an NPC plan;
- add a clue observation;
- start or advance a situation clock;
- create a proposed scene transition.

Each command includes typed parameters, actor, target, reason, and expected preconditions. The deterministic service verifies that the actor can perform it, the target exists, required resources are available, and the rules permit it.

The model never gets unrestricted access to arbitrary JavaScript, the file system, network calls, secrets, or unrestricted database writes.

### 9.4 Structured output and validation

Use strict structured outputs/tool schemas where the provider supports them. Even when the provider claims schema conformance, the server validates business rules, enum values, IDs, numeric ranges, preconditions, and permissions. Structured output improves shape reliability but does not prove that a proposed action is correct. Model output must be treated as an untrusted proposal.

### 9.5 Model call policy

- Local deterministic mode: no model calls.
- Connected mode: one bounded adjudication call for actions that benefit from model interpretation.
- Enhanced narration: optional second call after the engine commits the result; can be skipped for trivial actions.
- NPC dialogue: use the same Director service with the NPC's knowledge, goals, and personality context; do not create an unconstrained new system.
- World simulation: batch relevant updates at world-time boundaries, rather than calling a model for every minor entity.
- Cache stable rules references and campaign summaries.
- Set timeouts, retries, token budgets, concurrency limits, and provider cost controls.
- If a model call fails, use the last valid local result and preserve the action transaction.

### 9.6 Connected infrastructure

The final product should support two deployment modes:

**Offline/local mode**
- Static PWA/standalone remains playable.
- Deterministic game systems, saves, maps, journal, campaign state, and local Director work without a server.
- AI is optional and visibly marked unavailable when no provider is configured.

**Connected mode**
- A separately hosted HTTPS service owns provider credentials.
- The public client calls the service using an authenticated user/session token.
- The service performs structured model requests, rate limiting, validation, cost accounting, and provider abstraction.
- No provider secret or privileged token is embedded in GitHub Pages or browser storage.
- Requests are scoped to the correct campaign and revision.
- Logs avoid storing secrets or unnecessary personal content.
- Service outages fall back to local play.

GitHub Pages is static hosting. It cannot itself keep a private provider secret or run the persistent model proxy required by connected production mode. The client/server boundary must be designed before connected AI is considered production-ready.

### 9.7 Prompt and content security

Player text, imported saves, uploaded documents, NPC dialogue, books, and in-world notes are untrusted data. They can provide fiction or evidence, but cannot override system instructions, security policy, command permissions, or save validation. The service treats in-world content as quoted data, not privileged instructions.

---

## 10. Campaign generator and world creation

Campaign creation should request only a few meaningful preferences:
- tone and themes;
- expected campaign length or open-ended play;
- rules strictness and danger;
- solo companion configuration;
- optional setting or starting concept.

The Director can propose a campaign, but the generator builds an inspectable structured package before play begins.

### 10.1 Campaign package

- premise and central tension;
- world seed and regional starting conditions;
- starting location and opening situation;
- primary antagonist or opposing force;
- faction map and key relationships;
- major NPC roster and goals;
- situation graph and key revelations;
- initial clue network;
- regions, settlements, travel routes, and notable sites;
- encounter and hazard templates;
- reward/economy assumptions;
- world clocks and escalation triggers;
- personal/companion arc hooks;
- possible endings and conditions that can transform the conflict.

### 10.2 Generation and validation passes

1. Generate the central truth and conflict.
2. Generate actors with motives and feasible plans.
3. Generate locations and relationships that support those plans.
4. Build a situation graph with multiple routes.
5. Place clues and verify redundant access to key revelations.
6. Build encounters and hazards from supported rules data.
7. Build rewards within campaign progression limits.
8. Validate entity references, timelines, geography, resources, and logic.
9. Persist the campaign seed and initial state.
10. Begin the campaign with a playable scene, not a preamble full of exposition.

### 10.3 Procedural geography

The map and world generator must create coherent geography rather than isolated random labels. Rivers flow from high ground toward lower terrain; settlements connect to resources, routes, and defensible locations; climate and biome placement follow plausible rules. Generated locations receive stable IDs and relationships. The campaign can discover more geography as it expands without regenerating already-known places.

---

## 11. Party, companions, and solo balance

Solo play needs a complete adventuring experience without forcing the player to control a large roster manually.

- The player character remains the sole owner of player decisions.
- Companions can advise, disagree, volunteer, refuse, or act according to established personality and relationship state.
- The player can set broad tactical preferences and can override companion actions when appropriate.
- Companion dialogue has character-specific memory and knowledge.
- Companions can have personal goals and arcs that intersect with the campaign.
- Encounter difficulty accounts for actual party strength, resources, and action economy, not only nominal character level.
- A player can run with no companion, a small party, or a larger party where the rules support it.
- Companion death, injury, departure, loyalty, and return are meaningful state changes, not arbitrary dramatic toggles.

---

## 12. Progression, rewards, crafting, and downtime

The end design treats progression as a campaign system:
- character level and class progression;
- ability/skill/proficiency changes;
- spells and class features;
- equipment and magic-item acquisition;
- wealth, trade, crafting, repair, and consumables;
- personal goals and companion development;
- faction standing and titles;
- stronghold/settlement projects;
- legacy/retirement and continuation.

Every item and reward comes from validated definitions. Crafting has materials, time, proficiency/tools, cost, and result definitions. Downtime uses a time budget and competing opportunities. Long projects have milestones and interruption consequences.

Rewards should fit the campaign, level, danger, and fiction. The Director can propose a reward, but the reward table and progression engine determine what can actually be awarded.

---

## 13. Multiplayer and campaign sharing

Solo remains the primary design target, but the world model should not make co-op impossible.

The final multiplayer contract:
- one shared campaign state and event history;
- authenticated participant identities and character ownership;
- a clear turn/scene control model;
- simultaneous planning only where explicitly supported;
- deterministic command ordering and campaign revisions;
- the Director addresses the group, not one player unless the scene is private;
- party knowledge and individual character knowledge are distinct;
- private messages, secrets, and personal scenes are scoped correctly;
- disconnect/reconnect does not duplicate actions or rewards;
- all state-changing commands are idempotent or guarded against repeated submission.

A public real-time multiplayer service is not assumed to exist simply because the PWA is hosted. Signaling, session coordination, authority, and persistence need to be separately designed and tested.

---

## 14. Reliability, security, and performance

### 14.1 Transaction rules

- Each player action receives an idempotency key.
- A committed action has one event sequence and one rules outcome.
- A failed model call does not partially apply state.
- A failed save does not silently report success.
- A stale model result cannot overwrite a newer scene.
- Import is validated before replacing active state.
- Roll outcomes are persisted and are not silently rerolled on refresh.
- Randomness can be seeded/audited for automated tests.

### 14.2 Observability

Development builds record:
- action ID and campaign revision;
- selected mechanic and reason;
- validation outcome;
- rules transaction/event IDs;
- model/provider request metadata without secrets;
- latency and token/cost estimate when available;
- fallback reason;
- state consistency result.

Player-facing logs remain understandable and do not expose internal prompts, secrets, or raw error traces.

### 14.3 Recovery

The system supports:
- autosave at safe transaction boundaries;
- manual save slots;
- portable backup/export;
- pre-import recovery snapshot;
- schema migration;
- corrupted-save rejection with a clear recovery path;
- undo/recovery for technical faults without turning narrative consequences into casual rewinds.

### 14.4 Performance and cost

- No model call for trivial deterministic actions.
- Context includes only relevant memories, not the entire transcript.
- Long-running campaigns use tiered memory and periodic summaries.
- Expensive model calls are reserved for rulings, major scenes, important NPC portrayal, campaign generation, and high-value narration.
- The user can choose local-only, economical connected, or enhanced connected behavior.
- A provider outage or exhausted budget does not block the campaign.

---

## 15. Testing and quality gates

The game is not complete because a JavaScript file parses or a model returns convincing prose. End-state validation tests the whole player experience.

### 15.1 Rules test matrix

Every supported mechanic has:
- deterministic unit tests;
- boundary/edge-case tests;
- invalid-command tests;
- integration tests through the player action pipeline;
- save/load persistence tests.

Coverage includes checks, saves, attacks, contests, advantage/disadvantage, conditions, death/recovery, spells, concentration, movement, range, cover, resource costs, rests, travel, progression, and rewards.

### 15.2 Director evaluation

Run seeded scenarios across:
- routine/no-roll tasks;
- genuinely uncertain checks;
- impossible tasks;
- player plans that mix multiple intentions;
- negation and correction;
- vague or ambiguous actions;
- deceptive NPCs and hidden facts;
- conflicting NPC beliefs;
- unexpected creative actions;
- failure consequences;
- combat tactics and spell targeting;
- long-term callbacks;
- world-time advancement;
- model malformed output, timeout, refusal, and stale responses.

Score each result on:
- intent understanding;
- correct mechanic selection;
- rule/parameter fidelity;
- valid command use;
- state tracking;
- NPC acting and knowledge;
- narrative quality;
- player agency;
- continuity;
- response efficiency and cost.

### 15.3 World simulation tests

Test:
- NPC schedules and feasible travel;
- knowledge propagation;
- faction plans and resource constraints;
- clocks and deadlines;
- rival-party progress;
- settlement supply changes;
- world events;
- causality and provenance;
- no impossible teleportation or secret knowledge.

### 15.4 Long campaign tests

Simulate many sessions with:
- old and new saves;
- returning NPCs;
- multiple regions;
- changing faction control;
- unresolved promises;
- discovered and misinterpreted clues;
- companion departures;
- completed/failed campaigns;
- imports, exports, and recovery.

Memory tests verify that important facts remain retrievable and that irrelevant details do not overwhelm current context.

### 15.5 Player-stage tests

Automated proxies can test onboarding and rule complexity, but they do not represent actual years of tabletop experience. Conduct human playtests with:
- a first-time tabletop player;
- a player familiar with basic 5e;
- a frequent/experienced player;
- a rules-focused player;
- a player who intentionally tries unusual actions and exploits.

Record where the Director asks unnecessary questions, chooses the wrong rule, rails the player, forgets a fact, or over-narrates.

### 15.6 Release gates

A phase is not merge-ready until:
- all existing regression suites pass;
- new module-specific tests pass;
- generated standalone/PWA/Pages outputs are built from canonical sources;
- save migration and old-save compatibility pass;
- release integrity passes;
- the actual player-facing workflow has an end-to-end test;
- no known issue can duplicate rewards, corrupt state, or bypass rules;
- any untested human/device requirement is explicitly listed rather than claimed as passed.

---

## 16. Completion criteria: what “the full game” means

Solo Realms reaches its intended end design when all of the following are true:

1. A new player can create a character and begin without reading rules documentation or configuring mechanical controls.
2. The player can describe nearly all normal gameplay in natural language.
3. The Director correctly distinguishes no-roll, ability check, saving throw, attack, spell, contest, time/resource action, and clarification.
4. All consequential mechanics are authoritative, deterministic where appropriate, explainable, and tested.
5. Combat, spells, exploration, travel, survival, social play, downtime, crafting, and progression share one consistent campaign state.
6. The world advances from coherent clocks and actor goals, even when the player ignores them.
7. Important NPCs have distinct goals, knowledge, relationships, and believable memory.
8. Campaigns are built from situations, facts, clues, actors, and clocks rather than a brittle mandatory plot chain.
9. Key mysteries have redundant information paths and no arbitrary single-roll chokepoints.
10. Player choices can permanently change allies, enemies, factions, settlements, regions, and endings.
11. The Director can recall long-term events with provenance and distinguish fact, rumor, belief, and theory.
12. The game remains usable offline and connected mode protects provider credentials.
13. Saves survive upgrades, imports, exports, browser restarts, and long campaigns.
14. The mobile/PWA and standalone experiences provide the same game behavior.
15. Automated and human evaluation demonstrates fair rulings, coherent state, agency, and engaging narration over extended campaigns.

This is the destination. V23 delivers only the first portion of items 2, 3, 11, and 12. The remaining work is intentionally laid out in the implementation roadmap rather than being treated as complete.

---

## 17. Research and design references

### Rules
- [D&D Systems Reference Document 5.2.1](https://www.dndbeyond.com/srd) — official rules reference; use the project-adopted SRD release and its license terms.
- [D&D 2024 Basic Rules: Playing the Game](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game) — ability checks, saving throws, attacks, proficiency, and difficulty.
- [D&D 2024 Dungeon Master's Guide](https://www.dndbeyond.com/sources/dnd/dmg-2024) — adventure creation, campaign design, encounters, rewards, and world-building.

### Adventure and mystery design
- [The Alexandrian: Node-Based Scenario Design](https://thealexandrian.net/wordpress/7949/roleplaying-games/node-based-scenario-design-part-1-the-plotted-approach) — why situation/node structures preserve meaningful choice compared with linear plot chains.
- [The Alexandrian: Three Clue Rule](https://thealexandrian.net/wordpress/1118/roleplaying-games/three-clue-rule) — redundant clues for robust mystery progression.
- [The Alexandrian: Random GM Tips — Making Clues](https://thealexandrian.net/wordpress/46338/roleplaying-games/random-gm-tips-making-clues) — practical clue construction.

### Memory and agents
- [Park et al., Generative Agents: Interactive Simulacra of Human Behavior (2023)](https://research.google/pubs/generative-agents-interactive-simulacra-of-human-behavior/) — memory streams, reflection, retrieval, and planning for believable agents.
- [Packer et al., MemGPT: Towards LLMs as Operating Systems (2023)](https://arxiv.org/abs/2310.08560) — tiered memory and virtual context management for long-running interactions.

### Structured AI integration
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) — schema-constrained model outputs, refusal/incomplete response handling, and the recommendation to evaluate schemas in the actual application.
- [OpenAI Responses API reference](https://developers.openai.com/api/reference/resources/responses/methods/create) — structured JSON-schema response configuration.

Research informs the design; it does not prove an implementation is complete. All game-specific decisions must be validated against the adopted ruleset, actual campaign data, and playtests.
