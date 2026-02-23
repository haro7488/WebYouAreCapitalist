import { useGameStore } from '@stores/gameStore'
import { useUIStore } from '@stores/uiStore'
import { MoneyDisplay, ProgressBar } from '@components/common'
import { MarketIndicator } from './MarketIndicator'
import { Home, HelpCircle } from 'lucide-react'

interface GameHeaderProps {
  onHome?: () => void
}

/** 게임 상단 헤더: 홈, 도움말, 턴, 자금, 영향력, AP, 시장 상태 표시 */
export function GameHeader({ onHome }: GameHeaderProps) {
  const gameState = useGameStore((s) => s.gameState)
  const openHelp = useUIStore((s) => s.openHelp)

  if (!gameState) return null

  const player = gameState.companies[0]
  const { turn, maxTurns, market } = gameState
  const { cash: money, influence, ap: actionPoints, maxAp: maxActionPoints } = player

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-700 p-3">
      <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:justify-between">
        {/* 홈 + 도움말 버튼 */}
        <div className="flex items-center gap-1">
          {onHome && (
            <button
              onClick={onHome}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              aria-label="메인 메뉴"
            >
              <Home size={18} />
            </button>
          )}
          <button
            onClick={() => openHelp()}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="도움말"
          >
            <HelpCircle size={18} />
          </button>
        </div>

        <span className="text-sm font-medium text-slate-300">
          턴 {turn}/{maxTurns}
        </span>

        <div className="text-right md:text-left">
          <MoneyDisplay amount={money} />
        </div>

        <div className="min-w-[120px]">
          <ProgressBar value={influence} max={100} showLabel />
        </div>

        <span className="text-sm text-slate-300">
          AP {actionPoints}/{maxActionPoints}
        </span>

        <div className="flex justify-end md:justify-start">
          <MarketIndicator condition={market.condition} />
        </div>
      </div>
    </header>
  )
}
