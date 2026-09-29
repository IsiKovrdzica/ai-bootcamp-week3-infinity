# Feature Specification: BrickPulse Post-Game AI Coach

**Feature Branch**: `001-brickpulse-ai-coach`
**Created**: 2026-09-28
**Status**: Clarified — ready for planning
**Input**: Add one explicitly requested, post-game AI coaching response to the completed Week03 BrickPulse application.

## Scope and authority

This specification defines an additive Week04 boundary only. `docs/GAME_SPEC.md` remains the authoritative, frozen Week03 specification for all existing BrickPulse gameplay. This specification is authoritative only for the post-game AI Coach and the minimum completed-game telemetry needed to support it.

Week03 specifications, implementation records, evaluations, evidence, context manifests, and repository instructions remain historical Week03 artifacts. They must not be rewritten to imply that backend, provider, retry, timeout, or player-facing AI functionality was part of Week03.

Existing gameplay must remain unchanged except for collecting the minimum data needed to construct the `GameSummary` after a game reaches `WON` or `GAME_OVER`.

## Clarifications

### Session 2026-09-28

- **Duration**: `durationSeconds` is cumulative active simulation time processed while the game is in `RUNNING`. Time in `READY`, `WON`, and `GAME_OVER` is excluded. The counter resets only when a fresh game is created or restarted; losing a non-final life and returning to `READY` does not reset it.
- **Timeout and retries**: One backend advice request has a 15-second total AI-operation deadline shared by all provider attempts. Core permits at most 2 total provider attempts, including the first attempt. A retry may begin only for a classified transient failure and only while time remains within the same deadline.
- **Mentor reliability addendum**: The second and final provider call remains within the same 15-second deadline. Network/connection, 408, and 429 failures retry the configured primary model; normalized 500, 502, or 503 provider-unavailable failures use the capability-checked `gemini-3.5-flash-lite` Gemini model. No third call, authorization/safety/validation bypass, or provider change is allowed.
- **Repeated requests**: A player may explicitly request advice again for the same completed game after the prior request settles. Only one request may be in flight at a time. Restarting invalidates pending and previously displayed coach state for the completed game; a late result from that game must be ignored.
- **Provider-output strictness**: Provider output must have exactly the three `AiAdvice` fields. Any unexpected field causes rejection rather than stripping.
- **Public failures**: Invalid local input returns HTTP `400` with the exact `INVALID_GAME_SUMMARY` envelope defined below. Provider failure, timeout, and invalid provider output return HTTP `503` with the exact `AI_ADVICE_UNAVAILABLE` envelope defined below.

## User scenarios and acceptance

### User Story 1 — Request coaching after a completed game (Priority: P1)

After reaching `WON` or `GAME_OVER`, a player explicitly asks the AI Coach for a short assessment and one actionable recommendation based only on the completed game's summary.

**Why this priority**: This is the complete user value of the feature. Without an explicit post-game request and useful advice, no AI integration is needed.

**Independent test**: Complete a game, select `ASK AI COACH`, submit a valid summary through a fake provider, and verify that validated advice is displayed without changing or restarting the game.

**Acceptance scenarios**:

1. **Given** a game in `WON` or `GAME_OVER` and the coach is idle, **When** the player selects `ASK AI COACH`, **Then** the frontend sends exactly the defined `GameSummary` to `POST /api/ai/advice` and displays `ANALYZING...` while the request is pending.
2. **Given** a semantically valid `GameSummary` and a provider that returns valid structured advice, **When** the backend processes the request, **Then** it returns only validated `AiAdvice` and the frontend displays its summary, recommendation, and category.
3. **Given** a game that is not in a terminal state, **Then** the AI Coach action is unavailable and no advice request is made.
4. **Given** any coach UI state, **Then** existing restart and game-use behavior remains available and independent of the AI request outcome.

---

### User Story 2 — Reject invalid local data safely (Priority: P1)

