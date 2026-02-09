import { useUIStore } from '@stores/uiStore'
import { MainMenu, GameScreen, RunResult, MetaShop } from '@screens/index'

/** 현재 화면에 따라 적절한 컴포넌트를 렌더링 */
function App() {
  const currentScreen = useUIStore((s) => s.currentScreen)

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {currentScreen === 'mainMenu' && <MainMenu />}
      {currentScreen === 'game' && <GameScreen />}
      {currentScreen === 'runResult' && <RunResult />}
      {currentScreen === 'metaShop' && <MetaShop />}
    </div>
  )
}

export default App
