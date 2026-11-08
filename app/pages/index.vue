<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
} from 'vue'
import { DEFAULT_DIFFICULTY, DIFFICULTIES } from '../utils/word-list'
import type { Difficulty } from '../utils/word-list'

const {
  version,
  view,
  focused,
  started,
  streak,
  words,
  activeIndex,
  activeTypedLen,
  remainingMs,
  frozenStats,
  difficulty,
  punctuation,
  numbers,
  capitalization,
  nextTest,
  repeatTest,
  selectDifficulty,
  setPunctuation,
  setNumbers,
  setCapitalization,
  focus,
} = useTypingSession()

/** The ladder on the slider; 'general' is a separate mode toggle. */
const ladderOptions: Difficulty[] = DIFFICULTIES.filter((d) => d !== 'general')

/** Last ladder tier. 'general' leaves it untouched so toggling back
 * restores the previous level. */
const ladderDifficulty = ref(
  difficulty.value === 'general' ? DEFAULT_DIFFICULTY : difficulty.value,
)

watch(difficulty, (next) => {
  if (next !== 'general') ladderDifficulty.value = next
})

const ladderIndex = computed(() =>
  ladderOptions.indexOf(ladderDifficulty.value),
)
const isGeneral = computed(() => difficulty.value === 'general')

/** Filled portion of the difficulty slider, as a CSS percentage. */
const difficultyFill = computed(() => {
  const max = ladderOptions.length - 1
  if (max <= 0) return '0%'
  const index = Math.max(0, ladderIndex.value)
  return `${(index / max) * 100}%`
})

/** The slider selects immediately; repeated same-value steps no-op. */
function onDifficultyInput(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement) || target.disabled) return
  const next = ladderOptions[Number(target.value)]
  if (next !== undefined) selectDifficulty(next)
}

/** 'general' overrides the ladder; the slider is disabled while it is on. */
function onToggleGeneral(event: MouseEvent): void {
  blurControl(event)
  selectDifficulty(isGeneral.value ? ladderDifficulty.value : 'general')
}

/** Modifier toggles are buttons - blur them so typing keys stay with the
 * session. */
function blurControl(event: MouseEvent): void {
  const target = event.currentTarget
  if (target instanceof HTMLElement) target.blur()
}

function onTogglePunctuation(event: MouseEvent): void {
  blurControl(event)
  setPunctuation(!punctuation.value)
}

function onToggleNumbers(event: MouseEvent): void {
  blurControl(event)
  setNumbers(!numbers.value)
}

function onToggleCapitalization(event: MouseEvent): void {
  blurControl(event)
  setCapitalization(!capitalization.value)
}

/** Topbar summary: time/mode plus the active word modifiers. */
const configLabel = computed(() => {
  const mods = [
    punctuation.value ? 'punctuation' : '',
    numbers.value ? 'numbers' : '',
    capitalization.value ? 'capitalization' : '',
  ].filter(Boolean)
  return `time 30 | english${mods.length > 0 ? ` | ${mods.join(' ')}` : ''}`
})

const viewportEl = useTemplateRef<HTMLElement>('viewportEl')
const wordsEl = useTemplateRef<HTMLElement>('wordsEl')
const caretEl = useTemplateRef<HTMLElement>('caretEl')

/** Caret blinks again after this much time without a keystroke. */
const IDLE_AFTER_MS = 700

const timerSeconds = computed(() => Math.ceil(remainingMs.value / 1000))

/** While typing the caret tweens; it snaps back into place on a fresh test. */
const caretGlide = computed(
  () => activeIndex.value !== 0 || activeTypedLen.value !== 0,
)

/**
 * Inline style of the absolutely positioned caret; its coordinates come from
 * DOM measurement (offset* ignores transforms, so the sliding translation of
 * the words container never skews the numbers).
 */
