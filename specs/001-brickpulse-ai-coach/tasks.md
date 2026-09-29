# Implementation Tasks: BrickPulse Post-Game AI Coach

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/](./contracts/)

**Scope**: Core Week04 feature only. Do not implement Stretch work.

## Task notation

- `[P]` means the task may run in parallel with other `[P]` tasks in the same dependency window because it changes different files and does not depend on unfinished behavior.
- `[RED]` means add or change the expectation first and confirm it fails for the intended missing behavior.
- `[GREEN]` means implement only enough behavior to satisfy the preceding RED task(s).
- Every verification/evidence task records only commands actually run and results actually observed.

## Hard dependency chain

```text
Week03 baseline and instruction boundary
  -> contracts and validation RED/GREEN
  -> fake provider
  -> service and HTTP handler RED/GREEN
  -> timeout/retry RED/GREEN
  -> telemetry and frontend RED/GREEN
  -> Gemini adapter compatibility gate and implementation
  -> full offline verification
  -> optional one-call live verification
  -> evidence and final security review
```

The SDK compatibility research task may start earlier, but no live adapter or call may precede the fake-backed Core boundaries and offline verification.

---

## Phase 0 — Week03 baseline and repository boundary

**Purpose**: Freeze the actual baseline and authorize only the approved additive Week04 scope.

- [x] T001 Inspect `git status`, `package.json`, `package-lock.json`, `.gitignore`, `tsconfig.json`, `src/`, `evals/`, `scripts/`, `AGENTS.md`, `.github/00-index.instructions.md`, and routed `.github/instructions/*.instructions.md`; record pre-existing changes without modifying them.
- [x] T002 Run `npm test` and save the exact baseline result for later Week04 evidence.
- [x] T003 Run `npm run smoke` and save the exact baseline result, including any environment/browser limitation.
- [x] T004 [P] Run `npm run typecheck` and save the exact baseline result.
- [x] T005 [P] Run `npm run build` and save the exact baseline result.
- [x] T006 Compare T002–T005 with the documented Week03 baseline; stop and report any unexplained failure before Week04 code work.
- [x] T007 Update `AGENTS.md` authority and boundaries so `docs/GAME_SPEC.md` remains authoritative for gameplay and `specs/001-brickpulse-ai-coach/spec.md` is authoritative only for the approved Week04 AI boundary.
- [x] T008 Update `.github/00-index.instructions.md` to route Week04 architecture, validation/testing, workflow, and review tasks to the approved spec and relevant modules.
- [x] T009 [P] Narrowly update `.github/instructions/01-architecture.instructions.md` to permit only the planned browser → TypeScript backend → `AiAdviceProvider` boundary while preserving all Week03 game ownership rules.
- [x] T010 [P] Narrowly update `.github/instructions/02-testing.instructions.md` to add fake-first Week04 tests without weakening deterministic Week03 testing.
- [x] T011 [P] Narrowly update `.github/instructions/03-workflow.instructions.md` so the approved feature no longer triggers the unconditional Week04 stop; retain specification-first RED/GREEN and evidence rules.
- [x] T012 [P] Narrowly update `.github/instructions/05-code-review.instructions.md` with request/output validation, secret boundary, timeout/retry, fake-provider, and Week03 regression checks.
- [x] T013 Verify `.github/instructions/04-build-and-commands.instructions.md` has no concrete conflict and leave it unchanged; leave `docs/CONTEXT_MANIFEST.md` and all other Week03 historical artifacts unchanged.
- [x] T014 Inspect the instruction-only diff and confirm it authorizes no second endpoint/provider, database, authentication, deployment, streaming, agent, or gameplay redesign.
- [x] T015 Re-run `npm run typecheck` (or the smallest existing no-behavior check) to demonstrate the instruction update changed no application behavior; record the result.

**Checkpoint**: Baseline is known and active instructions permit only this Week04 feature.

---

