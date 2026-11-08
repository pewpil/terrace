// smoke test for terrace's pure typing modules.
// run with `npm run smoke` (esbuild-bundles this entry, then executes it).
// the entry stays plain .mjs so `no-console` exemptions apply; the imported
// app modules are TypeScript and get bundled in.
import { createWordEngine, mulberry32 } from '../app/utils/word-engine'
import { modifyWord } from '../app/utils/word-mods'
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  ENGLISH_COUNTS,
  ENGLISH_RANKED,
  getDifficultyWords,
} from '../app/utils/word-list'
import {
  createTypingSession,
  displayLetters,
} from '../app/utils/typing-session'

const failures = []
const ok = (name, cond) => {
  if (!cond) failures.push(name)
}

// --- english vocab table + difficulty tiers (terrace axis; the reference
//     embeds difficulty in the language names, terrace bands ranks) ---
ok('ranked table 50k words', ENGLISH_RANKED.length === 50_000)
ok(
  'ranked lowercase alpha',
  ENGLISH_RANKED.every((w) => /^[a-z]+$/.test(w)),
)
let countsOk = true
for (let i = 1; i < ENGLISH_COUNTS.length; i++) {
  if ((ENGLISH_COUNTS[i] ?? 0) > (ENGLISH_COUNTS[i - 1] ?? 0)) countsOk = false
}
ok('counts non-increasing', countsOk)
const rankOf = new Map(ENGLISH_RANKED.map((word, i) => [word, i]))
const beginnerWords = getDifficultyWords('beginner')
const beginnerSet = new Set(beginnerWords)
const masterWords = getDifficultyWords('master')
ok('beginner band is 1000 words', beginnerWords.length === 1000)
ok(
  'beginner head is you i the',
  beginnerWords.slice(0, 3).join(' ') === 'you i the',
)
ok('master band is 25000 words', masterWords.length === 25_000)
ok(
  'general pool = whole table',
  getDifficultyWords('general') === ENGLISH_RANKED,
)
ok('default difficulty is beginner', DEFAULT_DIFFICULTY === 'beginner')
ok(
  'difficulties in ladder order',
  DIFFICULTIES.join(',') ===
    'beginner,elementary,intermediate,advanced,expert,master,general',
)

// --- word engine (beginner tier pool) ---
const rand = mulberry32(42)
const engine = createWordEngine(rand, { difficulty: 'beginner' })
engine.ensure(0)
ok('engine initial 100 words', engine.words.length === 100)
ok(
  'beginner draws within band',
  engine.words.every((w) => beginnerSet.has(w)),
)
ok(
  'no adjacent dupes',
  engine.words.every((w, i) => i === 0 || w !== engine.words[i - 1]),
)
engine.ensure(95)
ok('keep-ahead at 95 -> 195', engine.words.length === 195)
engine.ensure(96)
ok('keep-ahead at 96 -> 196', engine.words.length === 196)

// general draw: every word from the whole table, skewed by real frequency
const genEngine = createWordEngine(mulberry32(42), { difficulty: 'general' })
genEngine.ensure(400)
const genWords = genEngine.words
ok(
  'general draws within table',
  genWords.every((w) => rankOf.has(w)),
)
ok(
  'general no adjacent dupes',
  genWords.every((w, i) => i === 0 || w !== genWords[i - 1]),
)
const nearHead = genWords.filter((w) => (rankOf.get(w) ?? 50_000) < 3000).length
ok('general frequency-skewed', nearHead > genWords.length * 0.5)

