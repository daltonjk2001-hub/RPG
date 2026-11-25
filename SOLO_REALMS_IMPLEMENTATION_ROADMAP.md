# Solo Realms — Full End-State Implementation Roadmap

**Purpose:** Deliver the complete target described in SOLO_REALMS_COMPLETE_END_DESIGN.md.  
**Starting point:** V23 is merged to main. It is a foundation, not completion.  
**Policy:** Work in independently testable increments. Merge only after the phase gate is satisfied.

The roadmap is dependency-ordered. The order matters: campaign state, rules authority, and memory must be reliable before autonomous NPCs, dynamic campaign generation, or expanded AI control are layered on top.

---

## Release philosophy

Every implementation phase must:
- start from main and use a dedicated feature branch;
- have an explicit scope and measurable acceptance criteria;
- add tests before or alongside behavior changes;
- preserve old saves or include a migration;
- rebuild standalone, PWA, and GitHub Pages outputs from canonical sources;
- run the entire regression suite on the supported Node versions;
- record limitations honestly;
- merge only after CI and generated-artifact checks pass.

A “phase complete” means its acceptance criteria are met. A demo or isolated feature does not close a phase.

---

## Phase 0 — End-state design baseline

**Status:** Design drafted on this branch.

Deliverables:
- complete end-state game design;
- target technical architecture;
- dependency-ordered implementation roadmap;
- explicit current-versus-target boundaries;
- research references and acceptance gates.

Exit criteria:
- one canonical destination document exists;
- architecture matches the product design;
- every unfinished system is placed in an implementation phase;
- no document claims that V23 already implements future systems.

---

## Phase 1 — Stabilize the V23 foundation and extract the domain boundary

**Goal:** Stop new gameplay logic from depending on global function replacement and DOM state.

Work:
- inventory all V18–V23 global functions, wrappers, events, and initialization order;
- document current state owners and compatibility adapters;
- introduce versioned action, plan, command, result, and event contracts;
- isolate the V23 local planner and connected-plan validator as pure services;
- move action resolution behind a single explicit orchestration API;
- move save calls and UI rendering out of core resolver modules;
- keep legacy globals as adapters while call sites migrate;
- add transaction IDs, idempotency keys, and campaign revision checks.

Acceptance:
- no new core module reads DOM values directly;
- action resolver accepts explicit state/context/options;
- one action cannot be applied twice after refresh/retry;
- model failure cannot partially mutate state;
- legacy tests and old saves remain compatible;
- standalone/PWA/Pages builds are generated and pass integrity checks.

Not included yet: major narrative redesign, new world simulation, or full campaign generation.

---

## Phase 2 — Complete Director adjudication

**Goal:** Make natural-language action handling reliable across the full range of ordinary play.

Work:
- replace keyword-first classification with intent parsing plus context and explicit mechanic selection;
- represent no-roll, ability check, save, attack, contest, spell, time/resource action, clarification, and unsupported action distinctly;
- add fiction/feasibility checks and capability validation;
- improve target resolution, pronoun/reference resolution, multi-step intent, negation, corrections, and quoted text handling;
- allow the connected model to propose a typed plan, but validate every field against rules and current state;
- add local deterministic fallback behavior for all supported mechanics;
- preserve player overrides as deliberate advanced settings;
- produce an explanation for no-roll and check decisions;
- create result structures with partial success and consequence options where the game system supports them.

Acceptance:
- representative actions route to the correct mechanic;
- routine unopposed actions do not produce rolls;
- attacks and spells never route to a generic ability check;
- impossible attempts do not become possible through high dice;
- ambiguous inputs ask one direct clarification instead of guessing;
- failed/malformed model responses fall back safely;
- AI plan evaluation covers varied phrasing and adversarial/contradictory inputs.

---

## Phase 3 — Rules completeness and consistency

**Goal:** Ensure every core game mechanic shares one authoritative rules service.

Work:
- audit the adopted SRD/ruleset and every currently implemented rule;
- complete ability checks, saves, attacks, contests, movement, action economy, conditions, damage, healing, rests, progression, and resource use;
- audit spell schema and resolution for range, area, components, duration, concentration, saves, upcasting, and ongoing effects;
- complete monster action data and enemy decision constraints;
- reconcile tactical map geometry with range, cover, line of sight, and movement legality;
- add combat end conditions, morale/surrender/retreat, environmental objects, and persistent effects;
- make all rule decisions testable without a browser.

Acceptance:
- a rules matrix documents each supported mechanic and any intentional house rule;
- each mechanic has unit, edge, integration, and persistence tests;
- no UI code owns mechanical calculation;
- combat and spell results are reproducible from seeded tests;
- rule explanations match the committed mechanical result.

---

## Phase 4 — Canonical campaign state, events, facts, and memory

**Goal:** Give the game reliable long-term continuity.

Work:
- establish stable entity IDs and a campaign revision;
- introduce append-only domain events;
- create the fact/belief/observation ledger with provenance and visibility;
- migrate V23 event records into the new event schema;
- add relationship graph data;
- separate player knowledge, party knowledge, NPC knowledge, and world truth;
- implement memory tiers: working, campaign, episodic, semantic/reflection, and archive;
- add relevance/recency/importance/entity retrieval;
- generate evidence-backed summaries with source event IDs;
- detect contradictions without erasing evidence;
- migrate old save formats through explicit versioned steps.

