import { test } from 'node:test'
import assert from 'node:assert/strict'
import { testRender } from '@opentui/solid'
import { RGBA } from '@opentui/core'
import type { TestRendererSetup } from '@opentui/core/testing'
import {
  Session,
  PASSAGE,
  COLORS,
  wrapLines,
  lineIndexAt,
} from '../src/screens/session'

const allSpans = (setup: TestRendererSetup) =>
  setup.captureSpans().lines.flatMap((line) => line.spans)

const hasSpan = (setup: TestRendererSetup, text: string, color: string) =>
  allSpans(setup).some(
    (s) => s.text === text && s.fg.equals(RGBA.fromHex(color)),
  )

const hasCaretOn = (setup: TestRendererSetup, ch: string) =>
  allSpans(setup).some(
    (s) => s.text === ch && s.bg.equals(RGBA.fromHex(COLORS.caretBg)),
  )

test('session renders passage, header, stats, and caret on first char', async () => {
  const setup = await testRender(() => <Session onBack={() => {}} />, {
    width: 200,
    height: 30,
  })
  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    assert.match(frame, /the quick brown fox/)
    assert.match(frame, /tab restart \| esc menu/)
    assert.match(frame, /type to begin/)
    assert.match(frame, /streak 0/)
    assert.match(frame, /wpm\s+--/)
    assert.match(frame, /time\s+--/)
    assert.ok(hasCaretOn(setup, PASSAGE.charAt(0)), 'caret not on first char')
    assert.ok(
      allSpans(setup).some(
        (s) =>
          s.fg.equals(RGBA.fromHex(COLORS.pending)) &&
          s.text.startsWith('he quick'),
      ),
      'pending text not dim',
    )
    assert.ok(
      !allSpans(setup).some((s) => s.bg.equals(RGBA.fromHex('#a6e3a1'))),
      'progress bar should be empty at 0%',
    )
  } finally {
    setup.renderer.destroy()
  }
})

test('correct keystrokes advance the caret and color chars correct', async () => {
  const setup = await testRender(() => <Session onBack={() => {}} />, {
    width: 200,
    height: 30,
  })
  try {
    await setup.renderOnce()
    await setup.mockInput.typeText('the')
    await setup.renderOnce()
    assert.ok(hasSpan(setup, 'the', COLORS.correct), 'typed chars not correct')
    assert.ok(hasCaretOn(setup, ' '), 'caret not on the space after "the"')
  } finally {
    setup.renderer.destroy()
  }
})

test('wrong keystroke marks the char and backspace restores it', async () => {
  const setup = await testRender(() => <Session onBack={() => {}} />, {
    width: 200,
    height: 30,
  })
  try {
    await setup.renderOnce()
    await setup.mockInput.typeText('x')
    await setup.renderOnce()
    assert.ok(hasSpan(setup, 'x', COLORS.wrong), 'wrong char not red')
    assert.ok(hasCaretOn(setup, 'h'), 'caret not after the wrong char')
    setup.mockInput.pressBackspace()
    await setup.renderOnce()
    assert.ok(hasCaretOn(setup, 't'), 'caret did not step back')
    assert.ok(
      !allSpans(setup).some((s) => s.text === 'x'),
      'erased char still rendered',
    )
    await setup.mockInput.typeText('t')
    await setup.renderOnce()
    assert.ok(hasSpan(setup, 't', COLORS.correct), 'retype not correct')
  } finally {
    setup.renderer.destroy()
  }
})

test('space completes a clean word and increments the streak', async () => {
  const setup = await testRender(() => <Session onBack={() => {}} />, {
    width: 200,
    height: 30,
  })
  try {
    await setup.renderOnce()
    await setup.mockInput.typeText('the ')
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    assert.match(frame, /perfect: the/)
    assert.match(frame, /streak 1/)
    assert.ok(hasCaretOn(setup, 'q'), 'caret not on the next word')
  } finally {
    setup.renderer.destroy()
  }
})

test('errors inside a word reset the streak', async () => {
  const setup = await testRender(() => <Session onBack={() => {}} />, {
    width: 200,
    height: 30,
  })
  try {
    await setup.renderOnce()
    await setup.mockInput.typeText('teh')
    setup.mockInput.pressBackspace()
    setup.mockInput.pressBackspace()
    setup.mockInput.pressBackspace()
    await setup.mockInput.typeText('the ')
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    assert.match(frame, /miss: the/)
    assert.match(frame, /streak 0/)
  } finally {
    setup.renderer.destroy()
  }
})

test('tab restarts the session', async () => {
  const setup = await testRender(() => <Session onBack={() => {}} />, {
    width: 200,
    height: 30,
  })
  try {
    await setup.renderOnce()
    await setup.mockInput.typeText('the ')
    setup.mockInput.pressTab()
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    assert.match(frame, /type to begin/)
    assert.match(frame, /streak 0/)
    assert.doesNotMatch(frame, /perfect:/)
    assert.ok(hasCaretOn(setup, PASSAGE.charAt(0)), 'caret not reset to start')
  } finally {
    setup.renderer.destroy()
  }
})

test('escape returns to the menu', async () => {
  let back = false
  const setup = await testRender(
    () => <Session onBack={() => (back = true)} />,
    {
      width: 200,
      height: 30,
    },
  )
  try {
    await setup.renderOnce()
    setup.mockInput.pressEscape()
    await new Promise((r) => setTimeout(r, 50))
    await setup.flush()
    assert.ok(back, 'escape did not trigger onBack')
  } finally {
    setup.renderer.destroy()
  }
})

test('accuracy and progress track keystrokes', async () => {
  const setup = await testRender(() => <Session onBack={() => {}} />, {
    width: 200,
    height: 30,
  })
  try {
    await setup.renderOnce()
    await setup.mockInput.typeText('the quick')
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    assert.match(frame, /acc\s+100%/)
    const pct = Math.floor((9 / PASSAGE.length) * 100)
    assert.match(frame, new RegExp(`progress\\s+${pct}%`))
    assert.ok(
      allSpans(setup).some((s) => s.bg.equals(RGBA.fromHex('#a6e3a1'))),
      'progress bar fill not visible',
    )
  } finally {
    setup.renderer.destroy()
  }
})

test('completing the passage shows the done state', async () => {
  const setup = await testRender(() => <Session onBack={() => {}} />, {
    width: 200,
    height: 30,
  })
  try {
    await setup.renderOnce()
    await setup.mockInput.typeText(PASSAGE)
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    assert.match(frame, /session complete - tab to restart/)
    assert.match(frame, /progress\s+100%/)
    const words = PASSAGE.split(' ').length
    assert.match(frame, new RegExp(`streak ${words}`))
  } finally {
    setup.renderer.destroy()
  }
})

test('wrap lines preserves the passage and respects the width', () => {
  const lines = wrapLines(PASSAGE, 60)
  assert.ok(lines.every((line) => line.length <= 60))
  assert.equal(lines.join(' '), PASSAGE)
})

test('line index tracks the caret across wrapped lines', () => {
  assert.equal(lineIndexAt(0), 0)
  assert.equal(lineIndexAt(59), 0)
  assert.equal(lineIndexAt(60), 0, 'separator space belongs to the upper line')
  assert.equal(lineIndexAt(61), 1)
  assert.equal(
    lineIndexAt(PASSAGE.length),
    2,
    'end of passage is the last line',
  )
})
