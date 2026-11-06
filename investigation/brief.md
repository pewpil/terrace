# Brief

**Question:** How do monkeytype.com's main typing-test page and its result screen actually work (DOM/CSS, input flow, word generation, stat math, completion/restart) so the Nuxt app 'terrace' can rebuild them with its own identity?

**Purpose:** The user wants a personal-use rebuild of monkeytype's main typing page as 'terrace' in their Nuxt app, with its own logo identity (via vectorcraft). Monkeytype is open source, but the user explicitly asked to reverse-engineer the shipped site.

**Targets:**
- https://monkeytype.com/ (shipped bundle copy in /tmp/opencode/monkeytype; public source at /tmp/opencode/monkeytype-repo, commit 2df8cbd46)

**Constraints:**
- no git usage by the agent (read or write) unless the user explicitly asks
- no reuse of monkeytype branding, fonts, images, license or assets in terrace; terrace gets its own logo via vectorcraft
- scope: only the main test page (/) plus its result screen; no login, settings, profile pages
- default configuration only (mode time 30, english default list); no settings UI
- rebuild target: Nuxt 4 + TypeScript app; verify with typecheck/lint/build + curl smoke test on PORT=4173
- live capture of monkeytype.com in the harness browser was expressly granted by the user and is now complete

**Done when:** Every in-scope mechanic is a ledger-backed finding (fnd_1..fnd_11 recorded, hypotheses hyp_2/hyp_3 supported), the implementation-ready rebuild report is saved at investigation/rebuild-report.md, and the Nuxt implementation is free to start.
