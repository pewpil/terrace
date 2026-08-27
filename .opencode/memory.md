# Project Memory

This file is wired into every opencode session via `instructions` in
`.opencode/opencode.json`. Use it to persist durable context that helps the
assistant work in this repository — architecture decisions, conventions,
gotchas, and anything that is not obvious from reading the code.

Keep entries concise and dated when useful. Prune stale notes as the project
evolves.

## Working Style (user preference)

- **Discourage big stretch tasks / one-shotting.** Building the whole TUI +
  game + storage stack in a single session produced a long chain of bugs that
  took many iterations to resolve. The user explicitly does NOT want to
  one-shot large features anymore — build step by step, verify each step
  (check/lint/test, and for TUI: a real-PTY render check), and confirm before
  moving on. Prefer small, reviewable increments over a giant end-to-end drop.

## Project Overview

- Repository: `terrace` (working dir: `/home/sadanddan/Projects/terrace`, empty
  repo)
- A TUI (terminal UI) typing racer and trainer tool, written in **TypeScript**.
- Type: CLI/server tool — specifically a terminal UI (TUI) app.

## Stack Decisions (confirmed)

- **Runtime:** Deno (2.9.4 on this machine).
- **TUI library:** `deno_tui` (Im-Beast/deno_tui) — pure Deno, zero deps,
  reactive, components + mouse/keyboard. Chosen over neo-blessed (Node) and raw
  ANSI.
- **Language:** TypeScript (runs natively in Deno, no separate build step
  needed).
- **Storage (2026-08):** SQLite via Deno's built-in `node:sqlite`
  (`DatabaseSync`) — zero new deps. Prisma and Drizzle were evaluated and
  rejected (codegen/node_modules overhead; drizzle-kit crippled under Deno for
  sqlite). Schema created idempotently at startup; no migration framework. Tests
  use `:memory:`.

## Scaffold (current)

- `deno.json`: import map pins `tui@2.1.11`, `crayon@3.3.3`,
  `"std/assert": "jsr:@std/assert@1"` (bare specifier required by the
  `no-import-prefix` lint rule). Tasks: `dev`, `check`, `lint`, `fmt`,
  `fmt:check`, `test`.
- `main.ts`: delegates to `runApp()` in `src/app.ts`.

### Module layout

- `src/game/state.ts` — GameState reducer + Keystroke timeline
  (`applyKeySession`, `classifyKey`). Pure; timestamps passed in.
- `src/game/rng.ts` — mulberry32 seeded PRNG, pick, weightedPick.
- `src/game/markov.ts` — order-2 word Markov chain (`buildChain`,
  `generateText`, dead-end restart fallback); corpus at `src/data/corpus.txt`
  (public-domain prose, normalized lowercase in `tokenize`).
- `src/game/generator.ts` — modes: "normal" (pure markov) / "focus" (60% weak
  targets from FocusProfile). Focus gated on ≥50 key observations
  (`MIN_FOCUS_OBSERVATIONS`). Weak bigrams bias via corpus vocab words that
  contain them (`bigramPracticeWords`), NOT injected as raw char pairs.
- `src/game/analytics.ts` — pure: wordResults (perfect = complete span, no
  errors, no backspaces in span), charErrorMap, perSecondWpm/consistencyScore,
  wpmSeries, sessionSummary, sessionDeltas (key/bigram/word upsert deltas;
  inter-char latency breaks adjacency on backspace/other), rankWeakRows (score =
  2*errorRate + capped slowness ratio → errors dominate).
- `src/storage/db.ts` + `repo.ts` — openDb (mkdir + WAL + idempotent DDL:
  sessions/key_stats/bigram_stats/word_stats), typed repo fns, saveSessionResult
  transactional, loadFocusProfile (word weakness = attempts-minus-perfects as
  error term).

### deno_tui 2.1.11 API gotchas (verified)

- `new Tui({ style, refreshRate })` calls `Deno.consoleSize()` — REQUIRES a real
  TTY; running in a non-interactive shell throws. Expected; works in real
  terminal. Never instantiate Tui from tests.
- All components REQUIRE a `theme` property (can be `{}` but must be present).
- `Text`: `text` is `string | Signal<string>`; update live via
  `text.text.value = ...`; rectangle has NO height (auto = 1).
- `Component.destroy()` removes component + children from parent (screen
  teardown = destroy root components you created).
- `tui.on(event, cb)` RETURNS an unsubscribe function (also
  `tui.off(type, listener)` exists).
- Key names in `keyPress`: "up"/"down"/"left"/"right", "return", "space",
  "backspace", "escape" (lowercase strings).
