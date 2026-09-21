# BrickPulse Browser Smoke Test

This is a short manual check for the initial screen and the basic start/movement interaction. It supplements the deterministic tests; it does not replace them or the evaluator-owned formal tests.

## Reproduce

From the repository root:

```bash
npm install
npm run dev -- --host 127.0.0.1
```

Open the Vite URL, normally `http://127.0.0.1:5173/`, in a browser.

1. Confirm the page title and `BrickPulse` heading are visible.
2. Confirm the game area is a 640x480 Canvas showing the paddle, ball, 32 bricks, `SCORE 0000`, `LIVES 3`, and `READY`.
3. Press `Space` once. Confirm the ready message changes to running play and the ball begins moving.
4. Hold `ArrowRight` briefly, then release it. Confirm the paddle responds while staying inside the game area.
5. Optionally press `A` and `D` briefly to check the alternate movement controls.

## Review execution

- **Date:** 2026-09-21
- **Server command:** `npm run dev -- --host 127.0.0.1`
- **URL:** `http://127.0.0.1:5173/`
- **Result:** PASS
- **Observed:** The initial screen rendered with the 640x480 Canvas, 32-brick wall, score 0, three lives, paddle, ball, and `READY` message. Pressing Space changed the rendered frame and started play. Holding ArrowRight changed the rendered frame again, confirming basic input was received.
- **Additional signal:** Canvas readback confirmed non-empty rendered pixels and reported `width: 640`, `height: 480`.

This smoke test was independently repeated during the final review. It is separate from the formal E1-E5 and H1 evaluator artifacts.