const caretStyle = ref<Record<string, string>>({
  left: '0px',
  top: '0px',
  height: '0px',
})
/** How far the words content is slid up: current line, next line visible. */
const wordsShift = ref(0)
/** Caret blinks again after a pause while typing. */
const caretIdle = ref(true)

let idleTimeout: ReturnType<typeof setTimeout> | undefined

function updateCaret(): void {
  const container = wordsEl.value
  const caret = caretEl.value
  if (!container || !caret) return
  const word = container.querySelector<HTMLElement>(
    `[data-word-index="${activeIndex.value}"]`,
  )
  if (!word) return
  const letters = word.querySelectorAll<HTMLElement>(':scope > .letter')
  const count = letters.length
  if (count === 0) return

  const typed = activeTypedLen.value
  const anchor = (typed < count ? letters[typed] : letters[count - 1]) ?? null
  if (!anchor) return

  // after the last letter the caret sits on the inter-word gap
  const left =
    typed < count ? anchor.offsetLeft : anchor.offsetLeft + anchor.offsetWidth
  const glyphHeight = anchor.offsetHeight
  const caretHeight = Math.round(glyphHeight * 1.2)
  const top = anchor.offsetTop - Math.round((caretHeight - glyphHeight) / 2)

  caretStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    height: `${caretHeight}px`,
  }
  const stride = word.offsetHeight
  wordsShift.value = Math.max(0, word.offsetTop - stride)

  caretIdle.value = false
  if (idleTimeout !== undefined) clearTimeout(idleTimeout)
  idleTimeout = setTimeout(() => {
    caretIdle.value = true
  }, IDLE_AFTER_MS)
}

function onResize(): void {
  updateCaret()
}

watch([version, activeIndex, view], () => updateCaret(), { flush: 'post' })

onMounted(() => {
  updateCaret()
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <main class="page">
    <header class="topbar">
      <span class="logo">terrace</span>
      <span class="config">{{ configLabel }}</span>
    </header>

    <div class="difficulty">
      <label class="difficulty-label" for="difficulty-slider">
        difficulty
      </label>
      <div class="difficulty-slider-wrap">
        <input
          id="difficulty-slider"
          class="difficulty-slider"
          type="range"
          min="0"
          :max="ladderOptions.length - 1"
          step="1"
          :value="ladderIndex"
          :style="{ '--fill': difficultyFill }"
          :disabled="isGeneral"
          :aria-valuetext="difficulty"
          @input="onDifficultyInput"
        />
        <div class="difficulty-ticks" aria-hidden="true">
          <span
            v-for="(d, i) in ladderOptions"
            :key="d"
            :class="{ reached: !isGeneral && i <= ladderIndex }"
          />
        </div>
      </div>
      <span class="difficulty-value">{{ difficulty }}</span>
      <button
        type="button"
        class="general-toggle"
        :class="{ active: isGeneral }"
        :aria-pressed="isGeneral"
        @click="onToggleGeneral"
      >
        general
      </button>
    </div>

    <nav class="mods" aria-label="word modifiers">
      <span class="mods-label" aria-hidden="true">with</span>
      <button
        type="button"
        class="mod-item"
        :class="{ active: punctuation }"
        :aria-pressed="punctuation"
        @click="onTogglePunctuation"
      >
        <ModifierIcon name="punctuation" />
        <span>punctuation</span>
      </button>
      <button
        type="button"
        class="mod-item"
        :class="{ active: numbers }"
        :aria-pressed="numbers"
        @click="onToggleNumbers"
      >
        <ModifierIcon name="numbers" />
        <span>numbers</span>
      </button>
      <button
        type="button"
        class="mod-item"
        :class="{ active: capitalization }"
        :aria-pressed="capitalization"
        @click="onToggleCapitalization"
      >
        <ModifierIcon name="capitalization" />
        <span>capitalization</span>
      </button>
    </nav>

    <section v-if="view === 'test'" class="test" @click="focus()">
      <div class="bar" aria-hidden="true">
        <span class="hints"
          >tab restart | esc unfocus | ctrl+backspace whole word</span
        >
        <span class="live">
          <span v-if="streak > 0" class="streak">streak {{ streak }}</span>
          <span class="timer" :class="{ ghost: !started }">
            {{ timerSeconds }}
          </span>
        </span>
      </div>

      <div ref="viewportEl" class="viewport">
        <div
          ref="wordsEl"
          class="words"
          :style="{ transform: `translateY(-${wordsShift}px)` }"
        >
          <span
            v-for="(letters, i) in words"
            :key="i"
            class="word"
            :data-word-index="i"
          >
            <span
              v-for="(letter, j) in letters"
              :key="j"
              class="letter"
              :class="letter.state"
              >{{ letter.char }}</span
            >
          </span>
          <span
            ref="caretEl"
            class="caret"
            :class="{ blink: caretIdle && focused, smooth: caretGlide }"
            :style="caretStyle"
          />
        </div>

        <div v-if="!focused" class="focus-note">
          click here or press any key to focus
        </div>
      </div>
    </section>

    <div v-else-if="frozenStats" class="result-wrap">
      <ResultScreen
        :stats="frozenStats"
        :config="{
          mode: 'time',
          time: 30,
          language: 'english',
          difficulty,
          punctuation,
          numbers,
          capitalization,
        }"
        @next="nextTest()"
        @repeat="repeatTest()"
      />
    </div>
  </main>
</template>

<style scoped>
.page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.topbar {
  width: min(72rem, 94vw);
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-block: 1.4rem;
}

.logo {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.25em;
  text-indent: 0.25em;
  color: var(--text);
}

.logo::after {
  content: '\258D'; /* caret block, terrace accent */
  margin-left: 0.1em;
  color: var(--accent);
  animation: logo-blink 1.1s steps(1) infinite;
}

.config {
  color: var(--dim);
  letter-spacing: 0.08em;
}

.difficulty {
  width: min(72rem, 94vw);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.1rem;
  padding-block: 0.35rem 0.5rem;
}

.difficulty-label {
  color: var(--dim);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  cursor: pointer;
}

.difficulty-slider-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  width: 15rem;
}

