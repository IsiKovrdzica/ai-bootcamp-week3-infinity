# Implementation Plan: BrickPulse Post-Game AI Coach

**Branch**: `001-brickpulse-ai-coach` | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)

## Summary

Add one post-game, explicitly triggered AI Coach to the existing BrickPulse app. Preserve the Week03 game rules and Canvas renderer; add only cumulative `RUNNING`-time telemetry to `GameState`. A small DOM controller in the Vite frontend sends an exact `GameSummary` to one Node/TypeScript HTTP endpoint. The backend validates the request before provider access, executes a bounded provider service behind `AiAdviceProvider`, validates the provider result as unknown, and projects only exact public success/error contracts.

The backend uses Node's built-in HTTP server rather than a server framework. Routine tests inject `FakeAiAdviceProvider`. The only live adapter is `GeminiAiAdviceProvider`, using backend-only environment configuration and the official `@google/genai` SDK.

## Technical context

| Area | Decision |
|---|---|
| Frontend | Existing vanilla TypeScript, HTML, CSS, Canvas, and Vite |
| Backend | Node.js TypeScript, ESM, built-in `node:http` |
| Runtime baseline | Node 20+ documented; current development environment is Node 24 |
| AI provider | Gemini through `@google/genai`; default example model `gemini-3.5-flash-lite`, always read from `GEMINI_MODEL` |
| Validation | Handwritten exact-key runtime validators; no schema-validation dependency |
| Testing | Existing Vitest; pure handler/service/controller tests with fake provider and fake timers |
| Local routing | Vite proxy `/api` to backend on `127.0.0.1:8787`; browser uses relative `/api/ai/advice` |
| Persistence | None |

## Constitution and scope check

- `docs/GAME_SPEC.md` remains authoritative for all existing gameplay.
- `specs/001-brickpulse-ai-coach/spec.md` is authoritative only for Week04 AI behavior and minimum telemetry.
- No Week03 historical specification, evidence, evaluation, or context-manifest file is rewritten.
- No AI call enters `updateGame`, rendering, input handling, or an animation-frame path.
- No extra endpoint, provider, model fallback, database, authentication, deployment, streaming, agent, or gameplay redesign is introduced.
- The dependency additions below require explicit approval during implementation under the existing repository rules.

## Proposed repository layout

```text
index.html
src/
  game.ts                         # add durationSeconds only
  game.test.ts                    # deterministic duration regression tests
  ai/
    contracts.ts                  # browser-safe request/success/error types
    game-summary.ts               # derive exact summary from terminal GameState
    coach-controller.ts           # request ownership/state; injected transport/view
    coach-controller.test.ts
  main.ts                         # bind DOM, terminal state, restart invalidation
  style.css                       # minimal coach panel styling
server/
  index.ts                        # composition root and node:http listener
  app.ts                          # exact route/body handling; injectable service
  ai/
    contracts.ts                  # backend domain/provider failure types
    validation.ts                 # exact structural + semantic validators
    provider.ts                   # AiAdviceProvider interface
    fake-provider.ts              # deterministic modes and call count
    gemini-provider.ts            # sole provider-specific module
    prompt.ts                     # versioned prompt and JSON response schema
    advice-service.ts             # deadline, retry, validation, safe projection
    usage-log.ts                  # sanitized structured diagnostic event
  *.test.ts                       # handler/service/validation tests
scripts/
  dev.mjs                         # start API and Vite; terminate both together
  verify-gemini.ts                # explicit one-call live verification
vite.config.ts                    # development proxy only
tsconfig.server.json              # NodeNext typecheck, including server tests/live script
tsconfig.server.build.json        # production emit, excluding tests/live script
.env.example
```

`src/ai/contracts.ts` contains no provider configuration and may be imported by browser code. `server/**` must never be imported from `src/**`. Server contracts may structurally mirror public DTOs, but server validation remains authoritative and accepts `unknown`.

## Implementation phases

### Phase 0 — Activate the narrow Week04 instruction boundary

