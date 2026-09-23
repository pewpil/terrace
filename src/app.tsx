import { createSignal } from 'solid-js'
import { Menu } from './screens/menu'
import { GameStub } from './screens/game-stub'

export type Screen = 'menu' | 'game'

export const App = () => {
  const [currentScreen, setCurrentScreen] = createSignal<Screen>('menu')

  // Placeholder navigation: menu items will plug in here as screens are built
  const navigate = (to: Screen): void => {
    setCurrentScreen(to)
  }

  return (
    <>
      {currentScreen() === 'menu' ? (
        <Menu onNavigate={navigate} />
      ) : (
        <GameStub onBack={() => navigate('menu')} />
      )}
    </>
  )
}
