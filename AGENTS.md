# BrickPulse Agent Instructions

## Purpose

This is the concise, always-on entry point for agents working on BrickPulse. BrickPulse is a small Week03 Breakout-inspired browser game with one approved additive Week04 feature: the post-game AI Coach defined in specs/001-brickpulse-ai-coach/spec.md.

## Authority order

1. The current explicit user request.
2. docs/GAME_SPEC.md for all Week03 gameplay behavior and scope.
3. specs/001-brickpulse-ai-coach/spec.md for the approved Week04 AI Coach boundary and minimum duration telemetry only.
4. docs/BUILD_PROMPT_V1.md for the historical baseline implementation task.
5. This file.
6. The relevant module routed by .github/00-index.instructions.md.
7. docs/CONTEXT_MANIFEST.md for historical Week03 context selection and exclusions.

If two sources conflict, stop and report the conflict instead of guessing.

## Always-on boundaries

- Keep the project limited to vanilla TypeScript, HTML, CSS, and Canvas, with the intended future Vite and Vitest setup.
- Keep game-state updates and collision rules independent from Canvas rendering and browser input.
- Validate `GameConfig` at runtime before creating playable state. A TypeScript type assertion is not runtime validation.
- Follow specification-first and focused test-first development: write the relevant expectation, observe meaningful RED when applicable, implement the smallest coherent change, reach GREEN, and run relevant regression checks.
- Preserve actual baseline results and report commands and failures honestly. Never fabricate evidence or mark an unrun check as passing.
- Add no dependency, framework, infrastructure, or feature outside the approved scope without explicit approval.
- Permit backend, provider, API SDK, post-game AI, retry, and timeout work only where it implements the approved Week04 AI Coach specification and its task plan.
- Do not add React, Zod, a physics engine, database code, a second endpoint or provider, authentication, deployment, streaming, agents, dashboards, or gameplay redesign.
- Do not commit secrets, credentials, private data, or private reasoning.

## Instruction routing

Read `.github/00-index.instructions.md`, then load only the smallest relevant instruction module. Authoritative project documents are task context, not material to duplicate into instruction files.

## Stop conditions

Stop and ask for direction when requirements conflict, a material decision is missing, a requested change crosses the approved Week04 boundary, an unapproved dependency appears necessary, or work would require paths outside the task's allowed scope.
