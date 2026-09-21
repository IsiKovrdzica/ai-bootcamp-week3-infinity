# BrickPulse Week 3 Evidence

**Evidence status:** WEEK 3 CONTROLLED EXPERIMENT AND INDEPENDENT HOLDOUT COMPLETED

This document records the completed baseline development, formal E1–E4 baseline PASS results, genuine E5 baseline failure, focused RED→GREEN sequence, one controlled production change, unchanged same-eval E5 PASS, final E1–E5 formal regression PASS, and the first and only independent H1 holdout execution. Development checks remain separate from formal and holdout results.

## Initial claim

**Claim:** The frozen baseline passed E1–E4 and failed E5. After one controlled deterministic-substepping change, the unchanged E5 passed, the complete E1–E5 formal regression passed 5/5, and the independently withheld H1 passed on its first and only execution. This supports the frozen hypothesis for this project and evaluated scenario.

## Baseline identity

- **Baseline prompt/version:** `docs/BUILD_PROMPT_V1.md`
- **Context manifest/version:** `docs/CONTEXT_MANIFEST.md`
- **Phase 1 checkpoint:** `e2e6d74 Phase 1: freeze Week 3 specification and context`
- **Baseline commit:** `a5c4925 Baseline: first playable BrickPulse version`
- **Pre-E5 checkpoint:** `1075073 Evaluation: record E1-E4 and freeze E5`
- **E5 failure/hypothesis checkpoint:** `005331a Evaluation: record E5 failure and freeze hypothesis`
- **RED regression checkpoint:** `0b9397d TDD: preserve RED regression for E5 frame-gap collision`
- **Controlled-change checkpoint:** `35f6e33 Controlled change: add deterministic simulation sub-stepping`
- **Pre-holdout evidence checkpoint:** `23dda9f Evaluation: record controlled-change results before holdout`
- **Baseline status:** Completed and frozen
- **Baseline frozen before formal evaluation:** Yes

## Baseline result

| Scenario | Actual baseline result | Observed behavior |
|---|---|---|
| E1 — Normal start | PASS | `READY` changed to `RUNNING`; velocity was nonzero; position changed after `1/60` second; score was 0; lives were 3; 32 bricks remained |
| E2 — Paddle boundary | PASS | The paddle remained fully in bounds at both horizontal boundaries and did not overrun either boundary under continued input |
| E3 — Invalid or incomplete configuration | PASS | All four variants were rejected by `validateGameConfig` and `createGame`; no playable state was created and no coercion occurred |
| E4 — Brick side collision | PASS | Exactly the selected brick was removed; alive count decreased by one; score increased once by 10; horizontal velocity reversed; the removed brick did not score again |
| E5 — Frame-gap brick crossing at maximum valid ball speed | FAIL | Ball center moved from Y 56 to Y 101; direction remained downward; target remained alive; alive count remained 1; score remained 0; no unrelated brick changed |

E1–E4 passed as 4 formal tests in 1 test file. E5 was later run by name and genuinely failed while the 4 nonmatching formal tests were skipped. These formal results do not derive from, or convert, the earlier 33 development-test passes.

## Observed signal

- **Signal:** E5 failed. Across the `0.10`-second update the ball center moved from Y `56` to Y `101`, passed through the target's vertical span, remained downward-moving, left the target alive, left the alive count at `1`, and left score at `0`; no unrelated brick changed.
- **Why it is a genuine baseline observation:** E5 was frozen in `docs/EVALS.md` and committed before execution. The unchanged baseline application was exercised by the evaluator-owned fixture using a valid maximum-speed configuration.
- **Relevant artifact or output:** `evals/week3-formal.test.ts`; `npm test -- evals/week3-formal.test.ts -t "E5"`; 1 test file failed, E5 failed, and 4 nonmatching tests were skipped.

## Diagnosis and hypothesis

- **Likely problem layer:** Pure game simulation time integration in `src/game.ts`. `updateGame` advances the ball once using the full external `deltaSeconds`, then performs brick detection against the resulting ball position. `resolveBrick` requires `circleIntersectsRectangle` to succeed at that sampled position. Its reconstructed previous position is used only to select horizontal versus vertical response after an overlap has already been found, not to detect a collision along the traveled path.
- **Alternative explanation considered:** A malformed or interfering evaluator fixture. The E5 preconditions proved that the ball began immediately above the target and that its projected post-update position lay beyond the target; unrelated bricks were isolated and none changed.
- **Hypothesis:** If a large external update is processed as several small deterministic internal simulation steps while preserving the full elapsed time, the existing brick collision logic should observe the target during one internal step. E5 should then pass without changing gameplay rules, the configuration contract, rendering, input, or the formal evaluator expectation.
- **Result:** The hypothesis is supported for this project and evaluated scenario: the focused regression became GREEN, unchanged E5 became PASS, and E1–E5 passed 5/5. This does not establish a universal collision or physics solution.

