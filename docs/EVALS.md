# BrickPulse Week 3 Formal Evaluations

**Owner:** Human evaluator  
**Status:** Expectations frozen before baseline implementation  
**Context boundary:** This file is not baseline implementation context. Formal execution begins only after the baseline is frozen.

## Result conventions

- Do not enter PASS or FAIL until the scenario has actually been executed.
- Preserve baseline results before any corrective change.
- Run the same scenario after the one controlled change.
- Record actual commands, fixtures, or manual steps in `EVIDENCE_003.md`.

## Formal baseline execution evidence

- **Baseline commit:** `a5c492521d5d933fa05d9e5eddb96b736ace2aa2`
- **Command:** `npm test -- evals/week3-formal.test.ts`
- **Summary:** 1 test file passed; 4 tests passed

## E1 — Normal start

**Scenario:** Load the valid default configuration and press Space from `READY`.

**Prewritten expectation:**

- State changes from `READY` to `RUNNING`.
- The ball begins moving.
- Score remains `0`.
- Lives remain `3`.
- Brick count remains `32`.

**Baseline result:** PASS
**Observed:** `READY` changed to `RUNNING`; velocity was nonzero; the ball position changed after `1/60` second; score remained `0`; lives remained `3`; and 32 bricks remained.
**Post-change result:** NOT RUN  
**Status:** PASS

## E2 — Paddle boundary

**Scenario:** Sustain leftward movement at the left boundary and rightward movement at the right boundary.

**Prewritten expectation:**

- The entire paddle remains inside the 640×480 play area at both boundaries.
- Continued input at a boundary does not move the paddle beyond that boundary.

**Baseline result:** PASS
**Observed:** The paddle remained fully in bounds at both horizontal boundaries, and continued movement toward each boundary did not move it beyond the field.
**Post-change result:** NOT RUN  
**Status:** PASS

## E3 — Invalid or incomplete configuration

**Scenario variants:**

- `ballSpeed` is missing.
- `lives` is `0`.
- A speed is nonnumeric.
- An unexpected key is present.

**Prewritten expectation:**

- Every variant is rejected by runtime validation.
- No playable state is created.
- Values are not coerced.

**Baseline result:** PASS
**Observed:** All four frozen invalid variants were rejected by `validateGameConfig`; `createGame` also rejected them; no playable state was created; and no coercion occurred.
**Post-change result:** NOT RUN  
**Status:** PASS

## E4 — Brick side collision

**Classification:** Baseline-discovery candidate; no failure is predicted.

**Scenario:** At an ordinary valid game speed, the ball intersects one brick from its left or right side.

**Prewritten expectation:**

- Exactly that brick is removed once.
- Score increases exactly once by 10 points.
- Horizontal ball velocity changes direction.
- The removed brick cannot be scored a second time.

**Baseline result:** PASS
**Observed:** Exactly the selected brick was removed; the alive count decreased by one; score increased exactly once by 10; horizontal velocity reversed direction; and the removed brick did not score again.
**Post-change result:** NOT RUN  
**Status:** PASS

If E1–E4 all pass in the real baseline, preserve every PASS result. Define another boundary expectation before executing that new case; never manufacture or retroactively redefine a failure.

## E5 — Frame-gap brick crossing at maximum valid ball speed

**Classification:** Additional boundary evaluation defined after E1–E4 all passed. Expectation is frozen BEFORE execution.

**Scenario:**

- Use a valid `GameConfig` with:
  - `lives = 3`
  - `paddleSpeed = 360`
  - `ballSpeed = 450`
- Use a `RUNNING` state.
- Select one live brick and construct the evaluator fixture so unrelated bricks cannot interfere with the trajectory.
- Place the ball immediately before that brick on a direct top/bottom collision path.
- The ball travels at the valid configured speed of 450 px/s.
- Advance the game once with a deterministic 0.10-second delta such that the ball's path crosses through the target brick between the pre-update and post-update positions.

**Prewritten expectation:**

- The target brick collision is not skipped.
- Exactly the target brick is removed once.
- Score increases exactly once by 10.
- Vertical velocity changes direction.
- No unrelated brick is removed.

**Important interpretation:**

This evaluation checks whether the frozen brick-collision gameplay rule remains true at a plausible boundary frame interval while using a completely valid `GameConfig`.

It does NOT prescribe:

- continuous collision detection;
- a physics engine;
- swept collision;
- any particular implementation technique.

The implementation technique, if a later correction is authorized, must remain a separate decision.

**Baseline result:** FAIL
**Observed:** The ball center moved from Y `56` to Y `101` during the single `0.10`-second update. Its vertical direction remained downward, the target remained alive, the alive-brick count remained `1`, score remained `0`, and no unrelated brick changed.
**Baseline command:** `npm test -- evals/week3-formal.test.ts -t "E5"`
**Baseline output summary:** 1 test file failed; E5 failed; 4 nonmatching formal tests were skipped.
**Post-change result:** NOT RUN
**Status:** FAIL

## H1 — SEALED HOLDOUT

**Status:** SEALED / NOT RUN

The full scenario and expectation were defined before baseline implementation and are held externally by the human evaluator. They will be revealed only after the controlled change is complete.
