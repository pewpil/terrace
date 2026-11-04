# Project Memory

This file is wired into every opencode session via `instructions` in
`.opencode/opencode.json`. Use it to persist durable context that helps the
assistant work in this repository — architecture decisions, conventions,
gotchas, and anything that is not obvious from reading the code.

Keep entries concise and dated when useful. Prune stale notes as the project
evolves.

## Working Style (user preference)

- **Discourage big stretch tasks / one-shotting.** Build step by step, verify
  each step (check/lint/test + for TUI: a real-PTY render check), and confirm
  before moving on. Prefer small, reviewable increments. (Exception: when the
  user explicitly says "implement all of them", do all approved steps but keep
  verifying after each.)

## Project Overview

- Repository: `terrace` (working dir: `/home/sadanddan/Projects/terrace`)
- A TUI typing racer and trainer. Terminal UI app.

## Stack (current, OpenTUI era — 2026-10)

- **Runtime:** Node 26.4.0 via nvm (`~/.config/nvm/nvm.sh`, `.nvmrc`); run with
  `node --experimental-ffi`. NOT Deno/Bun (the old deno_tui prototype was
  discarded).
- **UI:** `@opentui/core` + `@opentui/solid` 0.5.12 with `solid-js` pinned
  exact 1.9.12 + `babel-preset-solid` 1.9.12 (lockstep matters).
- Node path requires Babel: universal Solid JSX transform (`moduleName:
  "@opentui/solid"`, `generate: "universal"`), module-resolver aliases
  `solid-js` → `solid.js` dist and appends `.js` to relative imports.
- Tests: `node:test` + `testRender()` from `@opentui/solid`; Babel-compiled to
  `dist-test/`. `npm test` globs `"dist-test/tests/*.test.js"` (trailing-slash
  dir path fails). `build:test` now `rm -rf dist-test` first (stale compiled
  tests otherwise linger and run twice).
- SEA deployment works: `npm run build:exe` → `build/terrace`; `src/sea-extract.ts`
  must stay the FIRST import in `src/index.tsx`.
- Skills: `.agents/skills/` is gitignored + regenerable via `npm run skill`
  (reads `skills-lock.json`, runs `npx skills add <source> --skill <name>`);
  the lockfile records source+hash but does NOT pin upstream (no `skills ci`;
  re-install fetches current upstream — hash is a drift indicator only).

## Current implementation (2026-10-21)

- `src/app.tsx` — `Screen = 'menu' | 'session'`, signal-based switching.
- `src/screens/menu.tsx` — full-screen centered menu: `ascii_font font="block"
  text="TERRACE"` (~81 cols; user rejected `huge`), ↑/↓/Enter/q/Esc.
- `src/screens/session.tsx` — the typing page, fully working:
  - Layout: left col `flexGrow: 1` (75%) with rows 10/65/25 (header strip /
    passage / feedback); right col exactly `width: '25%'` with stats stack
    (wpm/acc/time/progress, label box width 10) + 3-wide vertical progress bar
    (track `#16161e`, fill `#a6e3a1`, `justifyContent: 'flex-end'` + child
    `height: '<pct>%'`).
  - Typing model: position-based `typed: string[]` signal; printable keys via
    `key.sequence` (length 1, `>= ' '`, `< '\x7f'`, `!ctrl && !meta`);
    backspace pops. Esc → menu, Tab → resetSession.
  - Passage: hardcoded English sentence; `wrapLines(passage, 60)` greedy wrap;
    3-line sliding window (`windowLines`, current line centered when possible;
    `LINE_STARTS` accounts for the consumed separator space).
  - Char states: correct `#c0caf5`, pending `#565f89`, wrong `#f7768e` (shows
    the TYPED char, monkeytype-style), caret fg `#7aa2f7` + bg `#283457` (bg
    needed so a caret on a space is visible).
  - Word finalize: word spans INCLUDE the trailing space; finalize on typing
    the space (or passage completion); once per word (`finalized[]`); perfect
    = zero errors AND zero backspaces in span → streak++, else streak=0.
    Feedback row: `perfect: <word>` / `miss: <word>` or `<typed> != <word>`,
    plus `streak N` (green when > 0).
  - Stats: 500ms ticker (`setInterval` + `unref()` + `onCleanup`); wpm =
    correctChars/5/minutes (needs ≥1s), acc = (attempts-errors)/attempts over
    printable keystrokes, time m:ss frozen at done, progress = typed/length.
  - Done state: `session complete - tab to restart`, typing/backspace ignored.