.difficulty-slider {
  --fill: 0%;
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 0.9rem;
  margin: 0;
  background: transparent;
  cursor: pointer;
}

.difficulty-slider:focus {
  outline: none;
}

.difficulty-slider::-webkit-slider-runnable-track {
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    var(--accent) 0 var(--fill),
    rgb(86 95 137 / 45%) var(--fill) 100%
  );
}

.difficulty-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 0.75rem;
  height: 0.75rem;
  margin-top: -0.28rem;
  border: 2px solid var(--bg);
  border-radius: 50%;
  background: var(--accent);
}

.difficulty-slider::-moz-range-track {
  height: 3px;
  border-radius: 2px;
  background: rgb(86 95 137 / 45%);
}

.difficulty-slider::-moz-range-progress {
  height: 3px;
  border-radius: 2px;
  background: var(--accent);
}

.difficulty-slider::-moz-range-thumb {
  width: 0.75rem;
  height: 0.75rem;
  border: 2px solid var(--bg);
  border-radius: 50%;
  background: var(--accent);
}

.difficulty-slider:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.difficulty-slider:disabled::-webkit-slider-runnable-track {
  background: rgb(86 95 137 / 45%);
}

.difficulty-slider:disabled::-webkit-slider-thumb {
  background: var(--dim);
}

.difficulty-slider:disabled::-moz-range-track {
  background: rgb(86 95 137 / 45%);
}

.difficulty-slider:disabled::-moz-range-progress {
  background: var(--dim);
}

.difficulty-slider:disabled::-moz-range-thumb {
  background: var(--dim);
}

.difficulty-slider:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px rgb(166 227 161 / 25%);
}

.difficulty-slider:focus-visible::-moz-range-thumb {
  box-shadow: 0 0 0 3px rgb(166 227 161 / 25%);
}