## Phase 1 — Exact contracts and validation

**Purpose**: Establish the untrusted boundaries before any provider or server integration.

- [x] T016 Add browser-safe `GameSummary`, `AiAdvice`, and exact public error types/constants in `src/ai/contracts.ts`; include no provider import or environment access.
- [x] T017 Add compile-valid no-behavior validator exports with the planned signatures in `server/ai/validation.ts`, then add `server/ai/validation.test.ts` scaffolding; stubs may return a fixed failure but MUST NOT implement validation behavior.
- [x] T018 [RED] Write the valid `GameSummary` structural/semantic acceptance case in `server/ai/validation.test.ts`; run it and confirm meaningful RED.
- [x] T019 [RED] Add table-driven request tests for non-object, `null`, array, missing key, extra key, wrong type, non-finite value, negative value, and fractional count cases.
- [x] T020 [RED] Add semantic request tests for score mismatch, brick bounds, life bounds, life-sum mismatch, incomplete `WON`, and nonzero-lives `GAME_OVER` using 32 bricks, 3 lives, and 10 points per brick.
- [x] T021 [GREEN] Implement exact-key plain-object, structural, and semantic `GameSummary` validation in `server/ai/validation.ts`; return a validated value/result without coercion or type assertion as proof.
- [x] T022 Run T018–T020 tests and confirm GREEN; run `git diff --check` on the validation slice.
- [x] T023 Add the backend `AiAdvice` domain type/category constants in `server/ai/contracts.ts`, keeping provider results typed as `unknown` until validation.
- [x] T024 [RED] Write the valid exact `AiAdvice` acceptance test in `server/ai/validation.test.ts`; confirm meaningful RED.
- [x] T025 [RED] Add provider-output tests for missing key, extra key, wrong type, whitespace-only strings, empty strings, summary over 160 characters, and recommendation over 220 characters.
- [x] T026 [RED] Add exact-category tests covering the four allowed values and representative unknown/case-mismatched values.
- [x] T027 [GREEN] Implement strict `AiAdvice` validation in `server/ai/validation.ts`; reject rather than strip unexpected fields.
- [x] T028 Run all Phase 1 tests and confirm GREEN; verify the validators accept `unknown` and emit only exact validated objects.

**Checkpoint**: Both contracts are runtime-validated independently of Gemini and HTTP.

---

## Phase 2 — Provider abstraction and deterministic fake

**Purpose**: Create the test boundary before service or live-provider work.

- [x] T029 Define the minimal `AiAdviceProvider.generateAdvice(summary, { signal }): Promise<unknown>` interface and closed internal failure categories in `server/ai/provider.ts`; add a compile-valid no-behavior `FakeAiAdviceProvider` export in `server/ai/fake-provider.ts` whose methods fail deterministically until GREEN.
- [x] T030 [RED] Add `server/ai/fake-provider.test.ts` expectations for deterministic valid success and synchronous call-count increment.
- [x] T031 [RED] Add fake-provider expectations for permanent failure, retryable transient failure, and transient-then-success sequencing.
- [x] T032 [RED] Add fake-provider expectations for deferred/delayed resolution, abort observation, and arbitrary malformed `unknown` output.
- [x] T033 [GREEN] Implement `FakeAiAdviceProvider` modes and `providerCallCount` in `server/ai/fake-provider.ts`; use injected/deferred timing only and no network access.
- [x] T034 Run fake-provider tests and confirm every method entry increments the counter exactly once.
- [x] T035 Prepare the invalid structural/semantic fixture matrix and expected `providerCallCount === 0` assertions for the later service test without importing an unavailable service module; activate it as RED only after the compile-valid seam exists at T043.

**Checkpoint**: Routine tests have a deterministic provider with observable calls.

---

## Phase 3 — Server TypeScript build and minimal backend skeleton

**Purpose**: Prove the Node/ESM build layout before endpoint behavior or provider integration.

