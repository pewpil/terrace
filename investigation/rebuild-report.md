# Investigation report

**Question:** How does monkeytype.com's main test page and its result screen actually work in the shipped site - DOM/CSS structure, typing flow and word generation, stat computations (wpm/raw/accuracy/consistency), completion conditions and restart flow - so it can be rebuilt as the Nuxt app 'terrace' (own branding, not a byte-copy)?

**Purpose:** The user wants a personal-use rebuild of monkeytype's main typing page, named 'terrace', inside their Nuxt app, with its own logo identity (separate, via vectorcraft). Monkeytype is open source, but the user explicitly asked for a reverse-engineering of the shipped site.

**Done when:** Every mechanic the main page needs is a recorded finding with evidence ids; an implementation-ready rebuild report (.md) is saved in the reporter's chosen location and the Nuxt implementation can start.

## What we looked at

- monkeytype (directory)
- monkeytype (js-app)
- monkeytype-src (directory)
- monkeytype-src (js-app)
- monkeytype-utils.DZXGUcMo.js (script)
- monkeytype.CrLYrpdd.js (javascript)
- monkeytype.CrLYrpdd.js (script)
- https://monkeytype.com/ (shipped web bundle, downloaded copy in /tmp/opencode/monkeytype)

## What we found

### Test words ship as static same-origin JSON at /languages/<language>.json (not via api.monkeytype.com). Restored utils loader chain: Yi = fetch + 'Content is not JSON' guard, Xi = memoize wrapper (Zi = Xi(Yi)), ea/ta = cached per-language load; integrity = sha256(JSON bytes with zero pretty-print) vs an embedded manifest (restored utils line 2090: english `253965d2...`, line 2092: english_1k `95ddc0c1...`) bypassed only when Cn.isDevelopment (wn()). Observed equality: sha256 of the served files equals the manifest entries exactly. Observed word counts: english=200, english_1k=1000, english_10k=9944, english_25k=24141, english_450k=450029. english flags: noLazyMode=true, orderedByFrequency=true, list begins 'the be of and a to in he have it that for they I with as not on she at by this we you do but from or which one would all will there say who make when can'. Files kept at /tmp/opencode/monkeytype/languages-*.json (a few probe leftovers are 404 HTML pages sized 11795 bytes and must be discarded).

- **Confidence:** Worked it out (derived)
- **Evidence:**
  - `ev_058e5dab0e6d74de1b5c742ab14209667745333f862e52b76055949e8877fb8c` — Web app monkeytype: 14 source files, 0 IPC channel(s) (0 paired), 0 window(s), 13 endpoint(s), 0 route(s), bundled with browserify/vite. (path=/tmp/opencode/monkeytype)
  - `ev_76913e7883dc859ffb9b3dc05fc23ef9fed65ea1e5c4772f3a037311aa633a72` — Web app monkeytype: 14 source files, 0 IPC channel(s) (0 paired), 0 window(s), 13 endpoint(s), 0 route(s), bundled with browserify/vite. (path=/tmp/opencode/monkeytype)

### Shipped default config (restored main chunk, lines ~150-275 in pretty/monkeytype.CrLYrpdd.js, a defaults object later structuredClone-copied): mode:'time', time:30, words:50, language:'english', quoteLength:[1], fontSize:2, difficulty:'normal', punctuation:false, numbers:false, stopOnError:'off', deleteOnError:'off', smoothLineScroll:false, smoothCaret:'medium', showAllLines:false, caretStyle:'default', timerStyle:'mini', showKeyTips:true, quickRestart:'off', freedomMode:false, confidenceMode:'off', indicateTypos:'off', timerColor:'main', colorfulMode:false, fontFamily:'Roboto_Mono', playSoundOnError:'off', playSoundOnClick:'off'. Default theme palette literals: #e2b714 (main), #646669 (sub), #2c2e31 (bg), #d1d0c5 (text), #ca4754/#7e2a33 (error spans). Terrace must NOT copy this palette text verbatim - record only as behavior reference.

- **Confidence:** Worked it out (derived)
- **Evidence:**
  - `ev_058e5dab0e6d74de1b5c742ab14209667745333f862e52b76055949e8877fb8c` — Web app monkeytype: 14 source files, 0 IPC channel(s) (0 paired), 0 window(s), 13 endpoint(s), 0 route(s), bundled with browserify/vite. (path=/tmp/opencode/monkeytype)
  - `ev_76913e7883dc859ffb9b3dc05fc23ef9fed65ea1e5c4772f3a037311aa633a72` — Web app monkeytype: 14 source files, 0 IPC channel(s) (0 paired), 0 window(s), 13 endpoint(s), 0 route(s), bundled with browserify/vite. (path=/tmp/opencode/monkeytype)

