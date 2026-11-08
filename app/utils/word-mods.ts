/**
 * terrace's punctuation and numbers modifiers.
 *
 * The reference bakes punctuation and number words into its language lists
 * and filters them out when the modifiers are off. terrace's vocabulary is a
 * clean lowercase frequency table, so the modifiers are applied to generated
 * base words instead - a terrace-owned behaviour, not reference parity.
 *
 * All randomness comes from the engine's seeded stream, so a fixed seed
 * reproduces the same test exactly (SSR/hydration safety and 'repeat').
 *
 * - punctuation: some words get a matched wrapper ("word", 'word', (word),
 *   [word], {word}) or a trailing mark (word, word. word; word: word? word!)
 * - numbers: some words are replaced by a number. With punctuation also on,
 *   numbers additionally appear with a currency prefix, a percent suffix,
 *   thousands separators or a decimal point.
 * - capitalization: some words get their first letter uppercased; the
 *   capital stays inside any punctuation wrapper ("Word").
 */

const NUMBER_CHANCE = 0.2
const CAPITAL_CHANCE = 0.2
const PUNCT_CHANCE = 0.4
const WRAP_CHANCE = 0.45

const WRAP_PAIRS = [
  ['"', '"'],
  ["'", "'"],
  ['(', ')'],
  ['[', ']'],
  ['{', '}'],
] as const

const SUFFIXES = [',', '.', ';', ':', '?', '!'] as const

export interface WordModOptions {
  /** Attach punctuation marks to generated words. Default false. */
  punctuation?: boolean
  /** Replace some generated words with numbers. Default false. */
  numbers?: boolean
  /** Uppercase the first letter of some words. Default false. */
  capitalization?: boolean
}

/** Uniform integer in [min, max]. */
function randomInt(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1))
}

/** A digit string; the first digit can be forced away from zero. */
function randomDigits(
  random: () => number,
  length: number,
  leadingNonZero: boolean,
): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    const digit =
      leadingNonZero && i === 0
        ? randomInt(random, 1, 9)
        : randomInt(random, 0, 9)
    out += String(digit)
  }
  return out
}

/** 1234567 -> 1,234,567 */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function makeNumber(random: () => number, punctuation: boolean): string {
  if (!punctuation) {
    return randomDigits(random, randomInt(random, 1, 4), true)
  }
  switch (randomInt(random, 0, 4)) {
    case 0:
      return `$${randomDigits(random, randomInt(random, 1, 4), true)}`
    case 1:
      return `${randomDigits(random, randomInt(random, 1, 3), true)}%`
    case 2:
      return groupThousands(randomDigits(random, randomInt(random, 4, 6), true))
    case 3:
      return `${randomDigits(random, randomInt(random, 1, 2), true)}.${randomDigits(
        random,
        2,
        false,
      )}`
    default:
      return randomDigits(random, randomInt(random, 1, 4), true)
  }
}

function punctuate(word: string, random: () => number): string {
  if (random() < WRAP_CHANCE) {
    const pair = WRAP_PAIRS[randomInt(random, 0, WRAP_PAIRS.length - 1)]
    return pair === undefined ? word : `${pair[0]}${word}${pair[1]}`
  }
  const suffix = SUFFIXES[randomInt(random, 0, SUFFIXES.length - 1)]
  return suffix === undefined ? word : `${word}${suffix}`
}

/**
 * Apply the enabled modifiers to one generated base word.
 *
 * The RNG is consumed only for enabled modifiers, so turning both off leaves
 * the original word stream untouched.
 */
export function modifyWord(
  word: string,
  random: () => number,
  options: WordModOptions = {},
): string {
  if (options.numbers === true && random() < NUMBER_CHANCE) {
    return makeNumber(random, options.punctuation === true)
  }
  const cased =
    options.capitalization === true && random() < CAPITAL_CHANCE
      ? `${word.charAt(0).toUpperCase()}${word.slice(1)}`
      : word
  if (options.punctuation === true && random() < PUNCT_CHANCE) {
    return punctuate(cased, random)
  }
  return cased
}