- `handleInput/handleKeyboardControls/handleMouseControls(tui)` must be called.
- **RENDER LOOP (critical):** `tui.dispatch()` ONLY wires SIGINT/SIGTERM →
  `destroy` handlers. You MUST ALSO call `tui.run()` or **nothing is drawn**
  (blank screen / appears hung) and Ctrl+C leaves the TTY in raw/alt-screen
  mode (broken terminal on exit). `tui.run()` writes `USE_SECONDARY_BUFFER`,
  draws the background, and starts the canvas render timer; it returns
  immediately (loop driven by `setTimeout(refreshRate)`).
- `tui.dispatch()` already installs a `destroy` handler that calls
  `tui.destroy()` (restores primary buffer + cursor + `setRaw(false)`) then
  `Deno.exit(0)`. Do NOT add a second `tui.on("destroy", () => Deno.exit(0))`
  — it is redundant and can run before cleanup.
- Styling expects a Stylizer like `crayon.bgBlack`.
- **crayon has NO `gray`/`grey`** — 4-bit names are black/red/green/yellow/
  blue/magenta/cyan/white + `bg*`/`light*`/`bgLight*`; attributes include
  bold/dim/invert/underline. Use `crayon.dim` for pending text.
- **TERMINAL ENCODING (root cause of "garbled"):** deno_tui emits standard
  ANSI and 8-color codes (crayon uses `ESC[30;47m`-style, NOT truecolor), so
  colors are fine. The ONLY thing that produced "whole screen garbled /
  mojibake, wrong characters" was **non-ASCII glyphs in UI strings**: `❯`,
  `—`, `↑`, `↓`, `·`, `×`, and the sparkline block chars `▁▂▃▄▅▆▇█`. In a
  terminal whose locale/encoding isn't UTF-8 these become garbage. **Keep ALL
  rendered text 7-bit ASCII.** Verify with
  `grep -rnP '[^\x00-\x7F]' src/`. When the user reports "garbled", grep for
  non-ASCII FIRST — before touching layout/positioning. (Replacing those glyphs
  with ASCII — `>`/`-`/`up/down`/`|`/`x` and an ASCII sparkline ramp
  ` .:-=+*#` — fully fixed the reported garbling.)
- **`verbatimModuleSyntax: true` is INCOMPATIBLE with deno_tui@2.1.11** — do NOT
  enable this flag.

## Conventions

- Strict compiler options incl. `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`; lint enforces no-non-null-assertion,
  no-explicit-any, prefer-const, no-import-prefix → index access needs explicit
  undefined guards, external deps go through the import map.
- Game logic is pure (no TUI/storage imports downward); TUI screens return a
  `{ destroy() }` handle; screens communicate via promise resolvers in app.ts.

## Architecture Decisions

- 2026-08: storage = raw node:sqlite, hand-written DDL, thin typed repo layer.
- Keystroke-level accuracy (errors/attempts) rather than positional accuracy.
- Session saved when completed OR any word attempted; aborted runs included so
  focus profile still learns.

## Gotchas / Lessons Learned

- `node:sqlite` works out of the box on this Deno build incl. WAL pragma,
  RETURNING not needed (use last_insert_rowid), transactions via exec
  BEGIN/COMMIT/ROLLBACK.
- Bigram weakness must map to whole vocabulary words containing the pair;
  injecting raw 2-char pairs into word-level Markov output produces garbage
  single-letter tokens.
- **Headless TUI verification:** `script` under a non-interactive shell reports
  `Deno.consoleSize()` = 0, so deno_tui draws nothing (capture is useless). To
  actually see rendered output, use a Python pty harness: `pty.openpty()` +
  `fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))`
  to set e.g. 100x30, spawn `deno run --allow-read --allow-write main.ts` with
  stdin/stdout/stderr = slave, feed keystrokes with small delays, capture raw
  master bytes. Inspect the raw escapes (`ESC[<r>;<c>H` = cursor move proves
  positioning works; `ESC[30;47m g` = cursor char). A naive CSI-stripping
  "screen reconstructor" MIS-PARSES and shows false garbage (e.g. literal
  `[5;14H` as text) — trust the raw escape inspection. With `tui.run()` present,
  the menu + passage render correctly in a proper pty, confirming the per-line
  `Text` + `parent: tui` + `text.text.value` update model is sound.
- **Rendering model that works (proven):** create `Text` components with
  `parent: tui` and a `rectangle: { column, row, width }` (no height); update
  live via `text.text.value = ...`. Components attach on a `queueMicrotask`
  inside the `Component` constructor (not synchronously), which is fine. The
  base `Component.draw()` only clears; `Text.draw()` creates a `TextObject` and
  redraws — live `.value` updates do re-render.

## Open Questions

- 2026-08-27: the working tree was reverted to the last commit, discarding the
  TUI/game/storage modules built in this session. The module layout above is a
  PROVEN DESIGN REFERENCE, not current files in `src/`. Rebuild step by step;
  reuse the gotchas here (esp. `tui.run()` + ASCII-only output) to avoid the
  two bugs that ate the most time.

## Open Questions
