# V18 system design notes

## Architecture

V18 is additive: `source/solo_realms_v17.js` is assembled with `source/SR18_SYSTEMS_LAYER.js` by `tools/build_v18.py`. The main HTML is regenerated from the combined source as one inline script and the retained V17 HTML shell in `backup/previous_release_htmls/`. The PWA is derived from the same standalone output, adding only install metadata and service-worker registration, so both builds use identical application code. The new Save Center uses a separate IndexedDB database so it does not overwrite the inherited rules-library object store.

## Spell resolver

The V14 structured spell resolver remains the base for casting costs, spell slots, target selection and common combat resolution. V18 wraps the effect classifier to infer additional semantic categories from spell descriptions and structured SRD fields. This means effect coverage is broad and content-driven, but not equivalent to a manually authored implementation of every individual spell. Complex spells involving bespoke geometry, summoned creature autonomy, long-term downtime, exact transformations, or multiple nested effects may need more specialized handlers.

Typed spell damage in solo encounters now flows through `sr12ApplyDamage`, matching the resistance/immunity/vulnerability logic used in shared encounters. The effect record tracks concentration, duration and several common buffs/defenses. Upcasting reuses V14's published text logic first, then applies a narrow fallback for common dice-per-slot-level descriptions.

## Monster turn controller

When a creature has a structured `statBlock`, V18 selects among its named actions and can expand Multiattack into the referenced action sequence. Action execution handles range, line of sight, attack rolls, save DCs, damage type, half damage on successful saves where stated, recognized conditions and condition immunity. Recharge state is rolled between rounds. Legendary actions are selected from the creature's own action data and spend listed action costs. Reaction mitigation and morale are generic behavior layers, not bespoke scripts for every creature.

The parser depends on recognizable stat-block wording and structured data. A creature with missing or nonstandard action fields can fall back to the earlier generic enemy controller. The rules are not a replacement for a complete tabletop rules audit.

## Improvisation

The classifier maps language patterns to broad action families. It proposes skill, DC, consequence and alternate approaches, while the core resolver still handles the character check. It does not auto-grant unlimited spell effects, equipment or resources. Text that does not match a known family falls through to the prior free-form Director. The resulting procedural Director is useful for a no-human-DM experience but is not a cloud LLM and does not have open-ended semantic understanding.

## Living world

A campaign-scoped `sr18` object stores its own clock, factions, pressure clocks, rumors, events, action ledger and rival group state. It is initialized without replacing prior campaign fields. Travel, long rests and classified actions advance the world. When a pressure clock fills, the system creates an optional event rather than automatically forcing an encounter. NPC and companion records carry persistent goals, fears, principles and relationship/memory data.

## Save system

The Save Center uses database `solo-realms-v18-save-archive` with `slots` and `recovery` object stores. Manual slots are numbered 1–8; recovery snapshots rotate through six keys. If IndexedDB writes fail, smaller manual saves and the latest recovery snapshot fall back to localStorage. Imports are size-limited and structure-validated before state replacement. Loading another save writes the current campaign to recovery first.

The Save Center is local to the current browser/device. It is not cloud sync. Users should export JSON backups before clearing site data or switching devices. Old slot import is best-effort and only applies to known V3/V17 keys whose data validates against current character structure.

## Multiplayer compatibility

V18 increments the authenticated transport protocol from 19 to 20 and peer ID prefix from `sr19` to `sr20`, preventing mixed-version clients from sharing the same rooms. The V15 class-resource protocol remains its own independent version marker.
