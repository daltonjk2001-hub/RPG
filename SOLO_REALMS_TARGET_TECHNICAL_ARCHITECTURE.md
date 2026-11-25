# Solo Realms — Target Technical Architecture

**Status:** Proposed architecture for the complete end-state design  
**Build baseline:** V23, merged to main  
**Migration strategy:** Incremental module extraction with compatibility adapters; no full-runtime rewrite

This document converts SOLO_REALMS_COMPLETE_END_DESIGN.md into an implementable software architecture. Names and directory paths below describe the intended target. They are not claims that the modules already exist.

---

## 1. Architectural decision

Solo Realms will use a **deterministic campaign core with a bounded Director orchestration layer**.

The browser client owns presentation and an offline-capable local campaign core. The same domain contracts are used when a connected Director service is available. Model output is a proposal, never the source of truth. All state changes pass through typed command validation and deterministic domain services.

The system has five boundaries:

1. **Experience layer:** scene display, chat-like action input, character/party views, map, journal, combat interface, settings, save center.
2. **Director layer:** intent interpretation, context assembly, adjudication proposals, scene planning, NPC portrayal, narration, and memory retrieval.
3. **Domain layer:** authoritative rules, campaign/world simulation, combat, spells, time, resources, progression, NPC/faction systems, and quest/situation resolution.
4. **Persistence layer:** versioned saves, event history, snapshots, migrations, indexes, import/export, recovery.
5. **Infrastructure layer:** local browser runtime, optional authenticated AI gateway, provider adapters, multiplayer session services, telemetry and deployment.

No layer may bypass the layer below it to mutate campaign state.

---

## 2. Runtime topology

### 2.1 Offline/local topology

The standalone HTML and installable PWA load the same assembled application runtime.

The local runtime provides:
- player interaction and UI;
- local intent classification and fallback adjudication;
- deterministic rules and world services;
- campaign state and event history;
- local memory retrieval;
- save, recovery, import/export;
- local narration templates and non-generative NPC behavior;
- optional cached rules reference material.

No network service is required for ordinary single-player play.

### 2.2 Connected topology

The connected mode adds an HTTPS Director gateway. The gateway:
- authenticates the player/session;
- resolves the campaign identity and current revision;
- retrieves only authorized campaign context;
- calls the configured provider through a server-side adapter;
- validates model output against strict contracts;
- forwards a bounded proposal to the deterministic domain core;
- records non-sensitive operational metrics;
- enforces quotas, rate limits, provider timeouts, and request size limits.

Provider credentials remain on the server. The browser never receives a provider secret.

### 2.3 Deployment modes

| Mode | Client | Director | Campaign authority | Required network |
|---|---|---|---|---|
| Standalone offline | Local HTML | Local deterministic | Local domain core | None |
| PWA offline | Installed PWA | Local deterministic | Local domain core | None after installation |
| Connected PWA | PWA | Authenticated gateway + provider | Domain core | HTTPS |
| Future co-op | PWA clients | Shared Director service | Authoritative campaign session | HTTPS/realtime |

GitHub Pages publishes static PWA files. It is not the connected AI gateway and must never be treated as a secret store or persistent application server.

---

## 3. Target source layout

The existing repository contains a layered runtime under source/. The first goal is not to rename everything. It is to extract cohesive boundaries while retaining the stable build and old entry points.

Proposed target modules:

### 3.1 Core domain

- campaign-state: campaign identity, schema version, revision, and root state.
- domain-events: append-only event contracts and event sequencing.
- command-contracts: allowed state-changing command types and parameter schemas.
- command-validator: preconditions, authorization, resource checks, and transaction validation.
- transaction-runner: atomic application, rollback on failure, idempotency, and revision checks.
- rules-registry: adopted ruleset version and canonical rule data identifiers.
- dice-service: seeded/testable randomness and audited roll records.
- time-service: world clock, watches, day, season, and scheduled advancement.
- resource-service: HP, spell slots, supplies, conditions, currency, and item use.
- progression-service: XP/milestones, level transitions, class features, and rewards.
- save-service: snapshots, migration, validation, export/import, and recovery.

### 3.2 Rules domain

