# Handoff

## State after difficulty slider + general-mode round (2026-11-07) - rev 39

**DONE - difficulty is a slider over the ladder only; general is a separate mode:**
- Replaced the seven-bar meter with a native range slider in app/pages/index.vue. Ladder options are DIFFICULTIES minus general (beginner, elementary, intermediate, advanced, expert, master); the slider is min 0, max 5, step 1, with a live name label. The track fill percentage is computed from the ladder index. Six tick dots sit under the track, accent-colored up to the selected tier.
- General is NOT a slider step anymore. It is a separate bordered toggle after the difficulty value (aria-pressed), labeled "general". Enabling it calls selectDifficulty('general'); disabling it restores the last ladder tier. The page keeps ladderDifficulty: Ref<Difficulty> (initialized from DEFAULT_DIFFICULTY, updated by a watch on difficulty that ignores 'general'), so the previous tier survives the general round trip. The general button is accent-outlined when active.
- While general is enabled the range input is disabled: no pointer/keyboard input, cursor not-allowed, dimmed opacity, dim track/thumb, and all six ticks unreached. The value label shows "general" and the slider aria-valuetext is "general". The input handler also guards target.disabled, so even a synthetic input event cannot change difficulty while general is on (verified through CDP).
- Selecting any ladder tier still restarts the test with a rerolled seed (same rule as tab); toggling general also restarts. Default remains beginner; SSR determinism is untouched.
- No pure-logic changes: word-list, word-engine, word-mods and typing-session are untouched; smoke assertions unchanged.

**Verified through CDP on the production build:** initial slider max 5 / value 0 / label beginner / general false / 6 ticks reached 1; set slider to 5 -> master, reached 6; click general -> disabled true, aria-valuetext general, label general, general aria-pressed true, reached 0; dispatch input on the disabled slider -> state unchanged; click general again -> master restored, disabled false, reached 6. Screenshot of the general-active state reviewed (dimmed slider, accent-outlined general toggle). Final chain: smoke, fmt:check, typecheck, eslint, build all green; production SSR on our own 4010 (200 /, 404 /INDEX) shows the slider max 5 and the general button; port 4000 was curled only and never touched.

**Lint/prettier note:** Prettier formats void elements self-closed (<input />), while the Nuxt eslint config's vue/html-self-closing default warned. Rather than suppress locally, eslint.config.mjs now sets vue/html-self-closing to warn with html.void 'always', aligning the linter with Prettier. This is the only config change this round.

**Docs:** rebuild-report.md difficulty UI bullet now describes the six-step ladder slider and the separate general toggle/disable semantics; AGENTS.md difficulty section and roadmap round 4 entry updated likewise.

**Next (candidate work, priority order):**
- Local PB storage keyed (mode, time, language, difficulty, punctuation, numbers, capitalization) + crown on the result screen; server-side SQLite in Nitro routes remains the leading candidate.
- Persist selected difficulty/general + modifier toggles (localStorage or future server profile).
- vitest + @nuxt/test-utils migration of scripts/smoke-typing.mjs; composable/component tests for slider, general toggle, keyboard and modifier toggles.
- Optional: native datalist tick labels for the slider; sentence-aware capitalization variant; per-modifier PB tags.

**Standards to keep:** no git usage by the agent; verification chain = smoke + fmt:check + typecheck + lint + build + SSR curl; check ss -ltnp before binding a test port and NEVER kill pre-existing listeners (4000 may be the user's dev server - curl as-is or use a spare port like 4010); pure modules stay clock/DOM-free; generated vocab file is script-owned; no-console exempted only for scripts/*.mjs; behavior spec of record = investigation/rebuild-report.md plus this handoff; no backtick characters in code-mode execute payloads.
