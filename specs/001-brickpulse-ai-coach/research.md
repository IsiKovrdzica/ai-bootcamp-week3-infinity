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

### Primary `gemini-2.5-flash-lite`; fixed tested fallback `gemini-3.5-flash-lite`

**Decision**: The documented primary is `gemini-2.5-flash-lite`, supplied only through backend `GEMINI_MODEL`. The one fixed backend fallback is `gemini-3.5-flash-lite`; it is not environment-configurable or browser-selectable.

**Rationale**: This coaching task needs short text transformation and classification rather than deep reasoning. The fallback candidate was separately capability-tested through the same BrickPulse prompt, Gemini adapter, structured-output request, and runtime `AiAdvice` validator, observing `PASSED` with exactly one provider call. This was not a retry of the primary live verification, which remains `FAILED` with one call and invalid advice.

**Source**: [Google Gemini model catalog](https://ai.google.dev/gemini-api/docs/models)

**Rejected alternatives**:

- `gemini-3.8-flash`: capable but larger than this bounded task requires.
- Replacing the documented `gemini-2.5-flash-lite` primary without a new approved verification record: would misstate the observed primary evidence.
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

### Mentor addendum: bounded second-slot model selection

**Decision**: Retain at most two application provider calls. Network/connection,
408, and 429 use the second slot for the configured primary model; normalized
500, 502, and 503 provider-unavailable failures use the same second slot for
the capability-checked `gemini-3.5-flash-lite` Gemini model.

**Evidence**: The candidate completed one separate sanitized capability check
through the same prompt, SDK adapter, structured-output settings, and runtime
validator: `PASSED` / `providerCallCount: 1` / `adviceValid: true`. This was
not a retry of the primary live check, which remains `FAILED` /
`providerCallCount: 1` / `adviceValid: false`.

**Boundary**: No third call, model chain, additional provider, or fallback for
auth/configuration/safety/validation failures.

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

## `@google/genai` 2.24.0 compatibility gate results

**Pinned package inspected**: `@google/genai` 2.24.0, including its published
`dist/genai.d.ts` declarations and `dist/node/index.mjs` implementation. The
package remains a backend-only runtime dependency. No live Gemini request was
made during this gate.

**Retry semantics**: `HttpRetryOptions.attempts` counts the initial transport
request. Values `0` and `1` mean no retry; when retry options are present but
`attempts` is omitted, the default is 5 total attempts. The 2.24.0 source clamps
the configured value to at least 1 and passes `attempts - 1` to `p-retry`.
Without a `retryOptions` object, the source invokes the transport once directly.
The offline compatibility test supplies `retryOptions: { attempts: 1 }`, returns
a retryable HTTP 503 from an injected fetch, and observes exactly one fetch.

**Transport timeout semantics**: `HttpOptions.timeout` is milliseconds and is a
per-transport-attempt timeout, not a shared retry budget. The implementation
creates a fresh attempt signal for every fetch and combines the timeout with the
caller's signal. BrickPulse therefore continues to own its shared 15-second
deadline in the advice service and does not use SDK timeout as a replacement.

**Cancellation**: `GenerateContentConfig.abortSignal` is forwarded through
`generateContent` to the request client. The client derives the transport signal
from that caller signal. An offline injected-fetch test observes the transport
signal becoming aborted when the supplied controller is aborted. SDK docs also
state that this is client-side cancellation and may not cancel server-side work,
so the existing local settle/deadline guard remains required.

**Structured JSON**: `GenerateContentConfig` supports
`responseMimeType: 'application/json'` and `responseJsonSchema`. The published
type accepts JSON Schema as `unknown`, while the SDK request transformer emits
both values under `generationConfig`. The offline test proves this exact request
shape. Provider output still crosses the application boundary as unknown text
or parsed JSON and remains subject to BrickPulse's handwritten validator.

**Response and usage metadata**: `GenerateContentResponse.text` exposes the
first candidate's generated text. `usageMetadata` exposes numeric
`promptTokenCount`, `candidatesTokenCount`, and `totalTokenCount`, among other
breakdowns. The offline test proves text and those numeric counts survive SDK
response conversion. Only safe input/output token counts may be projected into
`AiUsageEvent`; raw request/response payloads are never logged.

**Gate decision**: Use the official SDK adapter in the later adapter phase,
configured with `retryOptions: { attempts: 1 }` on every `generateContent` call.
Direct backend fetch is not selected because one SDK method call was proven to
equal one transport attempt under that configuration.

**Sources**:

- [Pinned 2.24.0 `HttpRetryOptions` documentation](https://googleapis.github.io/js-genai/release_docs/interfaces/types.HttpRetryOptions.html)
- [SDK `GenerateContentConfig` documentation](https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html)
- [Gemini structured outputs documentation](https://ai.google.dev/gemini-api/docs/structured-output)
