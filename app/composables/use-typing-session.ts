import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import type { ComputedRef, Ref, ShallowRef } from 'vue'
import { createTypingSession, displayLetters } from '../utils/typing-session'
import type {
  DisplayLetter,
  SessionStats,
  TypingSession,
} from '../utils/typing-session'
import { createWordEngine, mulberry32 } from '../utils/word-engine'
import { DEFAULT_DIFFICULTY } from '../utils/word-list'
import type { Difficulty } from '../utils/word-list'

export type TestView = 'test' | 'result'

/** Everything the test page and the result screen need from a session. */
export interface TypingSessionState {
  /** Bumps on every keystroke mutation - consumers re-measure on change. */
  version: ShallowRef<number>
  view: ShallowRef<TestView>
  focused: Ref<boolean>
  started: ComputedRef<boolean>
  /** Countdown left (ms), kept fresh by the ~100ms clock tick. */
  remainingMs: Ref<number>
  /** Current perfect-word streak (0 hides the indicator). */
  streak: Ref<number>
  /** Selected vocabulary difficulty (drives the engine pool). */
  difficulty: Ref<Difficulty>
  /** Attach punctuation marks to generated words. */
  punctuation: Ref<boolean>
  /** Replace some generated words with numbers. */
  numbers: Ref<boolean>
  /** Uppercase the first letter of some generated words. */
  capitalization: Ref<boolean>
  /** Letters for every engine word, pending ones included. */
  words: ComputedRef<DisplayLetter[][]>
  activeIndex: ComputedRef<number>
  /** Chars typed into the active word (drives caret measurement). */
  activeTypedLen: ComputedRef<number>
  frozenStats: ShallowRef<SessionStats | null>
  /** Back to a fresh test with a new wordset. */
  nextTest(): void
  /** New test that replays the same wordset (same RNG draws). */
  repeatTest(): void
  /** Fresh test on another vocabulary difficulty (seed rerolls). */
  selectDifficulty(next: Difficulty): void
  /** Fresh test with punctuation on/off (seed rerolls). */
  setPunctuation(enabled: boolean): void
  /** Fresh test with numbers on/off (seed rerolls). */
  setNumbers(enabled: boolean): void
  /** Fresh test with capitalization on/off (seed rerolls). */
  setCapitalization(enabled: boolean): void
  /** Show the words again after Esc. */
  focus(): void
}

/*
 * The very first test uses a fixed seed so SSR output and client hydration
 * produce identical words. Any restart rerolls the seed (that can only be
 * triggered after mount, e.g. by a user keystroke or button click).
 */
const INITIAL_SEED = 0x2b715107

const DEFAULT_LIMIT_MS = 30_000
const CLOCK_MS = 100

export function useTypingSession(
  limitMs = DEFAULT_LIMIT_MS,
): TypingSessionState {
  const view = shallowRef<TestView>('test')
  const focused = ref(true)
  const remainingMs = ref(limitMs)
  const streak = ref(0)
  const frozenStats = shallowRef<SessionStats | null>(null)
  const difficulty = shallowRef<Difficulty>(DEFAULT_DIFFICULTY)
  const punctuation = ref(false)
  const numbers = ref(false)
  const capitalization = ref(false)

  let seed = INITIAL_SEED
  let session = createSession()

  // Session getters are plain (non-reactive) reads, so every computed reads
  // `version` first to re-run whenever a keystroke changed the machine.
  const version = shallowRef(0)

  function createSession(): TypingSession {
    return createTypingSession({
      engine: createWordEngine(mulberry32(seed), {
        difficulty: difficulty.value,
        punctuation: punctuation.value,
        numbers: numbers.value,
        capitalization: capitalization.value,
      }),
      limitMs,
    })
  }

  const words = computed<DisplayLetter[][]>(() => {
    void version.value
    return session.words.map((word) => displayLetters(word))
  })
  const activeIndex = computed(() => {
    void version.value
    return session.activeIndex
  })
  const activeTypedLen = computed(() => {
    void version.value
    return session.words[session.activeIndex]?.typed.length ?? 0
  })
  const started = computed(() => {
    void version.value
    return session.started
  })

  function finishTest(): void {
    if (session.finished) return
    frozenStats.value = session.finish(Date.now())
    view.value = 'result'
  }

  function afterKeystroke(): void {
    streak.value = session.streak
    version.value++
    remainingMs.value = session.remainingMs(Date.now())
    if (remainingMs.value <= 0) finishTest()
  }

  function restart(replay: boolean): void {
    if (!replay) seed = (Math.random() * 0x1_0000_0000) >>> 0
    session = createSession()
    view.value = 'test'
    focused.value = true
    remainingMs.value = limitMs
    streak.value = 0
    frozenStats.value = null
    version.value++
  }

  function nextTest(): void {
    restart(false)
  }

  function repeatTest(): void {
    restart(true)
  }

  function selectDifficulty(next: Difficulty): void {
    if (next === difficulty.value) return
    difficulty.value = next
    // a different vocabulary is a fresh test; the seed rerolls like tab
    restart(false)
  }

  function setPunctuation(enabled: boolean): void {
    if (enabled === punctuation.value) return
    punctuation.value = enabled
    // a different word stream is a fresh test, same as a difficulty switch
    restart(false)
  }

  function setNumbers(enabled: boolean): void {
    if (enabled === numbers.value) return
    numbers.value = enabled
    restart(false)
  }

  function setCapitalization(enabled: boolean): void {
    if (enabled === capitalization.value) return
    capitalization.value = enabled
    restart(false)
  }

  function focus(): void {
    focused.value = true
  }

  function unfocus(): void {
    focused.value = false
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Tab') {
      e.preventDefault()
      nextTest()
      return
    }
    if (e.key === 'Escape') {
      unfocus()
      return
    }
    if (view.value !== 'test' || session.finished) return
    if (!focused.value) return
    // Backspace is handled before the modifier guard so ctrl+backspace is
    // not swallowed; holding the key repeats deletion, which is intended.
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (e.ctrlKey && !e.altKey && !e.metaKey) {
        session.backspaceWord(Date.now())
      } else {
        session.backspace(Date.now())
      }
      afterKeystroke()
      return
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return
    // printable characters only; Enter (key === 'Enter') is ignored in time
    // mode, matching the reference behaviour
    if (e.key.length !== 1) return
    // swallow every printable key: without this, browser find-as-you-type
    // (e.g. ' in Firefox) and page scrolling for space steal the test
    e.preventDefault()
    session.type(e.key, Date.now())
    afterKeystroke()
  }

  function onTick(): void {
    if (view.value !== 'test' || !session.started) return
    const left = session.remainingMs(Date.now())
    remainingMs.value = left
    if (left <= 0) finishTest()
  }

  let clock: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
    clock = setInterval(onTick, CLOCK_MS)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown)
    if (clock !== undefined) clearInterval(clock)
  })

  return {
    version,
    view,
    focused,
    started,
    remainingMs,
    streak,
    difficulty,
    punctuation,
    numbers,
    capitalization,
    words,
    activeIndex,
    activeTypedLen,
    frozenStats,
    nextTest,
    repeatTest,
    selectDifficulty,
    setPunctuation,
    setNumbers,
    setCapitalization,
    focus,
  }
}
