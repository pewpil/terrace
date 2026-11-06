# Hypotheses

## hyp_1 (Supported)

Test content words are fetched from static same-origin JSON files at /languages/<language>.json; the default 'english' file carries the 200-word ordered-by-frequency 'noLazyMode' list, shipped files verified: english (200 words), english_1k (1000), english_10k, english_25k, english_450k, contractions, doubleletter, legal, medical (HTTP 200, hashed in project evidence).

Prediction: The site only requests /languages/<lang>.json from its own origin (not api.monkeytype.com) and a sha256 manifest inside the bundle verifies each file; restoring language loading + default config in the clone reproduces word supply.

Supporting: ev_058e5dab0e6d74de1b5c742ab14209667745333f862e52b76055949e8877fb8c, ev_76913e7883dc859ffb9b3dc05fc23ef9fed65ea1e5c4772f3a037311aa633a72

- Served-file sha256 equals the embedded integrity manifest (perfect match), and only /languages/<lang>.json (same-origin statics) are used for word supply. Duplicate hypothesis of hyp_2; treat hyp_2 as canonical.
## hyp_2 (Supported)

Test content words come from static same-origin JSON files at /languages/<language>.json; default 'english' = the 200-word ordered-by-frequency noLazyMode list; english_1k/10k/25k/450k + contractions/doubleletter/legal/medical also served (HTTP 200).

Prediction: The app requests only /languages/<lang>.json from its own origin and a sha256 manifest in the bundle verifies each file; cloning the loader + default config reproduces word supply 1:1 for default tests.

Supporting: ev_058e5dab0e6d74de1b5c742ab14209667745333f862e52b76055949e8877fb8c, ev_76913e7883dc859ffb9b3dc05fc23ef9fed65ea1e5c4772f3a037311aa633a72

- Shader integrity manifest match + memoized loader confirmed from restored utils; word lists hashed in project artifacts.
## hyp_3 (Supported)

A default run (time 30, english 200-word list) renders ~100 words up front, streams more words as the caret advances (keep-ahead 100), and ends exactly at the 30s boundary via the ~1s timer tick, then shows the result screen.

Prediction: Live capture will show on load ~100 words inside #words, appended words as the caret nears the end, and the result page completing at 30s with wpm/acc/consistency values plausible to the typed sample.

Supporting: ev_944c67c70c137c425b41a6867a74a62150a615b08d4b4b5f6addfe935bdf101b, ev_2f8a21d296c9566b1e145696d04a502278cb254eb5099a752b37d7f76d6fe54f

- Shipped addWord body (restored line 12526) shows bound 100 + endless time-mode generation; repo cross-check matched word-for-word.