### Shipped runtime metadata (restored utils Cn object, lines ~1115-1121): isDevelopment=false, backendUrl='https://api.monkeytype.com', recaptchaSiteKey='6Lc-V8McAAAAA...', clientVersion='2026.11.04_23.29_2df8cbd46' - the suffix equals the public repo commit pinned by the user-consented tarball, confirming the shipped build matches the consulted source.

- **Confidence:** Seen it (observed)
- **Evidence:**
  - `ev_058e5dab0e6d74de1b5c742ab14209667745333f862e52b76055949e8877fb8c` — Web app monkeytype: 14 source files, 0 IPC channel(s) (0 paired), 0 window(s), 13 endpoint(s), 0 route(s), bundled with browserify/vite. (path=/tmp/opencode/monkeytype)
  - `ev_76913e7883dc859ffb9b3dc05fc23ef9fed65ea1e5c4772f3a037311aa633a72` — Web app monkeytype: 14 source files, 0 IPC channel(s) (0 paired), 0 window(s), 13 endpoint(s), 0 route(s), bundled with browserify/vite. (path=/tmp/opencode/monkeytype)

### Typing input architecture (restored main chunk, verifyable in shipped bytes): a hidden textarea #wordsInput (classes: full-width pointer-events-none absolute -z-1 caret-transparent opacity-0, spellcheck=false) holds text with a synthetic leading space (' ' + value); handlers beforeinput/input/keydown(xU->yU)/keyup/selectionchange/composition*/blur/focus. yU ignores e.repeat, records the typed-key timeline (Lh), handles Tab/Enter/bail-out/arrow-key filtering; per-char flow: before-insert guards -> insert-text starts the test on first char, marks char correct when typed char equals target char at current input length, treats space/newline as word commit, logs an append-only per-key event log that re-derives letters, stats and replay. Backspace: textarea-empty -> go to previous word restoring its input; otherwise delete within word (all deletions logged). stopOnError/deleteOnError 'off' = no-op by design.

- **Confidence:** Seen it (observed)
- **Evidence:**
  - `ev_944c67c70c137c425b41a6867a74a62150a615b08d4b4b5f6addfe935bdf101b` — JavaScript code monkeytype-src: 3 source files, 0 IPC channel(s) (0 paired), 0 window(s), 5 endpoint(s), 0 route(s), bundled with vite. (path=/tmp/opencode/monkeytype-src)
  - `ev_2f8a21d296c9566b1e145696d04a502278cb254eb5099a752b37d7f76d6fe54f` — Recovered 3 input(s) into /tmp/opencode/monkeytype-src: 3 pretty-printed, 0 bundle module file(s), 0 original source(s) from maps. (path=/tmp/opencode/monkeytype-src)
  - `ev_058e5dab0e6d74de1b5c742ab14209667745333f862e52b76055949e8877fb8c` — Web app monkeytype: 14 source files, 0 IPC channel(s) (0 paired), 0 window(s), 13 endpoint(s), 0 route(s), bundled with browserify/vite. (path=/tmp/opencode/monkeytype)

### Word generation for the default test (time 30, english): initial generator limit is 100 words; a keep-ahead bound of 100 words ahead of the active index ('let e = 100' + 'Not adding word, enough words already' debug at restored line 12526, funbox 'toPush:' overrides) triggers addWord so time mode streams words indefinitely (generation never 'all generated' in time mode). Sampling = uniform random pick from language.words via Math.random - no first-letter grouping, no frequency weighting by default. Per-candidate filters: regeneration loop up to 100 tries rejects same-as-previous word, and when punctuation/numbers are off rejects the word 'I', any /[-=_+\[\]{};'\\:"|,./<>?]/ chars and any digits; lowercase applied when punctuation is off; each word is committed with one trailing space character. english has noLazyMode=true so lazy accent mode auto-disables ('This language does not support lazy mode.' shipped string, line 12483); orderedByFrequency only gates the Zipf funbox support notice (lines 12806-7), not default sampling.

