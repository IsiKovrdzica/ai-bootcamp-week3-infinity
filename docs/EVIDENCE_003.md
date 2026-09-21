# BrickPulse Week 3 Evidence

**Evidence status:** BASELINE DEVELOPMENT RECORDED; FORMAL EVALUATION NOT RUN

This document records completed baseline-development evidence. Formal evaluator-owned evaluation, the controlled-change experiment, and independent holdout evaluation have not run. Development checks do not imply a formal PASS.

## Initial claim

**Claim:** The first coherent playable Week 3 baseline was implemented and passed its focused development checks. Formal conformance remains to be evaluated.

## Baseline identity

- **Baseline prompt/version:** `docs/BUILD_PROMPT_V1.md`
- **Context manifest/version:** `docs/CONTEXT_MANIFEST.md`
- **Phase 1 checkpoint:** `e2e6d74 Phase 1: freeze Week 3 specification and context`
- **Baseline status:** Completed and frozen
- **Baseline frozen before formal evaluation:** Yes; formal evaluation has not run

## Baseline result

- **Formal scenario:** NOT RUN / TO BE RECORDED
- **Expected result:** TO BE RECORDED by the formal evaluator
- **Actual result:** NOT RUN
- **Evidence level:** Development evidence only; no formal PASS/FAIL

## Observed signal

- **Signal:** NOT RUN / TO BE RECORDED after formal evaluation
- **Why it is a genuine baseline observation:** TO BE RECORDED after formal evaluation
- **Relevant artifact or output:** TO BE RECORDED after formal evaluation

## Diagnosis and hypothesis

- **Likely problem layer:** NOT RUN / TO BE RECORDED
- **Alternative explanation considered:** NOT RUN / TO BE RECORDED
- **Hypothesis:** NOT RUN / TO BE RECORDED
- **Result that would disprove the hypothesis:** NOT RUN / TO BE RECORDED

## Frozen variables

- **Specification:** Frozen `docs/GAME_SPEC.md`; formal-experiment value to be recorded
- **Formal scenario and expectation:** NOT RUN / TO BE RECORDED
- **Configuration/fixture:** NOT RUN / TO BE RECORDED
- **Commands/environment:** NOT RUN / TO BE RECORDED
- **Other unchanged factors:** NOT RUN / TO BE RECORDED

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

## Manual verification

- **Steps:** The human evaluator loaded the running BrickPulse application and performed a manual baseline browser smoke check using the documented controls and normal gameplay.
- **Actual result:** The application loaded successfully; Space started the ball from `READY`; Left Arrow and Right Arrow moved the paddle; A and D also moved the paddle; bricks disappeared when hit; score increased when bricks were destroyed; intentionally missing the ball reduced lives from 3 to 2; and the game returned to `READY` after that non-final miss.
- **Evidence:** Human-observed manual baseline verification. This smoke check is separate from the formal evaluator-owned evaluation, which remains NOT RUN. No formal PASS/FAIL is inferred from the smoke-check result.

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
- **Review status:** Baseline development review completed; final formal review NOT RUN

## Known limitation

**Limitation:** Collision handling is intentionally simple and discrete. It does not include continuous collision detection, swept collision systems, advanced tunneling prevention, or complex corner-resolution heuristics. npm reported two moderate dependency audit findings; no dependency-changing audit fix was attempted during the frozen baseline.

## Contributions

| Contributor | Contribution | Personally verified result |
|---|---|---|
| Human project owner | Approved the frozen specification/context, implementation plan and assumptions, baseline implementation, and documentation-only synchronization; subsequently performed the manual browser interaction smoke check | Application load, Space start, Arrow and A/D paddle movement, brick removal, scoring, life reduction from 3 to 2, and return to `READY` after a non-final miss were manually verified as baseline behavior |
| Codex | Created the minimal scaffold and BrickPulse implementation, wrote and ran focused development tests, performed type/build verification, and conducted the available visual smoke check | 33/33 focused tests, typecheck, production build, and local visual render completed |

If completed individually, record that fact instead of inventing a second contributor.

## Final review decision

- **Decision:** NOT RUN
- **What the evidence proves:** The baseline implementation completed its recorded development checks.
- **What the evidence does not prove:** It does not prove formal evaluator PASS, controlled-change effectiveness, independent holdout success, or a final review decision.
- **Next smallest step:** Run the separately authorized evaluator-owned formal evaluation and record its actual result without changing the frozen baseline first.