- Tests: 16 total (5 menu + 11 session) — colors asserted via `captureSpans()`
  (spans have `fg`/`bg` RGBA with `.equals()`; `RGBA` exported from
  `@opentui/core`).

## OpenTUI 0.5.12 gotchas (proven this session)

- `render(App)` must receive the component FUNCTION, not a JSX element, or
  `useRenderer()` throws "No renderer found".
- Mock input emits raw bytes: use `pressEnter()` not `pressKey('return')`.
  Available: `typeText(text, delayMs?)` (async), `pressTab`, `pressBackspace`,
  `pressEscape`, `pressEnter`, `pressArrow`.
- Screen transitions need real time gaps: `await wait(50)` + `await flush()`
  so the new screen's `useKeyboard` listener mounts.
- `captureSpans()` exists on TestRendererSetup (implemented in
  `@opentui/core/testing`, re-exported by solid) — use it for color asserts;
  `captureCharFrame()` for text asserts.
- `<text>` supports `bg` (string hex ok) — proven with the caret highlight.
- `ParsedKey`: `name`, `ctrl`, `meta`, `shift`, `sequence`, `eventType`.
- Do NOT bind `q` in the session screen — q is a typing letter (menu keeps
  q=quit).
- **PTY verification:** the renderer emits DIFFS (only changed cells), so a
  per-phase capture must replay the ACCUMULATED byte stream —
  `/tmp/opencode/pty_run.py` does this (phases: `wait:N` / `type:text` /
  `key:TAB|ESC|ENTER|BS`).
- `npm run build` (dist/) is separate from `npm test` (dist-test/) — rebuild
  dist/ before pty runs or you test stale code.
- All rendered prose stays 7-bit ASCII (old garbled-terminal lesson; box-
  drawing in the block-font title is fine).

## Old-project design reference (deno era — reuse for upcoming steps)

The reverted deno prototype's module layout is a PROVEN DESIGN REFERENCE for
the generator/analytics/storage steps (not current files):

- `game/rng.ts` mulberry32; `game/markov.ts` order-2 word Markov
  (`buildChain`/`generateText`, dead-end restart fallback), corpus normalized
  lowercase.
- `game/generator.ts` modes normal/focus; focus gated on ≥50 key observations;
  weak bigrams bias via vocab words CONTAINING the pair (never inject raw
  2-char pairs — produces garbage tokens).
- `game/analytics.ts` pure: perfect word = complete span, no errors, no
  backspaces in span (adopted in session.tsx already); perSecondWpm/
  consistencyScore; sessionDeltas (inter-char latency breaks adjacency on
  backspace); rankWeakRows score = 2*errorRate + capped slowness ratio.
- Storage plan: SQLite via `node:sqlite` `DatabaseSync`, WAL, idempotent DDL
  (sessions/key_stats/bigram_stats/word_stats), transactional save,
  loadFocusProfile (word weakness = attempts-minus-perfects).

## Roadmap (approved plan, remaining)

- Summary screen (separate screen after session completes).
- Markov/focus passage generator (rebuild from reference above).
- SQLite storage for sessions/focus profile.

## Conventions

- Strict TS: `noUncheckedIndexedAccess` (guard array indexing or use
  `charAt`/`??`), `exactOptionalPropertyTypes` (omit optional props, never
  pass explicit undefined), `verbatimModuleSyntax` (use `import type`).
- ESLint: `no-console`, prettier formatting (no semicolons, single quotes).
- Game logic stays pure where possible; screens communicate via promise
  resolvers / callbacks in app.tsx.