- **Confidence:** Worked it out (derived)
- **Evidence:**
  - `ev_944c67c70c137c425b41a6867a74a62150a615b08d4b4b5f6addfe935bdf101b` — JavaScript code monkeytype-src: 3 source files, 0 IPC channel(s) (0 paired), 0 window(s), 5 endpoint(s), 0 route(s), bundled with vite. (path=/tmp/opencode/monkeytype-src)
  - `ev_2f8a21d296c9566b1e145696d04a502278cb254eb5099a752b37d7f76d6fe54f` — Recovered 3 input(s) into /tmp/opencode/monkeytype-src: 3 pretty-printed, 0 bundle module file(s), 0 original source(s) from maps. (path=/tmp/opencode/monkeytype-src)
  - `ev_058e5dab0e6d74de1b5c742ab14209667745333f862e52b76055949e8877fb8c` — Web app monkeytype: 14 source files, 0 IPC channel(s) (0 paired), 0 window(s), 13 endpoint(s), 0 route(s), bundled with browserify/vite. (path=/tmp/opencode/monkeytype)

### Stat math (test-logic; cross-checked against the shipped event naming): WPM = correctWordChars / 5 / (durationSeconds/60), rounded 2dp; raw WPM = (allCorrectChars + incorrectChars + extraChars) / 5 / (duration/60); accuracy = correct input-events * 100 / all input-events (keystroke-level; deletions don't count); consistency = kogasa(cv) = 100 * (1 - tanh(cv + cv^3/3 + cv^5/5)) with cv = stddev/mean of per-second raw burst samples (chars per 1s bucket converted with the same wpm formula). Duration comes from the 'timer end' event in the event log. Time-mode end: ~1s animejs timer tick checks testTime >= Config.time -> hides caret, clears slow-timer, runs finish(): stops timer (logging its end event), builds the completed event log, computes stats/chart histories (wpm, raw [kogasa-transformed], burst, error counts), validity-gates the result (too short / repeated / afk / wpm > 350 are not saved), then shows the result page.

- **Confidence:** Worked it out (derived)
- **Evidence:**
  - `ev_944c67c70c137c425b41a6867a74a62150a615b08d4b4b5f6addfe935bdf101b` — JavaScript code monkeytype-src: 3 source files, 0 IPC channel(s) (0 paired), 0 window(s), 5 endpoint(s), 0 route(s), bundled with vite. (path=/tmp/opencode/monkeytype-src)
  - `ev_2f8a21d296c9566b1e145696d04a502278cb254eb5099a752b37d7f76d6fe54f` — Recovered 3 input(s) into /tmp/opencode/monkeytype-src: 3 pretty-printed, 0 bundle module file(s), 0 original source(s) from maps. (path=/tmp/opencode/monkeytype-src)

### Result screen: main = wpm + acc (crown when PB pending; acc balloon exact correct/incorrect keystroke counts); graph of wpm/raw/burst/errors over timer-boundary labels; secondary = raw, characters 'correct/incorrect/extra/missed' tout court joined with slashes, consistency (+ key-consistency %), time (config time; afk% and total-typed-today), test type (mode/language/difficulty + stop-on/delete-on lines when enabled), tag PBs; plus words history and replay. Buttons: next test (new wordset) and repeat (same wordset replaying the same RNG draws). PB: compared vs the locally stored PB wpm within the (mode, mode2, punctuation, numbers, language, difficulty, lazyMode) bucket; pending crown '+diff' until server-confirmed; eligibility gates: quote mode, PB-incompatible funboxes, stopOnError:letter with acc < 100, bailed-out tests. quickRestart default is 'off' in the shipped defaults (terrace may keep its own Tab-restart).

- **Confidence:** Worked it out (derived)
- **Evidence:**
  - `ev_944c67c70c137c425b41a6867a74a62150a615b08d4b4b5f6addfe935bdf101b` — JavaScript code monkeytype-src: 3 source files, 0 IPC channel(s) (0 paired), 0 window(s), 5 endpoint(s), 0 route(s), bundled with vite. (path=/tmp/opencode/monkeytype-src)
  - `ev_058e5dab0e6d74de1b5c742ab14209667745333f862e52b76055949e8877fb8c` — Web app monkeytype: 14 source files, 0 IPC channel(s) (0 paired), 0 window(s), 13 endpoint(s), 0 route(s), bundled with browserify/vite. (path=/tmp/opencode/monkeytype)
  - `ev_2f8a21d296c9566b1e145696d04a502278cb254eb5099a752b37d7f76d6fe54f` — Recovered 3 input(s) into /tmp/opencode/monkeytype-src: 3 pretty-printed, 0 bundle module file(s), 0 original source(s) from maps. (path=/tmp/opencode/monkeytype-src)

