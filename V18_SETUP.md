# Solo Realms V18 setup guide

## 1. Run the single-file game

Open `Solo_Realms_V18_Main.html` in Chrome, Firefox, Edge or another modern browser. The main HTML contains the application runtime inline and does not need a package manager or JavaScript CDN to start. Browser storage is used for the current campaign and preferences.

For more reliable downloads, offline caching and Android installation, use the PWA build instead of opening the file from a Downloads folder.

## 2. Install the PWA

1. Upload the **contents** of the `pwa/` folder to an HTTPS static host. GitHub Pages is one option.
2. Open the hosted `index.html` in Chrome on Android.
3. Use the browser's Install app / Add to Home screen action.
4. Launch Solo Realms from the installed app icon.

The service-worker cache name is derived from the published app shell, manifest, and icons. Each changed build gets a distinct cache, so installed copies pick up the new application and remove the stale Solo Realms cache after activation.

## 3. Install the free rules reference

1. Be online for the initial download.
2. Open **More → Rules & Settings → Rules Guide**.
3. Choose **Install free library**.
4. Wait for the install completion message. The pack is cached locally in IndexedDB.
5. Open **Spells** or **Bestiary** to browse the installed content. The existing V17 Markdown downloads remain available for spells, the bestiary, and the combined rules reference.

The library installer uses the versioned reference URLs already present in the V17 resource layer. If the upstream repository changes its branch or file structure again, the installer reports a failure; it does not pretend missing files were installed.

## 4. Campaign and save management

Use the **Save Center** button in the top bar.

- **Save here** writes the active campaign to one of eight independent manual slots.
- **Load** validates a slot before replacing the active campaign. The current campaign is written to recovery first.
- **Delete** removes only the selected slot.
- **Recover latest autosave** loads the most recent recovery snapshot from the six-entry recovery ring or local fallback.
- **Download campaign backup (.json)** creates a portable campaign file.
- **Import campaign backup** validates the file before restoring it.

V18 can read the V3/V17 localStorage slot formats when the old slot data exists and passes validation. The V22 validator checks character identity and ability ranges, bounds nested arrays and serialized data, rejects cyclic/reserved-key structures, and normalizes optional older campaign fields on a copy before restore. Failed or malformed imports do not replace the active campaign. Keep exported JSON backups before clearing browser data or changing devices. Browser-local IndexedDB is not synchronized between devices.

## 5. Rules and combat behavior

- Spell effects are inferred from structured reference fields and spell descriptions. Damage, saves, areas, conditions, healing, concentration, common protection/buff effects, durations and upcasting are handled by the common resolver.
- Monsters with structured SRD stat blocks can use named actions, multiattack sequences, attack rolls, saving throws, typed damage, condition effects, recharge rolls, legendary actions and morale behavior.
- Non-standard player actions can be adjudicated as tool, environment, animal, magic, escape, stealth, performance, research or deception approaches. A reasonable successful solution can bypass a prepared encounter.
- Campaign time, faction pressure, rumors, event history, NPC/companion memories, and rival-party progress persist in campaign state.

These are broad automation systems, not a guarantee that every spell description, monster trait, or edge-case in the full tabletop rules has a bespoke handler. The Director may require a human-style interpretation for an unusual rule interaction.

## 6. Multiplayer

Multiplayer now uses the V18 protocol 20 handshake. Both players need a compatible V18 build. The protocol change intentionally prevents V17 clients from silently joining V18 sessions. Internet access is required for PeerJS signaling and session connection.

## 7. Development checks

Run:

```bash
bash tests/run_v18.sh
```

The suite includes inherited campaign/rules, resource, UI, PWA, multiplayer and V16/V17 regression tests plus V18 integrated tests. Real Android browser testing and actual two-device multiplayer are still separate release checks.
