<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
} from 'vue'
import { DIFFICULTIES } from '../utils/word-list'
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
  nextTest,
  repeatTest,
  selectDifficulty,
  focus,
} = useTypingSession()

const difficultyOptions = DIFFICULTIES

/** Chips are buttons - blur them so typing keys stay with the session. */
function onSelectDifficulty(event: MouseEvent, d: Difficulty): void {
  const target = event.currentTarget
  if (target instanceof HTMLElement) target.blur()
  selectDifficulty(d)
}

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
      <span class="config">time 30 | english</span>
    </header>

    <nav class="diff" aria-label="word difficulty">
      <button
        v-for="d in difficultyOptions"
        :key="d"
        type="button"
        class="diff-item"
        :class="{ active: d === difficulty }"
        @click="onSelectDifficulty($event, d)"
      >
        {{ d }}
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
        :config="{ mode: 'time', time: 30, language: 'english', difficulty }"
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

.diff {
  width: min(72rem, 94vw);
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem 1.5rem;
  padding-block: 0.35rem 0.55rem;
}

.diff-item {
  font-family: inherit;
  font-size: 0.9rem;
  letter-spacing: 0.08em;
  color: var(--dim);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.diff-item:hover {
  color: var(--text);
}

.diff-item.active {
  color: var(--accent);
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