## Frozen variables

- **Specification:** Frozen `docs/GAME_SPEC.md`; unchanged
- **Formal scenario and expectation:** Frozen E1–E5 expectations in `docs/EVALS.md`; E5 will remain unchanged
- **Configuration/fixture:** E5 valid configuration `{ lives: 3, paddleSpeed: 360, ballSpeed: 450 }`, isolated target, vertical path from Y 56 to projected Y 101, and external delta `0.10` seconds
- **Commands/environment:** Baseline E5 command `npm test -- evals/week3-formal.test.ts -t "E5"`; the same command is frozen for the post-change comparison
- **Other unchanged factors:** Game rules, `GameConfig`, collision-side response, renderer, input, dependencies, evaluator harness, and all unrelated implementation remain frozen

## One controlled change

- **Change:** Implemented deterministic internal simulation sub-stepping with a maximum internal step of `1/60` second. Larger external deltas are divided into equal internal steps whose sum preserves the full elapsed time, using the existing movement and collision sequence for each step.
- **Files intentionally changed:** `src/game.test.ts` for the focused regression and test-oracle correction; `src/game.ts` for the single controlled production change.
- **Reason this is the smallest coherent change:** At the maximum valid speed of 450 px/s, a `1/60`-second step moves the ball at most 7.5 px. For this project, that is smaller than the 14 px ball diameter and the 20 px smallest brick dimension, so the direct E5 crossing will contain sampled overlap while retaining the existing collision logic. This is a project-specific discrete-step bound, not a universal physics solution.
- **Status:** COMPLETE

## Same formal evaluation before and after

| Item | Before | After |
|---|---|---|
| Scenario ID | E5 | E5 |
| Expected behavior | Frozen E5 expectation in `docs/EVALS.md` | Same unchanged expectation |
| Actual behavior | Target skipped; score 0; vertical direction unchanged; no unrelated brick changed | Target removed; score 10; vertical direction reversed upward; no unrelated brick changed |
| Status | FAIL | PASS |
| Evidence reference | `npm test -- evals/week3-formal.test.ts -t "E5"` | Same unchanged evaluator and command; 1 test passed and 4 nonmatching tests were skipped |

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

### Completed controlled-change verification

1. Added one focused `src/game.test.ts` regression derived from E5 and preserved RED against the unchanged implementation at checkpoint `0b9397d`.
2. Implemented only deterministic internal simulation sub-stepping with maximum step `1/60` in `src/game.ts`.
3. Reran the focused regression to GREEN.
4. Corrected the older paddle test oracle: its exact final-Y assertion was replaced by a semantic non-penetration assertion because sub-stepping correctly consumes the remaining elapsed time after reflection. This was a test-oracle correction, not a second gameplay implementation change.
5. Ran the development suite: 34/34 tests passed.
6. Ran `npm run typecheck`: PASS.
7. Ran `npm run build`: PASS.
8. Reran the same unchanged formal E5 evaluator: PASS.
9. Ran the complete E1–E5 formal regression: 5/5 PASS.

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
| `npm test -- evals/week3-formal.test.ts -t "E5"` | Run only the frozen E5 baseline evaluation | FAIL; target remained alive, score remained 0, vertical direction remained downward; 1 test failed and 4 nonmatching tests were skipped |
| Focused E5-derived regression | Preserve RED before the production change, then verify GREEN afterward | RED before implementation; GREEN after deterministic sub-stepping |
| `npm test` | Post-change development regression suite | PASS; 34/34 tests passed |
| `npm run typecheck` | Post-change TypeScript verification | PASS |
| `npm run build` | Post-change production build verification | PASS |
| `npm test -- evals/week3-formal.test.ts -t "E5"` | Official unchanged E5 same-eval post-change rerun | PASS; 1 test passed and 4 nonmatching tests were skipped |
| `npm test -- evals/week3-formal.test.ts` | Official post-change E1–E5 formal regression | PASS; 1 test file passed and 5/5 tests passed |

## Final scoped verification

