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