Before code work, update only the active instruction layer:

1. `AGENTS.md`: add the Week04 spec to authority order and permit backend/provider/timeout/retry work only for this feature; retain every Week03 gameplay and secret restriction.
2. `.github/00-index.instructions.md`: route Week04 AI architecture, validation, tests, commands, and review to the new spec and relevant modules.
3. `.github/instructions/01-architecture.instructions.md`: preserve game ownership rules while adding the browser → backend → provider boundary.
4. `.github/instructions/02-testing.instructions.md`: allow Week04 tests derived from this spec and require fake-first, no-network routine tests.
5. `.github/instructions/03-workflow.instructions.md`: replace the unconditional Week04 stop with a narrow approved-feature workflow.
6. `.github/instructions/05-code-review.instructions.md`: review the approved backend/provider work instead of rejecting it; add secret, validation-order, retry, timeout, and regression checks.

Do not change `.github/instructions/04-build-and-commands.instructions.md` in this phase. Update it only after implementation establishes new commands and only if the user separately approves recording their verified status. Do not change `docs/CONTEXT_MANIFEST.md`; it describes the historical Week03 baseline.

### Phase 1 — Establish contracts and deterministic validation

1. Define exact public DTO types and constants for 32 bricks, 3 lives, and 10 points per brick.
2. Implement a reusable `isPlainRecord`/exact-key check.
3. Validate `GameSummary` from `unknown`: exact keys and types first, semantic invariants second.
4. Validate provider output from `unknown`: exact three keys, string bounds/non-whitespace, and exact category enum.
5. Unit-test success, missing/extra keys, wrong types, non-finite/fractional counts, each semantic inconsistency, extra provider fields, length bounds, and invalid categories.

The backend does not import a TypeScript type assertion as proof. Validators return a discriminated result or validated value.

### Phase 2 — Add minimum game telemetry and summary derivation

1. Add `durationSeconds: number` to `GameState`, initialized to `0` by `createInitialState`.
2. In `updateGame`, add each finite non-negative simulation slice to the counter only when that slice is actually processed from `RUNNING`. Count the final processed slice that causes `WON`, life loss, or `GAME_OVER`; do not count time after the transition. Ignore negative or non-finite deltas for telemetry accumulation only, without changing their existing physics handling.
3. Preserve the counter when a non-final miss changes status to `READY`; the existing full restart path calls `createInitialState` and resets it.
4. Add focused tests for initial zero, accumulation in `RUNNING`, exclusion in `READY` and terminal states, survival across life loss, reset on restart, and protection from negative/non-finite telemetry values. Re-run existing movement/collision/scoring tests unchanged.
5. Derive the terminal summary without duplicate mutable counters:
   - `outcome = state.status` after narrowing to `WON | GAME_OVER`;
   - `score = state.score`;
   - `bricksDestroyed = state.bricks.filter(brick => !brick.alive).length`;
   - `livesRemaining = state.lives`;
   - `livesLost = state.config.lives - state.lives`;
   - `durationSeconds = state.durationSeconds`.

### Phase 3 — Build provider-independent service and HTTP boundary

1. Define the small interface:

   ```ts
   interface AiAdviceProvider {
     generateAdvice(
       summary: Readonly<GameSummary>,
       options: { signal: AbortSignal },
     ): Promise<unknown>;
   }
   ```

2. Define normalized provider failures with a closed classification (`transient`, `auth`, `configuration`, `safety`, `client_cancelled`, `permanent`, `programming`). Only `transient` is retryable.
3. Implement the advice service with one outer 15,000 ms deadline, one `AbortController`, at most two calls, and one fixed 250 ms retry delay injected behind clock/sleep functions for deterministic tests.
4. Race the complete operation against the deadline in addition to passing the signal. Once expired, mark the operation settled, abort the signal, return failure, and ignore any late provider fulfillment.
5. Validate provider output after each successful provider return. Invalid output is immediately non-retryable.
6. Implement a pure HTTP handler/composition seam, then a thin `node:http` adapter:
   - accept only `POST /api/ai/advice`;
   - reject malformed JSON or invalid DTO as the exact HTTP 400 envelope;
   - impose a small request-body limit (16 KiB) and treat overflow as invalid input;
   - call the service only after validation;
   - return exact HTTP 200 or 503 JSON with no extra public fields;
   - return an application-owned minimal response for unmatched routes/methods without adding another feature endpoint.

