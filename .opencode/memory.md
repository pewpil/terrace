# Project Memory

This file is wired into every opencode session via `instructions` in
`.opencode/opencode.json`. Use it to persist durable context that helps the
assistant work in this repository — architecture decisions, conventions,
gotchas, and anything that is not obvious from reading the code.

Keep entries concise and dated when useful. Prune stale notes as the project
evolves.

## Project Overview

- Repository: `terrace` (working dir: `/home/sadanddan/Projects/terrace`, empty repo)
- A TUI (terminal UI) typing racer and trainer tool, written in **TypeScript**.
- Type: CLI/server tool — specifically a terminal UI (TUI) app.

## Stack Decisions (confirmed)

- **Runtime:** Deno
- **TUI library:** `deno_tui` (Im-Beast/deno_tui) — pure Deno, zero deps, reactive, components + mouse/keyboard. Chosen over neo-blessed (Node) and raw ANSI.
- **Language:** TypeScript (runs natively in Deno, no separate build step needed).
- No scaffolding done yet — user wants to confirm approach before I build it.

## Conventions

## Architecture Decisions

## Gotchas / Lessons Learned

## Open Questions
