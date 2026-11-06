/**
 * terrace's english vocabulary + difficulty tiers.
 *
 * terrace treats difficulty as its own config axis (the reference embeds it
 * in the language names: "english 5k", "english 10k", ...). The vocabulary
 * comes from an open frequency corpus (OpenSubtitles 2018, via
 * hermitdave/FrequencyWords - open data, not another product's asset),
 * rank-ordered by real use frequency and filtered by
 * scripts/build-vocab.mjs; the tier banding and the frequency-weighted
 * "general" mode are terrace-owned.
 *
 * Tiers are disjoint frequency bands over the ranked table and are sampled
 * uniformly within a band. "general" covers every word of all tiers, with
 * each word's appearance probability matching its real share of
 * written/spoken language.
 *
 * Invariants (module load): ranked table is the expected size, entries are
 * unique lowercase [a-z] words, counts are non-increasing.
 */

import { ENGLISH_RANKED_RAW } from './vocab/en-ranked'

export type Difficulty =
  | 'beginner'
  | 'elementary'
  | 'intermediate'
  | 'advanced'
  | 'expert'
  | 'master'
  | 'general'

/** Display order, ascending difficulty. */
export const DIFFICULTIES: readonly Difficulty[] = [
  'beginner',
  'elementary',
  'intermediate',
  'advanced',
  'expert',
  'master',
  'general',
]

export const DEFAULT_DIFFICULTY: Difficulty = 'beginner'

const EXPECTED_WORDS = 50_000

const ranked: string[] = []
const counts: number[] = []
for (const line of ENGLISH_RANKED_RAW.split('\n')) {
  if (line.length === 0) continue
  const cut = line.lastIndexOf(' ')
  const word = line.slice(0, cut)
  const count = Number(line.slice(cut + 1))
  if (!/^[a-z]+$/.test(word)) continue
  if (!Number.isFinite(count) || count <= 0) continue
  ranked.push(word)
  counts.push(count)
}

export const ENGLISH_RANKED: readonly string[] = ranked
export const ENGLISH_COUNTS: readonly number[] = counts

if (ranked.length !== EXPECTED_WORDS || ranked.length !== counts.length) {
  const detail = `ranked ${ranked.length} / counts ${counts.length}`
  throw new Error(
    `en-ranked data is broken (${detail}; want ${EXPECTED_WORDS})`,
  )
}
for (let i = 1; i < counts.length; i++) {
  const previous = counts[i - 1]
  const current = counts[i]
  if (previous === undefined || current === undefined) continue
  if (current > previous) {
    throw new Error(`en-ranked counts rise at rank ${i + 1}`)
  }
}
for (let i = 1; i < ranked.length; i++) {
  if (ranked[i] === ranked[i - 1]) {
    throw new Error(`en-ranked duplicate word at rank ${i + 1}`)
  }
}

export interface FrequencyBand {
  /** First rank (1-based), inclusive. */
  from: number
  /** Last rank, inclusive. */
  to: number
}

/**
 * Tier bands as 1-based inclusive rank ranges over ENGLISH_RANKED. The
 * sizes (1k / 2k / 3k / 6k / 13k / 25k) mirror how the reference grades
 * its english lists while keeping each tier a disjoint slice, so a tier is
 * a stable practice basket rather than a growing prefix.
 */
export const DIFFICULTY_BANDS = {
  beginner: { from: 1, to: 1000 },
  elementary: { from: 1001, to: 3000 },
  intermediate: { from: 3001, to: 6000 },
  advanced: { from: 6001, to: 12000 },
  expert: { from: 12001, to: 25000 },
  master: { from: 25001, to: 50_000 },
} satisfies Record<Exclude<Difficulty, 'general'>, FrequencyBand>

/** Words of a difficulty: the band slice; 'general' is the whole table. */
export function getDifficultyWords(difficulty: Difficulty): readonly string[] {
  if (difficulty === 'general') return ENGLISH_RANKED
  const band = DIFFICULTY_BANDS[difficulty]
  return ENGLISH_RANKED.slice(band.from - 1, band.to)
}

/** Only 'general' samples by real-world frequency; tiers draw uniformly. */
export function isFrequencyWeighted(difficulty: Difficulty): boolean {
  return difficulty === 'general'
}

interface WeightedTable {
  cum: Float64Array
  total: number
}

let weightedTable: WeightedTable | null = null

function getWeightedTable(): WeightedTable {
  if (weightedTable !== null) return weightedTable
  let total = 0
  const cum = new Float64Array(ENGLISH_RANKED.length)
  for (let i = 0; i < ENGLISH_RANKED.length; i++) {
    total += ENGLISH_COUNTS[i] ?? 0
    cum[i] = total
  }
  weightedTable = { cum, total }
  return weightedTable
}

/**
 * Draw one word with probability proportional to its real-language share
 * (binary search over the cumulative occurrence counts).
 */
export function drawWeighted(random: () => number): string {
  const { cum, total } = getWeightedTable()
  const target = random() * total
  let lo = 0
  let hi = cum.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    const value = cum[mid] ?? 0
    if (value > target) hi = mid
    else lo = mid + 1
  }
  return ENGLISH_RANKED[lo] ?? 'the'
}