The system rejects malformed or inconsistent completed-game summaries before spending provider capacity or trusting the data.

**Why this priority**: The frontend is an untrusted boundary. Provider calls must not be made for invalid application input.

**Independent test**: Send structurally and semantically invalid request variants to the endpoint with an instrumented fake provider and verify a stable validation response and `providerCallCount === 0`.

**Acceptance scenarios**:

1. **Given** a request that is not a plain object, has missing or unexpected fields, contains a wrong type, or contains a non-finite number, **When** it reaches the endpoint, **Then** the backend rejects it before provider invocation.
2. **Given** a structurally valid request that violates any game-summary invariant, **When** it reaches the endpoint, **Then** the backend rejects it and `providerCallCount` remains `0`.
3. **Given** an invalid local request, **Then** the response does not expose a provider payload, prompt, stack trace, credential, or provider implementation detail, and the request is not retried.

---

### User Story 3 — Recover safely from AI failures (Priority: P1)

When the provider is unavailable, too slow, or returns malformed content, the player receives a stable failure state and can continue using BrickPulse.

**Why this priority**: An external AI service is less reliable and less trusted than local deterministic game logic; failures must remain contained.

**Independent test**: Configure fake providers for failure, timeout, malformed output, and transient-then-success behavior, and verify bounded calls plus safe application responses.

**Acceptance scenarios**:

1. **Given** a provider failure, **When** advice cannot be produced, **Then** the frontend displays `AI advice is temporarily unavailable. Please try again later.` and no raw provider error is returned or displayed.
2. **Given** the AI operation reaches its 15-second total deadline, **When** processing times out, **Then** active provider work is aborted or ignored, the stable failure is returned, and the game remains usable.
3. **Given** provider output with missing, unexpected, mistyped, out-of-range, or invalid enum fields, **When** the backend validates it, **Then** the output is rejected and is never returned or displayed as advice.
4. **Given** the first provider attempt has a retryable transient failure and deadline time remains, **When** the backend retries, **Then** total attempts never exceed 2 and both attempts remain within the shared 15-second deadline.
5. **Given** a non-transient failure, invalid local input, or invalid provider output, **Then** the backend does not retry it.

---

### User Story 4 — Verify the real provider without coupling routine tests to it (Priority: P2)

A developer can use Gemini for a limited, explicitly configured live integration check while ordinary automated tests remain deterministic and credential-free.

**Why this priority**: A real-provider check supplies integration evidence, while the fake provider keeps routine development reproducible, fast, and safe.

**Independent test**: Run the ordinary suite without provider credentials, then separately opt into one documented live Gemini check with backend-only environment configuration.

**Acceptance scenarios**:

1. **Given** the ordinary automated suite, **When** it runs without `GEMINI_API_KEY`, **Then** provider-boundary tests use `FakeAiAdviceProvider` and do not make live network calls.
2. **Given** valid backend-only Gemini configuration and an explicit live-check action, **When** the limited check runs, **Then** it exercises the same provider abstraction and response validation used by the application.
3. **Given** missing live-provider configuration, **When** ordinary build and test commands run, **Then** they do not require or reveal a Gemini credential.

## Edge cases

- Numeric values represented as strings, `NaN`, positive or negative infinity, fractions where counts must be integers, and negative values are rejected.
- Arrays, `null`, inherited-property objects, missing keys, and objects with unexpected keys are not accepted as `GameSummary` or `AiAdvice` values.
- A forged `WON` summary with fewer than 32 destroyed bricks is rejected.
- A forged `GAME_OVER` summary with lives remaining is rejected.
- A summary whose score is not exactly ten times the destroyed-brick count is rejected.
- A summary whose remaining and lost lives do not total the Week03 starting count of three is rejected.
- Empty, whitespace-only, overlong, or wrong-type advice text is rejected.
- A late provider result arriving after timeout must not replace the safe failure state with unvalidated advice.
- Repeated clicks while one request is pending must not create concurrent duplicate provider calls.
- Restarting a game while a request is pending must not allow advice from the previous game to be presented as advice for the new game.
- A transient first-attempt failure may be retried once, but both attempts share the 15-second total deadline.
- A provider authentication/configuration error, non-transient provider `4xx`, invalid local input, malformed provider output, or application validation/programming error is not retryable.

