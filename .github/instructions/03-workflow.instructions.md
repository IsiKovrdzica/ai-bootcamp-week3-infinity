---
description: "BrickPulse specification-first, test-first, and evidence workflow."
applyTo: "**/*"
---

# Workflow Instructions

## Required sequence

```text
specification
  → focused implementation expectation
  → RED when applicable
  → smallest implementation
  → GREEN
  → relevant regression
  → frozen baseline
  → evaluator-owned formal evaluation
  → observed signal
  → one hypothesis
  → one controlled change
  → same formal evaluation before/after
  → independently held evaluation
  → evidence and review
```

## Before editing

1. Read `AGENTS.md` and route through `.github/00-index.instructions.md`.
2. Read only context authorized for the current stage by `docs/CONTEXT_MANIFEST.md`.
3. Confirm the allowed paths and current scope.
4. State assumptions or contradictions before changing files.

## During work

- Make one small, coherent behavior change at a time.
- Keep tests with their behavior change and preserve unrelated work.
- Do not broaden scope to solve an unrelated issue.
- Preserve the completed baseline before formal evaluation or correction.
- For a correction, record the signal, hypothesis, frozen variables, and one controlled change.
- Log meaningful AI assistance without private reasoning.

## Evidence and external actions

- Record actual commands, outputs, limitations, and skipped checks.
- Never fabricate results or generated evidence.
- Do not commit, push, deploy, publish, or contact external services unless separately requested.
- Stop on contradictory requirements, missing material decisions, out-of-scope paths, or Week 4 behavior.
