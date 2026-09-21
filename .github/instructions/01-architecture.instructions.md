---
description: "BrickPulse Week 3 ownership, state, and browser boundaries."
applyTo: "**/*"
---

# Architecture Instructions

## System boundary

BrickPulse is one small vanilla TypeScript browser application rendered with HTML, CSS, and one Canvas. The logical play area is 640×480 and contains one paddle, one ball, one fixed 4×8 brick grid, one level, score, and three lives.

## Ownership

- Pure game logic owns state, movement, collision response, scoring, life loss, and terminal-state transitions.
- Browser input converts keys into player intent; it does not directly mutate authoritative state.
- Canvas rendering reads state and draws it; it does not decide rules, score, or collisions.
- Startup code validates `GameConfig` before creating playable state.
- Invalid configuration produces a controlled failure and no playable game.

Keep these responsibilities separable when the scaffold is created. Exact file paths may follow the eventual minimal scaffold, but dependency direction must remain game logic → state results, with browser input/rendering around that logic.

## Change rules

- Implement only behavior defined in `docs/GAME_SPEC.md`.
- Keep the fixed brick layout and single-level design.
- Use a handwritten runtime validator for the three-field `GameConfig`.
- Do not add a UI framework, validation library, physics engine, backend, database, provider SDK, or Week 4 feature.
- Do not hide rule decisions inside drawing code or DOM event handlers.