## Requirements

### Functional requirements

- **FR-001**: The system MUST expose the AI Coach action only when the current game state is `WON` or `GAME_OVER`.
- **FR-002**: The system MUST initiate advice generation only after an explicit player action; it MUST NOT invoke AI during `READY`, `RUNNING`, rendering, input processing, or frame-by-frame game simulation.
- **FR-003**: The frontend MUST construct and send only the defined `GameSummary`; it MUST NOT send the complete internal `GameState` when the summary is sufficient.
- **FR-004**: The frontend MUST submit advice requests using `POST /api/ai/advice` and represent idle, loading (`ANALYZING...`), success, and safe-failure states.
- **FR-005**: The backend MUST runtime-validate the request structure and semantic consistency before invoking any AI provider. TypeScript declarations or assertions alone do not satisfy this requirement.
- **FR-006**: Request validation MUST require a non-null plain object with exactly `outcome`, `score`, `bricksDestroyed`, `livesRemaining`, `livesLost`, and `durationSeconds`, with no missing or unexpected fields.
- **FR-007**: `outcome` MUST be exactly `WON` or `GAME_OVER`; all count and score fields MUST be finite non-negative integers; `durationSeconds` MUST be a finite non-negative number.
- **FR-008**: Request validation MUST enforce `score === bricksDestroyed * 10`, `0 <= bricksDestroyed <= 32`, `0 <= livesRemaining <= 3`, `0 <= livesLost <= 3`, and `livesRemaining + livesLost === 3`, inheriting the corresponding Week03 constants from `docs/GAME_SPEC.md`.
- **FR-009**: Request validation MUST enforce that `WON` has exactly 32 destroyed bricks and that `GAME_OVER` has exactly zero remaining lives.
- **FR-010**: Invalid local input MUST be rejected before provider invocation, MUST NOT be retried, and MUST leave `providerCallCount` at `0` in an instrumented acceptance test.
- **FR-011**: Application logic MUST access AI generation through a small `AiAdviceProvider` abstraction rather than through Gemini-specific calls distributed across the application.
- **FR-012**: The implementation MUST provide a `FakeAiAdviceProvider` for automated tests and `GeminiAiAdviceProvider` instances for limited live verification and the fixed, capability-checked Gemini-model fallback. Additional providers and unbounded model fallback are out of scope.
- **FR-013**: The backend MUST runtime-validate provider output before treating it as application data. Provider output MUST contain exactly `summary`, `recommendation`, and `category`; any missing or unexpected field MUST cause rejection.
- **FR-014**: A valid `AiAdvice` MUST be a non-null plain object with `summary`, `recommendation`, and `category`; `summary` MUST contain 1–160 characters, `recommendation` MUST contain 1–220 characters, and both MUST contain non-whitespace content.
- **FR-015**: `category` MUST be exactly one of `survival`, `efficiency`, `consistency`, or `general`.
- **FR-016**: Malformed provider output MUST be rejected as invalid provider output and MUST never be displayed as valid advice.
- **FR-017**: Each backend advice request MUST apply one 15-second total deadline to the complete AI operation, including all provider attempts. On expiry, active work MUST be aborted or ignored and the request MUST end in controlled failure without blocking continued game use.
- **FR-018**: Core MUST make at most 2 total provider attempts per backend advice request. With time remaining before the shared deadline, the second call retries the primary model only for network/connection, `408`, or `429` transient failures; normalized provider-unavailable `500`, `502`, or `503` failures use only the tested `gemini-3.5-flash-lite` Gemini fallback model. It MUST NOT make a third call or retry/fallback invalid local input, provider authentication/authorization/configuration errors, other provider `4xx` responses, safety refusal, invalid provider output, client cancellation, or application validation/programming errors.
- **FR-019**: Provider failure, timeout, and invalid provider output MUST produce a stable safe application failure that the frontend renders as `AI advice is temporarily unavailable. Please try again later.`
- **FR-020**: Application responses and user-visible states MUST NOT expose raw provider errors or payloads, stack traces, API keys, internal prompts, or provider internals.
- **FR-021**: `GEMINI_API_KEY` MUST be read only by backend runtime code from environment configuration and MUST never be included in browser code or bundles, committed content, prompts, tests, fixtures, screenshots, evidence, logs, or API responses.
- **FR-022**: The selected live model MUST be backend-configured through `GEMINI_MODEL`; the evidence MUST identify the provider and configured model without exposing credentials.
- **FR-023**: An `.env.example`, if added, MAY contain only empty placeholders such as `GEMINI_API_KEY=` and `GEMINI_MODEL=` for these settings.
- **FR-024**: Existing Week03 gameplay behavior and tests MUST continue to pass; AI failures MUST NOT prevent restart or ordinary BrickPulse use.
- **FR-025**: The feature MUST collect no gameplay telemetry beyond what is necessary to populate the `GameSummary` and MUST perform no persistent storage, authentication, analytics, or usage dashboard work.
- **FR-026**: `GameState` MUST retain the existing `status` values `READY`, `RUNNING`, `WON`, and `GAME_OVER`. The AI feature MUST use the existing terminal values `WON` and `GAME_OVER` directly in `GameSummary.outcome`.
- **FR-027**: The minimum duration telemetry MUST be one cumulative active-play counter associated with the current `GameState`. It MUST initialize to `0`, increase only by finite non-negative simulation time actually processed while `status === "RUNNING"`, survive intermediate life-loss transitions to `READY`, stop increasing in terminal states, and reset on full restart. A negative or non-finite `deltaSeconds` input MUST NOT make duration telemetry negative or non-finite; this telemetry-only guard MUST NOT redesign or otherwise sanitize existing physics behavior. Adding this telemetry MUST NOT alter movement, collision, scoring, life, input, or status-transition behavior.
- **FR-028**: The frontend MUST prevent concurrent advice submissions. After a request settles, it MUST permit another explicit request for the same completed game. A full game restart MUST clear displayed advice and invalidate any pending result from the prior game.
- **FR-029**: Post-game controls and advice output MUST be attached as DOM UI adjacent to the existing `#game` Canvas through the existing `index.html` and `src/main.ts` entry points. `src/render.ts` MUST remain responsible only for Canvas game rendering and MUST NOT own HTTP or provider behavior.

