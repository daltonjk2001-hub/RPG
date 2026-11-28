# Solo Realms — D&D Reference-to-Implementation Backlog

**Status:** Working implementation baseline and acceptance backlog  
**Audit baseline:** V24 on main, commit d9a5bb18e38faeff910a5869b23649a6f6258bf2  
**Reference:** Dungeons & Dragons: The Complete Master Reference, Consolidated Research Edition, 25 November 2026  
**Purpose:** Convert the six-pillar D&D reference into a traceable, dependency-ordered development plan for Solo Realms.

---

## 1. Executive decision

Solo Realms has a substantial playable foundation. It already contains character progression, class and subclass selection, a broad data-driven spell resolver, stat-block-driven monster turns, combat and multiplayer foundations, persistent NPC and faction behavior, a free-form Director-first action loop, local campaign storage and recovery, and a server-side AI Director gateway.

It is **not yet a complete 2024 D&D rules implementation**, a full simulation of every official D&D setting, or a fully autonomous campaign DM. The repository's own roadmap correctly describes V23 as a foundation and identifies rules completeness, canonical campaign memory, autonomous NPCs, faction simulation, structured adventure generation, exploration/downtime systems, co-op hardening, and human testing as unfinished work. V24 adds The Chronicler gateway and client integration; it does not close those other workstreams.

The recommended strategy is therefore:

1. Preserve the existing game and its save compatibility.
2. Resolve rules inconsistencies and establish one authoritative rules service.
3. Extract existing global/wrapper-based systems behind explicit, testable contracts.
4. Complete character, combat, spell, monster, exploration, and social mechanics.
5. Give campaign memory explicit facts, provenance, knowledge boundaries, and event history.
6. Expand NPC, faction, situation, and campaign simulation on top of that canonical state.
7. Make The Chronicler a validated orchestrator of the systems, never a second rules engine.
8. Prove behavior through deterministic tests, real-device checks, and sustained human playtests.

**Do not begin with another isolated feature.** Begin with the rules/architecture baseline and the discrepancies called out in this backlog.

## 2. Audit method and status vocabulary

This backlog distinguishes code existence from verified end-to-end behavior.

| Status | Meaning |
|---|---|
| Implemented foundation | Code and tests demonstrate the named capability within a stated scope. This does not mean every official D&D variant or edge case is covered. |
| Partial | A useful implementation exists, but coverage, integration, correctness, or validation is incomplete. |
| Missing | No complete implementation was established in the reviewed repository. |
| Needs live verification | Automated tests or code exist, but real-browser, device, multiplayer, provider deployment, or human play evidence is absent. |
| Reference-only | Content can be consulted or catalogued, but is not an interactive game mechanic. |

Priority labels:

- **P0 — Correctness / architecture blocker:** resolve before broad feature expansion.
- **P1 — Core game completeness:** required for the intended full campaign experience.
- **P2 — Advanced / setting expansion:** valuable after the core is reliable.
- **P3 — Optional reference or polish:** useful but not a blocker for core play.

A feature is not complete merely because a symbol, data entry, menu, prompt, or isolated test exists. Completion requires the relevant data contract, rules behavior, invalid-input handling, integration path, save/load behavior, and user-visible result.

## 3. Repository baseline verified for this audit

### 3.1 Existing implementation

| Area | Evidence in repository | Audit finding |
|---|---|---|
| Standalone browser game and reproducible build | Solo_Realms_V18_Main.html, tools/build_v18.py, build-inputs, source modules | Implemented foundation. Generated outputs are built from tracked inputs. |
| Installable PWA and GitHub Pages mirror | pwa/, docs/, service worker, publish workflow | Implemented build/publish path; real-device installation still needs verification. |
| Core rules and reference layer | source/SR18_SYSTEMS_LAYER.js plus inherited V17/V14 systems | Broad rules foundation; not a complete rules audit. |
| Classes and progression | tests/solo_realms_v18_rules_campaign_test.cjs | All twelve 2024 SRD core classes are represented; SRD subclass selection and XP progression through level 20 are tested. This is not proof that every subclass feature and interaction is complete. |
| Spell resolver | source/SR18_SYSTEMS_LAYER.js; V18 systems tests | Broad content-driven spell effect inference, typed damage, common saves/areas/conditions/healing/utility/concentration/upcasting. Specialized spell behavior remains incomplete. |
| Monster action resolver | source/SR18_SYSTEMS_LAYER.js; V18 systems tests | Structured stat-block actions, attacks, saves, damage, conditions, Multiattack, recharge, legendary actions and morale have coverage. Non-standard traits and bespoke mechanics remain incomplete. |
| Improvisation | SR18 systems and V20/V21 action layers | Useful procedural action families; heuristic rather than general semantic understanding. |
| Living-world foundations | V18 world state and V19 reactive world | Persistent clocks, factions, rumors, NPC/companion behavior and world events exist; full autonomous simulation is not present. |
| Director Studio | source/SR19_DIRECTOR_STUDIO.js | Personality profiles, weighted personality settings, custom DM instructions and offline flavor exist. Personality is not a substitute for deeper simulation. |
| Unified gameplay loop | source/SR20_GAMEPLAY_ENGINE.js | Adventure action flow connects exploration, social, travel, survival, tactical intent and campaign objectives. |
| Player-stage hardening | source/SR21_PLAYTEST_HARDENING.js | Tutorials, skill/proficiency/Expertise calculation, challenge presets, objective safeguards, travel watches and legacy progression have tests. |
| Save integrity | source/SR22_SAVE_GUARD.js and source/SR22_LEGACY_LEDGER.js | Bounded save validation, normalized-copy restore, old-save compatibility and reward deduplication have focused tests. |
| Director-first adjudication | source/SR23_DUNGEON_MASTER.js | Local no-roll/check planner, action-intent handling, bounded event log, lexical/recency retrieval and connected-plan validation exist. |
| Connected AI DM client | source/SR24_CUSTOM_AI_DM.js | The Chronicler can call a configured gateway, validate a proposed ruling, and request narration after deterministic resolution. |
| AI gateway | worker/src/index.mjs and worker/wrangler.toml | Server-side provider adapters, allowlists, bounded request/response handling, health route and Durable Object rate limiter exist. Deployment and production identity/auth controls still need verification. |
| Multiplayer | inherited V18 transport and multiplayer tests | Protocol-handshake, shared-state and initiative regression coverage exist. Real two-device play and concurrency recovery still need verification. |

