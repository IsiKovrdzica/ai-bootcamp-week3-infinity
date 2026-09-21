# BrickPulse Week 3 Evidence

**Evidence status:** BASELINE DEVELOPMENT AND FORMAL E1–E4 EVALUATION RECORDED

This document records completed baseline-development evidence and the separately executed evaluator-owned E1–E4 formal baseline evaluation. The controlled-change experiment and independent holdout evaluation have not run. The earlier development checks remain separate from the formal results.

## Initial claim

**Claim:** The frozen Week 3 baseline passed its focused development checks and all four independently executed formal baseline evaluations E1–E4. Those four evaluations discovered no baseline problem.

## Baseline identity

- **Baseline prompt/version:** `docs/BUILD_PROMPT_V1.md`
- **Context manifest/version:** `docs/CONTEXT_MANIFEST.md`
- **Phase 1 checkpoint:** `e2e6d74 Phase 1: freeze Week 3 specification and context`
- **Baseline commit:** `a5c492521d5d933fa05d9e5eddb96b736ace2aa2`
- **Baseline status:** Completed and frozen
- **Baseline frozen before formal evaluation:** Yes

## Baseline result

| Scenario | Actual baseline result | Observed behavior |
|---|---|---|
| E1 — Normal start | PASS | `READY` changed to `RUNNING`; velocity was nonzero; position changed after `1/60` second; score was 0; lives were 3; 32 bricks remained |
| E2 — Paddle boundary | PASS | The paddle remained fully in bounds at both horizontal boundaries and did not overrun either boundary under continued input |
| E3 — Invalid or incomplete configuration | PASS | All four variants were rejected by `validateGameConfig` and `createGame`; no playable state was created and no coercion occurred |
| E4 — Brick side collision | PASS | Exactly the selected brick was removed; alive count decreased by one; score increased once by 10; horizontal velocity reversed; the removed brick did not score again |

The formal run passed 1 test file and 4 tests. These results do not derive from, or convert, the earlier 33 development-test passes.

## Observed signal

- **Signal:** E1–E4 all passed; these scenarios discovered no baseline problem.
- **Why it is a genuine baseline observation:** The evaluator-owned harness was created and executed only after the baseline was frozen, against commit `a5c492521d5d933fa05d9e5eddb96b736ace2aa2`.
- **Relevant artifact or output:** `evals/week3-formal.test.ts`; `npm test -- evals/week3-formal.test.ts`; 1 test file passed and 4 tests passed.

## Diagnosis and hypothesis

- **Likely problem layer:** NOT RUN / TO BE RECORDED
- **Alternative explanation considered:** NOT RUN / TO BE RECORDED
- **Hypothesis:** NOT RUN / TO BE RECORDED
- **Result that would disprove the hypothesis:** NOT RUN / TO BE RECORDED

## Frozen variables

- **Specification:** Frozen `docs/GAME_SPEC.md`; unchanged for E1–E4
- **Formal scenario and expectation:** Frozen E1–E4 expectations in `docs/EVALS.md`
- **Configuration/fixture:** Deterministic evaluator-owned fixtures recorded in `evals/week3-formal.test.ts`
- **Commands/environment:** `npm test -- evals/week3-formal.test.ts`
- **Other unchanged factors:** Frozen baseline source, implementation tests, package files, and configuration

## One controlled change

- **Change:** NOT RUN / TO BE RECORDED
- **Files intentionally changed:** NOT RUN / TO BE RECORDED
- **Reason this is the smallest coherent change:** NOT RUN / TO BE RECORDED
- **Status:** NOT RUN

## Same formal evaluation before and after

| Item | Before | After |
|---|---|---|
| Scenario ID | NOT RUN / TO BE RECORDED | NOT RUN / TO BE RECORDED |
| Expected behavior | TO BE RECORDED | TO BE RECORDED |
| Actual behavior | NOT RUN | NOT RUN |
| Status | NOT RUN | NOT RUN |
| Evidence reference | TO BE RECORDED | TO BE RECORDED |

## RED, GREEN, and regression evidence

- **Configuration RED:** `npm test -- --run src/config.test.ts` failed because `./config` did not yet exist; this was the intended missing-implementation signal.
- **Configuration GREEN:** The same focused command passed 14/14 tests after the handwritten validator was implemented.
- **Game-rule RED:** `npm test -- --run src/game.test.ts` failed because `./game` did not yet exist; this was the intended missing-implementation signal.
- **Game-rule GREEN:** The same focused command passed 12/12 tests after pure game state and rules were implemented.
- **Input RED:** `npm test -- --run src/input.test.ts` failed because `./input` did not yet exist; this was the intended missing-implementation signal.
- **Input GREEN:** The same focused command passed 7/7 tests after control mapping and input handling were implemented.
- **Integrated development issue:** The first `npm run typecheck` and `npm run build` failed with TypeScript TS2367 because control-flow analysis did not infer that brick resolution could change the status to `WON`.
- **Minimal correction:** The brick resolver was made to return the win transition explicitly; no gameplay requirement was changed.
- **Regression result:** Final `npm test` passed 33/33 tests across three test files; final typecheck and build passed.