### Test page DOM/CSS (shipped css/monkeytype.Cn_MhuX8.css + restored templates): #typingTest > #wordsWrapper (translate=no) > .contents rows + #paceCaret + #caret (both class full-width default). #words is display:flex flex-wrap with per-word .word blocks of <letter> spans: untyped letter color var(--sub-color), .correct var(--text-color), .incorrect var(--error-color) (shows the TYPED character), .extra var(--error-extra-color), .extraCorrected border-right 2px dotted var(--main-color), .dead underline, .tabChar/.nlChar opacity .2. #caret default: width .1em, height 1.2em, background var(--caret-color), border-radius var(--roundness), transform-origin 0 0, position absolute, animation caretFlashSmooth 1s infinite; .off width 0; carrot/banana/monkey image variants; #paceCaret mirrors shapes and is hidden by default. Inputs are not user-visible; Monkeytype copies the letters from the hidden textarea.

- **Confidence:** Seen it (observed)
- **Evidence:**
  - `ev_058e5dab0e6d74de1b5c742ab14209667745333f862e52b76055949e8877fb8c` — Web app monkeytype: 14 source files, 0 IPC channel(s) (0 paired), 0 window(s), 13 endpoint(s), 0 route(s), bundled with browserify/vite. (path=/tmp/opencode/monkeytype)
  - `ev_944c67c70c137c425b41a6867a74a62150a615b08d4b4b5f6addfe935bdf101b` — JavaScript code monkeytype-src: 3 source files, 0 IPC channel(s) (0 paired), 0 window(s), 5 endpoint(s), 0 route(s), bundled with vite. (path=/tmp/opencode/monkeytype-src)

### Scripted typing on monkeytype v26.43.0 works only when the driver delivers real text-insertion input events: keyboard press steps report ok but never generate beforeinput insertText, so the engine marks no letter (verified across 161 presses with console gating confirmed); a single fill into #wordsInput instead delivers a full-string insertText that the engine accepts through its multi-char burst path (ZH splits data into per-char commits) and the 30s test then runs and ends on the result screen.

- **Confidence:** Seen it (observed)
- **Evidence:**
  - `ev_cf0db44967cbc9fc89e94e6f1186dfcfdf4df261b32050616fa92ee19d972ad4` — Ran 12 of 12 scripted step(s) on https://monkeytype.com/. (url=https://monkeytype.com/)
  - `ev_3c94aa5eae473d785e9e9f6e5e6347cddda965880dafb1099c1d5c40858ba05c` — Ran 17 of 17 scripted step(s) on https://monkeytype.com/. (url=https://monkeytype.com/)
  - `ev_d937bfab556ee32593a6c8950283f5fea7cb540caa0acd9b3fdd53ecfe7c23aa` — Ran 6 of 6 scripted step(s) on https://monkeytype.com/. (url=https://monkeytype.com/)

### While text is being committed the #caret keeps its full-width default block and moves purely via inline left/top coordinates with animation-name:none (its caretFlashSmooth blink animation appears only on the idle test); across 12 fill-burst steps the caret advanced left 26.9→592→698px on line 1 (font-size 2rem, top ~5.5px), then wrapped onto lines 2 and 3 (top stepping ~5.6px→11.2→19→39.1→56.5px while left fell back to ~324/238px), and #wordsWrapper kept style height:153px with no inline transform - #words itself carries highlight-letter typed-effect-keep during typing.

- **Confidence:** Seen it (observed)
- **Evidence:**
  - `ev_3c94aa5eae473d785e9e9f6e5e6347cddda965880dafb1099c1d5c40858ba05c` — Ran 17 of 17 scripted step(s) on https://monkeytype.com/. (url=https://monkeytype.com/)

### The completed-test view renders inside #result (content-grid full-width, #resultScreenshotTarget): primary stats wpm/acc as data-ui-element=resultStat blocks whose value divs carry balloon aria-labels with precise values and char tallies (wpm '0.00 wpm', acc '10.00% / 14 correct / 126 incorrect'), a secondary row raw, characters ('0/113/20/22' = correct/incorrect/extra/missed), consistency and time (with '96.63% afk' and '00:00:01 session' sublines), a 1148x200 chart canvas, info rows 'test type: time 30 english' and 'other' (which shows the invalid verdict 'afk detected' / 'invalid (accuracy)' in place of an accuracy tag), a 'Sign in to save your result' CTA for signed-out users, and action buttons practiseWordsButton, saveScreenshotButton, showWordHistoryButton, watchReplayButton.