### 3.2 Test and release evidence

At the reviewed main commit:

- The full regression workflow completed successfully.
- The V18 hardening workflow completed successfully.
- The GitHub Pages deployment workflow completed successfully.
- The test runner rebuilds the standalone application and PWA, runs the legacy and newer regression suites, and checks release-output integrity.

This is evidence of automated regression and packaging success. It is **not** evidence that every D&D rule is implemented, game balance is proven, the Worker is deployed with a live provider secret, Android interaction is reliable, two-device multiplayer is sound, or a multi-session campaign is enjoyable.

The README and test reports explicitly retain these live-testing limitations.

### 3.3 Known architectural constraints

- The application evolved as additive layers over a V17 runtime. V18–V24 contain wrappers and compatibility adapters around older global functions.
- Some systems still depend on shared global state and UI-oriented call paths.
- Save Center storage is browser/device-local. JSON export/import exists; automatic cloud synchronization is not established.
- V23 campaign memory is a bounded event list with lexical/recency retrieval, not a canonical fact graph or full entity knowledge system.
- The offline Director relies on deterministic heuristics and pattern matching.
- The connected model proposes bounded plans and narration; the deterministic client remains authoritative for mechanics.
- The Worker is separate from static GitHub Pages hosting. Repository code and deployment instructions do not prove that the Worker has been deployed or configured with a production provider secret.

## 4. Critical audit findings to resolve first

### A0.1 — Reconcile natural 1 / natural 20 behavior

**Priority:** P0  
**Status:** Conflicting test expectations; runtime behavior requires a single-source audit.

The legacy V18 rules/campaign test contains assertions that a natural 20 automatically succeeds on ability checks and saving throws and that a natural 1 automatically fails. The newer V21 hardening tests assert that ability checks use the final total versus DC, without automatic natural-1/natural-20 success or failure. V23's design document also states that ability checks use the final total and that attacks and saves retain their own mechanic-specific rules.

This creates a conflicting verification contract. It is not sufficient to assume that one later wrapper makes all earlier behavior harmless.

**Required change**
1. Trace every d20 resolution path in the inherited rules layer and later adapters.
2. Define attack, ability-check, and saving-throw natural-roll behavior independently for each supported ruleset.
3. Update obsolete legacy self-tests rather than preserving incorrect expectations.
4. Add one shared rules test matrix exercised through direct services and the player-facing path.
5. Confirm spell saves, monster saves, class features, and manual overrides use the same authoritative resolution policy.

**Acceptance**
- A natural 1 on an ordinary ability check can still succeed when the final total meets the DC, unless a specific rule says otherwise.
- A natural 20 on an ordinary ability check does not automatically succeed if the final total is below the DC, unless a specific rule says otherwise.
- Attack-roll critical hit/miss behavior follows the selected ruleset.
- Saving throws follow their specific rules and are not accidentally treated as ability checks or attacks.
- Legacy and current test suites agree on the same ruleset behavior.

### A0.2 — Separate official DC guidance from Solo Realms challenge presets

**Priority:** P0  
**Status:** Two scales currently coexist.

The V23 Director and gateway use the typical 2024 DC ladder of 5, 10, 15, 20, 25 and 30. V21 exposes presets of 5, 8, 12, 16, 20 and 25.

The V21 values may remain as a custom challenge preset, but the UI and stored result must not present them as the official D&D scale.

**Required change**
- Add a canonical ruleset-owned DC reference.
- Keep the V21 preset as an explicitly labelled Solo Realms house-rule profile, or migrate it to the official ladder.
- Store whether a DC came from the ruleset, a DM override, or a house-rule preset.
- Preserve the reason and situational factors behind a selected DC.

**Acceptance**
- A 2024 campaign uses the official typical DC guidance by default.
- A legacy or custom campaign cannot silently change its DC profile after an update.
- Director, manual override, UI display and test fixtures agree on the same DC value and source.

### A0.3 — Label and isolate current house rules

**Priority:** P0  
**Status:** Present in code and design notes; campaign-level ruleset separation is not established as complete.

Examples include the V20 +1 class-identity edge, tactical cover/flanking modifiers, and V20/V21 travel fatigue mechanics.

**Required change**
- Add a campaign rules profile and explicit house-rule flags.
- Label each non-official mechanic in the character sheet, combat log and campaign settings.
- Do not apply a house-rule bonus in a strict rules profile.
- Record the selected profile in every new save and migrate old saves to a documented default.

**Acceptance**
- A strict 2024 test campaign applies no unselected Solo Realms bonuses.
- An Enhanced campaign applies only its enabled options.
- Toggling an option affects future resolutions only unless a specific migration is approved.
- Existing saves load without silently changing their rules behavior.

### A0.4 — Adopt a precise supported-content and licensing boundary

**Priority:** P0  
**Status:** SRD 5.2.1 reference attribution is documented; complete 2024 Player's Handbook and all-setting coverage is not established.

**Required change**
- Define the canonical supported rules source and version for each campaign.
- Track content provenance and license per data pack.
- Keep original Solo Realms content distinguishable from SRD-derived content and third-party open content.
- Do not treat the D&D encyclopedia PDF as a license to reproduce non-SRD sourcebook text, illustrations, adventures, or stat blocks.
- Provide a versioned rules/content pack manifest and attribution display.

**Acceptance**
- Every installed rules pack identifies source, version, license and checksum.
- The UI identifies which rules/content profile a campaign uses.
- Builds do not silently bundle unapproved content.
- Imported content is validated before entering campaign state.

## 5. Six-pillar implementation matrix

This matrix maps the D&D reference chapters to Solo Realms capability and work required.

### Pillar I — Core gameplay and foundations

**Reference chapters:** 1–4 and Appendices A–B.

