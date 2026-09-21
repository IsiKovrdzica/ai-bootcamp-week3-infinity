# BrickPulse Context Manifest

**Purpose:** Define exactly what the future clean baseline implementation agent receives and distinguish workspace availability from context actually sent or used.

## Context rule

A file existing in the BrickPulse workspace does not mean it is baseline implementation context. Only sources marked **Included — send/use** below may be supplied to or deliberately read by the baseline agent. Excluded sources must not influence implementation.

## Baseline implementation sources

| Source | Status | Purpose | Priority | Risk / handling |
|---|---|---|---:|---|
| Fresh baseline user request | Included — send/use | Authorizes the baseline implementation task | 1 | Must match the frozen scope; stop on conflict |
| `AGENTS.md` | Included — send/use | Always-on boundaries, authority, and stop rules | 4 | Keep concise; do not treat as the product specification |
| `.github/00-index.instructions.md` | Included — send/use | Routes the task to relevant instruction modules | 5 | Routing aid only |
| `.github/instructions/01-architecture.instructions.md` | Included — send/use | Game ownership and browser boundaries | 5 | Must not invent paths before scaffolding |
| `.github/instructions/02-testing.instructions.md` | Included — send/use | Focused deterministic implementation-testing discipline | 5 | Implementation tests are not formal evaluation |
| `.github/instructions/03-workflow.instructions.md` | Included — send/use | Specification-first, RED/GREEN, baseline-preservation workflow | 5 | Stop before evaluator-owned evaluation |
| `.github/instructions/04-build-and-commands.instructions.md` | Included — send/use | Prevents invented setup and verification commands | 5 | Commands remain unknown until the manifest exists |
| `docs/GAME_SPEC.md` | Included — send/use | Authoritative game behavior, contract, scope, and Definition of Done | 2 | Frozen product source; stop on contradiction |
| `docs/BUILD_PROMPT_V1.md` | Included — send/use | Exact baseline implementation task | 3 | Applies only to the baseline run |
| `docs/CONTEXT_MANIFEST.md` | Included — send/use | Defines the clean context boundary | 6 | Its presence does not authorize excluded sources |

## Sources excluded from baseline implementation

| Source | Status | Why excluded | Risk avoided |
|---|---|---|---|
| `docs/EVALS.md` | Excluded — do not send/read | Evaluator-owned formal expectations run after the baseline is frozen | Tuning the baseline to formal cases |
| `docs/EVIDENCE_003.md` | Excluded — do not send/read | Empty evidence template, not implementation input | Claim-oriented or circular implementation |
| `docs/AI_USAGE_LOG.md` | Excluded — do not send/read | Historical audit record, not a requirement | Irrelevant context and anchoring |
| All externally held evaluation material | Excluded — do not send/read | Reserved for independent evaluation after the controlled change | Holdout contamination |
| Instructor Week 3/4 package and compiled PDF | Excluded — do not send/read | Already distilled into approved project sources | Noise, conflicting generic exercises, Week 4 leakage |
| Previous analysis/audit conversation | Excluded — do not send/read | Preparation history is not baseline task context | Excess context and stale alternatives |
| Week 4 material | Excluded — do not send/read | Outside the current project boundary | Tool/API/provider scope expansion |
| Generic instruction-file example | Excluded — do not send/read | Patterns have already been adapted | Importing unrelated architecture and commands |
| Generic Ticket/replay exercise | Excluded — do not send/read | Not a BrickPulse requirement | Unrelated contract and domain work |
| Unrelated local files or unsaved editor tabs | Excluded — do not send/read | Not project sources | Noise and accidental scope expansion |
| Web examples and old chats | Excluded — do not send/read | Not needed for the frozen task | Unverified patterns and context drift |
| Credentials, environment values, private data, or private reasoning | Excluded — never send/read | Not required for local Week 3 work | Secret or privacy exposure |

## Source precedence

When included sources differ, use this order:

1. Fresh explicit user request.
2. `docs/GAME_SPEC.md`.
3. `docs/BUILD_PROMPT_V1.md`.
4. `AGENTS.md`.
5. Routed instruction modules.
6. This manifest for context selection.

Stop and report any material conflict that cannot be resolved by this order.

## Clean baseline payload checklist

Before starting the future conversation, the human evaluator should confirm:

- Only the included sources are attached, pasted, or deliberately opened.
- Formal evaluation, evidence, usage-history, instructor, generic-example, and Week 4 sources are not supplied.
- The task is baseline implementation only and ends after focused implementation verification and baseline preservation.
- No credentials or private data are present.
