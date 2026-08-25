# Project Memory

This file is wired into every opencode session via `instructions` in
`.opencode/opencode.json`. Use it to persist durable context that helps the
assistant work in this repository — architecture decisions, conventions,
gotchas, and anything that is not obvious from reading the code.

Keep entries concise and dated when useful. Prune stale notes as the project
evolves.

## Project Overview

- Repository: `terrace` (working dir: `/home/sadanddan/Projects/terrace`, empty
  repo)
- A TUI (terminal UI) typing racer and trainer tool, written in **TypeScript**.
- Type: CLI/server tool — specifically a terminal UI (TUI) app.

## Stack Decisions (confirmed)

- **Runtime:** Deno
- **TUI library:** `deno_tui` (Im-Beast/deno_tui) — pure Deno, zero deps,
  reactive, components + mouse/keyboard. Chosen over neo-blessed (Node) and raw
  ANSI.
- **Language:** TypeScript (runs natively in Deno, no separate build step
  needed).
- No scaffolding done yet — user wants to confirm approach before I build it.

## Scaffold (done)

- `deno.json`: import map pins `tui@2.1.11`
  (https://deno.land/x/tui@2.1.11/mod.ts), `tui/components` ->
  src/components/mod.ts, `crayon@3.3.3`. Tasks: `dev` =
  `deno run --allow-read --allow-write main.ts`, `check` = `deno check main.ts`.
- `main.ts`: basic deno_tui demo (Tui + Button counter + Text).

### deno_tui 2.1.11 API gotchas (verified)

- `new Tui({ style, refreshRate })` calls `Deno.consoleSize()` — REQUIRES a real
  TTY; running in a non-interactive shell throws "stdin, stdout, and stderr are
  not connected to a terminal". Expected; works in real terminal.
- All components REQUIRE a `theme` property (type `Partial<Theme>` — can be `{}`
  but must be present).
- `Text` component: `text` is `string | Signal<string>` (NOT `{ value: ... }`),
  and its `rectangle` has NO `height` (only column/row/width; height auto = 1).
- `Button`: `label.text` accepts a `Computed`/`Signal`;
  `state.when("active", cb)` for press events; `handleInput`,
  `handleKeyboardControls`, `handleMouseControls` must be called;
  `tui.dispatch()` closes on Ctrl+C; `tui.run()` starts loop.
- Styling (`style`/`theme.base` etc.) expects a Stylizer function like
  `crayon.bgBlack` (returns styled string).
- **`verbatimModuleSyntax: true` is INCOMPATIBLE with deno_tui@2.1.11** — the
  library imports types via value-style `import { Offset, Rectangle }` (no
  `import type`). With `verbatimModuleSyntax` on, Deno emits those as runtime
  imports and fails at link time ("does not provide an export named 'Offset'").
  Do NOT enable this flag.

## Conventions

## Architecture Decisions

## Gotchas / Lessons Learned

## Open Questions
