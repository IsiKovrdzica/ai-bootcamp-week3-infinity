# BrickPulse Week 3 Formal Evaluations

**Owner:** Human evaluator  
**Status:** Expectations frozen before baseline implementation  
**Context boundary:** This file is not baseline implementation context. Formal execution begins only after the baseline is frozen.

## Result conventions

- Do not enter PASS or FAIL until the scenario has actually been executed.
- Preserve baseline results before any corrective change.
- Run the same scenario after the one controlled change.
- Record actual commands, fixtures, or manual steps in `EVIDENCE_003.md`.

## E1 — Normal start

**Scenario:** Load the valid default configuration and press Space from `READY`.

**Prewritten expectation:**

- State changes from `READY` to `RUNNING`.
- The ball begins moving.
- Score remains `0`.
- Lives remain `3`.
- Brick count remains `32`.

**Baseline result:** NOT RUN  
**Post-change result:** NOT RUN  
**Status:** NOT RUN

## E2 — Paddle boundary

**Scenario:** Sustain leftward movement at the left boundary and rightward movement at the right boundary.

**Prewritten expectation:**

- The entire paddle remains inside the 640×480 play area at both boundaries.
- Continued input at a boundary does not move the paddle beyond that boundary.

**Baseline result:** NOT RUN  
**Post-change result:** NOT RUN  
**Status:** NOT RUN

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

**Baseline result:** NOT RUN  
**Post-change result:** NOT RUN  
**Status:** NOT RUN

## E4 — Brick side collision

**Classification:** Baseline-discovery candidate; no failure is predicted.

**Scenario:** At an ordinary valid game speed, the ball intersects one brick from its left or right side.

**Prewritten expectation:**

- Exactly that brick is removed once.
- Score increases exactly once by 10 points.
- Horizontal ball velocity changes direction.
- The removed brick cannot be scored a second time.

**Baseline result:** NOT RUN  
**Post-change result:** NOT RUN  
**Status:** NOT RUN

If E1–E4 all pass in the real baseline, preserve every PASS result. Define another boundary expectation before executing that new case; never manufacture or retroactively redefine a failure.

## H1 — SEALED HOLDOUT

**Status:** SEALED / NOT RUN

The full scenario and expectation were defined before baseline implementation and are held externally by the human evaluator. They will be revealed only after the controlled change is complete.