| Capability | Current status | Required work |
|---|---|---|
| Fiction / mechanics / narration separation | Partial; Director-first separation exists | Formalize the pipeline and prohibit narration from changing outcomes. |
| DM and player agency | Partial; Chronicler prompt contracts cover agency | Add regression scenarios for railroading, assumed player speech, invented actions and hidden information. |
| d20 roll families | Partial | One typed service for ability checks, saves, attacks, contests, passive checks and no-roll outcomes. |
| Ability scores and modifiers | Implemented foundation | Add range/edge tests and verify every resolver reads the same character values. |
| 18 skills | Implemented foundation | Audit ability selection, unusual ability/skill combinations and all 18 skills through the player action path. |
| Proficiency and Expertise | Implemented foundation | Verify proficiency source precedence, stacking, multiclassing, tools and feature-granted bonuses. |
| Advantage / disadvantage | Implemented foundation | Add cancellation, multiple sources, rerolls/replacements, edge cases and deterministic seeded tests. |
| DC / AC | Partial | Separate DC and AC semantics; define modifier stacking and source trace. |
| Natural 1 / 20 | Conflicting test contract | Resolve under A0.1. |
| Contests, group checks and Help | Partial or unverified | Implement typed contest, group-check and Help procedures with ruleset tests. |
| Passive checks / Passive Perception | Partial or unverified | Implement supported passive scores, visibility modifiers and secret-check use. |
| Social interaction | Partial | Add 2024 Influence action and Friendly / Indifferent / Hostile starting attitude model. |
| Exploration procedures | Partial | Add light, vision, obscurity, noise, traps, searches, travel pace and navigation mechanics. |
| Combat loop | Partial | Complete initiative, surprise, rounds, turn ownership, action economy and combat termination. |
| Conditions | Partial | Central condition registry with exact effects, durations, stacking and expiration. |
| Damage and healing | Partial | Central typed damage pipeline; temporary HP, mitigation ordering, healing and overflow tests. |
| Death and recovery | Partial or unverified | Full 0 HP, death-save, stabilization, revival and recovery tests. |
| Rest and resource recovery | Partial | Implement exact rest eligibility, interruptions, resource refresh and time effects. |

**Acceptance tests**
- Every d20 action carries a typed mechanic, actor, target, relevant ability, proficiency source, modifiers, DC/AC, die result and final result.
- A player action cannot be resolved by two competing rule paths.
- No-roll actions do not create fake dice, objectives or rewards.
- A check is requested only when the fiction and selected ruleset support meaningful uncertainty.
- Specific-feature overrides are applied without corrupting the general rule.
- The player-facing combat log explains the final mechanical result and its modifiers.

### Pillar II — Character creation and mechanics

**Reference chapters:** 5–6 and relevant Appendix A sections.

| Capability | Current status | Required work |
|---|---|---|
| Twelve core classes | Implemented representation | Audit each class level and feature; do not equate class presence with complete class behavior. |
| Revised core subclasses | Partial / coverage unverified | Compare exact 2024 SRD subclass coverage with the PDF's broader 48-subclass reference; add supported entries and feature tests. |
| Character creation | Partial | Validate a complete 2024 creation sequence and persist all choices. |
| Species / lineage | Partial / coverage unverified | Complete supported species data, traits, movement, senses, size and feature interactions. |
| Backgrounds / origins | Partial / coverage unverified | Complete ability options, origin feats, proficiencies, equipment and background-specific effects. |
| Ability score generation | Partial / coverage unverified | Standard array, point buy and rolling options, with validation and campaign selection. |
| Feats | Partial / coverage unverified | Typed feat registry, prerequisites, level/feat category and mechanical effects. |
| Level advancement | Implemented foundation | Audit every level for HP, proficiency, resources, spell access, subclass features and feat/ASI choices. |
| Multiclassing | Partial / coverage unverified | Validate prerequisites, spell slots, proficiencies, features and level-specific interactions. |
| Equipment / armor / weapons | Partial | Canonical item schema, equip slots, armor calculations, weapon properties, mastery and inventory quantities. |
| Weapon Mastery | Partial / coverage unverified | Implement each supported mastery property and its trigger/condition/action constraints. |
| Tools | Partial / unverified | Tool proficiency, tool/skill combinations and craft/utility checks. |
| Conditions and resources on sheet | Partial | Show current effects and resource availability from canonical state, not duplicated UI state. |

**Acceptance tests**
- Build characters at levels 1, 2, 3, 4, 5, 8, 11, 17 and 20, plus class-specific unlock boundaries.
- Verify all 12 class progressions against the adopted source.
- Verify every supported subclass feature at its unlock level.
- Verify species/background/feat combinations and ability-score limits.
- Verify multiclass prerequisite failures and valid combinations.
- Verify level-up is atomic, repeat-safe and persisted.
- Verify class resources reset only on their actual recovery schedule.

### Pillar III — Magic and spellcasting

**Reference chapter:** 7.

| Capability | Current status | Required work |
|---|---|---|
| Spell reference library | Implemented foundation | Add schema/version/provenance validation and pack completeness reports. |
| Spell slots / casting | Implemented foundation with inherited V14 system | Audit every caster progression, multiclass interaction and slot expenditure. |
| Spell level and character level | Partial / unverified | Separate spell level, caster level, class level and upcast slot. |
| Prepared / known spells | Partial / unverified | Complete class-specific preparation, spellbook, replacement and access rules. |
| Spellcasting ability / DC | Partial | Central calculation using the active class/subclass feature and ruleset. |
| Components (V/S/M) | Partial / unverified | Enforce components, hands, focus, consumed materials and costly materials. |
| Casting time / action economy | Partial | Validate Action, Bonus Action, Reaction, ritual and longer casting times. |
| Range / targets / areas | Partial | Exact target selection, origin, geometry, line of effect, obstruction and legal target count. |
| Concentration | Partial | One-concentration limit, damage checks, incapacitation, replacement and duration expiration. |
| Duration / ongoing effects | Partial | Canonical effect records, start/end timing, turn order and save/load persistence. |
| Ritual casting | Partial / unverified | Implement eligibility, casting-time extension and slot behavior. |
| Upcasting | Partial | Spell-specific scaling rather than description-only dice inference. |
| Eight schools of magic | Reference and metadata partial | Store school as classification; do not treat school as an automatic mechanical effect. |
| Magic items / artifacts | Partial / unverified | Item charges, activation, attunement where supported, curses, saving throws and unique effects. |
| Weave / magical metaphysics | Reference-only | Setting-specific lore pack; should not be hard-coded as universal cosmology. |

**Required technical change**

Keep the existing spell resolver as a compatibility layer while introducing a versioned spell schema. The schema should encode casting time, level, school, range, target, components, material cost, duration, concentration, save/attack type, area geometry, damage/healing, condition, effects, scaling and explicit exceptions.

Use explicit handlers for spells whose behavior cannot be expressed safely through generic data. Description parsing should be a fallback or content-ingestion aid, not the authority for consequential mechanics.

