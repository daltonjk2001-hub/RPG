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


## V18.1.1 — Existing-system hardening

- The build now regenerates `docs/` as an exact mirror of canonical `pwa/` output for GitHub Pages.
- The PWA regression suite checks that every deployable file exists in both directories with byte-for-byte identical contents.
- Updated architecture and project-layout documentation to reflect the actual `build-inputs/` template path and generated publication directory.
- No gameplay logic, multiplayer protocol, or save format changes.


## V18.1.2 — Cross-system reliability hardening

- IndexedDB initialization now clears a failed cached connection promise so a later save operation can retry; stale database connections are closed on version changes.
- Campaign restore now stops if it cannot first create a recovery snapshot of the active campaign, preventing a failed backup from silently preceding a destructive load.
- Monster attack parsing recognizes ranged stat-block attack wording and normal/long range bands; ranged attacks no longer trigger melee-only Parry reactions.
- Recharge-use tracking is applied to individual resolved actions in solo and multiplayer Multiattack sequences.
- Added regression assertions for ranged attack parsing, Parry behavior and recharge cooldown state, plus a dedicated transient IndexedDB-open recovery test.
- Added a GitHub Actions workflow to rebuild the release and run the complete regression runner on hardening-branch pushes and pull requests.
- No save schema, campaign field, spell rule, character progression rule or multiplayer protocol version changes are intended.


## Director Studio evolution — V19

- Added nine distinct DM starter profiles and eight editable personality influences.
- Added custom DM identity/instructions and controls for narration length, DM initiative, NPC complexity and player agency.
- Applied the selected personality to connected generative prompts, campaign context, and offline narration/chat voice.
- Added bounded campaign-memory and recent-DM-conversation context.
- Kept V18 authoritative for dice, rules, character state, damage and rewards.
- Preserved existing quick profiles and mapped them to equivalent personality blends.
- Added regression tests for profile selection, normalization, prompt behavior, UI controls and offline mechanical invariants.
