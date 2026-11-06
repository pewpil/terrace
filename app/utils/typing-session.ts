/**
 * terrace's typing session - pure state machine, no clock, no DOM.
 *
 * Behaviour follows the agreed design (informed by the reverse-engineered
 * reference, but terrace-owned):
 *
 * - per-char states: pending, correct, incorrect (terrace preference: the
 *   TARGET letter stays visible in the error color when it is mistyped),
 *   extra
 * - an append-only key event log drives raw wpm, accuracy and consistency;
 *   final letter states drive wpm and the character counts
 * - space commits the current word; space on an empty word is ignored; enter
 *   is ignored in the default mode (the page maps it away)
 * - backspace deletes the last char; with an empty word it reverts to the
 *   previous word (restoring its input and clearing everything typed after
 *   it)
 * - ctrl+backspace deletes one whole space-separated word: the current
 *   word's content is cleared in one go, or at a word start the previous
 *   word is deleted entirely; cleared words keep a broken span (no perfect
 *   streak)
 * - a perfect word is one whose whole span (chars + trailing space) had no
 *   errors and no backspaces; perfect words bump the streak, anything else
 *   resets it
 * - wpm = correct chars / 5 / minutes (needs at least 1s of data); raw counts
 *   insert events; accuracy = correct inserts / inserts; consistency is the
 *   kogasa transform of the per-second raw bursts
 */

import type { WordEngine } from './word-engine'

export type LetterState = 'pending' | 'correct' | 'incorrect' | 'extra'

export interface SessionWord {
  /** The target word (without trailing space). */
  target: string
  /** What the user has typed into this word so far. */
  typed: string
  /** The word was committed with space. */
  done: boolean
  /** A mismatching char was typed somewhere in this word's span. */
  hadError: boolean
  /** A backspace happened somewhere in this word's span. */
  hadBackspace: boolean
  /** An extra char was typed and then removed in this word. */
  extraCorrected: boolean
}

export interface KeyEvent {
  /** Relative ms since the first keystroke. */
  t: number
  kind: 'insert' | 'delete'
  /** Whether an insert matched its target (null for deletions). */
  correct: boolean | null
}

export interface CharacterCounts {
  correct: number
  incorrect: number
  extra: number
}

export interface KeystrokeCounts {
  /** Printable insert events, space commits included. */
  inserts: number
  /** How many of those inserts mismatched their target. */
  errors: number
}

export interface ChartSeries {
  wpm: number[]
  raw: number[]
  errors: number[]
}

export interface SessionStats {
  wpm: number
  raw: number
  acc: number
  consistency: number
  timeMs: number
  characters: CharacterCounts
  keystrokes: KeystrokeCounts
  streakMax: number
  chart: ChartSeries
}

export interface TypingSession {
  readonly engine: WordEngine
  readonly started: boolean
  readonly finished: boolean
  readonly startTs: number | null
  /** Session words, aligned with engine.words. */
  readonly words: readonly SessionWord[]
  readonly activeIndex: number
  readonly streak: number
  readonly insertCount: number
  readonly errorCount: number
  /** Feed printable chars one at a time (spaces included). */
  type(char: string, ts: number): void
  backspace(ts: number): void
  /**
   * ctrl+backspace: delete one whole space-separated word. With content in
   * the current word it clears it entirely; with an empty word it deletes
   * the previous word instead (restoring position, clearing content).
   */
  backspaceWord(ts: number): void
  /** Live or final stats window-capped at the time limit. */
  statsAt(ts: number): SessionStats
  /** Freeze the session (idempotent; returns the frozen stats). */
  finish(ts: number): SessionStats
  remainingMs(ts: number): number
}

export interface SessionOptions {
  engine: WordEngine
  /** Test length in ms for time mode. Default 30000. */
  limitMs?: number
}

const DEFAULT_LIMIT_MS = 30_000

/** kogasa function from the reference math: 100 * (1 - tanh(cv + cv^3/3 + cv^5/5)). */
export function kogasa(cv: number): number {
  if (cv <= 0) return 100
  const sum = cv + Math.pow(cv, 3) / 3 + Math.pow(cv, 5) / 5
  return Math.max(0, 100 * (1 - Math.tanh(sum)))
}