- ability-checks;
- saving-throws;
- attack-rolls;
- contests;
- action-economy;
- movement-and-position;
- damage-and-healing;
- conditions-and-effects;
- spell-resolution;
- weapons-and-equipment;
- rests-and-recovery;
- exploration-and-hazards;
- travel-and-survival;
- crafting-and-downtime;
- encounter-balancing.

Each rules module accepts explicit state and inputs and returns a typed result plus proposed domain events. It does not reach into the DOM or save directly.

### 3.3 Campaign/world domain

- entity-registry: characters, companions, NPCs, factions, locations, items, and creatures.
- fact-ledger: facts, beliefs, observations, rumors, hypotheses, provenance, and contradiction status.
- relationship-graph: directional relationships and their dimensions.
- situation-engine: active situations, goals, clocks, routes, and resolution conditions.
- clue-graph: clues, revelations, evidence references, and knowledge visibility.
- npc-simulation: schedules, needs, plans, knowledge updates, and feasible actions.
- faction-simulation: goals, resources, plans, conflicts, and influence.
- settlement-simulation: services, supplies, scarcity, routes, and local events.
- regional-simulation: travel, weather, threats, rival parties, and regional clocks.
- world-tick: deterministic scheduling of immediate, regional, and distant updates.
- campaign-generator: seed, validation, initial state, and opening situation.

### 3.4 Director domain

- director-contracts: typed request, plan, clarification, narration, and result contracts.
- intent-interpreter: action meaning, targets, references, steps, negation, and ambiguity.
- context-builder: current scene, rules, entities, facts, memories, clocks, and constraints.
- adjudication-planner: possible/no-roll/check/attack/save/contest/other mechanic proposal.
- scene-planner: scene framing, transitions, pacing, and stakes.
- npc-portrayal: voice, dialogue, knowledge, motives, and social interaction.
- narrative-composer: post-resolution narration grounded in committed state.
- continuity-validator: canon, knowledge, chronology, and mechanical consistency.
- memory-retriever: entity, relevance, recency, importance, and semantic retrieval.
- memory-reflector: evidence-backed summaries and high-level campaign reflections.
- local-director: offline rules-based fallback and deterministic scene behavior.
- connected-director-client: provider gateway request/response, timeouts, and fallback.

### 3.5 Experience and persistence

- adventure-screen: primary conversation, scene, action input, result, and contextual suggestions.
- combat-screen: initiative, grid, actors, valid actions, reactions, and result detail.
- character-screen, party-screen, inventory-screen, spellbook-screen.
- journal-screen, codex-screen, map-screen, world-screen, stronghold-screen.
- settings-screen, save-center-screen, accessibility preferences.
- local-store: browser database abstraction.
- cache-manager: PWA asset/version cache and cached reference resources.
- save-migrations: explicit from-version/to-version transformations.
- diagnostics: non-sensitive development traces and support export.

---

## 4. Core data contracts

The contracts below are logical shapes. Exact TypeScript/JSDoc names and property types are finalized as each module is extracted.

### 4.1 Campaign root

A Campaign record contains:
- campaignId;
- schemaVersion;
- rulesetId and rulesetVersion;
- worldSeed;
- revision;
- createdAt and updatedAt;
- campaignPreferences;
- activeSceneId;
- partyId;
- worldState;
- entity references;
- activeSituationIds;
- memory index/version metadata;
- save snapshot/event cursor.

The root must not duplicate a fact already owned by another aggregate. It stores stable references and aggregate metadata.

### 4.2 Player and party

Character state contains:
- stable character ID and character schema version;
- identity, class, level, background, species/ancestry, alignment/personality notes where used;
- ability scores, saving throws, skills, tools, and proficiencies;
- hit points, hit dice, conditions, effects, and death/recovery state;
- actions, class features, resources, and spellcasting state;
- inventory/equipment references;
- progression and campaign-specific personal goals.

Party state contains member references, marching order, shared resources where applicable, formation, current command/turn state, and party knowledge. Character knowledge is separate from shared party knowledge.

### 4.3 Entity registry

Every persistent entity has:
- stable ID;
- entity type;
- schema version;
- display name and descriptors;
- current location or owner;
- canonical status;
- relevant aggregate data;
- created/updated event references.

