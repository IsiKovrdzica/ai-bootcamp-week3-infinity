# Week04 Development Quickstart (Planned)

This file describes commands the implementation plan intends to establish. They are not available or verified until implementation records actual results.

## Prerequisites

- Node.js 20 or newer
- npm
- No Gemini credential for ordinary development, tests, typecheck, build, or smoke checks

## Environment

Implementation will add an ignored local `.env` and a committed `.env.example` containing only:

```dotenv
GEMINI_API_KEY=
GEMINI_MODEL=
```

Create the ignored local file before using commands that explicitly pass Node's built-in `--env-file=.env` option:

```bash
cp .env.example .env
```

Backend code reads values from `process.env`. `tsx` is not assumed to load `.env`. The planned local scripts use Node 20+'s built-in environment-file support; emitted production startup may instead receive already-exported environment variables.

For a separately authorized live check, set `GEMINI_MODEL=gemini-3.5-flash-lite` unless another available model is deliberately selected. Never place a real key in `.env.example`, documentation, tests, evidence, screenshots, or browser-visible variables.

## Planned local commands

```bash
npm install
npm run dev:all
```

`dev:all` will start:

- the API on `http://127.0.0.1:8787`;
- Vite on its printed frontend URL; and
- a Vite development proxy from `/api` to the API.

Without Gemini configuration, the backend may start for local UI/error-path work but must return the stable unavailable response instead of attempting a provider call. A successful live advice request requires both backend environment values. Deterministic success and failure coverage belongs to the automated fake-provider tests rather than a hidden runtime provider switch.

Frontend-only and backend-only development remain available:

```bash
npm run dev
npm run dev:server
```

The planned `dev:server` command is `node --env-file=.env --import tsx --watch server/index.ts`. The emitted production command is exactly `node dist-server/server/index.js`.

## Planned routine verification

```bash
npm test
npm run typecheck
npm run build
npm run smoke
```

These commands must use fake providers only and must not require `GEMINI_API_KEY` or network access.

The existing Week03 focused and evaluator-owned commands remain part of regression evidence:

```bash
npm test -- src/config.test.ts src/game.test.ts src/input.test.ts
npm test -- evals/week3-formal.test.ts
npm test -- evals/week3-holdout.test.ts
```

## Planned explicit live verification

```bash
npm run verify:gemini
```

This command will:

- refuse or report `SKIPPED` when backend-only configuration is absent;
- make at most one live provider call;
- use the same prompt adapter and runtime output validator as the application;
- print only provider, model, latency, attempt count, and sanitized pass/fail/skip status;
- never print the key, internal prompt, raw provider payload, or stack trace.

It is never invoked by `npm test`, `typecheck`, `build`, or `smoke`.

## Manual acceptance path after implementation

1. Start `dev:all`; configure Gemini only when intentionally checking the live success path.
2. Complete a game to `WON` or `GAME_OVER`.
3. Confirm `ASK AI COACH` appears only in the terminal state.
4. Confirm one click shows `ANALYZING...`, disables the button, and then renders validated advice or the stable safe failure.
5. Confirm the button becomes usable after settle.
6. Start another request and restart; confirm old output is cleared and a late result cannot update the new game.
7. Confirm Space and all Week03 gameplay behavior remain unchanged.