- [x] T036 Obtain explicit dependency approval, then add pinned compatible development dependencies `@types/node` and `tsx`; update `package.json` and `package-lock.json` only through npm.
- [x] T037 Add `tsconfig.server.json` for typechecking with `module`/`moduleResolution: "NodeNext"`, `rootDir: "."`, `noEmit: true`, and includes for `server/**/*.ts` plus `scripts/verify-gemini.ts`; add `tsconfig.server.build.json` extending it with `noEmit: false`, `outDir: "dist-server"`, production `server/**/*.ts` only, and exclusions for `server/**/*.test.ts` and `scripts/**`.
- [x] T038 Add the smallest `server/index.ts` composition/start skeleton using `node:http`; do not add routes beyond the planned advice endpoint and minimal unmatched behavior.
- [x] T039 Add exact scripts: local `dev:server` uses `node --env-file=.env --import tsx --watch server/index.ts`; `build:server` emits with `tsconfig.server.build.json`; `start:server` runs `node dist-server/server/index.js` with already-exported environment variables.
- [x] T040 Use `.js` specifiers for Node-targeted relative imports where NodeNext requires them; run server typecheck/build, start exactly `dist-server/server/index.js`, and verify it boots and terminates cleanly before provider work.
- [x] T041 Add `scripts/dev.mjs` that only starts Vite and the backend, forwards termination signals, and stops the sibling when either process exits; do not build a reusable process-management framework.
- [x] T042 Add `vite.config.ts` with only the development `/api` proxy to `127.0.0.1:8787`; verify frontend source still uses a relative route.
- [x] T043 Update planned `dev:all`, combined `typecheck`, and combined `build` scripts while preserving existing script meanings; add a compile-valid no-behavior `server/ai/advice-service.ts` export with the planned injected service seam before Phase 4 RED tests.

**Checkpoint**: Server TypeScript emits and runs correctly before functional endpoint work.

---

## Phase 4 — Advice service and validation-before-provider proof

**Purpose**: Establish the application boundary and safe output projection before HTTP wiring.

- [x] T044 [RED] Add `server/ai/advice-service.test.ts` for valid summary + fake success → exact validated `AiAdvice`.
- [x] T045 [RED] Add service cases for every invalid structural/semantic request family and assert `providerCallCount === 0`; connect or replace the Phase 2 gate harness.
- [x] T046 [RED] Add service cases for malformed provider output and invalid category; assert one provider call, unavailable result, and no malformed fields returned.
- [x] T047 [RED] Add a provider output with one unexpected field and assert strict rejection rather than projection/stripping.
- [x] T048 [GREEN] Implement the validation-first orchestration skeleton in `server/ai/advice-service.ts`: validate request, invoke injected provider, retain result as `unknown`, validate output, and return an internal success/unavailable result.
- [x] T049 Ensure only validated `summary`, `recommendation`, and `category` are projected on success; never spread provider objects.
- [x] T050 Run Phase 4 tests and confirm invalid local input always produces zero provider calls; then add a compile-valid no-behavior `server/app.ts` handler export with the planned request/response seam before Phase 5 RED tests.

**Checkpoint**: Service order is proven without HTTP, timeouts, retries, or Gemini.

---

## Phase 5 — Minimal HTTP endpoint

**Purpose**: Implement the exact public API around the proven service.

