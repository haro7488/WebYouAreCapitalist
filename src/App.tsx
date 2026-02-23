import { useUIStore } from '@stores/uiStore'
import { Modal } from '@components/common'
import { GlossaryProvider } from '@components/glossary'
import { HelpModal } from '@components/game/HelpModal'
import { MainMenuScreen, GameScreen, RunResultScreen, MetaShopScreen } from '@screens/index'

function App() {
  const currentScreen = useUIStore((s) => s.currentScreen)
  const helpOpen = useUIStore((s) => s.helpOpen)
  const helpTermId = useUIStore((s) => s.helpTermId)
  const openHelp = useUIStore((s) => s.openHelp)
  const closeHelp = useUIStore((s) => s.closeHelp)

  return (
    <GlossaryProvider onOpenHelp={(termId) => openHelp(termId)}>
      {currentScreen === 'mainMenu' && <MainMenuScreen />}
      {currentScreen === 'game' && <GameScreen />}
      {currentScreen === 'runResult' && <RunResultScreen />}
      {currentScreen === 'metaShop' && <MetaShopScreen />}
      <Modal />
      {helpOpen && <HelpModal onClose={closeHelp} initialTermId={helpTermId ?? undefined} />}
    </GlossaryProvider>
  )
}

export default App
