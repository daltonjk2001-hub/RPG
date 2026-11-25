# Solo Realms V21 — Player-stage and stress QA

## Scope

This report separates simulated automated play from real human/device testing. Player-stage bands are inferred from character level for in-game guidance; they do not claim to measure a real player's tabletop experience or years played.

## Player-stage journeys

The V21 journey suite exercises:

- **New player (levels 1–2):** optional first-session guidance, free-form actions, no forced tutorial gates, and clear actions/results.
- **Learning (levels 3–4):** exploration, social interaction, travel, and camp/rest patterns.
- **Developing (levels 5–9):** skill selection, proficiency, Expertise, class edge, DC tiers, and roll-state overrides.
- **Experienced (levels 10–14):** mixed social/exploration/tactical actions, NPC relationships, faction reputation, objective targeting, and consequences.
- **Veteran (levels 15–19):** high-level modifiers, challenge presets, repeated actions, objective limits, and multi-watch travel.
- **Expert/legacy (level 20+):** level cap remains 20; separate Legacy XP/ranks, duplicate reward protection, archive history, and save compatibility.

## Stress coverage

The V21 endurance suite simulates 1,200 mixed exploration, social, campaign, and tactical actions; 200 travel watches under supply scarcity; eight recovery rests; bounded logs/records/leads/consequences; and a Save Center snapshot/validation round trip after the simulated long session.

The player-stage suite also probes repeated same-day objective actions, unrelated objective selections, idempotent archives/rewards, stale/older onboarding data, action-intent ambiguities, long-rest timing, and natural-1/20 check resolution.

## Findings addressed while preparing the test suite

- Fixed an infinite recursive panel wrapper that caused a startup stack overflow in the abandoned V21 prototype.
- Preserved the underlying V20 panel through a stable base-function reference before wrapping it.
- Removed duplicate V20 skill/difficulty/roll selectors when the V21 selectors are active.
- Made the V21 form selections authoritative over legacy form submission values.
- Classified an action by the earliest expressed intent; incidental mention of a guard or camp does not override the action's verb.
- Restricted no-roll rests to survival-mode rest actions; dialogue about a campsite still rolls normally.
- Aligned an eight-hour rest with two four-hour watches.
- Resolved ability checks from the final total versus DC, rather than making natural 1/20 an automatic failure/success.
- Required meaningful wording overlap before a selected objective can progress; exact same-day duplicate actions cannot farm steps.
- Bounded active objectives and preserved unfinished work instead of silently evicting it.
- Migrated earlier onboarding completion state rather than showing the first-session guide again.
- Made legacy reward IDs and campaign archives idempotent.

## Verification status

The new suites are wired into `bash tests/run_v18.sh`. The release-integrity suite verifies that the V21 runtime and controls ship identically in standalone, PWA, and Pages builds. On the final tested PR revision, the full regression passed **663/663 numbered assertions** and the independent V18 hardening workflow also passed **663/663**. Across the two independent CI runtimes (Node 22 and Node 20), that is **1,326 successful assertion executions**, with the release-integrity suite passing in both. The V21-specific results were **58/58 player-stage assertions** and **15/15 long-session stress assertions** per run.

## Non-blocking CI notices

The successful GitHub Actions runs still emit the Node `punycode` deprecation notice and a warning that some GitHub actions currently target Node 20. These did not fail either workflow and are separate maintenance items.

## Limits

These tests execute the application in a simulated browser/VM and verify deterministic state transitions. They do not establish game balance, writing quality, enjoyment, or real-world usability. Actual Android installation/touch testing, real two-device multiplayer, and human playtests with players of different tabletop backgrounds still require real devices/people. Automated character-level bands are only a gameplay proxy, not a substitute for that human feedback.