Acceptance:
- every consequential state change has an event;
- every campaign fact has a source or an explicit generated-world origin;
- an NPC cannot use information it could not know;
- player hypotheses never become canon automatically;
- long-session memory retrieval returns relevant events without flooding context;
- old saves load and round-trip through export/import.

---

## Phase 5 — NPCs, social scenes, companions, and rival parties

**Goal:** Make the world inhabitant layer feel like people with their own lives rather than dialogue endpoints.

Work:
- create NPC identity, personality, goal, fear, belief, schedule, resource, and relationship schemas;
- implement directional relationship dimensions rather than a single friendship number;
- give important NPCs bounded episodic memory and evidence-backed reflections;
- implement social adjudication based on motive, stakes, leverage, truth, and prior history;
- add NPC observation/knowledge propagation;
- implement deterministic schedule and feasible action selection;
- add companion autonomy with player-agency constraints and tactical preferences;
- add rival adventuring parties with goals, capabilities, progress, and consequences;
- support promises, debts, rivalries, loyalty, betrayal, departure, and return.

Acceptance:
- recurring NPC behavior is stable across sessions;
- dialogue respects what the speaker knows and believes;
- social success is not mind control;
- companions do not make player-character decisions;
- NPCs and rivals cannot teleport or act on unearned information;
- significant relationship changes have traceable causes.

---

## Phase 6 — Living world, factions, settlements, and regional simulation

**Goal:** Make the world advance beyond the immediate scene.

Work:
- implement immediate, regional, and distant simulation layers;
- centralize time and scheduled events;
- create faction goals, plans, resources, alliances, conflicts, and territory;
- create settlement status, supply, services, local power, and economic pressure;
- simulate travel and regional threats with bounded deterministic ticks;
- propagate rumors through plausible information routes;
- advance antagonist plans and clocks when player actions or time justify it;
- introduce rival-party events and regional opportunities;
- make simulation resumable and idempotent across save/load.

Acceptance:
- ignored situations can advance and transform coherently;
- every faction action has resources, time, and a causal trigger;
- regional events are reproducible from a seed/event log;
- world time does not double-advance after reload;
- distant simulation does not require one AI call per NPC;
- the player can inspect why a major world change occurred.

---

## Phase 7 — Situation, mystery, adventure, and campaign generation

**Goal:** Generate coherent adventures and long campaigns rather than disconnected quest prompts.

Work:
- implement situation graph schemas and state transitions;
- implement revelation/clue graphs with provenance and redundant clue paths;
- build villains with feasible plans, resources, limitations, and clocks;
- create dynamic scene and encounter construction;
- validate geography and actor/goal relationships;
- generate dungeons with topology, loops, factions, hazards, and changing inhabitants;
- connect personal, companion, faction, and main conflict arcs;
- create campaign seed and structured package validation;
- support alternate endings and transformed situations;
- make the Director improvise from the situation model rather than adding arbitrary plot branches.

Acceptance:
- campaign generator produces a validated playable package before the opening scene;
- every critical revelation has multiple independent paths;
- no single required action or one roll blocks the campaign;
- player choices can change the primary conflict and ending;
- generated NPCs, factions, places, and clues have coherent causal relationships;
- long campaign seeds remain stable after reload and migration.

---

## Phase 8 — Exploration, travel, survival, downtime, crafting, and strongholds

**Goal:** Turn the world into a place the character can inhabit over time.

Work:
- complete travel routes, terrain, watches, weather, navigation, supplies, and encounters;
- add dungeon exploration procedures, lighting, noise, traps, and environmental hazards;
- add rest interruption, recovery, resource refresh, and world-time consequences;
- add gathering, foraging, hunting, fishing, cooking, repair, and crafting with validated recipes;
- add downtime activities and long projects;
- add stronghold/base facilities, staff, defenses, supply, visitors, and regional influence;
- add economic updates when relevant events change supply or demand.

Acceptance:
- travel time and resources are consistent across UI, world simulation, and save data;
- optional survival strictness is campaign-configurable;
- crafting consumes exactly the validated materials and time;
- downtime projects can be interrupted and resumed;
- settlement/stronghold changes appear in the world and are visible in the journal.

---

## Phase 9 — Conversation-first interface and presentation overhaul

**Goal:** Make the complete underlying systems feel like one coherent Dungeon Master experience.

Work:
- redesign Adventure around scene, narration, dialogue, and one free-form action field;
- remove duplicate/legacy action controls from the normal path;
- display mechanical rulings only when relevant and reveal detailed math on demand;
- contextualize map, party, NPC, object, clue, and combat affordances;
- present NPC voices and dialogue distinctly;
- improve transitions, scene pacing, and consequence presentation;
- simplify character creation and first-session onboarding;
- redesign journal into facts, rumors, clues, promises, and unresolved questions;
- improve mobile layouts, touch targets, keyboard flow, accessibility, and PWA offline behavior;
- ensure every screen reflects canonical state rather than storing its own version.

