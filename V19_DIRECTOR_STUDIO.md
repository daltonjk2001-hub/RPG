# Solo Realms — Director Studio (V19)

## Player-facing capabilities

Choose one of nine starter profiles or build a custom blend from eight independent influences. The blend is normalized to 100 before it reaches the Director.

| Influence | Behavior |
|---|---|
| Grand Storyteller | Dramatic pacing, emotional arcs, recurring characters, earned payoffs |
| Mischievous Trickster | Clever reversals, running jokes, eccentric NPCs, delayed callbacks |
| Tactical Mastermind | Positioning, enemy intent, terrain, morale, credible opposition |
| Mystery Architect | Fair clues, motives, contradictions, knowledge tracking |
| Merciless Game Master | Impartial stakes, preparation, danger, meaningful consequences |
| World Explorer | Discovery, geography, culture, lore, multiple routes |
| Psychological Horror Master | Suspense, foreshadowing, atmosphere, player-controlled boundaries |
| Comedic Storyteller | Comic timing, distinct voices, absurdity, coherent callbacks |

Starter profiles: Balanced Tabletop DM, Grand Storyteller, Mischievous Trickster, Tactical Mastermind, Mystery Architect, Merciless Game Master, World Explorer, Psychological Horror Master, and Comedic Storyteller.

## Individual controls

- Custom DM name and player-authored instructions.
- Narration length: Concise, Standard, or Immersive.
- DM initiative: Reactive, Balanced, or Proactive.
- NPC complexity: Brief, Detailed, or Deep.
- Player-agency priority from 0 to 100.

## Runtime integration

The selected personality is appended to the existing `srAISystem` prompt, so action resolution, scene/quest/twist generation, and DM conversation share one identity and behavioral contract. `srAIContext` includes a bounded slice of durable Director memories and recent DM dialogue. Offline mode retains V18 procedural adjudication and adds personality-specific narration and chat voice. V18 remains authoritative for rolls, outcomes, damage, rewards, character state and campaign mutations.

Existing quick profiles remain available and map to V19 personality profiles. Campaign settings are saved with the campaign; player defaults are stored separately from saves. No provider credentials are added to campaign memory or the V19 test surface.

## Boundary

The personality mixer does not itself provide a generative model. Without a configured provider, the Director remains procedural and uses the selected blend for narrative flavor. Open-ended semantic interpretation requires a connected model endpoint.
