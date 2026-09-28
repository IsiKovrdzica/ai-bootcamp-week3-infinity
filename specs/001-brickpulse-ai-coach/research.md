# Technical Research: BrickPulse Post-Game AI Coach

**Date**: 2026-09-28

## Decisions

### Use Node's built-in HTTP server

**Decision**: Implement the single API endpoint with `node:http` and a small adapter around a pure handler.

**Rationale**: The feature has one JSON POST route and no authentication, database, multipart data, streaming, or deployment requirement. A web framework would add dependency and abstraction cost without reducing meaningful complexity. Body size, method/path matching, content type, and exact response projection are small enough to implement and test directly.

**Rejected alternatives**:

- Express/Fastify: unnecessary for one endpoint and would broaden dependency surface.
- Vite middleware as the application backend: violates the required trust boundary and would confuse development tooling with the backend.
- Serverless/deployment platform handler: deployment is explicitly out of scope.

### Use the official `@google/genai` SDK, isolated to one adapter

**Decision**: Propose `@google/genai` as the only new runtime dependency.

**Rationale**: Google's current JavaScript quickstart identifies `@google/genai` as the supported SDK. Keeping it inside `server/ai/gemini-provider.ts` prevents provider types, credentials, or configuration from crossing into browser code. The adapter remains replaceable behind `AiAdviceProvider` without adding another provider.

**Source**: [Google Gemini API getting started](https://ai.google.dev/gemini-api/docs/get-started)

**Rejected alternatives**:

- Direct REST immediately: viable and the fallback if SDK retry behavior cannot be constrained, but the official SDK reduces provider request/response plumbing.
- Legacy `@google/generative-ai`: not the current SDK.
- Multiple SDKs/providers: out of scope.

### Recommend stable `gemini-3.5-flash-lite`, but require configuration

**Decision**: Recommend `gemini-3.5-flash-lite` in setup guidance for this short structured-output task. The application reads the actual model only from backend `GEMINI_MODEL`; no model identifier is hard-coded as product behavior.

**Rationale**: Google's current model catalog describes it as the fastest, most cost-effective stable 3.5 model and recommends it for new lightweight workloads. This coaching task needs short text transformation and classification rather than deep reasoning. A stable model is preferable to a preview alias for reproducible evidence.

**Source**: [Google Gemini model catalog](https://ai.google.dev/gemini-api/docs/models)

**Rejected alternatives**:

- `gemini-3.8-flash`: capable but larger than this bounded task requires.
- 2.5-family models: still available to some users, but Google's catalog recommends newer models for new projects.
- Preview/latest aliases: less stable for reproducible coursework evidence.

### Use provider structured output as a generation constraint only

**Decision**: Request JSON structured output using the `AiAdvice` JSON schema, then parse the response as `unknown` and apply the handwritten strict validator.

**Rationale**: Structured output reduces malformed generations but is not an application trust boundary. The provider can still fail, SDK/API behavior can change, and exact-key/string bounds remain application requirements.

**Source**: [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)

**Rejected alternatives**:

- Prompt-only JSON: less reliable.
- Trust SDK-generated types/schema alone: fails the runtime-validation requirement.
- Add Zod: unnecessary for two compact contracts and currently prohibited without separate approval.

### Own retries and the total deadline in the application service

**Decision**: Configure the SDK for one transport attempt and allow the service at most two provider calls under one 15-second deadline.

**Rationale**: Current SDK source/documentation exposes retry options and shows retry defaults can include multiple HTTP attempts. Nested SDK plus service retries would make `providerCallCount` and the maximum external-call bound misleading. One retry owner makes behavior testable.

**Sources**: [SDK HTTP options](https://googleapis.github.io/js-genai/release_docs/interfaces/types.HttpOptions.html), [Google GenAI SDK request implementation](https://github.com/googleapis/js-genai/blob/main/src/_api_client.ts)

**Gate**: Verify the exact option syntax against the pinned SDK version during implementation. If a single SDK attempt cannot be configured and evidenced, use direct backend `fetch` for the Gemini adapter rather than accept hidden retries.

### Use AbortSignal plus a local settle guard

**Decision**: Pass one outer `AbortSignal` through attempts and also race/guard the service result against the shared deadline.

**Rationale**: The SDK supports an abort signal, but its documentation notes that client cancellation may not cancel work already accepted by the service. The local guard is therefore required to ensure a late response cannot become HTTP 200.

**Source**: [SDK `GenerateContentConfig.abortSignal`](https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html)

### Use handwritten validation

**Decision**: Implement exact-key structural and semantic validators with no validation library.

**Rationale**: Both contracts are small, fixed, and security-sensitive. A handwritten validator is readily testable and honors the current dependency constraint.

### Test frontend request ownership without a DOM test dependency

**Decision**: Extract a small controller with injected transport and view callbacks. Test concurrency, state transitions, abort, and stale-result rejection as pure TypeScript; retain a manual/smoke check for actual DOM wiring.

**Rationale**: This avoids adding jsdom/happy-dom for a small UI while still making the reliability logic deterministic.

## Repository facts confirmed

- `DEFAULT_CONFIG.lives` is `3`, and runtime validation accepts only `3`.
- `createBricks` creates 4 rows × 8 columns = `32` bricks.
- A brick changes from alive to dead once and adds exactly `10` points in `resolveBrick`.
- `GameStatus` is exactly `READY | RUNNING | WON | GAME_OVER`.
- `main.ts` owns the animation loop and `index.html` owns the Canvas/adjacent DOM.
- `render.ts` only reads game state and draws Canvas content.
- The existing `.gitignore` ignores `node_modules/` and `dist/`, but does not yet ignore `.env`; implementation must add `.env` and `.env.*` with an explicit `!.env.example` exception.

## Open technical gate

There is no unresolved product question. The only technical gate is SDK-version verification for retry suppression, structured output, and abort wiring. It must be closed before the Gemini adapter is accepted, and it does not alter the architecture or contracts.