Acceptance:
- a new player can complete a meaningful session without opening a mechanical selector;
- the interface works on mobile and desktop;
- normal action-taking is natural-language first;
- advanced controls remain accessible but never required;
- the same state is shown consistently in Adventure, character, map, journal, and combat screens.

---

## Phase 10 — Connected Director service and production operations

**Goal:** Make connected AI secure, resilient, observable, and controllable.

Work:
- design and deploy a separate HTTPS gateway;
- move provider secrets server-side;
- implement authentication, quotas, rate limits, request validation, and provider adapters;
- use structured outputs/tool calls where supported and validate them again in the application;
- implement timeout/fallback and stale-revision handling;
- add cost budgets and per-campaign call controls;
- redact secrets and unnecessary personal data from logs;
- add provider health/diagnostics and local-mode status;
- evaluate connected model versions against the same seeded scenario suite.

Acceptance:
- no provider key appears in client bundles or browser storage;
- gateway calls are authenticated and campaign-scoped;
- malformed, refused, or timed-out calls cannot mutate state;
- usage/cost can be measured and bounded;
- local/offline mode remains fully playable;
- provider changes do not require a game save migration.

---

## Phase 11 — Co-op multiplayer and shared-world hardening

**Goal:** Extend the stable single-player campaign model to optional shared campaigns.

Work:
- define player identity, ownership, permissions, and character control;
- introduce authoritative command ordering and optimistic revision checks;
- synchronize canonical state and event history;
- distinguish private, character, party, and public knowledge;
- implement turn/scene ownership and group response handling;
- support disconnect/reconnect and idempotent retries;
- test concurrent commands, conflicts, and state recovery.

Acceptance:
- no duplicate actions, rewards, rolls, or state mutations under reconnect/retry;
- all players see the same committed public state;
- private knowledge is not leaked to other characters;
- the Director can address a group coherently;
- real two-device sessions pass manual testing.

---

## Phase 12 — Human evaluation, balance, and public release

**Goal:** Prove the game is enjoyable, fair, understandable, and robust over actual sessions.

Work:
- recruit or run human tests across first-time, familiar, experienced, and rules-focused players;
- run extended campaigns across several regions and story arcs;
- test creative action attempts, loopholes, rules edge cases, and intentionally adversarial inputs;
- evaluate pacing, memory, voice, player agency, social interactions, combat tactics, and rewards;
- run Android/desktop/PWA install, offline, update, export/import, and recovery tests;
- test multiplayer on real devices if enabled;
- document known limits and release notes;
- revise prompts and rules based on repeatable failures rather than anecdotes alone.

Acceptance:
- no critical save/data/security defects;
- no known reward/roll duplication exploits;
- rules accuracy and state consistency meet the project's published target;
- human players can sustain a satisfying multi-session campaign;
- first-time players understand how to act without a rules tutorial;
- mobile and desktop builds pass real-use checks;
- any deferred feature is clearly identified and does not masquerade as complete.

---

## Dependency map

| Foundation | Required before |
|---|---|
| Phase 1 explicit domain boundary | All later domain extractions |
| Phase 2 adjudication contract | Full conversational play |
| Phase 3 authoritative rules | Combat, spells, progression, and encounter balance |
| Phase 4 event/fact/memory model | Reliable NPCs, factions, and long campaigns |
| Phase 5 NPC/relationship model | Social stories, companions, and rival parties |
| Phase 6 world scheduler | Dynamic campaign clocks and antagonist plans |
| Phase 7 situation/clue graph | Reliable generated adventures and mysteries |
| Phase 8 world activity systems | Full travel, downtime, crafting, and base play |
| Phase 9 coherent presentation | Public player experience |
| Phase 10 secure gateway | Production connected AI |
| Phase 11 shared authority | Co-op multiplayer |
| Phase 12 human validation | Public release confidence |

Some work can run in parallel after the required contracts exist. No later phase should bypass an incomplete foundation.

---

## What is already done versus what remains

### V23 foundations already merged
- Natural-language-first Adventure input.
- Basic local no-roll/check planning.
- Initial connected model ruling proposal and schema validation.
- Deterministic mechanics remain authoritative for dice and state.
- Basic action-event memory with bounded retrieval.
- Older save compatibility and V23 PWA cache migration.
- Regression coverage for those foundations.

### Not yet complete
- Full semantic intent understanding across all game mechanics.
- Complete rule engine coverage and rules matrix.
- Fully extracted transaction/domain architecture.
- Event-sourced campaign/fact/knowledge model.
- Rich NPC autonomy, companion arcs, and rival parties.
- Faction/economy/settlement simulation.
- Situation graph, robust clue graph, and full campaign generation.
- Full exploration/travel/downtime/stronghold systems.
- Finished conversation-first UI across all screens.
- Hosted secure model gateway.
- Production-grade co-op authority and synchronization.
- Real human/device playtest evidence.

The next code phase should be **Phase 1**, not another isolated gameplay feature. The design is the destination; the roadmap is the controlled path to reach it.
