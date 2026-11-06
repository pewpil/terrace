# Handoff

## State after tier rename (2026-11-06) - rev 35

DIFFICULTY RENAME (user request): "easy" is now "beginner". Renamed everywhere: Difficulty type + DIFFICULTIES + DEFAULT_DIFFICULTY + DIFFICULTY_BANDS key in app/utils/word-list.ts, engine doc comment in app/utils/word-engine.ts, smoke assertions (beginner band/head/default/ladder-order/engine-pool), build-vocab.mjs band-edge log label, AGENTS.md (current-state, difficulty section, roadmap) and the Terra-extension section in investigation/rebuild-report.md. The word "easy" still exists as VOCABULARY in en-ranked.ts (rank 412, inside the beginner band) - that is corpus data, intentionally untouched. Everything is backward-compatible inside the repo only: PB keys or stored profiles (none exist yet) would have needed this name settled before storage lands - good that it happened now.

Verified: npm run smoke green, fmt:check, typecheck, lint, build; SSR on the user's live dev server (4000, curled as-is) shows the active chip "beginner".

Everything else unchanged from rev 34 (difficulty axis architecture, bands, general weighting, ctrl+backspace, durable smoke). Next: PB storage (bucket now (mode, time, language, difficulty)), difficulty persistence, vitest migration. No new standards; the no-backticks-in-execute-payload gotcha from rev 34 still applies.
