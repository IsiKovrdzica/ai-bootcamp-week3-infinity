# Week04 Evidence — BrickPulse Post-Game AI Coach

## Scope

Week04 adds an explicit post-game AI Coach to the existing BrickPulse game. It
is additive: gameplay state derives the six-field completed-game summary, and
AI work is outside the frame-by-frame game loop. The normative feature scope
and plan remain the existing [specification](../specs/001-brickpulse-ai-coach/spec.md)
and [plan](../specs/001-brickpulse-ai-coach/plan.md); this document records
implementation evidence rather than restating them.

## Architecture

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
 AiAdviceProvider
    /          \
   v            v
Fake tests   Gemini adapter
```

The fake provider is used for deterministic routine tests. Gemini is a
backend-only adapter. The browser sends only a terminal `GameSummary`; it has
no provider, SDK, credential, or prompt dependency.

## Contracts and trust boundaries

The implemented endpoint is `POST /api/ai/advice`, reconciled with the
[OpenAPI contract](../specs/001-brickpulse-ai-coach/contracts/openapi.yaml)
and [provider contract](../specs/001-brickpulse-ai-coach/contracts/provider.md).

- `GameSummary` has exactly `outcome`, `score`, `bricksDestroyed`,
  `livesRemaining`, `livesLost`, and `durationSeconds`.
- Validated `AiAdvice` has exactly `summary`, `recommendation`, and `category`;
  categories are `survival`, `efficiency`, `consistency`, or `general`.
- Invalid structural or semantic summaries return the exact 400 envelope;
  unavailable provider, timeout, retry exhaustion, and invalid provider output
  return the exact safe 503 envelope.
- Gemini adapter output crosses as `unknown` and is runtime-validated by the
  application before any public response.
- The application owns one shared 15,000 ms deadline, at most two total
  provider calls, and a 250 ms delay only for normalized transient failures.
  The Gemini SDK is constrained to one transport attempt per provider call.

## Prompt and provider boundary

`server/ai/prompt.ts` identifies prompt version
`brickpulse-post-game-coach/v1`. Its versioned boundary accepts only the six
summary values, prohibits invented events or hidden state, and requires the
exact structured advice fields. The internal prompt text is intentionally not
reproduced here.

`GeminiAiAdviceProvider` is the sole live adapter. Credentials and model
selection are backend configuration. The configured provider is Gemini; the
model identifier is deployment configuration and is not recorded here.

## Evaluation matrix

| Scenario | Observed result | Evidence |
|---|---|---|
| Valid summary and valid advice | HTTP 200; browser/controller success | `server/integration.test.ts` |
| Structural invalid summary | HTTP 400; 0 provider calls; safe browser failure | `server/integration.test.ts` |
| Semantic invalid summary | HTTP 400; 0 provider calls; safe browser failure | `server/integration.test.ts` |
| Permanent provider failure | HTTP 503; 1 provider call; safe browser failure | `server/integration.test.ts` |
| Shared deadline / late result | HTTP 503 at shared 15,000 ms; late result ignored | `server/integration.test.ts`, `server/ai/advice-service.test.ts` |
| Malformed provider output | HTTP 503; no provider content rendered | `server/integration.test.ts` |
| Extra provider output field | HTTP 503; no provider content rendered | `server/integration.test.ts` |
| Invalid advice category | HTTP 503; no provider content rendered | `server/integration.test.ts` |
| Transient then success | Success with 2 provider calls | `server/integration.test.ts` |
| Transient twice | 2 provider calls, then HTTP 503 | `server/integration.test.ts` |
| Non-retryable failure | 1 provider call | `server/integration.test.ts` |
| Concurrent coach action | One in-flight browser request | `server/integration.test.ts`, `src/ai/coach-controller.test.ts` |
| Restart with stale success | Old success ignored | `server/integration.test.ts`, `src/ai/coach-controller.test.ts` |
| Restart with stale failure | Old failure ignored | `server/integration.test.ts`, `src/ai/coach-controller.test.ts` |
| Frontend provider/secret boundary | Built frontend scan passed | `scripts/check-frontend-boundary.mjs`, `src/ai/frontend-boundary.test.ts` |
| One permitted live Gemini verification | `FAILED`; `providerCallCount: 1`; `adviceValid: false`; no retry | `scripts/verify-gemini.ts`; observed T144 result |

## Offline verification

Phase 13 observed results:

- `npm test`: 21/21 files and 206/206 tests passed.
- `npm run smoke`: 6/6 checks passed.
- `npm run typecheck`: passed.
- `npm run build`: passed (Vite frontend output in `dist/`; server output in
  `dist-server/`).
- `npm test -- src/config.test.ts src/game.test.ts src/input.test.ts`: 3/3
  files and 42/42 tests passed (config 14, game 21, input 7).
- `npm test -- evals/week3-formal.test.ts`: 5/5 passed.
- `npm test -- evals/week3-holdout.test.ts`: 1/1 passed.
- `npm run check:frontend-boundary`: passed.
- `git diff --check`: passed.

No T138 fix was required. Phase 12 cross-boundary coverage is represented by
the matrix and `server/integration.test.ts` (11 tests).

## Live Gemini verification

Command: `npm run verify:gemini`

Execution count: 1

Sanitized result:

```json
{"status":"FAILED","providerCallCount":1,"adviceValid":false}
```

Retry: no retry performed.

The one permitted live verification did not produce a validated successful
result. The sanitized script intentionally does not expose enough raw provider
detail to determine a root cause from this evidence alone. It was not rerun.

## Secret and frontend bundle boundary

- `GEMINI_API_KEY` and `GEMINI_MODEL` are backend-only configuration.
- `.env` and `.env.*` are ignored; `.env.example` is explicitly allowed and
  contains empty placeholders only.
- The production frontend bundle scan passed for SDK, credential identifiers,
  provider/prompt identifiers, server references, and a configured key when
  supplied to the checker.
- Browser source boundary tests confirm no Gemini SDK, server provider, prompt,
  or Gemini configuration import in browser modules.
- No real secret is recorded in this document.

## Week03 regression preservation

The Phase 13 focused config/game/input suite, formal evaluation, holdout
evaluation, and smoke checks all passed as recorded above.

## Final requirement audit

| Requirement family | Concrete implementation and evidence | Audit result |
|---|---|---|
| FR-001–FR-004: terminal-only, explicit browser flow | `src/main.ts`, `src/ai/api-client.ts`, `src/ai/coach-controller.ts`, controller/API tests, and smoke | Covered |
| FR-005–FR-010: exact request structure, semantic validation, zero-call rejection | `server/ai/validation.ts`, `server/app.ts`, validation/app/integration tests | Covered |
| FR-011–FR-012: provider abstraction and two approved implementations | `server/ai/provider.ts`, fake provider, Gemini adapter, provider tests | Covered |
| FR-013–FR-016: exact untrusted output validation and no malformed display | `validateAiAdvice`, advice service, integration tests | Covered |
| FR-017–FR-020: shared deadline, bounded transient retry, safe failure/no leakage | `server/ai/advice-service.ts`, app/service/integration tests | Covered |
| FR-021–FR-023: backend-only configuration and environment example | `server/ai/config.ts`, `server/composition.ts`, `.gitignore`, `.env.example`, frontend-boundary checks | Covered; Gemini is recorded as provider. The actual model identifier remains deployment configuration and is not copied from local `.env` into evidence. |
| FR-024–FR-027: Week03 preservation and minimum terminal telemetry | `src/game.ts`, `src/ai/game-summary.ts`, game/summary tests, Phase 13 regression results | Covered |
| FR-028–FR-029: ownership/restart safety and adjacent DOM without Canvas changes | `CoachController`, `src/main.ts`, controller/integration tests, smoke; `src/render.ts` unchanged | Covered |
| API MUSTs: exact six-field request, exact three-field 200, exact 400/503 envelopes | [OpenAPI contract](../specs/001-brickpulse-ai-coach/contracts/openapi.yaml), `server/app.ts`, app/integration tests | Covered |
| A1 | Fake-backed valid summary → exact validated 200 advice | Covered: integration test |
| A2 | Structural and semantic invalid summary → 400 / zero provider calls | Covered: integration test |
| A3 | Provider failure → exact safe 503/no raw error | Covered: app/integration tests |
| A4 | Delayed fake → controlled 15-second timeout / exact 503 | Covered: service/integration tests with fake time |
| A5 | Missing/unexpected/invalid/invalid-text output rejected | Covered: validation/service/integration tests |
| A6 | Transient cases ≤2 attempts; non-retryable 1 or 0 | Covered: advice-service/integration tests |
| A7 | Week03 remains intact | Covered: focused, formal, holdout, typecheck, build, and smoke results |
| SC-001–SC-004 | Valid, invalid, unavailable, and retry acceptance behavior | Covered by A1–A6 evidence above |
| SC-005 | Routine suite needs no credential/live call | Covered: deterministic `npm test` result and fake provider tests |
| SC-006 | Browser source and built bundle expose no credential/provider boundary | Covered: source test and production bundle checker |
| SC-007–SC-008 | Week03 regression and restart usability after AI outcomes | Covered: Phase 13 checks, controller/integration tests, smoke |
| SC-009 | One explicit production-path live check records actual sanitized outcome | Covered: one execution, `FAILED` / `providerCallCount: 1` / `adviceValid: false`, no retry |

No offline Core blocker was found. The live result is evidence of one failed
validated live attempt, not evidence of a live pass and not diagnosed here.

## Known limitations

- External provider availability is outside the application.
- Browser abort does not guarantee provider-side cancellation or billing.
- Core has no authentication, rate limiting, deployment work, persistent usage
  history, or dashboard.
- Model availability is controlled by deployment configuration and the
  provider.
- The one live verification outcome was `FAILED` and was intentionally not
  retried.

## Team contributions

Not documented: no factual contributor information was provided for this
evidence artifact, and no contributor attribution is inferred.

## References

- [Week04 specification](../specs/001-brickpulse-ai-coach/spec.md)
- [Week04 plan](../specs/001-brickpulse-ai-coach/plan.md)
- [OpenAPI contract](../specs/001-brickpulse-ai-coach/contracts/openapi.yaml)
- [Provider contract](../specs/001-brickpulse-ai-coach/contracts/provider.md)
- `server/integration.test.ts`
- `server/ai/advice-service.test.ts`
- `server/ai/gemini-provider.test.ts`
- `scripts/verify-gemini.ts`