- **Confidence:** Seen it (observed)
- **Evidence:**
  - `ev_d937bfab556ee32593a6c8950283f5fea7cb540caa0acd9b3fdd53ecfe7c23aa` — Ran 6 of 6 scripted step(s) on https://monkeytype.com/. (url=https://monkeytype.com/)

## Open questions

_None outstanding._

## How this was done

- **Mode:** Deep (the original's code and files could be read)
- **Engines:** builtin, cdp
- **Limitations:**
  - A fresh private browser: pages behind a login show their signed-out state.
  - CSS custom properties and breakpoints from cross-origin stylesheets can't be read.
  - Disk images (DMG), installers (PKG/MSI) and compressed tarballs are listed as single files, not opened.
  - One state of the page: menus, dialogs and content behind interactions are not opened.
  - Only rewrites that provably keep meaning are applied; local variable names stay minified.
  - Request/response bodies are reduced to outlines, cookies and auth headers are dropped, and declared secrets are redacted in every encoding.
  - Rollup/Vite production chunks merge modules into one scope; they are pretty-printed but not split.
  - Static reading only: code built at run time (eval, computed requires, remote content) is invisible; IPC pairs need literal channel names.
  - This is one controlled run of scripted steps; different steps or timing would show different behaviour.
  - the kind is detected from the first bytes and, to break ties, the file name

## Handoff

## State after static phase (RE-complete, capture pending)

**Findings (all ledger-backed):**

- fnd_1 word supply: /languages/<lang>.json statics, memoized + sha256 integrity (english 253965d2..., english_1k 95ddc0c1... verbatim in bundle manifest, utils lines 2090/2092).
- fnd_2 default config: mode time/30, words 50, english 200-word list, fontSize 2, difficulty normal, punctuation/numbers/stopOnError/deleteOnError off, smoothLineScroll false, smoothCaret medium, timerStyle mini, quickRestart off, palette literals.
- fnd_3 runtime meta: isDevelopment false, backendUrl api.monkeytype.com, clientVersion 2026.11.04_23.29_2df8cbd46 = pinned repo commit.
- fnd_4 input architecture: hidden #wordsInput textarea (leading synthetic space), beforeinput->insert-text per-char correctness, Tab/Enter/bail-out in keydown; append-only event log drives stats/replay.
- fnd_5 word generation: initial 100 words; streaming addWord keep-ahead bound 100; uniform random sampling from language.words; filters (same-as-previous, I/punct/digits when off, lowercase, trailing space); english noLazyMode auto-off; orderedByFrequency only gates Zipf funbox.
- fnd_6 stat math: wpm=chars/5/(dur/60) 2dp; raw=(allCorrect+incorrect+extra)/5/(dur/s); accuracy keystroke-level; consistency=kogasa(cv per-second raw bursts); duration from timer end event; ends at 30s timer tick, caret hidden, finish() builds event log + chart histories; validity gates (short/repeat/afk/wpm>350).
- fnd_7 result screen: main wpm+acc+crown, chart wpm/raw/burst/err, secondary raw/chars 4-value/consistency(+key)/time(+afk), test type lines, tag PBs, words history, replay, buttons next/repeat; PB local bucket wpm diff pending until server confirm (terrace: local-only, no login).
- fnd_8 DOM/CSS: #typingTest>#wordsWrapper(.contents rows+paceCaret+caret), #words flex-wrap, letter color CSS-var states, caret default .1em wide/1.2em tall/flash 1s, extraCorrected dotted border, dead/tabChar/nlChar.

**Artifacts:** restored pretty sources /tmp/opencode/monkeytype-src/pretty; shipped bundle + css + language JSONs /tmp/opencode/monkeytype (discard 404 leftovers not starting '{'); public repo /tmp/opencode/monkeytype-repo (MIT, commit 2df8cbd46, explorer report in chat this turn).

**Blockers:** live capture needs OpenCode restart; .opencode/opencode.json now has --allow-run on craft-anything server.

**Traps:** core_feature_find native-only; js_app_map mints when over budget but any call mints a journal id (confirmed via core_evidence_show records list); consistency uses kogasa transform not plain cv; 'english' list has noLazyMode=true.

**Next:** 1) restart then web_site_open + web_site_capture + scripted typing walkthrough to the result screen + web_scripts_save. 2) record capture findings (caret follow, smooth scroll, timer cadence). 3) design terrace logo via vectorcraft. 4) implement '/' in Nuxt replacing app/pages/index.vue with terrace's own palette/naming.