**Acceptance tests**
- Every supported spell resolves its slot cost, target legality, range, components, duration and outcome.
- Concentration cannot be duplicated and ends under the exact selected rule.
- Upcasting changes only the fields defined by that spell.
- Area templates select only legal targets and respect geometry/obstruction.
- Damage types interact correctly with resistance, immunity and vulnerability.
- A spell effect survives save/load with correct remaining duration and ownership.
- Unsupported spell behavior is identified clearly instead of being silently approximated.

### Pillar IV — Multiverse, settings and official lore

**Reference chapters:** 8–11.

This pillar is primarily a content and setting architecture, not a reason to mix every D&D cosmology into one campaign.

| Capability | Current status | Required work |
|---|---|---|
| Monster / creature reference data | Implemented foundation via SRD pack | Add taxonomy, source metadata, completeness and trait-coverage reports. |
| Monster behavior and ecology | Partial | Connect creature type, habitat, motives, society, tactics and world simulation. |
| Forgotten Realms | Reference-only / not a complete setting system | Optional setting pack with geography, factions, pantheon, chronology and lore references. |
| Greyhawk | Reference-only | Optional setting pack and compatibility notes. |
| Eberron | Reference-only | Optional setting pack with distinct magic, technology, factions and geography. |
| Ravenloft | Reference-only | Optional setting pack for domains, darklords, horror tone and setting-specific constraints. |
| Planescape / Sigil / Outlands | Reference-only | Planar travel, portals, factions and planar traits as optional content/mechanics. |
| Dragonlance | Reference-only | Campaign setting pack, chronology and major setting elements. |
| Spelljammer | Reference-only | Spacefaring, spelljamming vessels, travel and setting-specific encounter support. |
| Dark Sun | Reference-only | Survival, scarcity, psionics and setting-specific rules profile where licensed/supported. |
| Mystara / Birthright / Nentir Vale / Exandria | Reference-only | Optional metadata/content packs; do not imply complete support until implemented. |
| Planes / Great Wheel | Reference-only | Versioned cosmology profiles; distinguish edition and setting variation. |
| Deities / pantheons | Reference-only / partial lore data | Deity registry, portfolios, relationships, clerical options and source provenance. |
| Historical events / iconic villains | Reference-only | Timeline and lore entries with source/version/canon distinctions. |

**Recommended design**

Create an optional Campaign Setting Pack system. Each pack should declare:
- Setting ID and edition/source scope.
- Cosmology profile.
- Regions, locations and stable entity IDs.
- Factions, organizations and relationships.
- Deities, pantheon data and religious options.
- Historical timeline and canon date.
- Setting-specific rules modules, if any.
- Content provenance and licensing.
- Compatibility with character options, spells and monsters.

Do not make the Forgotten Realms' Weave or Great Wheel assumptions universal to every setting. Store setting-specific metaphysics behind the setting profile.

**Acceptance tests**
- A campaign selects one setting profile at creation and stores its version.
- Two setting profiles can coexist without overwriting each other's canon.
- A setting-specific deity or faction does not appear in an unrelated setting unless deliberately imported.
- Planar travel validates available routes, destination rules and campaign continuity.
- Lore facts show source, edition/date and canon status.
- Unlicensed sourcebook prose/artwork is not bundled.

### Pillar V — Dungeon Mastering and worldbuilding

**Reference chapters:** 12–15.

| Capability | Current status | Required work |
|---|---|---|
| Director personalities | Implemented foundation | Keep profiles; add behavior evaluation and player-facing controls for mischief, tone and intensity. |
| Custom DM identity / instructions | Implemented foundation | Guard against instructions overriding rules, safety, canon or mechanics. |
| Natural-language action interface | Implemented foundation | Replace keyword-first routing with contextual typed intent interpretation. |
| No-roll / check adjudication | Partial | Add typed saves, attacks, contests, spell actions, time actions, clarification and unsupported outcomes. |
| AI narration | Partial | Add canonical fact grounding, visible state citation and stale response checks. |
| NPC memory and reactive behavior | Implemented foundation | Add knowledge provenance, observed vs heard facts, relationship dimensions and deterministic schedules. |
| Social interaction | Partial | Add 2024 Influence action, attitudes, motives, leverage, truthful/deceptive evidence and consequences. |
| Companion behavior | Partial | Add autonomy limits, individual goals, tactical preferences, trust and departure/return arcs. |
| Rival parties | Partial / unverified | Add party roster, capabilities, objectives, travel, progress and causal consequences. |
| Factions | Partial | Add resources, territory, plans, alliances, information channels and feasible action selection. |
| Settlements / economy | Missing as a complete system | Add services, supply, demand, prices, local power, infrastructure and economic events. |
| Challenge Rating / encounter balance | Partial | Add encounter builder, party thresholds, action-economy analysis, terrain and solo-monster adjustments. |
| Fixed campaign | Implemented foundation | Preserve the existing 20-chapter campaign and its progression tests. |
| Dynamic campaign generation | Partial | Generate a validated situation graph before play rather than only isolated quest prose. |
| Clue / revelation graphs | Missing as a complete system | Add redundant clue paths, evidence state, interpretation and provenance. |
| Dungeon topology | Missing as a complete system | Add spatial graph, loops, occupancy, hazards, routes, secrets and dynamic inhabitants. |
| Villain plans / clocks | Partial | Give antagonists goals, resources, agents, limits, information and deadline clocks. |
| World simulation | Partial | Immediate / regional / distant scheduler with reproducible, causal events. |
| Homebrew tooling | Missing as a complete authoring workflow | Validated creation tools for classes, features, spells, items, monsters, encounters and setting packs. |
| Session pacing / Session Zero | Partial / unverified | Campaign tone, boundaries, survival strictness, difficulty and DM behavior setup. |

**NPC data model requirement**

A significant NPC should have stable identity, personality, goals, fears, beliefs, resources, schedule, faction affiliations, relationships, observations, learned information and memory source events.

Relationships should not be reduced to one friendship number. At minimum, model trust, respect, affection, fear, suspicion, loyalty, gratitude and resentment as separately bounded values or typed relationship facts.

**Clue graph requirement**

Every important revelation should have multiple independent discovery paths. Store the truth, clues, sources, who knows each clue, who has interpreted it, who doubts it, and any contradictions. Failed checks may add cost or complications but should not erase the only path to essential campaign information.