- [x] T051 [RED] Add `server/app.test.ts` for `POST /api/ai/advice` valid JSON → HTTP 200, `application/json`, and deep-equal exact `AiAdvice` using an injected fake provider/service.
- [x] T052 [RED] Add malformed JSON, non-object, structural-invalid, and semantic-invalid endpoint cases → exact HTTP 400 envelope and `providerCallCount === 0`.
- [x] T053 [RED] Add provider unavailable/invalid-output endpoint cases → exact HTTP 503 envelope with no diagnostic fields.
- [x] T054 [RED] Add a bounded-body case above 16 KiB → HTTP 400 and zero provider calls.
- [x] T055 [GREEN] Implement a pure request handler and thin `node:http` adapter in `server/app.ts`/`server/index.ts`: exact method/path, bounded read, JSON parse, service invocation, exact content type/status/body.
- [x] T056 Implement minimal unmatched behavior (for example 404 for another path and 405 for another method) locally in `server/app.ts`; do not introduce generalized routing or error frameworks.
- [x] T057 Add tests that public 400/503 bodies contain no stack, raw error, provider payload, prompt, key, model internals, or extra keys.
- [x] T058 Send a failed fake-backed request followed by a valid fake-backed request in the handler test and prove the backend remains usable.
- [x] T059 Run endpoint/service/validation tests and confirm GREEN.

**Checkpoint**: Exact 200/400/503 behavior exists entirely with the fake provider.

---

## Phase 6 — Shared deadline and bounded retry

**Purpose**: Add reliability behavior with deterministic time.

- [x] T060 Add injected clock, abort-aware sleep, and deadline test controls to the advice-service construction seam; production defaults use platform timers.
- [x] T061 [RED] Write a fake-timer test proving the complete operation returns unavailable at one shared 15,000 ms deadline and ignores a later provider resolution.
- [x] T062 [RED] Write transient-first-then-success with a 250 ms retry delay; assert exactly 2 total provider calls and success only before the shared deadline.
- [x] T063 [RED] Write transient failure twice → exactly 2 calls then exact HTTP/service unavailable outcome.
- [x] T064 [RED] Write insufficient-time-before-retry → no second attempt and controlled unavailable outcome.
- [x] T065 [RED] Table-test auth, configuration, safety, cancellation, permanent provider 4xx, malformed output, and programming failures → exactly 1 provider call and no retry.
- [x] T066 [RED] Assert invalid request families remain 0 calls and are never delayed/retried.
- [x] T067 [GREEN] Implement one outer 15-second deadline, shared `AbortController`, settle guard, at most 2 attempts, and one abort-aware 250 ms retry delay in `server/ai/advice-service.ts`.
- [x] T068 Classify only connection/transient failures, 408, 429, and 5xx equivalents as retryable in `server/ai/provider.ts`; map all other agreed classes to non-retryable.
- [x] T069 Run Phase 6 tests with fake timers and confirm no test waits 15 real seconds; then add a compile-valid no-behavior `server/ai/usage-log.ts` sink export before T070 RED.

**Checkpoint**: Timeout and retry policy is exact, bounded, and provider-independent.

---

## Phase 7 — Ephemeral diagnostics and Gemini SDK compatibility gate

**Purpose**: Close the SDK/retry risk before any Gemini adapter is accepted.

- [x] T070 Add tests for an injected `AiUsageEvent` sink in `server/ai/usage-log.test.ts`: provider, model, timestamp, latency, outcome, attempt count, and optional safe token counts only.
- [x] T071 Implement an ephemeral injected sink/sanitized structured logger in `server/ai/usage-log.ts`; add no database, file history, dashboard, API endpoint, raw prompt/payload, key, or stack trace.
- [x] T072 Integrate the sink with the advice service and verify invalid local input records zero attempts without recording the submitted payload.
- [x] T073 Obtain explicit dependency approval for the exact pinned `@google/genai` version before modifying `package.json` or `package-lock.json`; stop if approval is not granted.
- [x] T074 After T073 approval, pin `@google/genai`, then inspect that pinned SDK version’s types/source and official docs for the exact structured JSON API, `AbortSignal` location, transport timeout semantics, and `retryOptions.attempts` semantics; record findings in `research.md` without copying secrets.
- [x] T075 Add a compile-only/provider-adapter spike or focused test proving SDK retry configuration is set to exactly 1 total transport attempt per `generateAdvice` call and the supplied abort signal reaches the request.
- [x] T076 Gate decision: if T075 cannot prove one SDK call equals one transport attempt, remove/avoid the SDK adapter and document direct backend `fetch` to the official Gemini REST endpoint as the selected implementation; do not silently accept nested retries.
- [x] T077 Confirm the selected adapter can request structured JSON and expose the returned text/JSON plus safely available usage metadata without logging raw payloads.

