---
description: "Deterministic Week 3 contract and game-rule testing guidance."
applyTo: "**/*"
---

# Testing Instructions

## Focused implementation tests

- Derive focused tests from `docs/GAME_SPEC.md`, not from implementation details.
- Test configuration validation and pure game rules without Canvas wherever possible.
- Use explicit states, positions, velocities, and time deltas. Avoid uncontrolled randomness and wall-clock-sensitive assertions.
- Separate JSON/object handling, contract validation, and gameplay meaning.
- Cover a meaningful success case and a relevant rejection or boundary case for each implemented behavior slice.

## RED, GREEN, regression

- Write the focused expectation before implementation when applicable.
- Confirm RED fails for the intended missing behavior, not because the test or fixture is broken.
- Implement the smallest coherent change required for GREEN.
- Rerun the focused check and relevant regression checks.
- Do not weaken or rewrite an expectation merely to make current code pass; an approved requirement change is required.

## Formal evaluation boundary

Formal Week 3 evaluations are evaluator-owned and run only after the baseline is frozen. They are not baseline implementation context and must not be used to tune the initial implementation.

Manual Canvas checks may supplement deterministic tests, but they do not replace contract and rule tests. Record only commands and outcomes that were actually run.