NPC, faction, location, item, creature, companion, and rival-party records use type-specific data schemas.

### 4.4 World clock

World time uses one authoritative timeline with:
- campaign day and calendar;
- hour/minute or a canonical time unit;
- watch boundaries;
- season and weather state;
- scheduled event queue;
- regional tick cursor.

The four-hour watch model currently used by V21 can be retained where appropriate, but all new time logic goes through one time service. A subsystem cannot independently increment day/watch values.

### 4.5 Situation model

A Situation includes:
- situationId and revision;
- premise and stakes;
- status;
- involved entity IDs;
- current known facts;
- hidden facts and their visibility;
- goals and plans;
- clue/revelation graph references;
- active clocks/deadlines;
- entry points and approach options;
- event dependencies;
- possible state transitions;
- resolution/abandonment conditions.

A situation is a structured world problem, not a scripted dialogue tree.

### 4.6 Facts, beliefs, and observations

A KnowledgeRecord includes:
- recordId;
- subject and claim;
- status: observed, reported, believed, suspected, confirmed, disproved, or unknown;
- source event IDs;
- observer/owner/audience;
- world time;
- confidence or evidence strength;
- visibility rules;
- related contradictory records.

Facts are append-only evidence-backed records. A new contradiction creates a new record and may change the derived current belief; it does not erase provenance.

### 4.7 Event contract

A DomainEvent includes:
- eventId;
- event sequence;
- campaign revision;
- event type;
- actor IDs and target IDs;
- world timestamp;
- source command/action ID;
- location;
- payload constrained by event type;
- visibility and knowledge propagation;
- causal parent event IDs;
- createdAt.

Events are immutable after commit. Corrections use compensating/corrective events.

### 4.8 Action request and adjudication plan

ActionRequest:
- actionId and idempotency key;
- campaignId and expectedRevision;
- player/character ID;
- natural-language text;
- sceneId;
- referenced entity IDs when known;
- client timestamp;
- optional explicit advanced overrides.

AdjudicationPlan:
- intent summary;
- intended outcome;
- target and approach;
- mechanic category;
- whether clarification is required;
- whether a roll is required;
- check/save/attack/contest/spell/action parameters as appropriate;
- provisional DC or defense target only where valid;
- proposed commands;
- possible success/failure/partial outcomes;
- resource/time implications;
- rationale for the ruling;
- source: local, connected, or explicit player override;
- confidence/ambiguity metadata.

The plan is validated; it is not applied directly.

### 4.9 Command and transaction contracts

A ProposedCommand contains:
- command type from an allow-list;
- actor and target IDs;
- typed parameters;
- expected preconditions;
- reason;
- originating action ID;
- relevant rule reference.

The command validator verifies:
- schema and size bounds;
- actor authority and capability;
- entity existence and reachability;
- action economy and resource cost;
- state revision and preconditions;
- rule-specific constraints;
- duplicate/idempotent submission.

A successful transaction returns:
- committed revision;
- domain events;
- mechanical result;
- state diff;
- generated memory write candidates;
- narrative context.

A failed transaction returns a typed reason and no partial state mutation.

---

## 5. Action pipeline and timing model

### 5.1 Standard player action

1. UI submits ActionRequest with expected campaign revision.
2. Local intent parser builds initial interpretation.
3. Context builder retrieves scene, rules, character, current targets, relevant memories, and world constraints.
4. Local or connected Director proposes an AdjudicationPlan.
5. If intent is materially ambiguous, return one conversational clarification without applying a transaction.
6. Validate the plan and proposed commands.
7. Route the mechanic to the correct rules service.
8. Resolve dice and mechanics exactly once.
9. Apply valid state changes as an atomic transaction.
10. Append events and increment campaign revision.
11. Advance only the clocks triggered by the action.
12. Run relevant NPC/faction/world updates.
13. Write evidence-backed memory and update retrieval indexes.
14. Compose result narration from the committed transaction and current scene.
15. Validate narration against state and knowledge boundaries.
16. Return response with action ID, events/result, concise mechanical summary, and new revision.

### 5.2 Async narration safety