// --- punctuation / numbers modifiers (terrace-owned: applied to generated
//     words because the vocab table itself is clean lowercase) ---
const seq = (...values) => {
  let i = 0
  return () => values[i++] ?? 0
}
ok('mods off leaves word untouched', modifyWord('word', () => 0) === 'word')
ok(
  'punctuation wraps with a pair',
  modifyWord('word', () => 0, { punctuation: true }) === '"word"',
)
ok(
  'punctuation appends a mark',
  modifyWord('word', seq(0.1, 0.9, 0), { punctuation: true }) === 'word,',
)
ok(
  'punctuation leaves some words plain',
  modifyWord('word', () => 0.9, { punctuation: true }) === 'word',
)
ok(
  'numbers replaces a word with digits',
  modifyWord('word', () => 0, { numbers: true }) === '1',
)
ok(
  'numbers + punctuation uses a currency form',
  modifyWord('word', () => 0, { numbers: true, punctuation: true }) === '$1',
)
ok(
  'capitalization uppercases the first letter',
  modifyWord('word', () => 0, { capitalization: true }) === 'Word',
)
ok(
  'capitalization leaves some words lowercase',
  modifyWord('word', () => 0.9, { capitalization: true }) === 'word',
)
ok(
  'capitalization stays inside the wrapper',
  modifyWord('word', () => 0, {
    capitalization: true,
    punctuation: true,
  }) === '"Word"',
)

// mods off must not consume random draws: identical stream to the old default
const plainStream = createWordEngine(mulberry32(99))
const offStream = createWordEngine(mulberry32(99), {
  punctuation: false,
  numbers: false,
})
plainStream.ensure(50)
offStream.ensure(50)
ok(
  'mods off keeps the default stream identical',
  plainStream.words.join(' ') === offStream.words.join(' '),
)
ok(
  'mods off words stay alpha',
  plainStream.words.every((w) => /^[a-z]+$/.test(w)),
)