**AI role requirement**

The player experiences one DM voice. Internally, the system may use bounded roles for intent interpretation, adjudication, NPC portrayal, situation planning, memory retrieval, narration and consistency validation. All state-changing commands must be typed, authorized, validated and committed by deterministic services.

### Pillar VI — D&D history, editions and the broader TTRPG ecosystem

**Reference chapters:** 16–19 and Appendix C.

| Capability | Current status | Required work |
|---|---|---|
| 2014/2024 rule distinction | Partial | Campaign-level ruleset profile, versioned rules sources and explicit compatibility adapters. |
| Historical editions (OD&D through 4e) | Reference-only | Optional educational Codex; not required for core gameplay. |
| 2014 Fifth Edition | Legacy foundation / compatibility unverified | Define an explicit 2014 profile and test actual rule differences. |
| 2024 Revised Fifth Edition | Current development target | Establish 2024 SRD 5.2.1 as the current supported baseline where applicable. |
| Pathfinder / OSR / narrative systems | Reference-only | Optional Codex entries; avoid importing mechanics into D&D campaigns by accident. |
| Licensing / SRD history | Documentation partial | Source and license registry for every data pack and imported content. |

**Acceptance tests**
- A campaign records its ruleset ID, content pack versions and house-rule selections.
- Loading a campaign after an update does not silently reinterpret its character or spell data.
- 2014 and 2024 mechanics can coexist in code without being combined accidentally.
- Historical/educational entries never modify gameplay.
- Every distributed content record has explicit provenance and licensing metadata.

## 6. Cross-pillar technical workstreams

These workstreams are prerequisites or shared foundations for several pillars.

### W01 — Domain boundary and transaction orchestration

**Priority:** P0  
**Maps to existing roadmap:** Phase 1  
**Current status:** Partial; V22 introduced namespaced pure save modules, but gameplay layers still use legacy wrappers/global state.

**Work**
- Inventory current global functions, wrapper order, state ownership and UI dependencies.
- Introduce versioned action request, adjudication plan, command, result and event contracts.
- Move rules calculations into pure or explicitly stateful services with declared inputs and outputs.
- Keep legacy globals as compatibility adapters during migration.
- Add transaction IDs, idempotency keys, campaign revisions and precondition validation.
- Move rendering, storage and notifications outside core rules resolution.

**Acceptance**
- Core rules modules do not read DOM values.
- A repeated request/retry cannot apply the same mutation twice.
- A failed model request cannot leave half-applied game state.
- Stale responses cannot overwrite a newer campaign revision.
- Existing saves and compatibility tests continue to pass.

### W02 — Director adjudication contract

**Priority:** P0  
**Maps to existing roadmap:** Phase 2  
**Current status:** Partial; V23/V24 provide local and connected check planning, but not all mechanics.

**Work**
- Replace keyword-first intent parsing with structured intent plus scene/context.
- Distinguish no-roll, ability check, saving throw, attack, contest, spell, resource/time action, clarification and unsupported action.
- Add feasibility and character-capability validation.
- Resolve pronouns, named targets, corrections, negation, quoted text and multi-step intent.
- Validate every model field against the campaign, ruleset and active state.
- Return one direct clarification only when essential information is genuinely missing.
- Provide structured failure consequences and partial outcomes where the system supports them.

**Acceptance**
- The Director does not route attacks or spell attacks into generic ability checks.
- Impossible actions are not made possible by a high roll.
- A routine action does not trigger an unnecessary check.
- Contradictory or ambiguous intents are clarified rather than guessed.
- Malformed/late/refused model responses fall back without mutating state.
- A seeded action-evaluation corpus measures intent and mechanic accuracy.

### W03 — Rules registry and authoritative rules services

**Priority:** P0  
**Maps to existing roadmap:** Phase 3  
**Current status:** Partial; multiple legacy systems exist, but a complete rules matrix and one authoritative service are not established.

**Work**
- Create a ruleset registry.
- Establish 2024 SRD 5.2.1 as the default supported rules baseline, with explicit limitations.
- Add mechanic result schemas for D20 tests, AC/DC comparisons, advantage, saves, attacks, damage, conditions, rests and progression.
- Separate official rules from house rules and DM overrides.
- Make seeded/random source injectable for tests.
- Add a rules matrix linking each mechanic to data, service, tests and known unsupported cases.

**Acceptance**
- Every supported mechanic is deterministic under a seeded test.
- Unit, boundary, invalid-input, integration and persistence tests exist.
- UI code does not own mechanical calculations.
- Rules explanations exactly match the committed mechanical result.
- Unsupported mechanics are surfaced, not silently approximated.

### W04 — Canonical campaign state, event history and memory

**Priority:** P0  
**Maps to existing roadmap:** Phase 4  
**Current status:** Partial; V18–V23 persistence and bounded events exist, but no full event/fact/knowledge model.

**Work**
- Add stable IDs for characters, NPCs, factions, places, items, clues, quests and situations.
- Introduce append-only, ordered domain events.
- Add campaign revision and provenance.
- Create fact/belief/observation records with status and visibility.
- Separate world truth, party knowledge, individual character knowledge and NPC knowledge.
- Add working, campaign, episodic, semantic/reflection and archive memory tiers.
- Add entity-, topic-, location-, recency- and importance-aware retrieval.
- Keep summaries linked to source event IDs.
- Add contradiction detection without deleting prior evidence.

**Acceptance**
- Every consequential state mutation has an event ID and cause.
- Every canonical fact has a source or a generated-world origin.
- An NPC cannot use information it could not plausibly know.
- A player theory is never promoted to fact without evidence.
- Long-session memory retrieval returns relevant context within bounded limits.
- Old saves migrate and round-trip without loss of canonical state.

### W05 — NPC, social, companion and rival simulation

**Priority:** P1  
**Maps to existing roadmap:** Phase 5  
**Current status:** Partial; V19 reactive behavior exists.

**Work**
- Add stable NPC identity and distinct goals, beliefs, resources, schedules and knowledge.
- Add directional relationship dimensions.
- Add deterministic observation and knowledge propagation.
- Add social adjudication using attitude, motive, stakes, leverage and prior events.
- Add companion autonomy with player-agency constraints.
- Add rival parties with goals, resources, travel and consequences.
- Add promises, debts, loyalty, betrayal, departure and return.

