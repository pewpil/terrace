import { useKeyboard } from '@opentui/solid'

export const GameStub = (props: { onBack: () => void }) => {
  useKeyboard((key) => {
    if (key.name === 'escape' || key.name === 'q') {
      props.onBack()
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
      <text content="Game coming soon" fg="#f9e2af" />
      <text content="esc to return to menu" fg="#565f89" />
    </box>
  )
}
