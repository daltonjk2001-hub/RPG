# The Chronicler — Solo Realms custom AI Dungeon Master

This is a custom campaign Director built around a foundation model. It is not a newly trained foundation model. The game-specific behavior comes from the dedicated role contract, structured adjudication and narration stages, campaign-memory context, server-side validation, and a deterministic rules engine that owns all mechanical state.

## Why this design

A language model that merely roleplays can sound convincing while forgetting facts, inventing mechanical results, or steering the player. Solo Realms therefore uses the model for interpretation, portrayal, scene composition, and NPC voice, while the client’s deterministic systems own dice, character modifiers, combat, spell slots, hit points, inventory, rewards, progression, and saved campaign state.

The connected Director runs bounded specialist tasks on the same configurable model:

- Adjudicator: interprets player intent and proposes no-roll vs ability check, skill, and typical DC.
- Narrator: narrates an already-resolved result without changing it.
- Conversation DM: speaks in the campaign and discusses known lore, clues, and options.
- Scene / quest / twist / encounter / treasure writer: creates structured situations that the existing engine validates and applies.

This manager-style design avoids extra model calls when they add no value. The local Director remains playable when the gateway is offline.

## Model selection research (25 November 2026)

The default is **OpenAI GPT-6.2 Sol** (gpt-6.2-sol). It is the balanced starting point for regular campaign turns. For difficult multi-step reasoning and long-horizon story planning, test **GPT-6.2 Astra**. For lower-cost/high-volume requests, test **GPT-6 Luna**. Consult the live [OpenAI model catalog](https://platform.openai.com/docs/models) and [Responses API](https://platform.openai.com/docs/api-reference/responses) before changing model IDs or pricing assumptions.

The gateway also includes provider adapters:
- **Anthropic:** set AI_PROVIDER=anthropic and configure a current Messages API model ID such as claude-sonnet-5-5. Sonnet is the balanced starting candidate; evaluate a higher-capability model for long campaign sessions. See [Anthropic models](https://docs.anthropic.com/en/docs/about-claude/models/overview) and [Messages API](https://docs.anthropic.com/en/api/messages).
- **Google Gemini:** set AI_PROVIDER=gemini and configure a current model ID such as gemini-3.8-flash. Test a stronger Pro-class model for difficult campaign synthesis. See [Gemini models](https://ai.google.dev/gemini-api/docs/models) and [structured output](https://ai.google.dev/gemini-api/docs/structured-output).

The code deliberately avoids selecting a model because of a vendor benchmark alone. The best Solo Realms model should be determined by the repository’s repeatable DM evaluation set: continuity, intent interpretation, adjudication accuracy, voice, player agency, and output cost. Model IDs and pricing change; check each provider’s live catalog before changing configuration.

## Research shaping this architecture

- Published D&D-agent evaluation separates function usage, parameter fidelity, acting quality, tactical optimality, state tracking, and function efficiency. A fluent response is not enough; the system needs reliable mechanics and state contracts.
- Long-horizon narrative benchmarks find that story consistency can degrade across extended interactions even when individual writing is strong. This supports retrieving campaign facts and validating every proposed action rather than trusting prose.
- Generative-agent research motivates explicit memory retrieval and reflection for believable NPC continuity, but memory must remain grounded in canonical events rather than model-invented history.
- Structured outputs, tool boundaries, and guardrails are established patterns for reliable agent systems. Solo Realms uses one configurable model with explicit task roles, validated JSON, and deterministic game actions.

## Deployment

The game is a static GitHub Pages site. Never put a model API key in docs/, pwa/, generated HTML, localStorage, or sessionStorage. The Worker keeps credentials server-side.

Requirements:
- A Cloudflare account with Workers enabled.
- Node.js and npm.
- An API key from one supported provider.

From the repository root:

1. Install Wrangler if needed: npm install --global wrangler.
2. Authenticate: wrangler login.
3. Change into worker/.
4. Add your provider key as a Worker secret using wrangler secret put AI_API_KEY.
5. Deploy with wrangler deploy.
6. Copy the deployed Worker HTTPS URL and append /api/director. In Solo Realms, open More → Rules & Settings → Director settings, paste the URL, save it, then test the connection.

The Worker allowlist defaults to the GitHub Pages origin https://daltonjk2001-hub.github.io. Add any custom domain or local development origin to ALLOWED_ORIGINS before deployment. Do not use a wildcard origin in production.

Provider configuration in worker/wrangler.toml:
- OpenAI default: AI_PROVIDER=openai, AI_MODEL=gpt-6.2-sol.
- Anthropic: AI_PROVIDER=anthropic, AI_MODEL set to a current Claude Messages API model ID.
- Gemini: AI_PROVIDER=gemini, AI_MODEL set to a current Gemini generateContent model ID.

The Wrangler configuration deploys a Durable Object-backed per-IP rate limiter (24 requests per 60-second window). The Worker refuses production requests when the limiter or provider secret is missing. Keep provider spend limits and alerts enabled in the provider dashboard. CORS is not authentication; the rate limiter and provider spend controls are required.

## Security and data flow

1. The browser sends {version, kind, input} to the configured Worker over HTTPS.
2. The Worker validates origin, route, task allowlist, request size, provider, and output type.
3. The Worker builds trusted role instructions server-side and sends the campaign prompt as user data.
4. The provider secret is attached only to the server-to-provider request.
5. The Worker returns a bounded response. It never returns the provider key or accepts a client-selected model/provider.
6. The client validates adjudication again and sends the approved plan into the deterministic rules engine.
7. Narration runs only after the engine has completed the action and is guarded against stale responses.

The Worker does not persist prompts. OpenAI Responses requests set store=false and put the persistent Dungeon Master contract in the first developer input message, before player text. This follows GPT-6.2’s current Responses API guidance for instruction ordering and stable prompt prefixes. Provider retention and account settings are governed by your selected provider’s current terms and controls.

## Evaluation contract

The gateway tests verify CORS, route and task allowlists, request size limits, missing secrets, provider request shapes, response normalization, and invalid ruling rejection.

The game evaluation should additionally score:
1. Intent fidelity: does the ruling understand what the player actually attempted?
2. Mechanic fidelity: does it choose the right action category, skill, and DC?
3. Agency: does the DM avoid deciding player thoughts, speech, or actions?
4. Continuity: does it preserve NPC identity, clues, geography, promises, and consequences?
5. Acting quality: do NPCs have distinct motives, limits, and voices?
6. Pacing and function efficiency: does it avoid needless calls, repetitive scenes, and forced combat?

Automated contract tests cannot prove that a campaign feels good. Human playtests across new, intermediate, and long-running campaigns remain necessary before calling the Director finished.

## Current limitation

This repository includes the client, Worker, provider adapters, and deployment instructions. It cannot create a Cloudflare account, add your private provider key, or deploy the Worker on your behalf. Until the Worker is deployed and the key is configured as a secret, Solo Realms continues using its offline Director.
