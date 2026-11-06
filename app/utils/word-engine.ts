/**
 * Streaming word generator for a typing session.
 *
 * Behaviour notes (terrace-owned; informed by the reverse-engineered
 * reference): the test starts with 100 words and keeps at least 100 words
 * ahead of the active index in time mode, so generation never runs out.
 * Words are drawn from the engine's difficulty pool - uniformly within a
 * tier, or by real-world frequency share for 'general'. A word equal to
 * the previous word is rejected.
 */

import {
  DEFAULT_DIFFICULTY,
  drawWeighted,
  getDifficultyWords,
  isFrequencyWeighted,
} from './word-list'
import type { Difficulty } from './word-list'

export interface WordEngine {
  /** Visible words generated so far, each without its trailing space. */
  readonly words: readonly string[]
  /**
   * Grow the word list until `activeIndex` has `keepAhead` words ahead of it.
   * Call after every word advance. No-op when the list is already long enough.
   */
  ensure(activeIndex: number): void
}

/** Small, fast, seeded PRNG - same family as the old terminal prototype. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DEFAULT_KEEP_AHEAD = 100
const DEFAULT_INITIAL = 100

export interface WordEngineOptions {
  /** How many words to keep ahead of the active index. Default 100. */
  keepAhead?: number
  /** Which difficulty pool to draw from. Default 'beginner'. */
  difficulty?: Difficulty
}

export function createWordEngine(
  random: () => number = Math.random,
  options: WordEngineOptions = {},
): WordEngine {
  const keepAhead = Math.max(1, options.keepAhead ?? DEFAULT_KEEP_AHEAD)
  const difficulty = options.difficulty ?? DEFAULT_DIFFICULTY
  const pool = getDifficultyWords(difficulty)
  const weighted = isFrequencyWeighted(difficulty)

  let words: string[] = []
  let previous = ''

  function nextWord(): string {
    for (let tries = 0; tries < pool.length * 2 + 8; tries++) {
      const candidate = weighted
        ? drawWeighted(random)
        : pool[Math.floor(random() * pool.length)]
      if (candidate === undefined || candidate === previous) continue
      previous = candidate
      return candidate
    }
    // the retry loop always succeeds for pools this large; unrepeatable
    // safety net: return a word different from the previous one
    const first = pool[0] ?? 'the'
    const second = pool[1] ?? 'and'
    const fallback = first === previous ? second : first
    previous = fallback
    return fallback
  }

  const engine: WordEngine = {
    get words(): readonly string[] {
      return words
    },
    ensure(activeIndex: number): void {
      // start with 100 words, then keep ~keepAhead words ahead of the index
      const want = Math.max(activeIndex + keepAhead, DEFAULT_INITIAL)
      while (words.length < want) {
        words = [...words, nextWord()]
      }
    },
  }

  return engine
}
