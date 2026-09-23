import { useKeyboard, useRenderer } from '@opentui/solid'
import { createSignal, For } from 'solid-js'
import type { Screen } from '../app'

export interface MenuItem {
  label: string
  hint: string
  action: 'start' | 'exit'
}

const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Start typing session',
    hint: 'not implemented yet',
    action: 'start',
  },
  { label: 'Exit', hint: 'close terrace', action: 'exit' },
]

export const Menu = (props: { onNavigate: (screen: Screen) => void }) => {
  const renderer = useRenderer()
  const [selected, setSelected] = createSignal(0)

  const activate = (item: MenuItem): void => {
    if (item.action === 'exit') {
      renderer.destroy()
    } else {
      props.onNavigate('game')
    }
  }

  useKeyboard((key) => {
    if (key.name === 'up') {
      setSelected((s) => (s - 1 + MENU_ITEMS.length) % MENU_ITEMS.length)
    } else if (key.name === 'down') {
      setSelected((s) => (s + 1) % MENU_ITEMS.length)
    } else if (key.name === 'return') {
      const item = MENU_ITEMS[selected()]
      if (item) activate(item)
    } else if (key.name === 'q' || key.name === 'escape') {
      renderer.destroy()
    }
  })

  return (
    <box
      style={{
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        backgroundColor: '#1a1b26',
      }}
    >
      <ascii_font font="block" text="TERRACE" />
      <box style={{ height: 2 }} />
      <For each={MENU_ITEMS}>
        {(item, i) => (
          <text
            fg={selected() === i() ? '#a6e3a1' : '#c0caf5'}
            content={`${selected() === i() ? '> ' : '  '}${item.label}`}
          />
        )}
      </For>
      <box style={{ height: 1 }} />
      <text fg="#565f89" content="up/down move | enter select | q quit" />
    </box>
  )
}