**Acceptance**
- Recurring NPCs remain coherent across save/load and long sessions.
- NPC responses respect knowledge limits and relationship history.
- Social success is not mind control.
- Companions do not select the player character's actions.
- NPC/rival plans are feasible and causally traceable.

### W06 — World, factions, settlements and scheduling

**Priority:** P1  
**Maps to existing roadmap:** Phase 6  
**Current status:** Partial; V18/V19 clocks, faction pressure and events exist.

**Work**
- Build immediate, regional and distant simulation levels.
- Centralize time and scheduled event advancement.
- Give factions goals, plans, resources, alliances, territory and information channels.
- Add settlement supply, services, economy and local power.
- Add travel-linked regional threats and rumor propagation.
- Advance antagonist plans only when time, resources and information permit.
- Make simulation ticks deterministic and idempotent.

**Acceptance**
- Ignored situations can evolve coherently.
- Every faction move has a cause, time and feasible resource cost.
- World changes are reproducible from a seed/event log.
- Reloading cannot double-advance time or faction actions.
- Players can inspect why a major event occurred.

### W07 — Situation, mystery, adventure and dungeon generation

**Priority:** P1  
**Maps to existing roadmap:** Phase 7  
**Current status:** Partial; fixed campaign and generation prompts exist, but validated graph-based campaign generation is not established.

**Work**
- Define situation graphs and state transitions.
- Define clue/revelation graphs with provenance and redundant discovery paths.
- Build villains with plans, resources, limitations and clocks.
- Generate connected scenes, encounters and locations.
- Generate dungeon topology with loops, occupancy, factions, hazards and routes.
- Connect personal, companion, faction and main campaign arcs.
- Validate generated campaign packages before play.
- Support branching transformations and multiple endings.

**Acceptance**
- A generated campaign package passes schema and consistency validation before the opening scene.
- Every critical revelation has multiple independent discovery paths.
- No single skill check, NPC or mandatory player phrase blocks essential progress.
- Geography, faction goals, clues and NPC motives are causally connected.
- Player choices can materially alter situations and endings.
- A campaign seed remains stable after save/load.

### W08 — Exploration, travel, survival, downtime, crafting and strongholds

**Priority:** P1  
**Maps to existing roadmap:** Phase 8  
**Current status:** Partial; V20/V21 implement watch-based travel, supply consumption, fatigue, rest and gathering foundations.

**Work**
- Add routes, terrain, elevation, weather, navigation and travel encounters.
- Add dungeon turns/procedures, lighting, vision, noise, traps and environmental hazards.
- Add rest eligibility, interruption, recovery and resource refresh.
- Add gathering, foraging, hunting, fishing, cooking, repairs and validated crafting recipes.
- Add downtime projects with time, cost, interruptions and progress.
- Add stronghold facilities, staff, defenses, supplies and regional influence.
- Make relaxed and strict survival campaign options explicit.

**Acceptance**
- Time and supply accounting is consistent across UI, rules and world state.
- Travel can be paused, interrupted and resumed without duplicate costs.
- Crafting consumes exactly the validated ingredients and time.
- Rest refreshes only permitted resources.
- Downtime projects persist and resume correctly.
- Stronghold and settlement changes appear in canonical state and journal.

### W09 — Conversation-first player experience

**Priority:** P1  
**Maps to existing roadmap:** Phase 9  
**Current status:** Partial; V23 moved the Adventure action flow toward natural language.

**Work**
- Center Adventure on current scene, relevant narration, dialogue and one action input.
- Keep advanced mechanics controls accessible but collapsed.
- Show mechanical rulings when relevant and detailed math on demand.
- Add contextual affordances for maps, parties, NPCs, clues, objects and combat.
- Distinguish NPC voices without compromising canonical facts.
- Redesign Journal into facts, rumors, clues, commitments and unresolved questions.
- Align Adventure, character sheet, map, journal and combat with the same canonical state.
- Audit mobile layout, touch targets, accessibility and offline PWA operation.

**Acceptance**
- A new player can complete a meaningful session without operating mechanical selectors.
- Normal gameplay is natural-language-first.
- Advanced controls remain available for rules-focused players and house rules.
- Every screen displays the same committed state.
- Desktop, mobile and PWA behavior is consistent.

### W10 — Connected Chronicler service and production operations

**Priority:** P1  
**Maps to existing roadmap:** Phase 10  
**Current status:** Partial; V24 client and Worker code exist, but deployment/configuration and production identity/auth controls require verification.

**Work**
- Confirm Worker deployment and health in the actual production environment.
- Keep provider credentials server-side.
- Add user/session authentication and campaign-scoped authorization; CORS is not authentication.
- Retain route/task allowlists, request validation and rate limits.
- Add per-user and per-campaign quotas, cost controls and call telemetry.
- Add request IDs, timeouts, retries, stale-revision handling and safe fallbacks.
- Redact secrets and unnecessary personal data from logs.
- Evaluate each provider/model against the same seeded DM scenario corpus.
- Make local mode visibly available whenever the gateway is offline.

**Acceptance**
- No provider secret appears in client files, generated outputs or browser storage.
- Unauthenticated or unauthorized users cannot consume another user's campaign context.
- Malformed, refused, timed-out or stale calls cannot mutate committed state.
- Costs and usage are measurable and bounded.
- Local/offline play remains complete for supported mechanics.
- Provider changes do not require a save migration.

### W11 — Co-op multiplayer and shared-world authority

**Priority:** P2  
**Maps to existing roadmap:** Phase 11  
**Current status:** Partial; transport and regression coverage exist; real concurrent sessions remain unverified.

**Work**
- Define player identity, character ownership and permissions.
- Add authoritative command ordering and campaign revision checks.
- Synchronize committed state and event history.
- Separate private, character, party and public knowledge.
- Define turn/scene ownership and group response behavior.
- Handle disconnect/reconnect, duplicate requests and conflicts.
- Add two-device and multi-session test scenarios.

**Acceptance**
- Reconnect/retry cannot duplicate actions, rolls, rewards or mutations.
- All clients observe the same committed public state.
- Private character knowledge is not leaked.
- Concurrent commands resolve deterministically or return a clear conflict.
- Real two-device sessions pass documented manual tests.

### W12 — Human evaluation, balance and release quality

**Priority:** P2  
**Maps to existing roadmap:** Phase 12  
**Current status:** Automated testing foundation exists; human/device validation remains outstanding.