### Phase 4 — Implement fake and Gemini providers

1. `FakeAiAdviceProvider` supports deterministic modes: valid success, permanent failure, transient failure, transient-then-success, repeated transient failure, delayed result, and malformed output. It exposes `providerCallCount` and accepts injected timing; it never uses network access.
2. `GeminiAiAdviceProvider` alone imports `@google/genai`, reads no browser state, and is constructed only with backend-read `GEMINI_API_KEY` and `GEMINI_MODEL`.
3. Use `gemini-3.5-flash-lite` in `.env.example` documentation/quickstart as the recommended current stable lightweight value, but keep `.env.example` itself empty as required (`GEMINI_MODEL=`).
4. Use Gemini structured JSON output with the three-field schema as a generation constraint. Parse the returned JSON as `unknown`; the application validator remains mandatory.
5. Explicitly configure SDK transport retries to one total SDK attempt. The advice service alone owns the optional second application attempt. Verify the installed SDK API/options in a focused adapter test or compile check because SDK retry configuration is version-sensitive.
6. Pass the outer deadline's abort signal into the SDK. Document that client abort prevents a late application success but may not cancel already accepted provider-side work or billing.
7. Map SDK/API errors to the closed failure classification without returning raw messages.

### Phase 5 — Add post-game frontend controller and DOM

1. Add a small coach section adjacent to `#game` in `index.html`: button plus status/output region with accessible live status.
2. Keep it hidden/disabled outside `WON` and `GAME_OVER`; never trigger it automatically.
3. Add an injectable browser-safe `requestAdvice` transport using relative `fetch('/api/ai/advice')`.
4. Use a small `CoachController` state machine (`hidden | idle | pending | success | failure`) with an incrementing game-session identifier and optional per-request `AbortController`.
5. On click, synchronously enter `pending` before starting fetch so a second click cannot duplicate an in-flight request.
6. After settle, permit another explicit request for the same terminal session.
7. Detect the existing full restart transition from terminal to `READY`; increment the session identifier, abort the browser request where possible, clear coach output, and ignore any result whose captured session/request identifier is stale.
8. Keep `render.ts` unchanged. `main.ts` binds state transitions to the controller after the normal game update/render work.

### Phase 6 — Verification, live check, and evidence

1. Run focused RED/GREEN slices, then the complete fake-based suite.
2. Run existing Week03 focused, formal, holdout, smoke, typecheck, and build checks without rewriting them.
3. Inspect the production browser bundle for `GEMINI_API_KEY`, configured secret values, `@google/genai`, and provider configuration; all must be absent.
4. Run the separate live check only when explicitly requested and credentials are configured. It makes one provider call and records only sanitized outcome metadata.
5. Record actual commands, results, limitations, provider/model identifier, and skipped live checks in one Week04 evidence artifact; do not duplicate plan/spec material.

## Mandatory validation order

```text
HTTP body
  -> bounded read and JSON parse
  -> runtime structural validation (plain object, exact keys/types)
  -> semantic GameSummary validation
  -> provider invocation (call count starts here)
  -> provider result retained as unknown
  -> strict runtime AiAdvice validation
  -> exact safe public projection
  -> frontend
```

No provider instance method is called on either parsing or validation failure. Handler tests inject a counting fake and assert `providerCallCount === 0` for every invalid structural and semantic case.

## Timeout and retry algorithm