**Checkpoint**: Adapter mechanics are proven; no live call has occurred.

---

## Phase 8 — Minimum duration telemetry and summary derivation

**Purpose**: Add only data needed for the completed-game request.

- [x] T080 Re-inspect `src/game.ts` and `src/game.test.ts`; document the existing derivations for outcome, score, destroyed bricks, remaining lives, and lost lives in the test names/fixtures rather than adding mutable duplicates.
- [x] T081 [RED] Add tests in `src/game.test.ts` for `durationSeconds`: initial 0; no increase in `READY`; increase by processed `RUNNING` slices; no increase after `WON`/`GAME_OVER`; and negative or non-finite `deltaSeconds` cannot make telemetry negative or non-finite.
- [x] T082 [RED] Add duration tests proving preservation through non-final life loss/return to `READY` and reset through the existing full-restart path.
- [x] T083 [GREEN] Add only `durationSeconds` to `GameState` and `createInitialState`; increment it for each finite non-negative processed `RUNNING` slice, including the slice that produces a terminal/life-loss transition, while ignoring invalid deltas for telemetry accumulation only and leaving existing physics handling unchanged.
- [x] T084 Run focused game tests and confirm movement, sub-stepping, collision, scoring, lives, controls, and status transitions remain unchanged; then add a compile-valid no-behavior `src/ai/game-summary.ts` export with the planned terminal-summary signature before T085 RED.
- [x] T085 [RED] Add `src/ai/game-summary.test.ts` for exact `WON` summary derivation from terminal state without full `GameState` leakage.
- [x] T086 [RED] Add exact `GAME_OVER` summary derivation and invalid non-terminal-state rejection tests.
- [x] T087 [GREEN] Implement `src/ai/game-summary.ts` deriving score, non-alive brick count, current lives, `config.lives - lives`, existing terminal status, and duration.
- [x] T088 Run Phase 8 tests plus existing `src/game.test.ts`; confirm all summary outputs satisfy backend invariants.

**Checkpoint**: The browser can construct the six-field request with one new telemetry field only.

---

## Phase 9 — Browser API client and request ownership controller

**Purpose**: Implement browser reliability logic without DOM or provider coupling.

- [x] T089 Add compile-valid no-behavior exports for the injected browser transport in `src/ai/api-client.ts` and request-ownership seam in `src/ai/coach-controller.ts`; stubs must compile but fail the subsequent behavioral assertions.
- [x] T090 [RED] Add `src/ai/coach-controller.test.ts` for a relative `POST /api/ai/advice` transport, exact request body, exact 200 parsing, and exact safe 400/503 handling with injected fetch.
- [x] T091 Assert browser modules never import `server/**`, `@google/genai`, `GEMINI_API_KEY`, or `GEMINI_MODEL`.
- [x] T092 [GREEN] Implement the browser API client in `src/ai/api-client.ts`; send only `GameSummary` and convert all non-success/network failures to the stable safe UI failure.
- [x] T093 [RED] Add controller tests for `hidden → idle → pending → success/failure`, synchronous pending transition, and repeated explicit requests after settle.
- [x] T094 [RED] Add concurrent-click test proving a second click while pending creates no second fetch.
- [x] T095 [RED] Add restart-while-pending tests proving request abort is attempted, coach state clears, session generation increments, and a late old response cannot update the new game.
- [x] T096 [GREEN] Implement `src/ai/coach-controller.ts` with one in-flight request, per-game session identifier, optional request `AbortController`, and injected view/transport callbacks.
- [x] T097 Run Phase 9 tests and confirm no DOM library, network, key, SDK, or server import is required.