| Command | Actual result |
|---|---|
| `npm test -- src/config.test.ts src/game.test.ts src/input.test.ts` | PASS; 3 test files passed and 34/34 development tests passed |
| `npm test -- evals/week3-formal.test.ts` | PASS; 1 test file passed and 5/5 formal tests passed |
| `npm run typecheck` | PASS; `tsc --noEmit` completed successfully |
| `npm run build` | PASS; TypeScript checking and Vite production build completed, with 8 modules transformed |

The holdout command was intentionally not rerun during final verification.

## Manual verification

- **Steps:** The human evaluator loaded the running BrickPulse application and performed a manual baseline browser smoke check using the documented controls and normal gameplay.
- **Actual result:** The application loaded successfully; Space started the ball from `READY`; Left Arrow and Right Arrow moved the paddle; A and D also moved the paddle; bricks disappeared when hit; score increased when bricks were destroyed; intentionally missing the ball reduced lives from 3 to 2; and the game returned to `READY` after that non-final miss.
- **Evidence:** Human-observed manual baseline verification. This smoke check is separate from the later formal evaluator-owned E1–E4 results; no formal PASS/FAIL is inferred from the smoke-check result itself.

## Independent evaluation

- **Reveal occurred only after controlled change:** Yes; H1 remained unavailable through checkpoint `23dda9f`.
- **Scenario supplied by human evaluator:** With exactly one life remaining, miss the paddle and cross the bottom boundary; verify `GAME_OVER`, terminal stability, and a complete fresh restart with Space.
- **Expected result:** `GAME_OVER`; stopped ball movement; unchanged score/bricks after terminal entry; Space restores `READY`, 3 lives, score 0, all 32 bricks, and initial paddle/ball positions.
- **Actual result:** PASS on the first and only execution. The miss produced `GAME_OVER`; the ball stayed at x 7/y 488 during an additional idle update; score stayed 0; all 32 bricks stayed unchanged; Space restored `READY`, 3 lives, score 0, 32/32 live bricks, paddle x 272/y 440, and ball x 320/y 431 matching a fresh default reference.
- **Command:** `npm test -- evals/week3-holdout.test.ts`
- **Result summary:** 1 test file passed; 1 test passed.
- **Status:** PASS
- **Effect on conclusions:** H1 independently supports the implemented final-life, terminal-stability, and fresh-restart behavior. It was not used for tuning, was not rerun, and no implementation change followed it.

## Diff review

- **Reviewed files:** Baseline application, focused tests, package manifest, and generated build output were reviewed at baseline handoff.
- **Unexpected files or generated output:** None reported; `dist/` and `node_modules/` were generated and ignored.
- **Out-of-scope functionality found:** None reported during baseline development review.
- **Review status:** Controlled experiment and post-change formal regression reviewed; independent holdout and final review NOT RUN

## Known limitation

- Collision handling remains simple and discretely sub-stepped; it does not claim continuous or swept collision detection or general-purpose physics correctness.
- The evidence supports the evaluated BrickPulse scenarios, not every possible frame rate or geometry.
- `npm install` previously reported two moderate dependency audit findings; no dependency-changing audit fix was applied.

## Contributions

This project was completed collaboratively by both team members throughout the full Week 3 workflow: the project owner and Mateja Miletić (`mmiletic5`). Both participated in scope and specification decisions, prompt/context design, implementation review, TDD and test review, formal evaluation design and interpretation, diagnosis of the E5 baseline failure, selection and review of the controlled change, holdout review, and final evidence review. Major technical and methodological decisions were discussed and agreed jointly rather than divided into isolated subsystems.

Codex assisted with the recorded scaffold, implementation, tests, evaluator harnesses, controlled change, verification commands, and evidence updates under the team's joint review. The factual outcomes remain those recorded in this evidence: baseline 33/33 development tests, post-change 34/34, typecheck/build PASS, E1–E5 5/5 PASS after the controlled change, and H1 1/1 PASS on its first and only execution.

## Final review decision

- **Decision:** Week 3 evidence and scoped final verification complete; ready for final human review.
- **What the evidence proves:** The baseline passed E1–E4 and failed E5; after the single controlled production change, the focused regression became GREEN, unchanged E5 passed, E1–E5 passed 5/5, and independently withheld H1 passed once. This supports the frozen hypothesis and specified game behavior for the evaluated project scenarios.
- **What the evidence does not prove:** It does not establish a universal collision or physics solution or behavior beyond the recorded scenarios.
- **Next smallest step:** After human approval, checkpoint the final evidence and holdout harness without further evaluation execution.