```text
deadline = clock.now() + 15_000
start one outer abort/deadline guard

for attempt in [1, 2]:
  if deadline expired: fail safely
  call provider once with shared abort signal
  if valid output: return validated advice only if deadline still active
  if failure is non-transient: fail safely
  if attempt == 2: fail safely
  wait min(250 ms, remaining budget) with abort support

on deadline:
  mark settled -> abort -> return AI_ADVICE_UNAVAILABLE
```

The Gemini SDK must be configured for one transport attempt; otherwise SDK-internal requests would violate the observable application attempt bound. Tests use fake timers/injected clock and never sleep for 15 real seconds.

## Prompt plan

- Store one backend-only versioned template, initially `brickpulse-post-game-coach/v1`.
- System instruction: act only as a concise BrickPulse post-game coach; use only supplied data; do not infer or invent events; output one summary, one next-game action, and one allowed category.
- Serialize the validated summary in a clearly delimited JSON data block and explicitly label it untrusted data, not instructions.
- Request JSON structured output with exact property names, required list, enum, and length descriptions; do not include secrets, full `GameState`, logs, or user-controlled free text.
- Keep low output limits and no tools, search, grounding, files, or conversation history.

## Test strategy and acceptance mapping

| Test area | Proof |
|---|---|
| Request validation | Exact valid request; malformed JSON; non-object; missing/extra/wrong fields; non-finite/fractional/negative values; every semantic invariant; invalid cases assert HTTP 400 and zero provider calls |
| Provider output | Exact valid advice; missing/extra fields; wrong types; blank/overlong strings; invalid category; failures assert exact HTTP 503 and never expose malformed data |
| Retry | Transient then success = 2 calls; transient twice = 2 calls + 503; permanent/auth/config/safety/invalid output = 1 call; invalid request = 0 calls |
| Timeout | Fake timers advance one shared 15-second deadline across call and retry delay; late resolution cannot replace 503 |
| HTTP projection | Exact status, content type, and deep equality for 200/400/503 bodies; no extra keys |
| Telemetry | Initial/reset zero; only processed `RUNNING` slices accumulate; READY/terminal excluded; life-loss preservation |
| Frontend controller | terminal-only availability; pending disables immediately; concurrent click ignored; settle permits retry; restart aborts/invalidates; stale result ignored |
| Secret boundary | Browser source/bundle contains no key, model env access, SDK import, or server module |
| Regression | Existing Week03 focused/formal/holdout tests, smoke, typecheck, and build remain green |
| Live integration | Explicit command, one call, same validator, sanitized pass/fail/skip result |

## Dependency changes proposed

| Package | Kind | Reason |
|---|---|---|
| `@google/genai` | runtime dependency | Official Gemini JavaScript/TypeScript SDK; isolated to backend adapter and added only after explicit dependency approval |
| `@types/node` | development dependency | Type-check Node HTTP, process, timers, and scripts |
| `tsx` | development dependency | Run TypeScript backend and explicit verification script locally without a separate watch build |

No Express/Fastify, Zod, dotenv, concurrently, database, logging framework, or second provider is proposed. Node reads environment variables directly. `scripts/dev.mjs` uses `node:child_process` to run Vite and the `tsx` backend together.

## Package scripts planned

Preserve current script meanings and add narrowly:

| Script | Planned command/purpose |
|---|---|
| `dev` | Keep existing frontend-only Vite command |
| `dev:server` | `node --env-file=.env --import tsx --watch server/index.ts` for local development |
| `dev:all` | `node scripts/dev.mjs` to supervise backend + Vite |
| `test` | Keep `vitest run`; all discovered tests remain fake-only/no-network |
| `typecheck` | Expand to frontend plus `tsc -p tsconfig.server.json`; server config includes tests and `scripts/verify-gemini.ts` with `noEmit` |
| `build` | Type-check both targets, build Vite frontend, then emit production server files with `tsconfig.server.build.json` |
| `start:server` | `node dist-server/server/index.js`; consumes already-exported production environment variables |
| `verify:gemini` | `node --env-file=.env --import tsx scripts/verify-gemini.ts`; script is typechecked but never executed by routine checks or emitted in the production build |