### API contracts

#### Request: `GameSummary`

```ts
type GameSummary = {
  outcome: "WON" | "GAME_OVER";
  score: number;
  bricksDestroyed: number;
  livesRemaining: number;
  livesLost: number;
  durationSeconds: number;
};
```

The request body MUST be exactly the `GameSummary` object itself, without an envelope or additional properties. Validation follows FR-005 through FR-010.

#### Successful application response: `AiAdvice`

```ts
type AiAdvice = {
  summary: string;
  recommendation: string;
  category: "survival" | "efficiency" | "consistency" | "general";
};
```

On success, the backend MUST return HTTP `200`, content type `application/json`, and exactly the validated `AiAdvice` object with no envelope or additional properties. Validation follows FR-013 through FR-016.

#### Failure response

For structurally or semantically invalid local input, the backend MUST return HTTP `400`, content type `application/json`, and exactly:

```json
{
  "error": {
    "code": "INVALID_GAME_SUMMARY",
    "message": "Invalid game summary."
  }
}
```

For provider unavailability, exhausted transient attempts, timeout, or invalid provider output, the backend MUST return HTTP `503`, content type `application/json`, and exactly:

```json
{
  "error": {
    "code": "AI_ADVICE_UNAVAILABLE",
    "message": "AI advice is temporarily unavailable. Please try again later."
  }
}
```