## Actual commands and results

| Command | Purpose | Actual result |
|---|---|---|
| `npm install` | Install the approved TypeScript, Vite, and Vitest development dependencies | Completed; npm also reported two moderate audit findings |
| `npm test -- --run src/config.test.ts` | Focused configuration RED/GREEN checks | Initial missing-module RED, then 14/14 passed |
| `npm test -- --run src/game.test.ts` | Focused game-rule RED/GREEN checks | Initial missing-module RED, then 12/12 passed |
| `npm test -- --run src/input.test.ts` | Focused input RED/GREEN checks | Initial missing-module RED, then 7/7 passed |
| `npm test` | Full focused development regression suite | 33/33 tests passed across three files |
| `npm run typecheck` | TypeScript verification | Initial TS2367 failure; passed after the minimal explicit-return correction |
| `npm run build` | TypeScript verification and Vite production build | Initial TS2367 failure; final build passed with eight modules transformed |
| `npm run dev -- --host 127.0.0.1` | Serve the baseline locally for the browser check | Vite served successfully at `http://127.0.0.1:5173/` |
| `npm run preview` | Production preview script | Available but NOT RUN |
| `npm test -- evals/week3-formal.test.ts` | Run only the evaluator-owned formal E1–E4 baseline harness | PASS; 1 test file passed and 4 tests passed |

## Manual verification

- **Steps:** The human evaluator loaded the running BrickPulse application and performed a manual baseline browser smoke check using the documented controls and normal gameplay.
- **Actual result:** The application loaded successfully; Space started the ball from `READY`; Left Arrow and Right Arrow moved the paddle; A and D also moved the paddle; bricks disappeared when hit; score increased when bricks were destroyed; intentionally missing the ball reduced lives from 3 to 2; and the game returned to `READY` after that non-final miss.
- **Evidence:** Human-observed manual baseline verification. This smoke check is separate from the later formal evaluator-owned E1–E4 results; no formal PASS/FAIL is inferred from the smoke-check result itself.

## Independent evaluation

- **Reveal occurred only after controlled change:** NOT RUN / TO BE RECORDED
- **Scenario supplied by human evaluator:** NOT RUN / TO BE RECORDED
- **Expected result:** TO BE RECORDED
- **Actual result:** NOT RUN
- **Status:** NOT RUN
- **Effect on conclusions:** NOT RUN / TO BE RECORDED

## Diff review

- **Reviewed files:** Baseline application, focused tests, package manifest, and generated build output were reviewed at baseline handoff.
- **Unexpected files or generated output:** None reported; `dist/` and `node_modules/` were generated and ignored.
- **Out-of-scope functionality found:** None reported during baseline development review.
- **Review status:** Baseline development review and formal E1–E4 baseline-result review completed; controlled-change and final review NOT RUN

## Known limitation

**Limitation:** Collision handling is intentionally simple and discrete. It does not include continuous collision detection, swept collision systems, advanced tunneling prevention, or complex corner-resolution heuristics. npm reported two moderate dependency audit findings; no dependency-changing audit fix was attempted during the frozen baseline.

## Contributions

| Contributor | Contribution | Personally verified result |
|---|---|---|
| Human project owner | Approved the frozen specification/context, implementation plan and assumptions, baseline implementation, and documentation-only synchronization; subsequently performed the manual browser interaction smoke check | Application load, Space start, Arrow and A/D paddle movement, brick removal, scoring, life reduction from 3 to 2, and return to `READY` after a non-final miss were manually verified as baseline behavior |
| Codex | Created the minimal scaffold and BrickPulse implementation, wrote and ran focused development tests, performed type/build verification, conducted the available visual smoke check, and later ran the evaluator-owned E1–E4 harness in a fresh evaluator conversation | 33/33 focused development tests, typecheck, production build, local visual render, and 4/4 formal E1–E4 tests completed |

If completed individually, record that fact instead of inventing a second contributor.

## Final review decision

- **Decision:** NOT RUN
- **What the evidence proves:** The baseline implementation completed its recorded development checks and passed formal E1–E4. E1–E4 discovered no baseline problem.
- **What the evidence does not prove:** It does not prove the outcome of E5, controlled-change effectiveness, independent holdout success, or a final review decision.
- **Next smallest step:** Execute the separately frozen E5 boundary evaluation only after authorization, without changing the frozen baseline first.