export function createTypingSession(options: SessionOptions): TypingSession {
  const engine = options.engine
  const limitMs = options.limitMs ?? DEFAULT_LIMIT_MS

  const entries: SessionWord[] = []
  let activeIndex = 0
  let started = false
  let finished = false
  let startTs: number | null = null
  let events: KeyEvent[] = []
  let insertCount = 0
  let errorCount = 0
  let streak = 0
  let streakMax = 0
  let frozen: SessionStats | null = null

  function sync(): void {
    const list = engine.words
    while (entries.length < list.length) {
      const index = entries.length
      const target = list[index]
      if (target === undefined) break
      entries.push({
        target,
        typed: '',
        done: false,
        hadError: false,
        hadBackspace: false,
        extraCorrected: false,
      })
    }
  }

  function start(ts: number): void {
    started = true
    startTs = ts
    streak = 0
    engine.ensure(0)
    sync()
  }

  function cappedRel(t: number): number {
    if (startTs === null) return 0
    return Math.max(0, Math.min(t - startTs, limitMs))
  }

  function commitAndAdvance(ts: number): void {
    const word = entries[activeIndex]
    if (word === undefined) return
    const full = word.typed.length === word.target.length
    // a space counts as a correct char only when the word was fully typed;
    // a partial commit is effectively a mistyped space
    const correctSpace = full
    insertCount++
    if (!correctSpace) errorCount++
    events.push({ t: ts, kind: 'insert', correct: correctSpace })

    const perfect = correctSpace && !word.hadError && !word.hadBackspace
    if (perfect) {
      streak++
    } else {
      streak = 0
    }
    streakMax = Math.max(streakMax, streak)

    word.done = true
    activeIndex++
    engine.ensure(activeIndex)
    sync()
  }

  const session: TypingSession = {
    get engine(): WordEngine {
      return engine
    },
    get started(): boolean {
      return started
    },
    get finished(): boolean {
      return finished
    },
    get startTs(): number | null {
      return startTs
    },
    get words(): readonly SessionWord[] {
      return entries
    },
    get activeIndex(): number {
      return activeIndex
    },
    get streak(): number {
      return streak
    },
    get insertCount(): number {
      return insertCount
    },
    get errorCount(): number {
      return errorCount
    },
    type(char, tsArg) {
      if (char.length !== 1) return
      if (finished) return
      if (started && cappedRel(tsArg) >= limitMs) return
      sync()
      if (!started) start(tsArg)
      const rel = tsArg - (startTs as number)
      const word = entries[activeIndex]

      if (char === ' ') {
        if (word === undefined || word.typed === '') return
        commitAndAdvance(rel)
        return
      }

      if (word === undefined) return
      const pos = word.typed.length
      const correct = pos < word.target.length && word.target[pos] === char
      word.typed += char
      if (!correct) word.hadError = true
      insertCount++
      if (!correct) errorCount++
      events.push({ t: rel, kind: 'insert', correct })
    },
    backspace(tsArg) {
      if (finished || !started) return
      if (cappedRel(tsArg) >= limitMs) return
      const word = entries[activeIndex]
      if (word === undefined) return

      if (word.typed === '') {
        if (activeIndex === 0) return
        // revert into the previous word: restore its input, break its span,
        // and clear every word past it so they can be retyped
        const previous = entries[activeIndex - 1]
        if (previous === undefined) return
        previous.done = false
        previous.hadBackspace = true
        for (let i = activeIndex; i < entries.length; i++) {
          const clear = entries[i]
          if (clear === undefined) continue
          clear.done = false
          clear.typed = ''
          clear.hadError = false
          clear.hadBackspace = false
          clear.extraCorrected = false
        }
        activeIndex--
        engine.ensure(activeIndex)
        sync()
        return
      }

      word.hadBackspace = true
      const removed = word.typed.slice(-1)
      word.typed = word.typed.slice(0, -1)
      if (removed.length === 1 && word.typed.length >= word.target.length) {
        word.extraCorrected = true
      }
    },
    backspaceWord(tsArg) {
      if (finished || !started) return
      if (cappedRel(tsArg) >= limitMs) return
      const word = entries[activeIndex]
      if (word === undefined) return

      if (word.typed !== '') {
        // clear the active word in one go; its span stays broken
        // (hadBackspace) so a retype cannot count as a perfect word
        word.hadBackspace = true
        word.typed = ''
        word.extraCorrected = false
        return
      }

      if (activeIndex === 0) return
      // at a word start: delete the previous word instead of restoring it
      const previous = entries[activeIndex - 1]
      if (previous === undefined) return
      previous.done = false
      previous.typed = ''
      previous.hadBackspace = true
      previous.extraCorrected = false
      for (let i = activeIndex; i < entries.length; i++) {
        const clear = entries[i]
        if (clear === undefined) continue
        clear.done = false
        clear.typed = ''
        clear.hadError = false
        clear.hadBackspace = false
        clear.extraCorrected = false
      }
      activeIndex--
      engine.ensure(activeIndex)
      sync()
    },
    statsAt(tsArg) {
      const rel = cappedRel(tsArg)
      if (startTs === null || rel < 1000) {
        return {
          wpm: 0,
          raw: 0,
          acc: 100,
          consistency: 100,
          timeMs: rel,
          characters: { correct: 0, incorrect: 0, extra: 0 },
          keystrokes: { inserts: insertCount, errors: errorCount },
          streakMax,
          chart: { wpm: [], raw: [], errors: [] },
        }
      }

      // final character state counts
      let correctChars = 0
      let incorrectChars = 0
      let extraChars = 0
      for (const word of entries) {
        if (word.typed.length === 0) continue
        for (let i = 0; i < word.typed.length; i++) {
          if (i < word.target.length) {
            if (word.typed[i] === word.target[i]) {
              correctChars++
            } else {
              incorrectChars++
            }
          } else {
            extraChars++
          }
        }
        if (word.done && word.typed.length === word.target.length) {
          // the trailing space of a fully typed word
          correctChars++
        }
      }

      // per-second buckets from the event log
      const seconds = Math.floor(rel / 1000) + 1
      const wpmBuckets = new Array<number>(seconds).fill(0)
      const rawBuckets = new Array<number>(seconds).fill(0)
      const errorBuckets = new Array<number>(seconds).fill(0)
      for (const event of events) {
        if (event.kind !== 'insert') continue
        const bucket = Math.min(seconds - 1, Math.floor(event.t / 1000))
        rawBuckets[bucket] = (rawBuckets[bucket] ?? 0) + 1
        if (event.correct) {
          wpmBuckets[bucket] = (wpmBuckets[bucket] ?? 0) + 1
        } else {
          errorBuckets[bucket] = (errorBuckets[bucket] ?? 0) + 1
        }
      }
      // chars per second -> wpm (chars / 5 * 60)
      const chart: ChartSeries = {
        wpm: wpmBuckets.map((n) => n * 12),
        raw: rawBuckets.map((n) => n * 12),
        errors: errorBuckets,
      }

      const minutes = rel / 60_000
      const wpm = correctChars / 5 / minutes
      const raw = rawBuckets.reduce((a, b) => a + b, 0) / 5 / minutes
      const attempted = insertCount
      const acc =
        attempted > 0 ? ((attempted - errorCount) / attempted) * 100 : 100

      const mean = rawBuckets.reduce((a, b) => a + b, 0) / seconds
      const variance =
        rawBuckets.reduce((a, b) => a + (b - mean) * (b - mean), 0) / seconds
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 0
      const consistency = kogasa(cv)

      return {
        wpm: round2(wpm),
        raw: round2(raw),
        acc: round2(acc),
        consistency: Math.round(consistency),
        timeMs: rel,
        characters: {
          correct: correctChars,
          incorrect: incorrectChars,
          extra: extraChars,
        },
        keystrokes: { inserts: insertCount, errors: errorCount },
        streakMax,
        chart,
      }
    },
    finish(tsArg) {
      if (finished) {
        return frozen as SessionStats
      }
      finished = true
      if (startTs === null) {
        frozen = {
          wpm: 0,
          raw: 0,
          acc: 100,
          consistency: 100,
          timeMs: 0,
          characters: { correct: 0, incorrect: 0, extra: 0 },
          keystrokes: { inserts: 0, errors: 0 },
          streakMax: 0,
          chart: { wpm: [], raw: [], errors: [] },
        }
        events = []
        return frozen
      }
      const frozenSessionStats = session.statsAt(startTs + cappedRel(tsArg))
      events = []
      frozen = frozenSessionStats
      return frozen
    },
    remainingMs(tsArg) {
      if (startTs === null) return limitMs
      return Math.max(0, limitMs - (tsArg - startTs))
    },
  }

  // pre-generate the initial words (and mirror them as pending session words)
  // so the UI can render a ready test before the first keystroke; the session
  // is not `started` until the first char arrives
  engine.ensure(0)
  sync()

  return session
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export interface DisplayLetter {
  char: string
  state: LetterState
}

/**
 * Map a session word to its display letters. terrace preference: a mismatch
 * keeps showing the TARGET letter and marks it incorrect (instead of the
 * reference's typed-char display) so the word shape stays readable; overflow
 * chars render as their own extras; the rest stays pending.
 */
export function displayLetters(word: SessionWord): DisplayLetter[] {
  const letters: DisplayLetter[] = []
  for (let i = 0; i < word.typed.length; i++) {
    const typed = word.typed[i]
    if (typed === undefined) continue
    if (i < word.target.length) {
      const target = word.target[i]
      if (target === undefined) continue
      letters.push({
        char: target,
        state: typed === target ? 'correct' : 'incorrect',
      })
    } else {
      letters.push({ char: typed, state: 'extra' })
    }
  }
  for (let i = word.typed.length; i < word.target.length; i++) {
    const pending = word.target[i]
    if (pending === undefined) continue
    letters.push({ char: pending, state: 'pending' })
  }
  return letters
}
