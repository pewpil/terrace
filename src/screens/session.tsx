import { useKeyboard } from '@opentui/solid'

export const Session = (props: { onBack: () => void }) => {
  useKeyboard((key) => {
    if (key.name === 'escape' || key.name === 'q') {
      props.onBack()
    }
  })

  return (
    <box style={{ flexDirection: 'row', width: '100%', height: '100%' }}>
      <box style={{ flexDirection: 'column', flexGrow: 1, height: '100%' }}>
        <box style={{ flexGrow: 1, backgroundColor: '#16161e' }} />
        <box style={{ flexGrow: 1, backgroundColor: '#1a1b26' }} />
        <box style={{ flexGrow: 1, backgroundColor: '#16161e' }} />
      </box>
      <box
        style={{
          flexDirection: 'column',
          width: '25%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1b26',
        }}
      >
        <text fg="#565f89" content="esc to return to menu" />
      </box>
    </box>
  )
}