**Work**
- Playtest with first-time, familiar, experienced and rules-focused players.
- Run multi-session campaigns across multiple regions and story arcs.
- Probe unusual creative actions, edge cases, loopholes and adversarial input.
- Evaluate pacing, memory, fairness, NPC acting, player agency, combat and rewards.
- Test Android/desktop/PWA installation, offline behavior, updates, import/export and recovery.
- Test real multiplayer if enabled.
- Publish known limitations rather than implying untested completeness.

**Acceptance**
- No critical save, data-integrity or security defects.
- No known duplicate-roll/reward exploit.
- Rules accuracy meets the published support matrix.
- Human players can sustain a coherent multi-session campaign.
- New players can act without a rules tutorial.
- Desktop/mobile builds pass real-use testing.
- Deferred features are clearly labelled.

## 7. Recommended implementation sequence and gates

The existing roadmap's dependency order should remain authoritative. The following gates make it operational against the V24 code baseline.

| Gate | Work | Completion requirement | Depends on |
|---|---|---|---|
| G0 | Audit baseline | Feature inventory, ruleset policy, known-defect list, content provenance | Current V24 main |
| G1 | W01 architecture boundary | Explicit APIs, transaction IDs, idempotency, adapters retained | G0 |
| G2 | W02 Director contract | Typed action intents and safe fallback across all supported action types | G1 |
| G3 | W03 rules authority | Unified rules services and rules matrix; A0.1–A0.3 closed | G1 |
| G4 | Character + combat completion | Supported character features, action economy, combat and conditions tested | G3 |
| G5 | Spell + monster completion | Structured schemas and specialized handlers for supported content | G3, G4 |
| G6 | W04 canonical memory | Facts, provenance, entity IDs, revisions, events and migrations | G1 |
| G7 | W05/W06 simulation | NPC/faction autonomy using canonical facts and scheduled actions | G6 |
| G8 | W07 campaign generator | Validated situations, clue graphs, villains and dungeons | G6, G7 |
| G9 | W08 world activities | Travel, survival, exploration, downtime and crafting share one clock/state | G3, G6 |
| G10 | W09 player experience | One coherent UI over canonical services | G2–G9 |
| G11 | W10 production AI | Authenticated deployed gateway and seeded model evaluation | G1, G2, G6 |
| G12 | W11 multiplayer | Shared authority and real-device/concurrency validation | G1, G4, G6 |
| G13 | W12 release validation | Human playtests and all release gates complete | G0–G12 |

Work that does not violate dependencies—such as data cataloguing, spell schema design, content provenance and test-corpus preparation—can proceed in parallel. Do not implement downstream autonomy by bypassing incomplete rules, memory or transaction foundations.

## 8. First implementation sprint: concrete backlog

These are the first tasks to execute, in this order.

### S0.1 — Produce the rules discrepancy inventory
- Search all active and legacy paths for d20 roll handling.
- Record every natural-1/natural-20 branch.
- Identify obsolete self-tests and superseded wrappers.
- Publish one authoritative rules matrix for checks, saves and attacks.
- Add failing tests for every known discrepancy before changing behavior.

**Done when:** every roll path is assigned to a mechanic and ruleset, and tests agree.

### S0.2 — Introduce the campaign ruleset contract
- Add ruleset ID, rules source/version and house-rule selections to campaign state.
- Add migration defaults for older V3/V17/V18/V21/V22/V23 saves.
- Keep rules profile separate from UI preferences and AI personality.
- Label class edge, cover/flank variants and survival fatigue as house rules.

**Done when:** old saves migrate deterministically and strict 2024 campaigns do not receive unselected house rules.

### S0.3 — Define typed mechanic requests and results
- Define no-roll, ability check, saving throw, attack, contest, spell, resource/time action, clarification and unsupported action.
- Include actor, target, context, action economy cost, ruleset and expected campaign revision.
- Define result fields and failure/consequence envelope.
- Ensure only the authoritative rules service commits state.

**Done when:** every current Director action maps to one typed mechanic or a clear unsupported/clarification response.

### S0.4 — Extract the first authoritative services
- Ability modifier and proficiency calculation.
- Ability check and saving throw resolution.
- Advantage/disadvantage handling.
- DC and attack comparison.
- Condition application/expiry.
- Damage mitigation order.

**Done when:** services can be tested without a browser and existing callers use compatibility adapters.

### S0.5 — Build a representative end-to-end rules corpus
Include at minimum:
- Routine action: no roll.
- Feasible hard action: ability check.
- Impossible action: no roll and no false success.
- Natural 1/20 ability check.
- Natural 1/20 attack.
- Successful/failed saving throw.
- Contest and group check.
- Advantage/disadvantage cancellation.
- Proficiency and Expertise.
- Specific-feature exception.
- Condition applied and expired.
- Resistance, immunity and vulnerability.
- Save/load round-trip after each meaningful state change.

**Done when:** deterministic results and player-visible explanations agree for every scenario.

### S0.6 — Establish the rules coverage dashboard
- List every mechanic in the PDF's Parts I–III and Appendices A–B.
- Map each to code owner, content schema, status, unit tests, integration tests and persistence tests.
- Display unsupported mechanics and known approximations.
- Prevent a feature from being called complete while required test categories are missing.

**Done when:** every core rule has a traceable implementation status and an owner.

## 9. Definition of done for every feature

A work item can be marked **Implemented** only when all applicable criteria are met:

1. **Source:** a named module owns the behavior and has a documented API.
2. **Rules:** the behavior matches the campaign's selected ruleset or is explicitly labelled a house rule.
3. **Data:** all required data is schema-validated and versioned.
4. **Determinism:** random outcomes can be seeded or injected in tests.
5. **Edges:** boundary conditions, invalid inputs, exceptions and competing effects are tested.
6. **Integration:** the feature works through the real player-facing action path.
7. **Persistence:** state survives save/load/export/import and migration.
8. **Authority:** AI/narration cannot bypass the rule or mutate state without validation.
9. **Usability:** results and unsupported cases are understandable to the player.
10. **Release:** generated standalone/PWA/Pages outputs contain the same tested implementation.

If a feature has code but lacks one or more required categories, mark it **Partial** or **Needs live verification**, not complete.

## 10. Global non-negotiable invariants