.difficulty-ticks {
  display: flex;
  justify-content: space-between;
  padding-inline: 0.375rem;
}

.difficulty-ticks span {
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: var(--dim);
  opacity: 0.45;
}

.difficulty-ticks span.reached {
  background: var(--accent);
  opacity: 0.8;
}

.difficulty-value {
  min-width: 6.5rem;
  color: var(--accent);
  font-size: 0.9rem;
  letter-spacing: 0.08em;
}

.general-toggle {
  font-family: inherit;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  color: var(--dim);
  background: none;
  border: 1px solid rgb(86 95 137 / 45%);
  border-radius: 2px;
  padding: 0.22rem 0.55rem;
  cursor: pointer;
}

.general-toggle:hover {
  color: var(--text);
  border-color: var(--dim);
}

.general-toggle.active {
  color: var(--accent);
  border-color: var(--accent);
}

.mods {
  width: min(72rem, 94vw);
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.3rem 1.5rem;
  padding-block: 0 0.55rem;
}

.mods-label {
  color: var(--dim);
  opacity: 0.7;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
}

.mod-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: inherit;
  font-size: 0.9rem;
  letter-spacing: 0.08em;
  color: var(--dim);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.mod-item:hover {
  color: var(--text);
}

.mod-item.active {
  color: var(--accent);
}

@media (max-width: 620px) {
  .difficulty {
    gap: 0.75rem;
  }

  .difficulty-slider-wrap {
    width: 10rem;
  }

  .difficulty-value {
    min-width: 0;
  }
}

@media (max-width: 420px) {
  .difficulty-slider-wrap {
    width: 7.5rem;
  }
}

.test {
  width: min(48rem, 92vw);
  flex: 1;
  padding-block: clamp(1.5rem, 14vh, 8rem) 0;
  cursor: default;
}

.bar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  min-height: 1.4rem;
  margin-bottom: 1.25rem;
}

.hints {
  color: var(--dim);
  font-size: 0.8rem;
  letter-spacing: 0.06em;
}

.live {
  display: inline-flex;
  align-items: baseline;
  gap: 1.25rem;
}

.streak {
  color: var(--accent);
  font-size: 0.9rem;
}

.timer {
  color: var(--text);
  font-size: 1.1rem;
}

.timer.ghost {
  visibility: hidden;
}

.viewport {
  position: relative;
  --fs: 1.35rem;
  --lh: 1.4;
  height: calc(var(--fs) * var(--lh) * 3);
  overflow: hidden;
}

.words {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  column-gap: 1ch;
  font-size: var(--fs);
  line-height: var(--lh);
  /* airy letter rhythm; offsets are JS-measured so spacing needs no caret math */
  letter-spacing: 0.08em;
  will-change: transform;
}

.letter {
  color: var(--dim);
}

.letter.correct {
  color: var(--text);
}

.letter.incorrect {
  color: var(--error);
}

.letter.extra {
  color: var(--error);
  opacity: 0.65;
}

.caret {
  position: absolute;
  width: 2px;
  border-radius: 1px;
  background: var(--caret);
  z-index: 1;
}

/* reference-feel smooth caret: 100ms tween while typing, snap on restart */
.caret.smooth {
  transition:
    left 0.1s cubic-bezier(0.45, 0, 0.55, 1),
    top 0.1s cubic-bezier(0.45, 0, 0.55, 1);
}

.caret.blink {
  animation: caret-blink 1.1s ease-in-out infinite;
}

.focus-note {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--dim);
  pointer-events: none;
}

.result-wrap {
  width: min(48rem, 92vw);
  flex: 1;
  display: flex;
  align-items: center;
  margin-block: 2rem;
}

/* reference-feel idle caret: a smooth fade that fully disappears at the ends */
@keyframes caret-blink {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

@keyframes logo-blink {
  50% {
    opacity: 0.2;
  }
}

@media (prefers-reduced-motion: reduce) {
  .logo::after,
  .caret.blink {
    animation: none;
  }
}
</style>