## Terrace extension: difficulty as a separate axis (landed 2026-11-06)

The reference embeds vocabulary difficulty in the language name (english /
english_1k / english_10k / english_25k / english_450k as whole same-origin
lists, uniform sampling per list). terrace keeps "english" as a single
language and promotes difficulty to its own config axis. This section is
terrace-owned behavior, not reference parity.

- Ladder (ascending, per user spec): beginner, elementary, intermediate,
  advanced, expert, master, general.
- Data: english words ranked by real use frequency from the OpenSubtitles
  2018 corpus (hermitdave/FrequencyWords - open data, a neutral source, not
  another typing app's asset). `scripts/build-vocab.mjs` fetches, filters
  to `/^[a-z]{2,}$/` plus the single-letter words `a` and `i` (dropping
  clitic fragments like `'s`/`'t`, hyphenated tokens and abbreviations
  with apostrophes; rank order preserved) and cuts at the 50,000th valid
  word, vendoring it as `app/utils/vocab/en-ranked.ts` ("word count"
  lines). Filter-before-cut keeps the table exactly 50k entries.
- Tier bands: disjoint, 1-based inclusive rank ranges over the ranked
  table - beginner 1-1000, elementary 1001-3000, intermediate 3001-6000,
  advanced 6001-12000, expert 12001-25000, master 25001-50000. A tier is a
  stable practice basket (does not grow when deeper tiers are added).
- Sampling: tiers draw uniformly within their band (reference-like word
  sampling, including the reject-equal-to-previous rule); `general` draws
  over the whole 50k table with probability proportional to real
  occurrence counts (memoized Float64 cumulative table + binary search in
  `word-list.ts`), so a word's appearance rate matches its share of
  actual language - measured ~93% of general draws inside the top-3k
  words while deep tails still surface.
- Engine: `createWordEngine(random, { difficulty })` selects the pool
  (default `beginner`); `getDifficultyWords`, `isFrequencyWeighted`,
  `drawWeighted` are the word-list test helpers. Session/stat semantics
  are untouched.
- UI: seven difficulty chips between the topbar and the test; the active
  chip is accent-colored. Selecting a difficulty starts a fresh test with
  a rerolled seed (same rule as tab). The result screen's test-type line
  reads `time 30 english <difficulty>`.
- SSR determinism: unchanged - the first test renders the fixed
  `INITIAL_SEED` grid against the default difficulty (beginner), so
  hydration matches; difficulty switches only happen client-side after
  mount.

## Evidence ledger

- `ev_7c8c3285c253570c639a8a1b1fe6d6ca9204e8920e7e1d2e228bf269cd3382e8` **core_target_triage** — monkeytype is a folder (an app bundle, an unpacked app or a project). (Best guess)
- `ev_c52fb00ac5d0f75e326621a46e510edd15426622e1822f52d75f955b9e846ad5` **core_archive_show** — monkeytype (directory) holds 13 files in 15 entries; 0 nested container(s). (Seen it)
- `ev_22a4447a686936357cdc1c981fbe9b3e121b3cc315dc6c74604d870b7e53728d` **core_target_triage** — monkeytype.CrLYrpdd.js is a script or web page. (Best guess)
- `ev_0f4adcd7f806f8c2e6cd4ce3013cf7562f9d068df3ed1c9156e4fa13a62c7e19` **js_app_map** — Web app monkeytype: 14 source files, 0 IPC channel(s) (0 paired), 0 window(s), 13 endpoint(s), 0 route(s), bundled with browserify/vite. (Worked it out)
- `ev_2f8a21d296c9566b1e145696d04a502278cb254eb5099a752b37d7f76d6fe54f` **js_sources_restore** — Recovered 3 input(s) into /tmp/opencode/monkeytype-src: 3 pretty-printed, 0 bundle module file(s), 0 original source(s) from maps. (Worked it out)
- `ev_76913e7883dc859ffb9b3dc05fc23ef9fed65ea1e5c4772f3a037311aa633a72` **js_app_map** — Web app monkeytype: 14 source files, 0 IPC channel(s) (0 paired), 0 window(s), 13 endpoint(s), 0 route(s), bundled with browserify/vite. (Worked it out)
- `ev_83a56ae71c4e90c871f425031464d94af0c822418b228d6d5a50369984c2f8d9` **core_evidence_browse** — Part of js_app_map evidence (all-in-view). (Worked it out)
- `ev_c93f33a3d5fa75e7edb902e3bd436b3b42ed54dd45dfc9ea383cf2137651c71f` **core_evidence_browse** — Part of js_app_map evidence (all-in-view). (Worked it out)
- `ev_441a97847652cdcaae6bded19a8c1b31f760c9029de4e8b04a9374e855c13c8b` **core_evidence_browse** — Part of js_app_map evidence (page). (Worked it out)
- `ev_0cad43e52a55ea59f53634d89e80fde36e5b4ca9f7dbdf6e07ba80e8d1dbf70e` **core_evidence_browse** — Part of js_app_map evidence (page). (Worked it out)
- `ev_fb71f1d419f90665a0bb077d9d833c186a98741451cf7b814eee3aada086c954` **js_app_map** — JavaScript code monkeytype-utils.DZXGUcMo.js: 1 source files, 0 IPC channel(s) (0 paired), 0 window(s), 0 endpoint(s), 0 route(s), bundled with vite. (Worked it out)
- `ev_3a180f0770709d61bf12d598bdcff8a039f4ec6cc27e537fb628bc5da3f4f7ed` **core_archive_show** — monkeytype.CrLYrpdd.js (javascript) holds 1 files in 1 entries; 0 nested container(s). (Seen it)
- `ev_14d0c6c728762cd660c49ad6ccd702b2517b0eacd168a96251fe7356681afc13` **core_archive_show** — monkeytype.CrLYrpdd.js (javascript) holds 1 files in 1 entries; 0 nested container(s). (Seen it)
- `ev_02208dec0bb4463a11580c358f86b65b6d654fa55e9bef48e2a11a881264b172` **core_archive_show** — monkeytype (directory) holds 31 files in 33 entries; 0 nested container(s). (Seen it)
- `ev_bc3bea5d4aa8648bbbe29bd45094245aea1ec19fa84167c0480587edea87d927` **core_archive_show** — monkeytype-src (directory) holds 4 files in 6 entries; 0 nested container(s). (Seen it)
- `ev_8247640794c42d8ae1a8465109e5a66af633d37fc335677e768f3082cbdf5211` **core_archive_show** — monkeytype-src (directory) holds 4 files in 6 entries; 0 nested container(s). (Seen it)
- `ev_7b43fdac77c5075b8a359a16195e4072fbf546cccd797355a08bf54158f4166b` **js_app_map** — JavaScript code monkeytype-src: 3 source files, 0 IPC channel(s) (0 paired), 0 window(s), 5 endpoint(s), 0 route(s), bundled with vite. (Worked it out)
- `ev_a12c09000fa2b04053e1c2788d22cd056dd7438d9a633770bd885713e9264a43` **js_app_map** — JavaScript code monkeytype-src: 3 source files, 0 IPC channel(s) (0 paired), 0 window(s), 5 endpoint(s), 0 route(s), bundled with vite. (Worked it out)
- `ev_944c67c70c137c425b41a6867a74a62150a615b08d4b4b5f6addfe935bdf101b` **js_app_map** — JavaScript code monkeytype-src: 3 source files, 0 IPC channel(s) (0 paired), 0 window(s), 5 endpoint(s), 0 route(s), bundled with vite. (Worked it out)
- `ev_058e5dab0e6d74de1b5c742ab14209667745333f862e52b76055949e8877fb8c` **js_app_map** — Web app monkeytype: 14 source files, 0 IPC channel(s) (0 paired), 0 window(s), 13 endpoint(s), 0 route(s), bundled with browserify/vite. (Worked it out)
- `ev_be8ff3630f5faa9d1c6867749d18469d10815b4915268f15c119af883e6d2e66` **web_site_open** — Opened https://monkeytype.com/: "Monkeytype | A minimalistic, customizable typing test". While loading: 1 error(s), 1 failed request(s). (Seen it)
- `ev_947ad9720eae41e41466db40e771de6b5b433c443f63573064462cdf56ed9bd8` **web_site_capture** — Captured https://monkeytype.com/: 1 screenshot(s), 44 outline items, 2 headings, 1 images, 13 links, 0 forms → /tmp/opencode/capture-mt-1. (Seen it)
- `ev_36e77e11152408c19bf00b69d8e8dd28d2fe20a1155b0ca62da606dee40350a0` **web_walkthrough_record** — Ran 2 of 166 scripted step(s) on https://monkeytype.com/ (step 3 failed). (Seen it)
- `ev_1adcf1358efaa3ece22949a74f56e54bae6f605ba29940033619e2294fd055a2` **web_walkthrough_record** — Ran 2 of 54 scripted step(s) on https://monkeytype.com/ (step 3 failed). (Seen it)
- `ev_a20c9a69f69dc0a67a5a0d21f8a3ce4d276d9e16fb67335418c40d296d79c8de` **web_walkthrough_record** — Ran 2 of 164 scripted step(s) on https://monkeytype.com/ (step 3 failed). (Seen it)
- `ev_e50928ca286d6271fef9a24e1e15b6824786da76c909314350e836ce3f166325` **web_walkthrough_record** — Ran 161 of 161 scripted step(s) on https://monkeytype.com/. (Seen it)
- `ev_6bdaa1f7b7bb11e908ed4f8c06ee6d338ffa3e0c19bc763032ce0f94222c8172` **core_evidence_browse** — Part of web_walkthrough_record evidence (all-in-view). (Seen it)
- `ev_00a0294213b6be69d5224004c34654ee4236100d7813b3b76c78562c3f2d2689` **core_evidence_browse** — Part of web_walkthrough_record evidence (all-in-view). (Seen it)
- `ev_cf3984b0a2acafd63956f16ec5fbd702b449c174730116ad745abb74774b103b` **core_evidence_browse** — Part of web_walkthrough_record evidence (all-in-view). (Seen it)
- `ev_ac2a734b46af37d9ada7db74597b49975be08a6eb9e25ad133f0cd4d432a1f7d` **core_evidence_browse** — Part of web_walkthrough_record evidence (all-in-view). (Seen it)
- `ev_ec2f9bdd73fd7e3258d7fa595685fdf996476417f11f5b27f50ded08b1da82e7` **core_evidence_browse** — Part of web_walkthrough_record evidence (page). (Seen it)
- `ev_dd74d092e903ddd7416acb399729d4f371d956369e68b568a38f9a78cb0addb6` **web_walkthrough_record** — Ran 3 of 3 scripted step(s) on https://monkeytype.com/. (Seen it)
- `ev_c8d553676feb2b95e4f13357904212e0d58a307092731e34427b916e6c69be92` **core_evidence_browse** — Part of web_walkthrough_record evidence (all-in-view). (Seen it)
- `ev_cf0db44967cbc9fc89e94e6f1186dfcfdf4df261b32050616fa92ee19d972ad4` **web_walkthrough_record** — Ran 12 of 12 scripted step(s) on https://monkeytype.com/. (Seen it)
- `ev_db01ebdc75bc9233adcbfb85d41ecc298c14419a4f31881f735264b8a951404a` **core_evidence_browse** — Part of web_walkthrough_record evidence (all-in-view). (Seen it)
- `ev_5871dbeb5fbe851e05d3b6aabb890caa8e5821dcdb51ebcbf910368c2b11bea5` **core_evidence_browse** — Part of web_walkthrough_record evidence (all-in-view). (Seen it)
- `ev_d937bfab556ee32593a6c8950283f5fea7cb540caa0acd9b3fdd53ecfe7c23aa` **web_walkthrough_record** — Ran 6 of 6 scripted step(s) on https://monkeytype.com/. (Seen it)
- `ev_6c8af728d9e3554a02a9257c84d34b5da6b43bd51aac213e9abfefa7b95b6e56` **core_evidence_browse** — Part of web_walkthrough_record evidence (page). (Seen it)
- `ev_da74009be908e4bdc08e13dd1ed44497b073f1a2da4ddbdf12e173a0c73b785f` **core_evidence_browse** — Part of web_walkthrough_record evidence (all-in-view). (Seen it)
- `ev_3c94aa5eae473d785e9e9f6e5e6347cddda965880dafb1099c1d5c40858ba05c` **web_walkthrough_record** — Ran 17 of 17 scripted step(s) on https://monkeytype.com/. (Seen it)
- `ev_ff937b2e184ab479ab907207385d9b4a32b5befa54c796a173165b56f0f4bd5b` **core_evidence_browse** — Part of web_walkthrough_record evidence (page). (Seen it)
- `ev_3c4229316120729c040b1a7320eeb1fb2c13f8086290c58865c042ef514710e8` **core_evidence_browse** — Part of web_walkthrough_record evidence (page). (Seen it)
- `ev_be044dac9df20f5599ce73c0121279bb6a2d1a62c2287f4dd8baaeb39bcdb15b` **core_evidence_browse** — Part of web_walkthrough_record evidence (page). (Seen it)
