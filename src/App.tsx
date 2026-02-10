import { useUIStore } from '@stores/uiStore'
import { Modal } from '@components/common'
import { MainMenuScreen, GameScreen, RunResultScreen, MetaShopScreen } from '@screens/index'

function App() {
  const currentScreen = useUIStore((s) => s.currentScreen)

  return (
    <>
      {currentScreen === 'mainMenu' && <MainMenuScreen />}
      {currentScreen === 'game' && <GameScreen />}
      {currentScreen === 'runResult' && <RunResultScreen />}
      {currentScreen === 'metaShop' && <MetaShopScreen />}
      <Modal />
    </>
  )
}

export default App
