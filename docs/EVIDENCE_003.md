# BrickPulse Week 3 Evidence

**Evidence status:** BASELINE DEVELOPMENT, FORMAL E1–E4 PASS RESULTS, AND FORMAL E5 BASELINE FAILURE RECORDED

This document records completed baseline-development evidence, the separately executed evaluator-owned E1–E4 formal PASS results, and the genuine E5 baseline failure. The controlled change, post-change evaluation, and independent holdout evaluation have not run. The earlier development checks remain separate from the formal results.

## Initial claim

**Claim:** The frozen Week 3 baseline passed its focused development checks and formal evaluations E1–E4, but failed the separately frozen E5 frame-gap boundary evaluation.

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
- **Result that would disprove the hypothesis:** After implementing only the approved internal sub-stepping, the focused regression or unchanged formal E5 still skips the target, or required existing behavior regresses. The hypothesis is not yet proven.

## Frozen variables

- **Specification:** Frozen `docs/GAME_SPEC.md`; unchanged
- **Formal scenario and expectation:** Frozen E1–E5 expectations in `docs/EVALS.md`; E5 will remain unchanged
- **Configuration/fixture:** E5 valid configuration `{ lives: 3, paddleSpeed: 360, ballSpeed: 450 }`, isolated target, vertical path from Y 56 to projected Y 101, and external delta `0.10` seconds
- **Commands/environment:** Baseline E5 command `npm test -- evals/week3-formal.test.ts -t "E5"`; the same command is frozen for the post-change comparison
- **Other unchanged factors:** Game rules, `GameConfig`, collision-side response, renderer, input, dependencies, evaluator harness, and all unrelated implementation remain frozen

## One controlled change

- **Change:** Proposed, not implemented: add deterministic internal simulation sub-stepping with a maximum internal step of `1/60` second. Divide each larger external delta into `ceil(deltaSeconds / (1/60))` equal steps so their sum preserves the full external elapsed time, and run the existing movement and collision sequence for each internal step.
- **Files intentionally changed:** Planned `src/game.test.ts` for one focused regression test, then `src/game.ts` for the single controlled implementation change; no other file is authorized yet.
- **Reason this is the smallest coherent change:** At the maximum valid speed of 450 px/s, a `1/60`-second step moves the ball at most 7.5 px. For this project, that is smaller than the 14 px ball diameter and the 20 px smallest brick dimension, so the direct E5 crossing will contain sampled overlap while retaining the existing collision logic. This is a project-specific discrete-step bound, not a universal physics solution.
- **Status:** NOT RUN

## Same formal evaluation before and after

| Item | Before | After |
|---|---|---|
| Scenario ID | E5 | E5 |
| Expected behavior | Frozen E5 expectation in `docs/EVALS.md` | Same unchanged expectation |
| Actual behavior | Target skipped; score 0; vertical direction unchanged; no unrelated brick changed | NOT RUN |
| Status | FAIL | NOT RUN |
| Evidence reference | `npm test -- evals/week3-formal.test.ts -t "E5"` | NOT RUN |

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

### Planned controlled-change verification

1. Add one focused `src/game.test.ts` regression using the E5-valid maximum-speed configuration, a `RUNNING` state, one isolated live target, a direct vertical path from immediately above the target, and one `0.10`-second update. Expect only the target to be removed, score to become 10, vertical direction to reverse, and unrelated bricks not to change.
2. Run that focused test against the unchanged implementation and preserve the expected RED caused by the skipped target.
3. Implement only the approved deterministic internal sub-stepping in `src/game.ts`.
4. Rerun the focused regression to GREEN.
5. Run the existing 33 development tests.
6. Run `npm run typecheck`.
7. Run `npm run build`.
8. Rerun the same formal E5 command and expectation unchanged.
9. Later rerun E1–E4 as formal regression evaluations.

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
- **Review status:** Baseline development, formal E1–E4, and E5 baseline-failure review completed; controlled-change and final review NOT RUN

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
- **What the evidence proves:** The baseline completed its recorded development checks and passed formal E1–E4, while E5 exposed a reproducible skipped brick collision at the frozen frame-gap boundary.
- **What the evidence does not prove:** The internal-substepping hypothesis is not yet proven; the controlled change, post-change E5, E1–E4 formal regression, and independent holdout remain NOT RUN.
- **Next smallest step:** After separate authorization, add the single focused regression test and preserve RED before modifying `src/game.ts`.