- The deterministic game engine is the sole authority for dice, character statistics, HP, damage, spell slots, inventory, rewards, progression and campaign state.
- The Director may propose; services validate and execute.
- Narration describes committed outcomes and cannot invent a mechanical result.
- Every consequential mutation is repeat-safe and attributable to an action/event.
- Player hypotheses, rumors, NPC beliefs and confirmed facts remain distinct.
- NPCs only act on information they could reasonably know.
- A creative action cannot bypass capability, range, resources, prerequisites or action economy merely because the player describes it persuasively.
- A failed roll should not arbitrarily close every route to essential information.
- House rules are visible, optional and persisted in the campaign profile.
- 2014 and 2024 behavior remain explicitly versioned.
- Old saves are migrated safely; invalid imports cannot replace the active campaign.
- Offline mode remains playable and does not depend on a model provider.
- Provider failure, latency or a stale response cannot corrupt or overwrite a newer game state.
- The project never equates automated assertions with proven balance, enjoyment or human usability.

## 11. Cross-reference to the Complete Master Reference PDF

The PDF is the curriculum and rules subject map. This backlog is the implementation translation.

| PDF section | Solo Realms workstream |
|---|---|
| Part I, Ch. 1 — What D&D Is | W01, W02, W09 |
| Part I, Ch. 2 — Dice, D20 Tests, Probability | A0.1, A0.2, W03 |
| Part I, Ch. 3 — Three Pillars | W02, W05, W08, W09 |
| Part I, Ch. 4 — Combat and Action Economy | W03, W04, W05; combat completion |
| Part II, Ch. 5 — Character Creation | Character creation work in Pillar II |
| Part II, Ch. 6 — Character Mechanics | Character, equipment, condition and progression work |
| Part III, Ch. 7 — Magic and Spellcasting | Spell schema and spell resolver work in Pillar III |
| Part IV, Ch. 8 — Cosmology and Planes | Setting packs in Pillar IV |
| Part IV, Ch. 9 — Major Campaign Settings | Setting packs in Pillar IV |
| Part IV, Ch. 10 — Deities and Mythic Figures | Lore/deity registry in Pillar IV |
| Part IV, Ch. 11 — Monster Lore and Taxonomy | Bestiary, monster schema and world simulation |
| Part V, Ch. 12 — DM Operating System | W02, W05, W07, W09, W10 |
| Part V, Ch. 13 — CR and Encounter Balance | Combat/encounter builder and balance evaluation |
| Part V, Ch. 14 — NPCs, Factions and Improvisation | W05, W06 |
| Part V, Ch. 15 — Worldbuilding and Homebrew | W07, W08, setting/content authoring |
| Part VI, Ch. 16–19 — History, Editions, TTRPG Ecosystem and Licensing | Ruleset profiles, Codex and content provenance |
| Appendix A — Quick Reference | Rules registry and player-facing quick reference |
| Appendix B — Glossary | In-game Codex glossary |
| Appendix C — Research Sources | Source/version/provenance registry |

## 12. Scope boundaries and non-goals

- This backlog targets the supported 2024 SRD rules baseline first. It does not claim that the application can legally or mechanically reproduce every option in every D&D sourcebook.
- 2014 compatibility is a separately versioned profile, not a mixture of old and revised rules.
- Historical editions and broader RPG systems are optional reference/Codex content, not a reason to destabilize the current campaign engine.
- Setting packs should be modular and distinguish edition/canon differences.
- The application should not simulate every NPC every second or require an AI call for every world tick.
- Do not rewrite the full monolithic runtime in one release. Migrate one domain boundary at a time and preserve adapters until tests prove they can be removed.
- Do not add more Director personality controls as a substitute for campaign facts, NPC autonomy, rules correctness or evaluation.
- Do not call the connected Director production-ready until the Worker is deployed, authenticated, monitored and cost-controlled.

## 13. Evidence and repository references

The implementation status in this document is based on the repository's tracked source, tests and design notes at the audit baseline.

Primary files:
- README.md
- ARCHITECTURE_V22.md
- SOLO_REALMS_COMPLETE_END_DESIGN.md
- SOLO_REALMS_IMPLEMENTATION_ROADMAP.md
- SOLO_REALMS_TARGET_TECHNICAL_ARCHITECTURE.md
- V18_SYSTEMS_DESIGN.md
- V18_TEST_REPORT.md
- V20_GAMEPLAY_DESIGN.md
- V21_PLAYTEST_REPORT.md
- V23_DM_DESIGN.md
- CUSTOM_AI_DUNGEON_MASTER.md
- source/SR18_SYSTEMS_LAYER.js
- source/SR19_DIRECTOR_STUDIO.js
- source/SR19_REACTIVE_WORLD.js
- source/SR20_GAMEPLAY_ENGINE.js
- source/SR21_PLAYTEST_HARDENING.js
- source/SR22_SAVE_GUARD.js
- source/SR22_LEGACY_LEDGER.js
- source/SR23_DUNGEON_MASTER.js
- source/SR24_CUSTOM_AI_DM.js
- worker/src/index.mjs
- tests/run_v18.sh
- tests/solo_realms_v18_rules_campaign_test.cjs
- tests/solo_realms_v18_systems_test.cjs
- tests/solo_realms_v20_gameplay_test.cjs
- tests/solo_realms_v21_hardening_test.cjs
- tests/solo_realms_v21_stress_test.cjs
- tests/solo_realms_v22_data_integrity_test.cjs
- tests/solo_realms_v23_director_test.cjs
- tests/solo_realms_v24_ai_dm_test.mjs
- tests/solo_realms_v24_gateway_test.mjs

Primary official reference for the current open rules baseline:
- D&D Systems Reference Document 5.2.1: https://www.dndbeyond.com/srd
- 2024 Basic Rules: https://www.dndbeyond.com/sources/dnd/br-2024
- 2014 Basic Rules: https://www.dndbeyond.com/sources/dnd/basic-rules-2014
- Official Sage Advice and Errata: https://www.dndbeyond.com/sources/dnd/sae

The Complete Master Reference PDF is a subject map and research companion. Where a specific mechanic or setting detail affects implementation, the adopted official rules source and its current errata control the actual rules contract.

---

**Current recommendation:** Execute S0.1 through S0.6 before starting another major gameplay feature. Once the rules matrix, authoritative service boundary and campaign ruleset contract exist, subsequent features can be added without increasing the risk of conflicting mechanics or fragmented state.