**Checkpoint**: Browser request behavior is deterministic and stale-safe before UI wiring.

---

## Phase 10 — Post-game DOM UI

**Purpose**: Attach the Core UI adjacent to the existing Canvas without changing Canvas rendering.

- [x] T100 Add the minimal coach section, `ASK AI COACH` button, status/output elements, and accessible live region adjacent to `#game` in `index.html`.
- [x] T101 Add minimal matching states/styles in `src/style.css`; do not redesign the game.
- [x] T102 Wire the controller in `src/main.ts`; show idle only for existing `WON`/`GAME_OVER`, keep it unavailable in `READY`/`RUNNING`, and never invoke automatically.
- [x] T103 Render pending as `ANALYZING...` with the button disabled; render exact summary, recommendation, and category on success.
- [x] T104 Render only `AI advice is temporarily unavailable. Please try again later.` on failure and re-enable explicit retry after settle.
- [x] T105 Detect the existing terminal-to-`READY` full restart in `src/main.ts`; clear/invalidate coach state while preserving Space restart and all other controls.
- [x] T106 Leave `src/render.ts` unchanged; if a change appears necessary, stop and re-evaluate the DOM attachment plan before editing it.
- [x] T107 Extend the browser smoke path or add a focused fake-backend smoke mode to verify terminal-only control, pending state, success/failure display, and restart usability without Gemini/network access.

**Checkpoint**: The complete user flow works against a controlled fake boundary; gameplay remains independent.

---

## Phase 11 — Gemini provider and versioned prompt

**Purpose**: Add the sole live adapter only after all provider-independent Core behavior is green.

- [x] T110 Add `.env.example` containing exactly empty `GEMINI_API_KEY=` and `GEMINI_MODEL=` placeholders.
- [x] T111 Update `.gitignore` to ignore `.env` and `.env.*` while explicitly allowing `.env.example`; verify no existing environment file becomes tracked.
- [x] T112 Add backend environment parsing/validation in the server composition root; missing key/model is a non-retryable configuration failure mapped to the safe 503 response.
- [x] T113 Add a compile-valid no-behavior versioned prompt export `brickpulse-post-game-coach/v1` in `server/ai/prompt.ts` before prompt RED tests; include no real prompt construction yet.
- [x] T114 [RED] Add prompt unit tests requiring all six summary fields as data, no additional game state, prohibition of invented events, exact response schema/categories, and no secrets/tools/history.
- [x] T115 [GREEN] Implement the versioned prompt, then implement `GeminiAiAdviceProvider` in `server/ai/gemini-provider.ts` using the adapter selected at T076, configured model, structured JSON, shared abort signal, and exactly one transport attempt per provider method call.
- [x] T116 Parse provider output as `unknown` and return it to the existing application validator; do not cast or locally strip fields inside the adapter.
- [x] T117 Map Gemini network/status/auth/configuration/safety/cancellation failures to the closed internal categories without exposing raw errors.
- [x] T118 Add adapter tests with injected/mock transport proving minimum context, configured model use, structured-output settings, abort propagation, retry suppression, error classification, and no key/raw-payload logging.
- [x] T119 Wire `GeminiAiAdviceProvider` only in `server/index.ts`; keep tests injecting the fake and keep all browser imports provider-free.

**Checkpoint**: Gemini is isolated and test-covered; still no live call.

---

## Phase 12 — Cross-boundary integration and security tests

**Purpose**: Prove the complete Core behavior offline.

