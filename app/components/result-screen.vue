<script setup lang="ts">
import { computed, onMounted, onUnmounted, useTemplateRef, watch } from 'vue'
import type { SessionStats } from '../utils/typing-session'

const props = defineProps<{
  stats: SessionStats
  config: {
    mode: string
    time: number
    language: string
    difficulty: string
  }
}>()

const emit = defineEmits<{ next: []; repeat: [] }>()

const wpmLabel = computed(() => `${props.stats.wpm.toFixed(2)} wpm`)
const wpmText = computed(() => props.stats.wpm.toFixed(2))

// accuracy balloon with the exact keystroke tallies, like the reference
const accLabel = computed(() => {
  const inserts = props.stats.keystrokes.inserts
  const correct = Math.max(0, inserts - props.stats.keystrokes.errors)
  return `${props.stats.acc.toFixed(2)}% / ${correct} correct / ${props.stats.keystrokes.errors} incorrect`
})
const accText = computed(() => props.stats.acc.toFixed(2))

const charactersText = computed(() => {
  const chars = props.stats.characters
  return `${chars.correct}/${chars.incorrect}/${chars.extra}`
})

const secondsText = computed(() => `${Math.round(props.stats.timeMs / 1000)}s`)

const typeText = computed(
  () =>
    `${props.config.mode} ${props.config.time} ${props.config.language} ${props.config.difficulty}`,
)

const canvasEl = useTemplateRef<HTMLCanvasElement>('chartEl')

/** Terrace palette hexes (canvas cannot read CSS custom properties). */
const COLORS = {
  wpm: '#a6e3a1',
  raw: '#565f89',
  error: '#f7768e',
  baseline: '#414868',
}

function drawChart(): void {
  const canvas = canvasEl.value
  if (!canvas || canvas.clientWidth === 0) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const { wpm, raw, errors } = props.stats.chart
  const buckets = Math.max(1, wpm.length)
  // one bucket of silence would crash the scale: everything is at 0 then
  const maxVal = Math.max(1, ...wpm, ...raw)
  const padTop = 16
  const baselineY = height - 18
  const usable = baselineY - padTop
  const stepX = width / buckets

  const x = (b: number) => (b + 0.5) * stepX
  const y = (v: number) => baselineY - (v / maxVal) * usable

  // baseline
  ctx.strokeStyle = COLORS.baseline
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, baselineY)
  ctx.lineTo(width, baselineY)
  ctx.stroke()

  // raw (dim line)
  drawSeries(ctx, raw, x, y, COLORS.raw)
  // wpm (accent line, drawn on top)
  drawSeries(ctx, wpm, x, y, COLORS.wpm)
  // error counts as small dots
  ctx.fillStyle = COLORS.error
  for (let b = 0; b < buckets; b++) {
    const n = errors[b]
    if (!n) continue
    ctx.beginPath()
    ctx.arc(x(b), y(n), 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawSeries(
  ctx: CanvasRenderingContext2D,
  series: number[],
  x: (b: number) => number,
  y: (v: number) => number,
  color: string,
): void {
  if (series.length === 0) return
  ctx.strokeStyle = color
  ctx.lineWidth = 1.8
  ctx.lineJoin = 'round'
  ctx.beginPath()
  for (let b = 0; b < series.length; b++) {
    const v = series[b]
    if (v === undefined) break
    const px = x(b)
    const py = y(v)
    if (b === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
}

onMounted(drawChart)
watch(() => props.stats, drawChart)

function onResize(): void {
  drawChart()
}

onMounted(() => {
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <section class="result">
    <div class="primary">
      <div class="stat">
        <span class="label">wpm</span>
        <span class="value big" :aria-label="wpmLabel">{{ wpmText }}</span>
      </div>
      <div class="stat">
        <span class="label">acc</span>
        <span class="value big" :aria-label="accLabel">{{ accText }}%</span>
      </div>
    </div>

    <canvas ref="chartEl" class="chart" aria-hidden="true" />

    <div class="secondary">
      <div class="stat">
        <span class="label">raw</span>
        <span class="value" :aria-label="`${stats.raw.toFixed(2)} raw wpm`">
          {{ stats.raw.toFixed(2) }}
        </span>
      </div>
      <div class="stat">
        <span class="label" aria-hidden="true">characters</span>
        <span
          class="value"
          :aria-label="`${stats.characters.correct} correct, ${stats.characters.incorrect} incorrect, ${stats.characters.extra} extra characters`"
          :title="`${stats.characters.correct} correct / ${stats.characters.incorrect} incorrect / ${stats.characters.extra} extra`"
        >
          {{ charactersText }}
        </span>
      </div>
      <div class="stat">
        <span class="label">consistency</span>
        <span class="value" :aria-label="`${stats.consistency}% consistency`">
          {{ stats.consistency }}%
        </span>
      </div>
      <div class="stat">
        <span class="label">streak</span>
        <span
          class="value"
          :aria-label="`${stats.streakMax} max perfect streak`"
        >
          {{ stats.streakMax }}
        </span>
      </div>
      <div class="stat">
        <span class="label">time</span>
        <span class="value">{{ secondsText }}</span>
      </div>
    </div>

    <p class="test-type">{{ typeText }}</p>

    <div class="actions">
      <button type="button" class="action" @click="emit('next')">
        next test
      </button>
      <button type="button" class="action quiet" @click="emit('repeat')">
        repeat
      </button>
    </div>
    <p class="hint" aria-hidden="true">tab - next test</p>
  </section>
</template>

<style scoped>
.result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2.25rem;
  width: 100%;
}

.primary {
  display: flex;
  gap: 3rem;
  justify-content: center;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.label {
  color: var(--dim);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
}

.value {
  color: var(--text);
}

.value.big {
  font-size: 2.25rem;
  line-height: 1.2;
}

.chart {
  width: min(46rem, 92vw);
  height: 11rem;
  border-radius: 4px;
}

.secondary {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem 2.75rem;
  justify-content: center;
}

.secondary .value {
  font-size: 1.1rem;
}

.test-type {
  margin: 0;
  color: var(--dim);
  letter-spacing: 0.08em;
}

.actions {
  display: flex;
  gap: 1rem;
}

.action {
  font-family: inherit;
  font-size: 1rem;
  letter-spacing: 0.08em;
  padding: 0.6rem 1.6rem;
  color: var(--bg);
  background: var(--accent);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.action:hover {
  box-shadow: 0 0 16px rgba(166, 227, 161, 0.35);
}

.action.quiet {
  color: var(--text);
  background: transparent;
  border: 1px solid var(--dim);
}

.action.quiet:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.hint {
  margin: 0;
  color: var(--dim);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
}
</style>
