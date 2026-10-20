import { createSignal } from 'solid-js'
import { Menu } from './screens/menu'
import { Session } from './screens/session'

export type Screen = 'menu' | 'session'

export const App = () => {
  const [currentScreen, setCurrentScreen] = createSignal<Screen>('menu')

  const navigate = (to: Screen): void => {
    setCurrentScreen(to)
  }

  return (
    <>
      {currentScreen() === 'menu' ? (
        <Menu onNavigate={navigate} />
      ) : (
        <Session onBack={() => navigate('menu')} />
      )}
    </>
  )
}
