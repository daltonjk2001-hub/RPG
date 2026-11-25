# Solo Realms V21 — Player-stage playtest hardening

## Scope

This release implements the six improvement areas found while reviewing the new-player through 10+ year player stages. The implementation is additive to V20; it does not replace V18 rules, V19 Director behavior, V20 adventure state, multiplayer protocol, or the Save Center schema.

## Changes

### Beginner onboarding and action recognition

- Social-intent phrases are classified before tactical terms, preventing ordinary phrases such as “talk to the guard” from being routed into combat because of the word “guard”.
- Stealthy passage past an NPC is an exploration action unless the player describes an attack or ambush.
- Characters at low levels receive an optional four-step first-session guide: explore, speak with someone, travel, and make camp. The guide can be dismissed and does not lock progression.

### Player agency and rules consistency

- The Adventure panel exposes optional controls for skill, challenge, roll conditions and objective focus while keeping Director-selected defaults.
- Core d20 checks call the established V14/V18 ability-check resolver, then apply the V20 class edge and travel/survival fatigue modifier.
- Skill summaries include ability modifiers, proficiency, Expertise and class edge. Automatic DCs use scene/mode cues and do not scale downward just because character level increases.
- Challenge presets are available as Trivial (DC 5), Routine (8), Standard (12), Hard (16), Expert (20) and Legendary (25). Explicit DC supplied by an existing resolver remains authoritative when the player leaves the selector on Automatic.

### Objective and campaign progression

- Player-created objectives default to two progress steps and can be configured from one to ten.
- Objective progress is tied to relevant actions; repeating the identical action on the same campaign day does not add another step.
- Routine rest does not create campaign momentum. Optional campaign openings are driven by completed objectives rather than every three successful actions.
- Failed approaches remain visible as consequences.

### Travel and survival

- Travel-watch time advances only on travel actions, not every six unrelated actions.
- Each travel watch consumes one carried ration and one water unit when available; shortages increase fatigue and shortage counters.
- An overnight camp/rest advances eight watches, reduces fatigue and exposure, and does not create campaign momentum.
- Existing inventory records and world simulation hooks remain in use.

### Long-term and level-20 progression

- Social outcomes update campaign faction reputation and a character-level reputation chronicle.
- Level-20 characters can earn Legacy XP from completed objectives and campaign archives without exceeding level 20.
- Legacy ranks unlock titles and durable milestones, not automatic combat-stat bonuses.
- The Legacy Chronicle can archive a campaign summary, completed objectives, region, chapter, relationships and unresolved leads without deleting the current campaign or save.

## Compatibility

New state is stored additively under `campaign.sr21` and `character.sr21Legacy`. Existing `campaign.sr20`, NPC relationship fields, Save Center snapshots and portable JSON save paths remain in place. The build appends the V21 layer after V20 and regenerates the standalone HTML, PWA and GitHub Pages mirror from canonical source.

## Verification

The V21 test suite is added to `tests/run_v18.sh` and the GitHub Actions hardening workflow. It exercises the action classifier, rules-aware checks, challenge selection, tutorial, watches, provisions, rest, objective safeguards, legacy rank and archive persistence. The complete result and assertion counts will be recorded in `V18_TEST_REPORT.md` after the branch and post-merge workflows finish.

Automated VM tests are not a substitute for browser/device verification, two-device multiplayer, long campaign play, or human playtesting across actual experience levels. The Director's intent recognition remains heuristic; the player can override the inferred skill, approach, difficulty and objective.