- [ ] T120 Add fake-backed frontend/backend success integration coverage for exact request → exact HTTP 200 advice → rendered success state.
- [ ] T121 Add invalid structural and semantic integration cases → exact HTTP 400 and `providerCallCount === 0`.
- [ ] T122 Add permanent provider failure → exact HTTP 503 and safe UI message.
- [ ] T123 Add shared-deadline timeout → exact HTTP 503 using fake time; no real 15-second sleep.
- [ ] T124 Add malformed output, extra field, and invalid category → exact HTTP 503 and no malformed data rendered.
- [ ] T125 Add transient-then-success and twice-transient integration cases → no more than 2 calls; add non-retryable → exactly 1 call.
- [ ] T126 Add concurrent frontend click and restart-during-pending integration coverage; assert one in-flight request and stale result rejection.
- [ ] T127 Add a browser-facing artifact/import test or build inspection asserting no `@google/genai`, `GEMINI_API_KEY`, configured key value, provider prompt, or server module appears in frontend output.
- [ ] T128 Add `scripts/verify-gemini.ts` and exact `verify:gemini` script (`node --env-file=.env --import tsx scripts/verify-gemini.ts`) before the offline gate; keep it undiscovered and unexecuted by `npm test`, build, typecheck, and smoke, and excluded from production emit.
- [ ] T129 Add a no-network missing-configuration test/dry path proving sanitized `SKIPPED` and zero calls; ensure `scripts/verify-gemini.ts` is included by `tsconfig.server.json`, then run its focused test plus typecheck and applicable build before Phase 13.

**Checkpoint**: A1–A7 and stale-response/security boundaries are proven offline.

---

## Phase 13 — Full offline verification

**Purpose**: Require all deterministic checks to pass before live validation.

- [ ] T130 Run `npm test`; record exact test/file counts and failures or success.
- [ ] T131 Run `npm run smoke`; record exact result and environment limitations.
- [ ] T132 [P] Run `npm run typecheck`; record exact result.
- [ ] T133 [P] Run `npm run build`; record exact result and output locations.
- [ ] T134 Run `npm test -- src/config.test.ts src/game.test.ts src/input.test.ts`; record the focused Week03 regression.
- [ ] T135 Run `npm test -- evals/week3-formal.test.ts`; record the Week03 formal regression without modifying its tests.
- [ ] T136 Run `npm test -- evals/week3-holdout.test.ts`; record the Week03 holdout regression without tuning against it.
- [ ] T137 Inspect the production frontend bundle for backend-only identifiers, SDK code, provider model configuration, and any real secret value; record the exact search and result.
- [ ] T138 Fix only actual Core failures, rerun the affected focused check, then repeat the relevant regression command.
- [ ] T139 Gate: do not proceed to a live provider call unless all applicable fake/offline checks are green; otherwise record the blocker and stop.

**Checkpoint**: Offline Core is green and eligible for one limited live check.

---

## Phase 14 — Separate limited live Gemini validation

**Purpose**: Verify the real adapter once without contaminating routine tests.

- [ ] T140 Confirm T128–T129 are complete and the separate live command still uses the same prompt adapter and runtime `AiAdvice` validator; make no network call in this task.
- [ ] T141 Confirm explicit live execution authorization and locally supplied backend-only `GEMINI_API_KEY`/`GEMINI_MODEL`; absent authorization or configuration remains an honest sanitized `SKIPPED` with zero calls.
- [ ] T142 Confirm the verified script is fixed to one valid `GameSummary` and at most one live `GeminiAiAdviceProvider` call; do not change behavior after the offline-green gate.
- [ ] T143 Reconfirm from the pre-live tests that output is limited to provider, model, timestamp, latency, sanitized status, attempt count, and optional safe token totals, with no key, prompt, raw payload, or stack trace.
- [ ] T144 Only when explicitly authorized and local credentials/network are available, run `npm run verify:gemini` once and record the actual result; otherwise record `SKIPPED` with the factual reason.
- [ ] T145 Do not retry the manual live verification merely to obtain a desired result; diagnose through fake/adapter tests first.

**Checkpoint**: Live status is honestly recorded as pass, fail, or skipped.

---

## Phase 15 — Documentation and evidence

**Purpose**: Produce one reproducible Week04 evidence trail without duplicating the spec/plan.

