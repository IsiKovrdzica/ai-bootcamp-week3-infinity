# BrickPulse Game Specification

**Status:** Frozen for Week 3 baseline implementation  
**Project:** BrickPulse  
**Platform:** Browser  
**Logical play area:** 640×480

## Description

BrickPulse is a small, original Breakout-inspired browser game rendered on one HTML Canvas. The player moves one horizontal paddle to keep one ball in play and destroy a fixed wall of bricks. The game contains one level, a score, three lives, and explicit ready, win, and game-over states. The project demonstrates specification-first development, deterministic rule testing, runtime configuration validation, and reproducible Week 3 evidence.

## Player goal and controls

The goal is to destroy every brick before all three lives are lost.

- **Left Arrow or `A`:** move the paddle left.
- **Right Arrow or `D`:** move the paddle right.
- **Space:** start play from `READY`; after `WON` or `GAME_OVER`, restart a fresh game.

## Game loop

1. Validate the startup `GameConfig`.
2. If valid, create a `READY` game with the paddle, stationary ball, fixed 4×8 brick grid, zero score, and three lives.
3. On Space, enter `RUNNING` and advance the ball and paddle from player input.
4. Resolve wall, paddle, and brick collisions; remove hit bricks and update score.
5. On a missed ball, subtract one life and either reset the paddle/ball or enter `GAME_OVER`.
6. When all bricks are destroyed, enter `WON`.
7. Stop simulation in terminal states and allow a full restart with Space.

## Win and lose conditions

- **Win:** every brick in the fixed 4×8 grid has been destroyed.
- **Lose:** the ball passes below the paddle when no life remains, producing `GAME_OVER`.

## Runtime-validated contract

```ts
type GameConfig = {
  lives: number;
  paddleSpeed: number;
  ballSpeed: number;
};
```

Default configuration:

```json
{
  "lives": 3,
  "paddleSpeed": 360,
  "ballSpeed": 240
}
```

Runtime validation must prove:

- The input is a non-null plain object.
- It contains exactly `lives`, `paddleSpeed`, and `ballSpeed`, with no missing or unexpected keys.
- `lives` is the integer `3`.
- `paddleSpeed` is a finite number from 200 through 600 pixels per second.
- `ballSpeed` is a finite number from 150 through 450 pixels per second.
- Values are not coerced from strings or other types.

Invalid configuration must produce a controlled validation result and prevent creation of playable game state. A TypeScript type assertion alone is not runtime validation.

## Gameplay rules

1. The paddle moves only horizontally and always remains fully inside the 640×480 play area.
2. The ball is stationary above the paddle in `READY` until the player presses Space.
3. The ball reflects from the left, right, and top walls.
4. Contact with the paddle reflects the ball upward.
5. A brick is removed once when hit and adds exactly 10 points once.
6. Missing the paddle costs one life; if lives remain, the paddle and ball reset while the current score and destroyed bricks are preserved.
7. Destroying every brick produces `WON`; losing the final life produces `GAME_OVER`; simulation stops until a restart.
8. Brick collision response follows the collision side: a left/right side hit reverses horizontal velocity, while a top/bottom hit reverses vertical velocity.

## Minimal visual requirement

Use one 640×480 Canvas with a dark background, original geometric shapes, a small retro color palette, and system monospace text. Display the paddle, ball, fixed brick grid, score, remaining lives, and a short message for `READY`, `WON`, or `GAME_OVER`. Do not use external assets, custom fonts, copied branding, or copyrighted game art.

## Out of scope

- Multiplayer, accounts, authentication, or leaderboards.
- Backend, database, API endpoints, or deployment.
- Custom audio, external assets, or copied Breakout branding.
- Power-ups, multiple levels, procedural generation, or difficulty progression.
- Physics engines, particle systems, elaborate animation, or touch/mobile controls.
- AI opponent or player-facing AI.
- AI hints, tool calling, read-only tools, providers, API SDKs, retries, timeouts, fallbacks, or any Week 4 functionality.
- React, Zod, or other unnecessary frameworks and libraries.

## Definition of Done

- The approved minimal browser scaffold loads BrickPulse locally using commands verified from its actual project manifest.
- A valid default `GameConfig` creates `READY`; invalid or incomplete configuration is rejected before playable state exists.
- The 640×480 game contains exactly one paddle, one ball, one fixed 4×8 brick grid, one level, three lives, and a score starting at zero.
- Both documented movement key pairs work, and the paddle never leaves the play area.
- Start, wall collision, paddle collision, brick removal, side/top/bottom brick response, scoring, life loss, win, game over, and restart match the eight gameplay rules.
- Every brick awards exactly 10 points at most once.
- Pure configuration and game-rule behavior has focused deterministic tests; Canvas behavior receives an appropriate manual smoke check.
- The completed baseline is frozen before evaluator-owned formal evaluation begins.
- Actual commands and results are recorded without fabricated evidence.
- No out-of-scope or Week 4 functionality is present.