// punctuation draws are deterministic and keep the underlying vocab word
const punctA = createWordEngine(mulberry32(99), { punctuation: true })
const punctB = createWordEngine(mulberry32(99), { punctuation: true })
punctA.ensure(200)
punctB.ensure(200)
const punctWords = punctA.words
ok('punctuation deterministic', punctWords.join(' ') === punctB.words.join(' '))
ok(
  'punctuation bases stay in the beginner band',
  punctWords.every((w) => beginnerSet.has(w.replace(/[^a-z]/g, ''))),
)
ok(
  'punctuation charset typeable',
  punctWords.every((w) => /^["'()[\]{}a-z,.;:?!]+$/.test(w)),
)
const decorated = punctWords.filter((w) => /[^a-z]/.test(w)).length
ok('punctuation decorates some words', decorated > 20)
ok('punctuation leaves some words plain', decorated < punctWords.length)
ok(
  'punctuation has wrapped words',
  punctWords.some((w) => /^".*"$|^'.*'$|^\(.*\)$|^\[.*\]$|^\{.*\}$/.test(w)),
)
ok(
  'punctuation has suffix words',
  punctWords.some((w) => /[a-z][,.;:?!]$/.test(w)),
)
ok(
  'punctuation no adjacent dupes',
  punctWords.every((w, i) => i === 0 || w !== punctWords[i - 1]),
)

// numbers replace some words; punctuation adds number-specific forms
const numA = createWordEngine(mulberry32(99), { numbers: true })
const numB = createWordEngine(mulberry32(99), { numbers: true })
numA.ensure(200)
numB.ensure(200)
const numWords = numA.words
ok('numbers deterministic', numWords.join(' ') === numB.words.join(' '))
ok(
  'numbers output words or digits',
  numWords.every((w) => /^[a-z]+$/.test(w) || /^\d+$/.test(w)),
)
const numeric = numWords.filter((w) => /^\d+$/.test(w)).length
ok('numbers replaces some words', numeric > 10)
ok('numbers leaves some words', numeric < numWords.length)
ok(
  'numbers no adjacent dupes',
  numWords.every((w, i) => i === 0 || w !== numWords[i - 1]),
)

const both = createWordEngine(mulberry32(99), {
  punctuation: true,
  numbers: true,
})
both.ensure(200)
const bothWords = both.words
ok(
  'both modifiers charset typeable',
  bothWords.every((w) => /^["'()[\]{}a-z0-9,.;:?!%$]+$/.test(w)),
)
ok(
  'both modifiers decorate numbers',
  bothWords.some((w) => /\d/.test(w) && /[,$%.]/.test(w)),
)

// capitalization: some words upper their first letter, some stay lowercase
const capA = createWordEngine(mulberry32(99), { capitalization: true })
const capB = createWordEngine(mulberry32(99), { capitalization: true })
capA.ensure(200)
capB.ensure(200)
const capWords = capA.words
ok('capitalization deterministic', capWords.join(' ') === capB.words.join(' '))
ok(
  'capitalization output alpha only',
  capWords.every((w) => /^[A-Za-z]+$/.test(w)),
)
const capped = capWords.filter((w) => /^[A-Z]/.test(w)).length
ok('capitalization uppercases some words', capped > 10)
ok('capitalization leaves some words lowercase', capped < capWords.length)
ok(
  'capitalization no adjacent dupes',
  capWords.every((w, i) => i === 0 || w !== capWords[i - 1]),
)

// all three modifiers together: caps, digits and marks all surface and the
// underlying letter bases stay inside the beginner band
const allMods = createWordEngine(mulberry32(99), {
  punctuation: true,
  numbers: true,
  capitalization: true,
})
allMods.ensure(200)
const allWords = allMods.words
ok(
  'all modifiers charset typeable',
  allWords.every((w) => /^["'()[\]{}A-Za-z0-9,.;:?!%$]+$/.test(w)),
)
ok(
  'all modifiers mix caps, digits and marks',
  allWords.some((w) => /[A-Z]/.test(w)) &&
    allWords.some((w) => /\d/.test(w)) &&
    allWords.some((w) => /[^A-Za-z0-9]/.test(w)),
)
ok(
  'all modifier letter bases stay in the beginner band',
  allWords
    .map((w) => w.replace(/[^A-Za-z]/g, '').toLowerCase())
    .filter((w) => w.length > 0)
    .every((w) => beginnerSet.has(w)),
)

// the session machine types capitals like any other char, and a lowercase
// char against a capital target is a mismatch
const caseSession = createTypingSession({
  engine: { words: ['Capitalized'], ensure() {} },
  limitMs: 30_000,
})
let cts = 500
for (const c of 'capitalized') {
  cts += 80
  caseSession.type(c, cts)
}
const caseLetters = displayLetters(caseSession.words[0])
ok('lowercase against capital target mismatches', caseSession.words[0].hadError)
ok(
  'mismatch keeps capital target visible',
  caseLetters[0]?.char === 'C' && caseLetters[0]?.state === 'incorrect',
)

// the session machine types punctuation and digits like any other char
const modStub = {
  words: ['"hello"', '42', '(world),', 'Capitalized'],
  ensure() {},
}
const modSession = createTypingSession({ engine: modStub, limitMs: 30_000 })
let mts = 500
const typeMod = (s) => {
  for (const c of s) {
    mts += 90
    modSession.type(c, mts)
  }
}
typeMod('"hello" ')
ok(
  'quoted word commits perfectly',
  modSession.words[0].done === true && modSession.streak === 1,
)
typeMod('42 ')
ok(
  'number word commits perfectly',
  modSession.words[1].done === true && modSession.streak === 2,
)
typeMod('(world), ')
typeMod('Capitalized ')
const modStats = modSession.finish(mts + 30_000)
ok('modifier chars counted', modStats.characters.correct === 32)
ok('modifier session acc 100', modStats.acc === 100)

// --- typing session: target the engine's own words ---
const sesEngine = createWordEngine(mulberry32(7))
sesEngine.ensure(0)
const targets = Array.from(sesEngine.words)
const session = createTypingSession({
  engine: sesEngine,
  limitMs: 30_000,
})
let ts = 1000
const type = (s) => {
  for (const c of s) {
    if (c === '\b') {
      session.backspace(++ts)
    } else {
      ts += 80
      session.type(c, ts)
    }
  }
}
const wd = (i) => session.words[i]

// --- the session pre-generates its window before any keystroke ---
ok('pre-generates 100 words', session.words.length === 100)
ok('pre-generated all pending', wd(0).typed === '' && wd(0).done === false)

// word 1: exact -> perfect
type(targets[0] + ' ')
ok('word1 committed', wd(0).done === true)
ok('streak 1', session.streak === 1)

// word 2: 2 chars, backspace, retype same char, finish
const t2 = targets[1]
type(t2.slice(0, 2))
type('\b')
type(t2[1])
type(t2.slice(2) + ' ')
ok('word2 committed', wd(1).done === true)
ok('streak reset by word2 backspace', session.streak === 0)
ok('word2 hadBackspace', wd(1).hadBackspace === true)

// word 3: exact -> perfect again
type(targets[2] + ' ')
ok('streak 1 again', session.streak === 1)

// word 4 (idx 3): partial commit (early space)
type(targets[3].slice(0, 1) + ' ')
ok('word4 committed partial', wd(3).done === true)
ok('streak 0 for partial', session.streak === 0)

// --- revert into previous word ---
session.backspace(++ts)
ok('reverted one word', session.activeIndex === 3)
ok(
  'word4 restored, not done',
  wd(3).done === false && wd(3).typed === targets[3].slice(0, 1),
)
ok('words later cleared by revert', wd(5).typed === '' && wd(6).done === false)
ok('revert breaks streak', session.streak === 0)

// --- retype word4 with a persistent in-range typo + an extra char ---
const t4 = targets[3]
const wrongChar = t4[t4.length - 1] === 'q' ? 'z' : 'q'
type(t4.slice(1, -1) + wrongChar + '!' + ' ')
ok('word4 re-committed', wd(3).done === true)
ok('active advanced', session.activeIndex === 4)

// --- stats over a full 30s window ---
const stats = session.finish(ts + 30_000)
ok('stats wpm > 0', stats.wpm > 0 && stats.wpm < 400)
ok('raw >= wpm (typos)', stats.raw >= stats.wpm)
ok('acc < 100', stats.acc < 100 && stats.acc > 0)
ok('chart has 31 seconds', stats.chart.raw.length === 31)
ok('incorrect counted', stats.characters.incorrect >= 1)
ok('extra counted', stats.characters.extra >= 1)
ok('time == 30s', stats.timeMs === 30_000)
ok('streakMax recorded', stats.streakMax === 1)

// --- keystroke counts drive the accuracy aria-label ---
const ks = stats.keystrokes
ok('keystrokes inserts > 0', ks.inserts > 0)
ok('keystrokes errors > 0', ks.errors > 0)
ok(
  'acc == keystroke ratio',
  stats.acc ===
    Math.round(((ks.inserts - ks.errors) / ks.inserts) * 100 * 100) / 100,
)

// --- display letters ---
const letters = displayLetters(wd(0))
ok(
  'word0 letters all correct',
  letters.every((l) => l.state === 'correct'),
)
const pending = displayLetters(wd(10))
ok(
  'fresh word all pending',
  pending.every((l) => l.state === 'pending'),
)

// mismatch keeps the TARGET letter visible in error color (terrace
// preference, overriding the reference's typed-char display)
const letters4 = displayLetters(wd(3))
const wrongIdx = t4.length - 1
ok(
  'mismatch shows target char',
  letters4[wrongIdx]?.char === t4[wrongIdx] &&
    letters4[wrongIdx]?.state === 'incorrect',
)
ok(
  'extra letter kept as typed',
  letters4[t4.length]?.char === '!' && letters4[t4.length]?.state === 'extra',
)

// --- never-started stats ---
const idle = createTypingSession({
  engine: createWordEngine(mulberry32(1)),
})
const idleStats = idle.statsAt(999_999)
ok('idle wpm 0', idleStats.wpm === 0)
ok('idle consistency 100', idleStats.consistency === 100)
ok('idle keystrokes 0', idleStats.keystrokes.inserts === 0)
ok('idle has pre-generated words', idle.words.length === 100)

// --- perfect 12-word run at human speed ---
const engine2 = createWordEngine(mulberry32(3))
const s2 = createTypingSession({ engine: engine2, limitMs: 30_000 })
let t2ts = 500
engine2.ensure(0)
const words2 = engine2.words
for (let i = 0; i < 12; i++) {
  for (const c of words2[i] ?? 'x') {
    t2ts += 170
    s2.type(c, t2ts)
  }
  t2ts += 170
  s2.type(' ', t2ts)
}
ok('s2 streak 12 after 12 perfect words', s2.streak === 12)
const stats2 = s2.finish(t2ts + 34_000)
ok('perfect 12w wpm plausible', stats2.wpm > 5 && stats2.wpm < 60)
ok('s2 acc 100', stats2.acc === 100)
ok('s2 keystroke errors 0', stats2.keystrokes.errors === 0)
ok('s2 streakMax 12', stats2.streakMax === 12)

// --- ctrl+backspace: whole-word deletion (separate session) ---
const engine3 = createWordEngine(mulberry32(11))
const s3 = createTypingSession({ engine: engine3, limitMs: 30_000 })
engine3.ensure(0)
const words3 = engine3.words
let t3ts = 400
const typeS3 = (s) => {
  for (const c of s) {
    if (c === '\b') {
      s3.backspace(++t3ts)
    } else {
      t3ts += 150
      s3.type(c, t3ts)
    }
  }
}
const wd3 = (i) => s3.words[i]

// type 5 words cleanly to set up editable history
for (let i = 0; i < 5; i++) typeS3(words3[i] + ' ')
ok('s3 five words committed', s3.activeIndex === 5 && wd3(4).done === true)
ok('s3 streak 5', s3.streak === 5)

// ctrl+backspace with text in the word clears it, index unchanged
typeS3((words3[5] ?? 'ab').slice(0, 3))
ok('s3 word5 partial', wd3(5).typed.length === 3)
t3ts += 200
s3.backspaceWord(t3ts)
ok('s3 clears active word', wd3(5).typed.length === 0 && s3.activeIndex === 5)

// ctrl+backspace at a word start deletes the previous word entirely
t3ts += 200
s3.backspaceWord(t3ts)
ok(
  's3 deletes previous word',
  s3.activeIndex === 4 &&
    wd3(4).typed.length === 0 &&
    wd3(4).done === false &&
    wd3(4).hadBackspace === true,
)
ok('s3 words after the deleted one cleared', wd3(5).typed === '')

// repeated ctrl+backspace deletes the word before that one
t3ts += 200
s3.backspaceWord(t3ts)
ok(
  's3 deletes again',
  s3.activeIndex === 3 && wd3(3).typed.length === 0 && wd3(3).done === false,
)

// retyping a ctrl-deleted word commits but can never be perfect
typeS3(words3[3] + ' ')
ok('s3 retype commits', s3.activeIndex === 4 && wd3(3).done === true)
ok('s3 streak 0 after clear+retype', s3.streak === 0)
// streakMax only ships in the frozen stats, so freeze the session to read it
const stats3 = s3.finish(t3ts + 31_000)
ok('s3 streakMax survived', stats3.streakMax === 5)

// ctrl+backspace before typing anything / at index 0 is a safe no-op
const s4 = createTypingSession({
  engine: createWordEngine(mulberry32(13)),
  limitMs: 30_000,
})
let t4ts = 100
s4.backspaceWord(t4ts)
ok('s4 no-op at start', s4.activeIndex === 0 && s4.words[0].typed === '')

if (failures.length > 0) {
  console.log('FAIL', JSON.stringify(failures))
  process.exit(1)
}
console.log(
  'smoke ok | wpm',
  stats.wpm,
  '| raw',
  stats.raw,
  '| acc',
  stats.acc,
  '| cons',
  stats.consistency,
  '| chars',
  JSON.stringify(stats.characters),
  '| s2 wpm',
  stats2.wpm,
  '| s3 retype committed + span broken',
  '| gen top3k head skew',
  `${Math.round((nearHead / genWords.length) * 100)}%`,
  '| punct decorated',
  decorated,
  '| numbers drawn',
  numeric,
  '| caps',
  capped,
)
