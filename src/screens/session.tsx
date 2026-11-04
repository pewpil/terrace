import { useKeyboard } from '@opentui/solid'
import { createSignal, For, onCleanup } from 'solid-js'

// The passage is hardcoded until the markov/focus generator lands.
export const PASSAGE =
  'the quick brown fox jumps over the lazy dog while rain falls softly on the quiet path and the old stone bridge remembers every step taken through the long learning night.'

const LINE_WIDTH = 60
const WINDOW_LINES = 3

export const COLORS = {
  correct: '#c0caf5',
  pending: '#565f89',
  wrong: '#f7768e',
  caretFg: '#7aa2f7',
  caretBg: '#283457',
} as const

type CharState = 'correct' | 'wrong' | 'caret' | 'pending'

interface Segment {
  state: CharState
  text: string
}

interface WordSpan {
  start: number
  length: number
}

type Feedback =
  | { kind: 'perfect'; word: string }
  | { kind: 'miss'; word: string; typed?: string }

export const wrapLines = (passage: string, width: number): string[] => {
  const lines: string[] = []
  let current = ''
  for (const word of passage.split(' ')) {
    if (current.length === 0) {
      current = word
    } else if (current.length + 1 + word.length <= width) {
      current = `${current} ${word}`
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current.length > 0) lines.push(current)
  return lines
}

const WORDS = PASSAGE.split(' ')
const WORD_SPANS: WordSpan[] = []
{
  let acc = 0
  for (const word of WORDS) {
    WORD_SPANS.push({ start: acc, length: word.length + 1 })
    acc += word.length + 1
  }
  const last = WORD_SPANS[WORD_SPANS.length - 1]
  if (last) last.length -= 1 // the final word has no trailing space
}

const LINES = wrapLines(PASSAGE, LINE_WIDTH)
const LINE_STARTS: number[] = []
{
  let acc = 0
  for (const line of LINES) {
    LINE_STARTS.push(acc)
    acc += line.length + 1 // wrapping consumes the separator space
  }
}

// A word's span includes its trailing space, so typing the space both
// completes the word and moves the caret into the next word's span.
const wordAt = (position: number): number => {
  for (let i = WORD_SPANS.length - 1; i >= 0; i--) {
    const span = WORD_SPANS[i]
    if (span !== undefined && position >= span.start) return i
  }
  return 0
}

export const lineIndexAt = (position: number): number => {
  for (let i = LINE_STARTS.length - 1; i >= 0; i--) {
    const start = LINE_STARTS[i]
    if (start !== undefined && position >= start) return i
  }
  return 0
}

export const charState = (
  typed: readonly string[],
  index: number,
): CharState => {
  const ch = typed[index]
  if (ch !== undefined) return ch === PASSAGE[index] ? 'correct' : 'wrong'
  return index === typed.length ? 'caret' : 'pending'
}

const lineSegments = (
  line: string,
  start: number,
  typed: readonly string[],
): Segment[] => {
  const segments: Segment[] = []
  for (let i = 0; i < line.length; i++) {
    const state = charState(typed, start + i)
    // wrong positions show what was actually typed, not the target char
    const display =
      state === 'wrong' ? (typed[start + i] ?? line.charAt(i)) : line.charAt(i)
    const last = segments[segments.length - 1]
    if (last !== undefined && last.state === state) {
      last.text += display
    } else {
      segments.push({ state, text: display })
    }
  }
  return segments
}

const StatRow = (props: { label: string; value: string }) => (
  <box style={{ flexDirection: 'row', height: 1 }}>
    <box style={{ width: 10 }}>
      <text fg="#565f89" content={props.label} />
    </box>
    <text fg="#c0caf5" content={props.value} />
  </box>
)

export const Session = (props: { onBack: () => void }) => {
  const [typed, setTyped] = createSignal<string[]>([])
  const [keystrokes, setKeystrokes] = createSignal({ attempts: 0, errors: 0 })
  const [startTime, setStartTime] = createSignal<number | null>(null)
  const [endTime, setEndTime] = createSignal<number | null>(null)
  const [done, setDone] = createSignal(false)
  const [streak, setStreak] = createSignal(0)
  const [feedback, setFeedback] = createSignal<Feedback | null>(null)
  const [tick, setTick] = createSignal(0)

  // Per-word error/backspace tallies are only read when a word finalizes,
  // so plain arrays suffice; the totals above drive the live accuracy stat.
  let wordErrors: number[] = []
  let wordBackspaces: number[] = []
  let finalized: boolean[] = []

  const ticker = setInterval(() => setTick((t) => t + 1), 500)
  ticker.unref()
  onCleanup(() => clearInterval(ticker))

  const resetSession = () => {
    wordErrors = []
    wordBackspaces = []
    finalized = []
    setTyped([])
    setKeystrokes({ attempts: 0, errors: 0 })
    setStartTime(null)
    setEndTime(null)
    setDone(false)
    setStreak(0)
    setFeedback(null)
  }

  const finalizeWord = (index: number) => {
    if (finalized[index] === true) return
    finalized[index] = true
    const span = WORD_SPANS[index]
    const word = WORDS[index]
    if (span === undefined || word === undefined) return
    const errors = wordErrors[index] ?? 0
    const backspaces = wordBackspaces[index] ?? 0
    if (errors === 0 && backspaces === 0) {
      setStreak((s) => s + 1)
      setFeedback({ kind: 'perfect', word })
    } else {
      setStreak(0)
      const typedWord = typed()
        .slice(span.start, span.start + word.length)
        .join('')
      setFeedback(
        typedWord === word
          ? { kind: 'miss', word }
          : { kind: 'miss', word, typed: typedWord },
      )
    }
  }

  const handleChar = (ch: string) => {
    if (done()) return
    const position = typed().length
    if (position >= PASSAGE.length) return
    if (startTime() === null) setStartTime(Date.now())
    const wordIndex = wordAt(position)
    const wrong = ch !== PASSAGE.charAt(position)
    setKeystrokes((k) => ({
      attempts: k.attempts + 1,
      errors: k.errors + (wrong ? 1 : 0),
    }))
    if (wrong) wordErrors[wordIndex] = (wordErrors[wordIndex] ?? 0) + 1
    const next = [...typed(), ch]
    setTyped(next)
    if (ch === ' ') finalizeWord(wordIndex)
    if (next.length === PASSAGE.length) {
      finalizeWord(WORD_SPANS.length - 1)
      setEndTime(Date.now())
      setDone(true)
    }
  }

  const handleBackspace = () => {
    if (done()) return
    const current = typed()
    if (current.length === 0) return
    const erased = current.length - 1
    const wordIndex = wordAt(erased)
    wordBackspaces[wordIndex] = (wordBackspaces[wordIndex] ?? 0) + 1
    setTyped(current.slice(0, erased))
  }

  useKeyboard((key) => {
    if (key.name === 'escape') {
      props.onBack()
      return
    }
    if (key.name === 'tab' || key.sequence === '\t') {
      resetSession()
      return
    }
    if (key.name === 'backspace') {
      handleBackspace()
      return
    }
    const ch = key.sequence
    if (!key.ctrl && !key.meta && ch.length === 1 && ch >= ' ' && ch < '\x7f') {
      handleChar(ch)
    }
  })

  const windowLines = () => {
    const caretLine = lineIndexAt(typed().length)
    const maxStart = Math.max(0, LINES.length - WINDOW_LINES)
    const start = Math.min(Math.max(0, caretLine - 1), maxStart)
    const result: { text: string; start: number }[] = []
    for (let i = 0; i < WINDOW_LINES; i++) {
      const text = LINES[start + i]
      const lineStart = LINE_STARTS[start + i]
      if (text !== undefined && lineStart !== undefined) {
        result.push({ text, start: lineStart })
      } else {
        result.push({ text: '', start: -1 })
      }
    }
    return result
  }

  const progressPct = () => Math.floor((typed().length / PASSAGE.length) * 100)

  const stats = () => {
    tick()
    const start = startTime()
    const end = done() ? (endTime() ?? Date.now()) : Date.now()
    const elapsed = start === null ? null : Math.max(0, end - start)
    const correct = typed().reduce(
      (count, ch, i) => (ch === PASSAGE[i] ? count + 1 : count),
      0,
    )
    const wpm =
      elapsed === null || elapsed < 1000 || correct === 0
        ? null
        : Math.round(correct / 5 / (elapsed / 60000))
    const { attempts, errors } = keystrokes()
    const acc =
      attempts === 0 ? null : Math.round(((attempts - errors) / attempts) * 100)
    return {
      wpm: wpm === null ? '--' : String(wpm),
      acc: acc === null ? '--' : `${acc}%`,
      time:
        elapsed === null
          ? '--'
          : `${Math.floor(elapsed / 60000)}:${String(Math.floor(elapsed / 1000) % 60).padStart(2, '0')}`,
      progress: `${progressPct()}%`,
    }
  }

  const feedbackText = () => {
    if (done())
      return <text fg="#a6e3a1" content="session complete - tab to restart" />
    const fb = feedback()
    if (fb === null) return <text fg="#565f89" content="type to begin" />
    if (fb.kind === 'perfect')
      return <text fg="#a6e3a1" content={`perfect: ${fb.word}`} />
    return 'typed' in fb ? (
      <text fg="#f7768e" content={`${fb.typed} != ${fb.word}`} />
    ) : (
      <text fg="#f7768e" content={`miss: ${fb.word}`} />
    )
  }

  return (
    <box
      style={{
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1b26',
      }}
    >
      <box style={{ flexDirection: 'column', flexGrow: 1, height: '100%' }}>
        <box
          style={{
            height: '10%',
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#16161e',
            paddingLeft: 2,
            paddingRight: 2,
          }}
        >
          <box style={{ flexGrow: 1 }}>
            <text fg="#565f89" content="normal mode" />
          </box>
          <text fg="#565f89" content="tab restart | esc menu" />
        </box>
        <box
          style={{
            height: '65%',
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundColor: '#1a1b26',
            paddingLeft: 2,
          }}
        >
          <For each={windowLines()}>
            {(line) => (
              <box style={{ flexDirection: 'row', height: 1 }}>
                <For
                  each={
                    line.start >= 0
                      ? lineSegments(line.text, line.start, typed())
                      : []
                  }
                >
                  {(seg) =>
                    seg.state === 'caret' ? (
                      <text
                        fg={COLORS.caretFg}
                        bg={COLORS.caretBg}
                        content={seg.text}
                      />
                    ) : (
                      <text fg={COLORS[seg.state]} content={seg.text} />
                    )
                  }
                </For>
              </box>
            )}
          </For>
        </box>
        <box
          style={{
            height: '25%',
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#16161e',
            paddingLeft: 2,
          }}
        >
          {feedbackText()}
          <box style={{ width: 3 }} />
          <text
            fg={streak() > 0 ? '#a6e3a1' : '#565f89'}
            content={`streak ${streak()}`}
          />
        </box>
      </box>
      <box
        style={{
          flexDirection: 'column',
          width: '25%',
          height: '100%',
          backgroundColor: '#1a1b26',
          paddingTop: 1,
          paddingLeft: 3,
          paddingRight: 3,
        }}
      >
        <StatRow label="wpm" value={stats().wpm} />
        <StatRow label="acc" value={stats().acc} />
        <StatRow label="time" value={stats().time} />
        <StatRow label="progress" value={stats().progress} />
        <box
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
          }}
        >
          <box
            style={{
              width: 3,
              backgroundColor: '#16161e',
              justifyContent: 'flex-end',
            }}
          >
            <box
              style={{
                height: `${progressPct()}%`,
                backgroundColor: '#a6e3a1',
              }}
            />
          </box>
        </box>
      </box>
    </box>
  )
}