The public error objects MUST contain no additional fields. Internal diagnostics may be logged only in sanitized backend logs and must obey FR-020 and FR-021.

### Architecture constraints

```text
Browser / Vite Frontend
        |
        v
POST /api/ai/advice
        |
        v
TypeScript Backend
        |
        v
AiAdviceProvider abstraction
        |
        +-- FakeAiAdviceProvider (automated tests)
        |
        +-- GeminiAiAdviceProvider (limited live validation)
```

- Provider credentials and provider calls belong exclusively to the backend boundary.
- The deterministic game-state update and collision rules remain independent of Canvas rendering, browser input, HTTP handling, and AI provider behavior.
- No AI result may modify game physics, score, lives, outcome, or the completed game record.

### Week04 repository-instruction boundary

The Week03 historical documents remain unchanged. Before implementation, the active instruction layer needs a narrowly scoped Week04 exception/routing update because these current instructions conflict with this approved feature:

- `AGENTS.md`: its always-on boundary prohibits backend, provider, API SDK, AI, retry, and timeout work.
- `.github/00-index.instructions.md`: it routes only Week03 authority and has no Week04 specification route.
- `.github/instructions/01-architecture.instructions.md`: it permits only `docs/GAME_SPEC.md` behavior and expressly prohibits a backend and Week04 features.
- `.github/instructions/02-testing.instructions.md`: it derives tests only from `docs/GAME_SPEC.md`; Week04 tests must also derive from this specification while retaining its deterministic-test rules.
- `.github/instructions/03-workflow.instructions.md`: it requires stopping on Week04 behavior.
- `.github/instructions/05-code-review.instructions.md`: it requires rejecting backend/provider/Week04 additions.

The update must preserve every Week03 gameplay constraint and make this feature specification authoritative only for the Week04 AI boundary. `.github/instructions/04-build-and-commands.instructions.md` does not conflict; its command and dependency discipline continues to apply. `docs/CONTEXT_MANIFEST.md` remains an unchanged historical description of the clean Week03 baseline and is not the active Week04 context manifest.

### Key entities

- **Completed Game**: The terminal Week03 game state (`WON` or `GAME_OVER`) from which minimum summary telemetry is derived.
- **GameSummary**: An exact, runtime-validated transfer object containing the six approved completed-game fields.
- **AiAdvice**: The exact, runtime-validated application response containing a concise summary, one concise actionable recommendation, and one allowed category.
- **AiAdviceProvider**: The backend boundary that accepts valid summary input and produces untrusted provider output for application validation.
- **Coach Request State**: The frontend's per-completed-game state: idle, loading, success, or safe failure.

## Testing and acceptance matrix

| ID | Required acceptance | Minimum evidence |
|---|---|---|
| A1 | Valid `GameSummary` produces valid structured advice | Endpoint test with fake provider; exact validated response asserted |
| A2 | Invalid `GameSummary` is rejected before provider use | Structural and semantic cases; `providerCallCount === 0` asserted |
| A3 | Provider failure produces the safe user-facing error | Fake failure; exact HTTP `503` envelope and absence of raw error asserted |
| A4 | Timeout produces controlled failure | Delayed fake provider; completion within the 15-second deadline tolerance and exact HTTP `503` envelope asserted |
| A5 | Malformed AI output is rejected | Missing, unexpected, invalid enum, wrong type, empty, and overlong variants; zero malformed content returned |
| A6 | Retry attempts remain within the configured maximum | Retryable fake failure produces no more than 2 total attempts; each non-retryable class produces exactly 1 or 0 as applicable |
| A7 | Existing Week03 behavior remains intact | Existing focused, formal, holdout, typecheck, build, and smoke checks as applicable |

