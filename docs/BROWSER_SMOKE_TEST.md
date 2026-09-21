# BrickPulse Browser Smoke Test

This document contains a manual browser check for the initial screen and the basic start/movement interaction. It supplements the deterministic tests and the automated application smoke command; it does not replace them or the evaluator-owned formal tests.

The browser interaction check below is manual, not an automated browser test. The automated server and entrypoint check is available as:

```bash
npm run smoke
```

That command starts Vite on port 4173, requests the served page, and verifies the BrickPulse title, 640x480 Canvas, and module entrypoint. It does not simulate keyboard input or replace the manual Canvas check.

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

## Automated smoke execution

- **Command:** `npm run smoke`
- **Result:** PASS
- **Observed:** Vite served the application at `http://127.0.0.1:4173/`; all three named checks passed for the BrickPulse title, Canvas dimensions, and `/src/main.ts` entrypoint.

This smoke test was independently repeated during the final review. It is separate from the formal E1-E5 and H1 evaluator artifacts.
