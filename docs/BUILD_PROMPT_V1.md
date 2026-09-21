# BrickPulse Baseline Build Prompt V1

Use the following as the actual task prompt in a fresh Codex conversation after the specification and context package are frozen.

---

You are the implementation agent for the Week 3 baseline of **BrickPulse**, a small Breakout-inspired retro browser game.

## Before editing

1. Read only the sources supplied for this baseline run and allowed by `docs/CONTEXT_MANIFEST.md`.
2. Summarize your understanding of the goal, scope, architecture boundaries, and Definition of Done.
3. Give a short implementation plan ordered by behavior slice.
4. List ambiguities or assumptions. Do not silently fill a material requirement gap.
5. Do not expand scope without explicit approval.

## Goal

Create the smallest coherent BrickPulse baseline that satisfies the frozen `docs/GAME_SPEC.md`: a vanilla TypeScript/HTML/CSS/Canvas browser game with one paddle, one ball, a fixed 4×8 brick grid, score, three lives, one level, win/game-over states, restart, and a handwritten runtime validator for the three-field `GameConfig`.

## Technical context

- The workspace begins without an application scaffold.
- Use vanilla TypeScript, HTML, CSS, and Canvas.
- Use Vite only for the minimal browser development/build scaffold and Vitest only for deterministic focused tests.
- Inspect the created `package.json` before documenting or running project commands.
- Keep pure game state, updates, collision rules, scoring, and state transitions separate from browser input and Canvas rendering.
- Canvas rendering reads authoritative state; it does not decide gameplay rules.
- Browser input expresses intent; it does not directly mutate authoritative state.

## Required behavior

Implement the exact contract, default values, controls, game loop, eight gameplay rules, visual minimum, exclusions, and Definition of Done in `docs/GAME_SPEC.md`.

The `GameConfig` validator must inspect unknown runtime input, require exactly `lives`, `paddleSpeed`, and `ballSpeed`, enforce the documented values/ranges, reject unexpected keys, and perform no type coercion. Invalid configuration must prevent playable-state creation.

## Test-first requirement

- Derive appropriate focused implementation tests from `docs/GAME_SPEC.md`.
- For each behavior slice, write the focused expectation first when applicable and confirm a meaningful RED result.
- Implement the smallest coherent change for GREEN, then run the relevant regression checks.
- Prefer pure deterministic rule tests with explicit state, positions, velocities, and time deltas.
- Supplement pure tests with a manual Canvas smoke check only after the deterministic behavior is green.
- Do not read or use evaluator-owned evaluation or evidence documents during this baseline task.

## Allowed areas of change

- Minimal root files required for the approved Vite/TypeScript/Vitest scaffold.
- Minimal application source for the specified browser game.
- Focused deterministic implementation tests.
- Factual setup/verification notes only when based on the actual created manifest and executed commands.

Preserve the existing specification, context, instruction, evidence-template, and usage-log documents unless the user separately authorizes a documentation correction.

## Prohibited additions

Do not add React, Zod, a physics engine, a backend, database, API endpoint, provider/API SDK, player-facing AI, AI hint, tool calling, read-only tool, retry, timeout, fallback, deployment, telemetry infrastructure, multiplayer, accounts, leaderboard, audio, power-up, multiple levels, procedural generation, or any other excluded or Week 4 feature.

Do not add dependencies merely for convenience. Do not initialize Git, commit, push, deploy, or contact external services unless separately requested.

## Required verification and baseline handoff

- Run only commands established from the actual scaffold and `package.json`.
- Report every command actually run and its real result; report skipped or unavailable checks explicitly.
- Inspect the final file set and confirm no prohibited scope was added.
- Report changed files, implementation assumptions, remaining limitations, and blockers.
- When the smallest specified baseline and its focused implementation checks are complete, preserve that state and stop. Do not begin evaluator-owned formal evaluation or a corrective iteration in this task.

## Stop and escalate

Stop without improvising if requirements conflict, a material decision is missing, an unapproved dependency seems necessary, a requested change falls outside allowed areas, a check fails for an unrelated pre-existing reason, or satisfying the task would require excluded functionality.

---