Routine automated tests MUST use the fake provider and MUST require neither network access nor a Gemini credential. The live Gemini check MUST be an explicitly invoked, separately named verification command that is not discovered or run by `npm test`. It MUST make at most one live advice request through `GeminiAiAdviceProvider`, require backend-only `GEMINI_API_KEY` and `GEMINI_MODEL`, pass the result through normal runtime validation, sanitize its output, and record the configured model and pass/fail/skip result without recording the credential, internal prompt, or raw provider payload. The exact command is established during implementation and documented before evidence is claimed.

## Evidence requirements

The completed Week04 work must provide reproducible evidence for:

- the frontend/backend boundary and endpoint;
- backend-only secret location and proof that the browser bundle does not receive the secret;
- Gemini as provider and the configured model identifier;
- exact request and response contracts;
- request and provider-output runtime validation;
- success, provider-failure, timeout, and malformed-output flows;
- fake-provider tests, including call and retry counts;
- the separate limited live-provider verification procedure and observed result;
- Week03 regression results; and
- known limitations and clarification decisions.

Existing SpecKit artifacts SHOULD carry this information when they already do so. New duplicate documents MUST NOT be created solely for formality, and evidence MUST contain actual observed commands/results rather than anticipated outcomes.

## Success criteria

### Measurable outcomes

- **SC-001**: In acceptance testing, 100% of valid terminal summaries used for A1 return an `AiAdvice` satisfying all response bounds and enum rules.
- **SC-002**: In A2, 100% of invalid structural and semantic summaries are rejected with zero provider calls.
- **SC-003**: In A3–A5, 100% of simulated provider failures, timeouts, and malformed outputs produce the exact HTTP `503` safe envelope and expose none of the prohibited internal details.
- **SC-004**: In A6, provider attempts never exceed 2 total within the shared 15-second deadline, and non-retryable cases produce no retry.
- **SC-005**: The ordinary automated suite completes without a Gemini credential or live provider call.
- **SC-006**: Inspection of frontend source and the production browser bundle finds no `GEMINI_API_KEY` value and no provider credential.
- **SC-007**: All previously passing Week03 tests and applicable build, typecheck, and smoke checks remain passing after implementation.
- **SC-008**: The player can restart and continue using BrickPulse after AI success, failure, malformed output, or timeout.
- **SC-009**: One documented, explicitly invoked live Gemini check can exercise the production provider path and record its actual outcome without recording the credential.

## Out of scope

- AI in the frame-by-frame game loop or any real-time gameplay path
- AI opponent, chatbot, or additional AI features
- Additional providers, model fallback chains, or more than two total provider calls
- Retrieval-augmented generation, vector databases, autonomous agents, or multi-agent architecture
- Login, authentication, database, persistent history, deployment, or multiplayer
- Streaming responses
- AI-driven modification of game physics or a major game redesign
- Usage dashboards or analytics beyond minimum in-memory summary telemetry
- Rewriting or retroactively expanding Week03 specifications, evidence, or history

## Assumptions and dependencies

- The frozen Week03 rules remain authoritative for the 4×8 brick grid, three starting lives, ten points per brick, and terminal-state meanings.
- Gemini is the sole live provider for Week04; the precise model identifier is deployment configuration rather than a hard-coded product requirement.
- The TypeScript backend and its local frontend routing/proxy arrangement will be chosen during planning without changing the required browser/backend/provider trust boundaries.
- Runtime validation may be implemented without adding a schema dependency; any new dependency requires separate approval under repository rules.
- No application code, dependency, infrastructure, or provider call is authorized by this specification-only task.
- The existing game loop treats supplied `deltaSeconds` as simulation time. Duration telemetry follows that same processed-time model and introduces no new pause/background-tab behavior.
- Sanitized backend diagnostics are allowed for development evidence, but no persistent analytics or user/game history is introduced.
