import { test } from 'node:test'
import assert from 'node:assert/strict'
import { testRender } from '@opentui/solid'
import { App } from '../src/app'
import { MENU_ITEMS } from '../src/screens/menu'

// The block font draws TERRACE as box-drawing art; this is the leading edge
const TITLE_ART = '████████╗ ███████╗'
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

test('menu renders title, items, and footer', async () => {
  const setup = await testRender(() => <App />, { width: 200, height: 30 })
  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    assert.ok(frame.includes(TITLE_ART), 'missing block-font title art')
    for (const item of MENU_ITEMS) {
      assert.ok(frame.includes(item.label), `missing menu item: ${item.label}`)
    }
    assert.match(frame, /up\/down move \| enter select \| q quit/)
  } finally {
    setup.renderer.destroy()
  }
})

test('arrow down highlights Exit', async () => {
  const setup = await testRender(() => <App />, { width: 200, height: 30 })
  try {
    await setup.renderOnce()
    setup.mockInput.pressArrow('down')
    await setup.renderOnce()
    assert.match(setup.captureCharFrame(), /> Exit/)
  } finally {
    setup.renderer.destroy()
  }
})

test('up arrow wraps around to last item', async () => {
  const setup = await testRender(() => <App />, { width: 200, height: 30 })
  try {
    await setup.renderOnce()
    setup.mockInput.pressArrow('up')
    await setup.renderOnce()
    assert.match(setup.captureCharFrame(), /> Exit/)
  } finally {
    setup.renderer.destroy()
  }
})

test('enter on first item opens the session page', async () => {
  const setup = await testRender(() => <App />, { width: 200, height: 30 })
  try {
    await setup.renderOnce()
    setup.mockInput.pressEnter()
    await wait(50)
    await setup.flush()
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    assert.doesNotMatch(frame, /Start typing session/)
    assert.match(frame, /tab restart \| esc menu/)
  } finally {
    setup.renderer.destroy()
  }
})

test('escape in session page returns to menu', async () => {
  const setup = await testRender(() => <App />, { width: 200, height: 30 })
  try {
    await setup.renderOnce()
    setup.mockInput.pressEnter()
    await wait(50)
    await setup.flush()
    setup.mockInput.pressEscape()
    await wait(50)
    await setup.flush()
    await setup.renderOnce()
    assert.match(setup.captureCharFrame(), /Start typing session/)
  } finally {
    setup.renderer.destroy()
  }
})