- [ ] T150 Review/finalize the versioned prompt comments/documentation in `server/ai/prompt.ts`; do not copy the internal prompt into public evidence.
- [ ] T151 Reconcile `contracts/openapi.yaml`, `contracts/provider.md`, and actual implementation; update planning artifacts only where implementation-compatible technical details were resolved.
- [ ] T152 Add the final AI evaluation matrix to one Week04 evidence artifact, covering success, invalid structural/semantic input with zero calls, provider failure, timeout, malformed/extra output, retry counts, concurrency, and stale response.
- [ ] T153 Create `docs/EVIDENCE_W04.md` with actual commands/results and links to existing SpecKit contracts rather than duplicating them.
- [ ] T154 Add the small architecture diagram `Frontend -> TypeScript Backend -> AiAdviceProvider -> Gemini` and identify the fake test branch.
- [ ] T155 Document the backend-only secret boundary, `.env` ignore proof, bundle scan, configured provider/model, and absence of frontend SDK/configuration.
- [ ] T156 Record actual offline verification from T130–T138, including any skipped/non-applicable check or environment limitation.
- [ ] T157 Record T144 live evidence only if actually run; otherwise record `SKIPPED` without fabrication.
- [ ] T158 Document known limitations: external provider availability, client abort not guaranteeing provider-side cancellation/billing, no authentication/rate limiting/deployment in Core, and model availability controlled by configuration.
- [ ] T159 Record both team members' contributions only if required by the submission and factually supported; do not infer participation.

**Checkpoint**: Evidence reproduces claims without secrets or duplicate formality documents.

---

## Phase 16 — Security and final Core review

**Purpose**: Finish with a clean, secret-free, regression-safe Core implementation.

- [ ] T160 Search tracked and untracked project source/docs/tests/scripts/screenshots/logs for credential patterns and accidental real secrets; do not print secret values into evidence or terminal capture.
- [ ] T161 Verify `.env` and `.env.*` are ignored and untracked, while `.env.example` is tracked with empty placeholders only.
- [ ] T162 Verify the API key, internal prompt, raw provider payload, stack traces, and provider internals appear in no frontend bundle, public response, documentation evidence, fixture, screenshot, or committed log.
- [ ] T163 Inspect `git status`, `git diff --stat`, and the complete diff; confirm every changed file belongs to the approved feature and no Week03 historical artifact was rewritten.
- [ ] T164 Re-run the complete verification sequence from Phase 13 after final documentation/configuration changes; record final results rather than reusing earlier output.
- [ ] T165 Compare the implementation against every Week04 MUST/FR/SC item and A1–A7 in `spec.md`; list any unmet item as a blocker rather than calling Core complete.
- [ ] T166 Confirm no Stretch item, second endpoint/provider/model fallback, database, authentication, deployment, streaming, agent, dashboard, or game-physics redesign was added.
- [ ] T167 Stop after Core completion and hand off the final behavior, files, commands/results, live status, risks, and limitations; do not begin Stretch work automatically.

## Parallel execution guidance

- T004 and T005 may run in parallel after T002/T003 establish the baseline command context.
- T009–T012 may be prepared in parallel after T007/T008 establish authority wording, then reviewed together at T014.
- Offline commands T132/T133 may run in parallel; formal and holdout tests remain read-only regression gates.
- Documentation tasks may be drafted in parallel only after their underlying evidence exists. T157 always depends on T144.

## Non-negotiable stop conditions

- Stop if the Week03 baseline has an unexplained failure.
- Stop before adding dependencies without explicit approval.
- Stop Gemini adapter work if SDK retry suppression cannot be proven; select the planned direct-fetch adapter instead.
- Stop before a live call unless all fake/offline Core checks are green and live execution is explicitly authorized.
- Stop and report any requirement that would need a second endpoint/provider, persistence, authentication, deployment, or gameplay redesign.