The deterministic transaction commits first. Optional enhanced narration can complete afterward. The narration response must reference the action ID and committed revision. If a newer action changed the scene, the late response is discarded or stored as a non-visible diagnostic. It must never overwrite the latest outcome.

### 5.3 Multi-step actions

A declared plan can contain several steps. The planner marks which steps are:
- immediate and deterministic;
- requiring separate checks;
- dependent on prior outcomes;
- time-consuming;
- interruptible by world events;
- impossible with current resources.

The engine resolves only the next valid step. A single message cannot silently consume hours, cross a dungeon, defeat a boss, and grant treasure without intermediate world updates or player-visible outcomes.

---

## 6. Rules service boundaries

### 6.1 Ruleset registry

Each campaign pins a ruleset ID/version. Rules updates do not silently change the interpretation of an existing campaign. The rules registry identifies the adopted SRD/reference version and project house rules.

### 6.2 Mechanic result contract

Every resolver returns:
- mechanic type;
- actor/target;
- required roll(s), if any;
- modifiers and sources;
- difficulty/defense;
- total/result;
- resource expenditure;
- applied conditions/effects;
- success/failure/partial state;
- events and state diff;
- public explanation;
- internal rule trace for tests/debug builds.

### 6.3 Rules data versus code

Where practical, spells, weapons, items, conditions, monster actions, and resource definitions are data-driven and validated against schemas. Domain algorithms remain code. The model may reference data IDs but cannot create executable mechanics.

### 6.4 Combat transaction

A combat turn is a transaction sequence:
- validate current actor and turn;
- select legal action;
- validate movement/target/range/line of sight;
- calculate attack/save;
- resolve damage/effects;
- consume action economy/resources;
- run relevant reactions;
- evaluate defeat, morale, condition expiry, and end-turn events;
- advance initiative/round as appropriate;
- persist before narration.

The UI reads the committed combat state. It does not calculate a second version of attack legality.

---

## 7. World simulation architecture

### 7.1 Scheduler

The world scheduler consumes world-time events and active clocks. Each scheduled task declares:
- interval or trigger;
- scope: immediate, scene, regional, distant;
- deterministic or model-assisted;
- preconditions;
- resource/time cost;
- event output.

The scheduler processes only tasks whose conditions are satisfied. It is resumable after save/load and cannot double-advance a task.

### 7.2 NPC agent runtime

NPC behavior uses:
- state and current goals;
- available observations and knowledge;
- schedules and feasible routes;
- relationship graph;
- needs/resources;
- short-term plans;
- priority scoring;
- bounded plan selection.

Deterministic behavior handles mundane schedules. A connected model may propose choices for high-impact social or strategic situations. Every proposed action is validated by world rules.

### 7.3 Faction runtime

Faction ticks update:
- goal progress;
- resource changes;
- agent/territory control;
- alliances and conflicts;
- rumor/information propagation;
- reaction to world/player events;
- clocks and next planned actions.

Faction updates must have causes and feasible constraints, not arbitrary story escalation.

### 7.4 Simulation levels

- Immediate: every relevant action.
- Regional: watch/day/event boundaries.
- Distant: day/week/season summaries or event-triggered updates.

A regional tick is deterministic and resumable; distant updates do not consume unbounded model calls.

---

## 8. Memory architecture

The target memory service has separate stores/indexes:
- canonical current state;
- append-only domain event log;
- entity records;
- knowledge/fact/belief ledger;
- NPC-specific episodic memory;
- campaign-level episodic memory;
- evidence-backed reflections/summaries;
- archival completed arcs.

Memory retrieval filters by entity, topic, time, scene, visibility, and current question. It ranks by relevance, importance, recency, and direct relation. A semantic/vector index is optional and accelerates retrieval; it is not the canonical record.

The offline implementation can use browser storage and lexical/indexed retrieval. The connected deployment may add server-side indexed storage and semantic search. Both use the same record contracts and provenance policy.

Memory compaction never deletes canonical facts or committed event history. It creates shorter summaries that reference their supporting events.

---

## 9. Provider gateway and security

### 9.1 Provider adapter

The gateway abstracts providers behind:
- structured adjudication request;
- structured command proposal;
- narrative request;
- NPC portrayal request;
- campaign generation request.

