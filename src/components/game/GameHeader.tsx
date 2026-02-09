import { useGameStore } from '@stores/gameStore'
import { MoneyDisplay, ProgressBar } from '@components/common'
import { MarketIndicator } from './MarketIndicator'

/** 게임 상단 헤더: 턴, 자금, 평판, 시장 상태 표시 */
export function GameHeader() {
  const gameState = useGameStore((s) => s.gameState)

  if (!gameState) return null

  const { turn, maxTurns, money, reputation, market } = gameState

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-700 p-3">
      {/* 모바일: 2행 그리드 / 데스크톱: 1행 flex */}
      <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:justify-between">
        {/* 턴 표시 */}
        <span className="text-sm font-medium text-slate-300">
          턴 {turn}/{maxTurns}
        </span>

        {/* 자금 표시 */}
        <div className="text-right md:text-left">
          <MoneyDisplay amount={money} />
        </div>

        {/* 평판 게이지 */}
        <div className="min-w-[120px]">
          <ProgressBar value={reputation} max={100} showLabel />
        </div>

        {/* 시장 상태 */}
        <div className="flex justify-end md:justify-start">
          <MarketIndicator condition={market.condition} />
        </div>
      </div>
    </header>
  )
}
