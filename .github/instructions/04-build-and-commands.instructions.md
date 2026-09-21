---
description: "Status and rules for BrickPulse setup, build, and verification commands."
applyTo: "**/*"
---

# Build and Commands Instructions

## Current status

The approved baseline scaffold and `package.json` now exist. The established stack is vanilla TypeScript, HTML, CSS, Canvas, Vite, and Vitest. `npm install` was used to install the dependencies recorded in the project manifest and lockfile.

The following package scripts are established:

| Command | Purpose | Baseline verification status |
|---|---|---|
| `npm run dev` | Start the Vite development server | Executed successfully during the baseline as `npm run dev -- --host 127.0.0.1` |
| `npm test` | Run the focused Vitest suite once | Executed successfully; 33/33 tests passed |
| `npm run typecheck` | Run TypeScript checking without emitting files | Executed successfully after the documented minimal correction |
| `npm run build` | Run TypeScript checking and create the Vite production build | Executed successfully |
| `npm run preview` | Preview the production build with Vite | Available in `package.json`; not executed during the baseline run |

No lint, formatting, or coverage command is established.

## Command discipline

- Do not copy commands from the instructor's generic example.
- Do not invent conventional commands or report them as available.
- Prefer focused checks during implementation and the full relevant checks before handoff.
- Report unavailable commands as `NOT ESTABLISHED`, never as passed.
- Do not treat an available script as successfully verified unless it was actually executed.
- Do not add or change dependencies, initialize Git, or alter the scaffold without explicit authorization for that phase.