Provider-specific response envelopes are normalized at the adapter boundary. Domain services never parse vendor-specific JSON.

### 9.2 Security controls

- server-held provider keys;
- authenticated session and campaign access;
- per-user/campaign quota and rate limit;
- request and response size caps;
- strict schema validation;
- command allow-lists and precondition checks;
- prompt-injection separation for player/in-world data;
- save/import validation;
- secrets redaction from logs;
- no arbitrary code execution or unrestricted network/tool access;
- abuse and cost controls.

### 9.3 Fallback behavior

On timeout, malformed result, provider refusal, quota exhaustion, disconnect, or schema mismatch:
- cancel uncommitted model proposal;
- use the local plan if safe;
- preserve all committed events and rolls;
- display a brief non-alarming connection status if relevant;
- never apply partial model changes.

---

## 10. Persistence and migration

Local browser storage is accessed through one storage abstraction. Domain modules do not call raw browser storage APIs directly.

Save envelope:
- saveFormatVersion;
- campaign schema/rules version;
- campaignId;
- revision;
- savedAt;
- compact canonical snapshot;
- event cursor/required history;
- migration metadata;
- integrity metadata.

Import flow:
1. enforce file size before parsing;
2. parse into an isolated object;
3. validate format/version and graph bounds;
4. run ordered pure migrations;
5. validate the normalized result;
6. create a recovery snapshot of the active campaign;
7. replace state atomically;
8. rebuild/reconcile indexes;
9. confirm the loaded campaign and show any migration warning.

Older V3/V17/V18/V21/V22/V23 saves receive explicit migrations. A malformed optional field is either normalized under a documented compatibility rule or rejected; no silent partial state replacement.

---

## 11. Testing and observability architecture

### 11.1 Test pyramid

- Pure unit tests for rules and domain helpers.
- Module contract tests for command/transaction/memory services.
- Scenario tests using seeded worlds and scripted player actions.
- AI plan validation tests using fixtures and adversarial outputs.
- Long-campaign simulation tests.
- Browser/PWA end-to-end tests on real UI.
- Human playtests with player-stage coverage.

### 11.2 Deterministic AI evaluation

Store scenario fixtures with:
- initial campaign snapshot;
- player action;
- expected intent classification range;
- acceptable mechanic categories;
- legal command constraints;
- expected state invariants;
- memory/knowledge constraints;
- evaluation rubric for narration.

Do not assert one exact prose string for open-ended narration. Evaluate factual support, agency, continuity, tone, and result clarity.

### 11.3 Traceability

Every action trace can be replayed from:
- initial revision;
- action request;
- model proposal/local plan;
- validated commands;
- random seed/roll results;
- committed events;
- resulting state revision.

The trace makes difficult bugs reproducible and allows prompt/model changes to be evaluated against the same scenario.

---

## 12. Migration plan from V23

V23 remains the compatibility base:
- SR23 Director functions become the first domain boundary to extract.
- V20/V21 resolver behavior is moved behind explicit input/output contracts, preserving tests.
- V22 save validation and legacy ledger stay as migration authorities.
- Existing public function names remain short adapters until all callers migrate.
- Generated standalone, PWA, and Pages outputs continue to come from canonical source modules.
- PWA cache names continue to be content-derived and bumped automatically by the builder.
- No implementation phase may remove a legacy adapter without proving there are no remaining call sites.

The safe extraction sequence is:
1. event and action contracts;
2. transaction/command boundary;
3. rules resolver APIs;
4. world clock/resource API;
5. campaign memory and fact ledger;
6. NPC/faction/world tick APIs;
7. Director orchestration;
8. screen rendering and UI adapters;
9. connected gateway.

---

## 13. Architecture completion gate

The target architecture is complete when:
- all persistent state changes go through validated domain commands;
- game rules do not depend on DOM state;
- AI requests and responses use versioned schemas;
- no provider secret is present in the client bundle;
- canonical state, events, facts, and NPC beliefs remain distinct;
- save/import migration is tested across supported historical formats;
- local and connected modes share the same domain contracts;
- UI screens render from committed state;
- world ticks are deterministic, resumable, and idempotent;
- an entire seeded campaign can be replayed and audited without hidden state mutation.
