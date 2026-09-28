---
description: "Routing guide for BrickPulse Week03 gameplay and the approved Week04 AI Coach."
applyTo: "**/*"
---

# BrickPulse Instructions Index

## Purpose

Use this index to select the smallest relevant context. Do not load every document merely because it exists in the workspace.

## Authoritative project documents

- docs/GAME_SPEC.md — Week03 product behavior, scope, contract, and Definition of Done.
- specs/001-brickpulse-ai-coach/spec.md — authority for the approved additive Week04 AI Coach and minimum telemetry only.
- specs/001-brickpulse-ai-coach/tasks.md — approved Week04 execution order and dependency gates.
- `docs/BUILD_PROMPT_V1.md` — task prompt for the future baseline implementation.
- `docs/CONTEXT_MANIFEST.md` — sources actually allowed for each stage.
- `docs/EVALS.md` — evaluator-owned formal expectations; excluded from baseline implementation context.
- `docs/EVIDENCE_003.md` — evidence template populated only from real results.
- `docs/AI_USAGE_LOG.md` — factual record of meaningful AI assistance.

## Routing matrix

| Task | Read first | Usually also read |
|---|---|---|
| Game ownership, state, collision, or rendering boundary | 01-architecture.instructions.md | docs/GAME_SPEC.md |
| Week04 AI architecture, backend, provider, timeout, retry, or frontend coach boundary | 01-architecture.instructions.md | specs/001-brickpulse-ai-coach/spec.md, tasks.md |
| GameConfig or deterministic game-rule behavior | 02-testing.instructions.md | 01-architecture.instructions.md, docs/GAME_SPEC.md |
| Week04 contract, validation, fake-provider, or controller test | 02-testing.instructions.md | specs/001-brickpulse-ai-coach/spec.md, tasks.md |
| Baseline implementation or controlled correction | 03-workflow.instructions.md | 01-architecture.instructions.md, 02-testing.instructions.md, 04-build-and-commands.instructions.md |
| Approved Week04 implementation | 03-workflow.instructions.md | specs/001-brickpulse-ai-coach/spec.md, tasks.md, relevant architecture/testing modules |
| Setup, build, or test commands | `04-build-and-commands.instructions.md` | `03-workflow.instructions.md` |
| Final verification, evidence, or handoff | 05-code-review.instructions.md | 03-workflow.instructions.md |
| Week04 review, evidence, or optional live verification | 05-code-review.instructions.md | specs/001-brickpulse-ai-coach/spec.md, tasks.md |
| Documentation-only change | `03-workflow.instructions.md` | Add another module only if its subject changes |
| Formal Week 3 evaluation after the baseline is frozen | `docs/EVALS.md` | `05-code-review.instructions.md`, `docs/EVIDENCE_003.md` |

## Baseline context rule

For the historical Week03 baseline, follow docs/CONTEXT_MANIFEST.md. Formal evaluation and evidence documents are not baseline implementation input. The approved Week04 task follows its SpecKit artifacts without rewriting historical Week03 documents.

## Maintenance

- Keep modules short and non-duplicative.
- Update the most specific authoritative file when a rule changes.
- Never copy commands or architecture from the instructor's generic example.
