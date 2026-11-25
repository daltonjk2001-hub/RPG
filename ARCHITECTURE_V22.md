# Solo Realms V22 — data integrity and runtime module boundaries

## Why this change

The runtime evolved as additive layers over the V17 base. That preserved existing saves and rules, but encouraged later features to wrap or replace global functions. Those wrappers make initialization order and regression diagnosis harder.

V22 begins a gradual separation with two cohesive modules that own their own data rules. It does not attempt a high-risk rewrite of the entire legacy runtime.

## Module boundaries

### `source/SR22_SAVE_GUARD.js`

- Accepts an imported/save object and the character schema as explicit inputs.
- Validates the serialized object graph, depth, node count, string size, numeric safety, reserved keys, and selected collection bounds.
- Confirms the required character/campaign shape, class/ancestry keys, ability scores and level.
- Returns a normalized copy; it never mutates the supplied save or live global game state.
- Keeps the existing V3/V17 compatibility path for optional campaign collections and trims the restored chronicle to the same 300-entry bound used by gameplay.

The V18 function `sr18ValidateSave` remains as a compatibility adapter for existing Save Center, slot and import call sites. It delegates to the namespaced V22 validator rather than owning validation rules.

### `source/SR22_LEGACY_LEDGER.js`

- Owns migration and exact-ID claims for level-20 legacy rewards.
- Migrates IDs present in the older milestone list into a persistent `awardedIds` map.
- Uses a prefixed key namespace and a null-prototype map to avoid special object-property names.
- Persists the complete deduplication ledger in the character save.
- Leaves `milestones` as a compact, visible 100-entry history.

The V21 functions `sr21EnsureLegacy` and `sr21AwardLegacyXP` remain compatibility adapters. They retain the existing rank/title calculations and user-visible return shape while delegating ledger migration/claims to V22.

## Import and restore policy

1. Enforce the 12 MB file limit before reading an uploaded file.
2. Validate the untrusted save structure before touching the active campaign.
3. Deep-copy and normalize only after the structure has passed bounds checks.
4. Preserve the existing pre-restore recovery snapshot requirement.
5. Replace live state only after validation and recovery succeed.

Unknown or malformed nested lists are rejected where their shape is part of the persisted contract. Optional V3/V17 campaign collections retain their historical empty-list fallback.

## Module policy for future changes

New systems should prefer:

- A namespaced module with a small, explicit API.
- Pure helpers that take state/schema as arguments and return a result.
- Explicit integration adapters at the boundary with older call sites.
- Tests that call module behavior directly as well as through the player-facing path.

New modules should not assign to `window`, `globalThis`, or replace existing gameplay functions as a way to register behavior. When older wrappers are changed, migrate one boundary at a time and retain regression coverage around initialization, save compatibility, and public/test interfaces.

## Next refactor candidates

The remaining legacy wrappers should be migrated incrementally, starting with screen rendering metadata and the save/recovery lifecycle, then world simulation and the gameplay action pipeline. Those changes need separate tests because they cross rendering, timing, and persistent-state boundaries. V22 intentionally does not claim that all older global wrappers have already been removed.


## V23 Director-first action pipeline

### SR23_DUNGEON_MASTER.js

V23 moves adjudication to the Director while preserving the V18/V21 deterministic rules engine:

- The primary player input is natural-language intent; normal play no longer requires the player to select a mode, skill, DC, or roll state.
- Intent classification is ordered and accounts for negated actions.
- Routine and unopposed tasks generally resolve without checks; meaningful uncertainty uses a provisional skill and the SRD 5.2.1 DC ladder.
- Safe travel and rests still advance world time and use existing resource rules.
- Existing V21 mechanics remain authoritative for rolls, character bonuses, NPC/faction updates, objectives, and world state.
- A bounded campaign.sr23.events log records actions and outcomes; lexical/recency retrieval supplies a small continuity window.
- Optional configured AI can narrate the already-resolved outcome. It has no authority to change numbers, rewards, inventory, damage, objectives, or campaign state.

V23 currently uses a compatibility adapter around the V20/V21 function boundary. The long-term refactor should move the resolver into a separately testable orchestration API and reduce reliance on global function replacement, without breaking existing game entry points.

### Save contract

The V22 save guard now accepts older saves without campaign.sr23, while validating the optional campaign.sr23.events list against a 240-event bound. Existing character/campaign schemas and prior save versions remain in place.

### Explicit limitations

The first V23 phase is not a fully autonomous AI campaign planner. It does not replace the dedicated combat attack/spell systems, add a hosted AI proxy, or implement a complete entity/fact knowledge graph. Automated tests cannot substitute for human playtests, touch-device checks, or real multiplayer sessions. See V23_DM_DESIGN.md for the adjudication principles, research references, and next-phase roadmap.
