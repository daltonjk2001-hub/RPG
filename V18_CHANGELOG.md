# Solo Realms V18 changelog

## Five development priorities completed in this build

### 1. Expanded spell rules engine
- Added data-driven spell effect inference using both structured fields and spell-description language.
- Improved classification for damage, saving throws, attack spells, area templates, damage types, healing, revival, conditions, summoning, teleportation, cleansing, resistance, invisibility, armor, temporary hit points and buffs.
- Added persistent utility-effect records, concentration tracking, duration ticking, AC effects, speed and roll bonuses, temporary HP upkeep, party-targeted companion effects and description-based upcasting fallback.
- Fixed the solo spell-damage path to use typed damage, so resistances, immunities and vulnerabilities apply there as well as in multiplayer.

### 2. Expanded monster combat
- Uses structured stat-block actions instead of relying only on a generic attack.
- Parses named mixed Multiattack patterns, including compact 2024 wording such as two Claw attacks and one Bite attack.
- Resolves attack rolls, saving throws, damage types, conditions, area actions, recharge, legendary actions, reaction-based damage reduction and morale.
- Prevents a multiattack sequence from consuming extra movement once per individual attack.
- Corrected the single-player movement helper call.

### 3. Improvisation and unusual actions
- Added classified approaches for tools, environment, animals, arcane experiments, deception, escape, stealth, performance and research.
- Each approach provides a fitting ability check, DC, success/failure framing and alternate choices.
- The Director's system guidance explicitly preserves player agency and does not secretly undo a successful bypass of a planned encounter.

### 4. Persistent living campaign
- Persists a campaign clock, faction goals and pressure, progress clocks, rumors, events and a bounded action ledger.
- Adds distinct NPC motives, fears, principles, memory and relationship changes.
- Tracks companion goals, fears, values and relationship memories.
- Advances an independent rival adventuring party and schedules optional consequences.
- Exposes current simulation state to the Director context and Journal.

### 5. Save management and recovery
- Adds eight manual slots backed by IndexedDB, with a localStorage fallback for smaller snapshots.
- Adds a six-entry automatic recovery ring and a latest-snapshot fallback.
- Adds validated restore, portable JSON export/import, individual slot deletion and recovery UI.
- Reads compatible V3/V17 localStorage slots where available.
- Preserves the active campaign by writing a recovery point before loading another save.

## Compatibility
- The prior 20-chapter campaign, rules-reference installer, character progression and class resource systems are retained.
- V18's multiplayer protocol is 20 and uses the `sr20` peer namespace. V17 peers are deliberately not handshake-compatible.
- The PWA service-worker cache namespace is `solo-realms-systems-v18`.

## Scope note
V18 is an expanded procedural rules engine. It does not claim a hand-coded bespoke implementation for every spell, creature trait or optional rule in the tabletop game. Some unusual spell effects and monster traits still fall back to generic adjudication and need campaign playtesting.


## V18.1 — Packaging and reproducible-build maintenance

- Fixed the build input path: the V17 HTML shell is loaded from `build-inputs/Solo_Realms_V17_Main.html`, where it is actually packaged.
- Made both the standalone HTML and PWA regenerate from the same tracked V17 shell and assembled V18 runtime.
- Ensured the PWA embeds the exact same application script as the standalone build; PWA-only metadata and service-worker registration are added separately.
- Corrected the README attribution link to `V18_ATTRIBUTION.md`.
- Updated the regression runner to rebuild before testing and verify build parity, manifest, service-worker registration, icons and attribution paths.
- No gameplay logic or save format changes are intended in this maintenance release.
