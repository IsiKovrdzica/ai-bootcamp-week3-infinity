---
description: "Risk-based Week 3 review checklist for BrickPulse."
applyTo: "**/*"
---

# Code Review Instructions

## Review order

1. Confirm the change matches the current request and `docs/GAME_SPEC.md`.
2. Reject Week 4 features and other excluded scope.
3. Check that `GameConfig` is validated at runtime before playable state exists.
4. Check all eight gameplay rules, including collision-side response.
5. Check that pure rules remain separate from browser input and Canvas rendering.
6. Check focused tests, evaluator-owned formal results, and the preserved baseline without overstating evidence.
7. Check that one correction has one hypothesis, one controlled change, and the same formal evaluation before/after.
8. Check dependency restraint, intentional files, and absence of secrets or generated claims.
9. Check `docs/EVIDENCE_003.md` and `docs/AI_USAGE_LOG.md` against actual work.

## Findings to reject

- Type assertions presented as runtime validation.
- Rule or score logic implemented only in rendering or event handlers.
- Multiple simultaneous changes that prevent causal comparison.
- Formal evaluations supplied as baseline implementation context.
- Unrun checks marked PASS or fabricated screenshots/output.
- React, Zod, physics engines, backend/provider code, or other excluded additions.
- Unrelated formatting, dependency upgrades, or infrastructure.

## Handoff

Report behavior changed, files changed, checks actually run, results, known limitations, and evidence still missing. A successful demo is not proof beyond the scenarios actually checked.
