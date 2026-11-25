# V25 — Campaign Ruleset and d20 Contract

V25 establishes the first explicit rules contract for campaigns. It is an integration layer over the V18–V24 runtime, not a claim that every 2024 class feature, subclass feature, spell, monster trait, or combat interaction is now complete.

## Campaign profiles

Each campaign receives a persisted `campaign.ruleset` object using schema `solo-realms-campaign-rules-v1`.

| Profile | Default use | Default house rules |
|---|---|---|
| `dnd-2024-srd-5.2.1` | New campaigns and pre-V20 saves without an existing rules profile | Off |
| `solo-realms-v24-enhanced` | Existing V20+ campaigns without an existing rules profile | On |

An existing saved `campaign.ruleset` is retained. The migration runs on the validator's normalized copy, so importing or validating a save does not mutate the caller's object.

The Adventure rules panel lets a player change the profile and independently toggle the custom rules below. A profile change resets its switches to that profile's defaults. A switch change affects future checks and tactical resolutions; it does not rewrite old rolls or previously recorded outcomes.

## Explicit Solo Realms house rules

| Key | Enhanced default | Effect |
|---|---:|---|
| `classIdentityEdge` | On | Grants the existing +1 class-identity edge when an action matches the class's designated approaches |
| `coverACBonus` | On | Keeps the existing successful-cover benefit in the V20/V18 monster-attack path |
| `flankingACBonus` | On | A successful V20/V21 flank temporarily reduces the selected enemy's AC by 2 |
| `travelFatiguePenalty` | On | At fatigue 4+, applies the existing −2 penalty to travel/survival checks |
| `customDCPresets` | On | Enables the legacy Solo Realms preset and offset scale |

The custom DC presets remain separate from the 2024 typical DC table:

| Solo Realms preset | DC |
|---|---:|
| Trivial | 5 |
| Routine | 8 |
| Standard | 12 |
| Hard | 16 |
| Expert | 20 |
| Legendary | 25 |

The 2024 SRD's typical task DC guidance is 5 (very easy), 10 (easy), 15 (medium), 20 (hard), 25 (very hard), and 30 (nearly impossible). The Director's normal automatic adjudication uses that typical ladder. See the [2024 D&D Basic Rules — Playing the Game](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game) and [SRD 5.2.1](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf).

## d20 test semantics

V25 provides a deterministic typed d20 resolver for ability checks, saving throws, and attack rolls.

- **Ability checks:** add modifiers and compare the total with the DC. A natural 20 is not an automatic success; a natural 1 is not an automatic failure.
- **Saving throws:** add modifiers and compare the total with the DC. A natural 20 or natural 1 has no general automatic-success or automatic-failure rule. Specific effects can define exceptions.
- **Attack rolls:** a natural 20 automatically hits and is a critical hit; a natural 1 automatically misses.

Advantage uses the higher of two d20 results; disadvantage uses the lower. If both are present, they cancel and one d20 is used. Death saving throws and other feature-specific exceptions remain the responsibility of their dedicated rules.

The corresponding request and result schemas are:

- `solo-realms-mechanic-request-v1`
- `solo-realms-mechanic-result-v1`

A request explicitly names the mechanic type, actor, action, optional target, rules profile, campaign revision, and bounded context. The validator rejects unsupported mechanics, malformed abilities, invalid profiles, unbounded context, and invalid action-cost data.

## DC provenance

Action outcomes record:

- `rulesetId`: the rules profile active for the campaign at resolution time.
- `dcSource`: `director-typical`, `manual-override`, or `solo-realms-custom-preset`.

This distinguishes a Director-selected DC from a deliberate manual DC or a Solo Realms house-rule preset.

## Compatibility and test coverage

The V25 regression suite covers:

- New-campaign defaults and V18/V20 save migration.
- Profile switching and independent house-rule toggles.
- Request schema validation and invalid-input rejection.
- Natural 1/20 behavior for ability checks, saving throws, and attack rolls.
- Advantage/disadvantage selection.
- Class identity, cover, flanking, fatigue, and custom-DC gates.
- Ruleset context supplied to the Director.
- Ruleset migration without mutating the imported save.

The existing V20 and V21 regression suites explicitly select the Enhanced profile because those suites exercise the historical gameplay contract, rather than the default profile for new campaigns.

## Current boundaries — not yet complete

V25 is a rules-contract and compatibility foundation. It does **not** complete the entire D&D rules engine. In particular:

1. The new typed attack resolver is a tested deterministic service, but every existing weapon/spell/monster attack call has not yet been refactored to submit a typed V25 request.
2. The broader action request schema is a contract for future mechanics; contest resolution, spell/action economy, conditions, reactions, and resource transactions still need feature-specific deterministic services.
3. The SRD profile establishes the default DC and house-rule boundary. It does not, by itself, prove complete 2024 feature parity across all classes, subclasses, spells, feats, equipment, monsters, or encounter rules.
4. Automated Node regression tests do not replace browser/device QA, multiplayer sessions on separate devices, or human tabletop playtesting.

The next implementation work should route every live d20 call through the typed contract, then expand the rules registry into versioned class, feature, spell, condition, monster, and action definitions with per-feature acceptance tests.
