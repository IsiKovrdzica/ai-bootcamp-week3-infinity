# BrickPulse Agent Instructions

## Purpose

This is the concise, always-on entry point for agents working on BrickPulse. BrickPulse is a small Week 3 Breakout-inspired browser game; the current project boundary ends before all Week 4 AI, tool, provider, and backend functionality.

## Authority order

1. The current explicit user request.
2. `docs/GAME_SPEC.md` for product behavior and scope.
3. `docs/BUILD_PROMPT_V1.md` for the baseline implementation task.
4. This file.
5. The relevant module routed by `.github/00-index.instructions.md`.
6. `docs/CONTEXT_MANIFEST.md` for context selection and exclusions.

If two sources conflict, stop and report the conflict instead of guessing.

## Always-on boundaries

- Keep the project limited to vanilla TypeScript, HTML, CSS, and Canvas, with the intended future Vite and Vitest setup.
- Keep game-state updates and collision rules independent from Canvas rendering and browser input.
- Validate `GameConfig` at runtime before creating playable state. A TypeScript type assertion is not runtime validation.
- Follow specification-first and focused test-first development: write the relevant expectation, observe meaningful RED when applicable, implement the smallest coherent change, reach GREEN, and run relevant regression checks.
- Preserve actual baseline results and report commands and failures honestly. Never fabricate evidence or mark an unrun check as passing.
- Add no dependency, framework, infrastructure, or feature outside the approved scope without explicit approval.
- Do not add React, Zod, a physics engine, backend/database code, provider or API SDKs, AI hints, tool calling, retries, timeouts, deployment, or other Week 4 functionality.
- Do not commit secrets, credentials, private data, or private reasoning.

## Instruction routing

Read `.github/00-index.instructions.md`, then load only the smallest relevant instruction module. Authoritative project documents are task context, not material to duplicate into instruction files.

## Stop conditions

Stop and ask for direction when requirements conflict, a material decision is missing, a requested change crosses the Week 3 boundary, an unapproved dependency appears necessary, or work would require paths outside the task's allowed scope.