`smoke` and `preview` remain available. The smoke script may need a focused Week04 extension or companion fake-backend smoke mode during implementation; do not make it require Gemini.

## Local development arrangement

- Backend listens on `127.0.0.1:8787` by default, with an optional backend-only `PORT` override.
- The repository remains ESM (`package.json` keeps `"type": "module"`). `tsconfig.server.json` uses `module: "NodeNext"`, `moduleResolution: "NodeNext"`, `rootDir: "."`, and `noEmit: true`; it type-checks `server/**/*.ts`, server tests, and `scripts/verify-gemini.ts`.
- `tsconfig.server.build.json` extends the server config, sets `noEmit: false` and `outDir: "dist-server"`, includes production `server/**/*.ts`, and excludes `server/**/*.test.ts` plus `scripts/**`. With `rootDir: "."`, the emitted entry is exactly `dist-server/server/index.js`.
- Relative imports in Node-targeted TypeScript use `.js` specifiers where NodeNext requires them, allowing TypeScript to resolve source `.ts` files while emitted Node ESM resolves `.js` files.
- Vite remains the frontend development server and proxies only `/api` to the backend.
- Browser requests remain same-origin relative paths and require no credential or provider configuration.
- Missing Gemini configuration is a backend configuration failure that yields the safe unavailable response; it never causes a browser-side configuration requirement. Fake providers are injected by tests, not selected through an undocumented production endpoint or browser flag.
- `npm run dev:all` starts both processes and forwards termination; developers may also run `dev:server` and `dev` separately.
- Local commands that intentionally use `.env` rely on Node 20+'s built-in `--env-file=.env`; `tsx` is loaded with `--import` and is not assumed to load environment files. Backend code reads configuration through `process.env`. `start:server` accepts already-exported environment variables and does not require `.env`.
- Vite is never described or used as the application backend.

## Evidence plan

The Week04 evidence record will map each claim to an observed command/test:

1. source/layout and Vite proxy inspection for the frontend/backend boundary;
2. `.env.example`, `.gitignore`, server composition, and browser-bundle scan for secret location;
3. sanitized live-check metadata for provider/model;
4. exact handler tests for request/success/failure contracts;
5. validator test matrices for local and provider output;
6. fake-provider success, permanent failure, timeout, malformed output, retry, and call-count tests;
7. frontend controller tests for concurrency and stale responses;
8. Week03 test, formal evaluation, holdout, smoke, typecheck, and build outputs;
9. separately invoked live verification result or an honest `SKIPPED` with reason;
10. known limitations: external provider availability, client abort not guaranteeing provider-side cancellation, and no deployment/rate-limiting/authentication in scope.

## Risks and gates

| Risk | Mitigation / gate |
|---|---|
| Active repository instructions prohibit Week04 work | Complete Phase 0 before implementation |
| SDK retry defaults exceed two attempts | Pin SDK version, explicitly set one SDK attempt, and verify adapter behavior/options before live use |
| Abort does not guarantee provider-side cancellation | Race/settle locally, ignore late results, log limitation without exposing payloads |
| Browser accidentally receives server code/env | Separate directories/configs, one-way imports, relative API client, production bundle scan |
| Timing tests become slow/flaky | Inject clock/sleep and use Vitest fake timers |
| Current root TypeScript config covers only `src` | Add dedicated Node config and make typecheck/build cover both |
| Model availability changes | Keep `GEMINI_MODEL` required/configurable; document current recommendation in research/quickstart, not application behavior |

## Planning status

No unresolved product decision remains. One implementation-time compatibility gate remains: confirm the pinned `@google/genai` version's exact structured-output, abort, and retry-option surface before writing the adapter. If one-attempt SDK retry configuration cannot be proven, use a backend-only direct `fetch` adapter to the Gemini REST API rather than accept hidden retries; the provider interface and all application behavior remain unchanged.
