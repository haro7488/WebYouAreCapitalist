import { useState, useRef, useCallback } from 'react'
import { useGameStore } from '@stores/gameStore'
import { useUIStore } from '@stores/uiStore'
import { MarketIndicator } from './MarketIndicator'
import { TraitBar } from './TraitDisplay'
import { Home, HelpCircle, Target, CheckCircle } from 'lucide-react'
import { TRAIT_REGISTRY, type Trait } from '@game/traits'
import { calculateCompanyNetWorth, calculateCompanyTotalIncome } from '@game/economy'
import { getNetWorthBreakdown, getRevenueBreakdown } from '@game/breakdown'
import { checkPlayerGoalCompletion } from '@game/logic/goalEngine'
import { formatMoney } from '@game/utils'
import type { MoneyBreakdown } from '@game/types'
import { MoneyDisplay, BreakdownPopover } from '@components/common'

interface GameHeaderProps {
  onHome?: () => void
}

/** 인플레이션 breakdown 생성 */
function getInflationBreakdown(gameState: NonNullable<ReturnType<typeof useGameStore.getState>['gameState']>): MoneyBreakdown {
  const items = [
    { label: '현재 인플레이션율', value: gameState.inflation, type: 'base' as const },
    { label: '누적 인플레이션 배율', value: gameState.cumulativeInflation, type: 'multiply' as const },
  ]
  return {
    title: '인플레이션',
    items,
    final: gameState.cumulativeInflation,
    history: gameState.inflationHistory,
    maxValue: Math.max(...(gameState.inflationHistory ?? []), gameState.cumulativeInflation) * 1.2,
  }
}

export function GameHeader({ onHome }: GameHeaderProps) {
  const gameState = useGameStore((s) => s.gameState)
  const openHelp = useUIStore((s) => s.openHelp)

  // 인플레이션 팝업 상태
  const [inflationBreakdown, setInflationBreakdown] = useState<MoneyBreakdown | null>(null)
  const inflationRef = useRef<HTMLSpanElement>(null)

  const handleInflationClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!gameState) return
    setInflationBreakdown(prev => prev ? null : getInflationBreakdown(gameState))
  }, [gameState])

  if (!gameState) return null

  const player = gameState.companies[0]
  const { turn, maxTurns, market } = gameState
  const { influence, cash } = player
  const netWorth = calculateCompanyNetWorth(player)
  const expectedIncome = calculateCompanyTotalIncome(player, gameState)

  const activeTraits = player.traits
    .map(id => TRAIT_REGISTRY.find(t => t.id === id))
    .filter((t): t is Trait => t != null)

  // 목표 달성 여부
  const goalCompleted = gameState.selectedGoal ? checkPlayerGoalCompletion(gameState) : false

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-700">
      {/* Row 1: 홈+도움말 | 영향력·자산·수익 | 턴 */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
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

        {/* 중앙: 핵심 지표 — 모바일에서 현금·영향력만 표시, sm 이상에서 순자산·예상수익 추가 노출 */}
        <div className="flex items-center gap-3 text-xs">
          {cash < 0 ? (
            <div className="flex items-center gap-1" title="부채 (이자 발생 중!)">
              <span className="text-red-400 font-bold">⚠️ 부채</span>
              <span className="text-red-400">{formatMoney(cash)}</span>
            </div>
          ) : (
            <span className="text-green-400" title="현금">
              💵 {formatMoney(cash)}
            </span>
          )}
          <span className="text-purple-400" title="영향력">
            ⭐ {influence}
          </span>
          {/* 순자산: 모바일에서 숨김 */}
          <span className="hidden sm:inline-flex items-center gap-0.5" title="순자산">
            💰 <MoneyDisplay amount={netWorth} size="sm" getBreakdown={() => getNetWorthBreakdown(player, gameState)} />
          </span>
          {/* 예상수익: 모바일에서 숨김 */}
          <span className="hidden sm:inline-flex items-center gap-0.5" title="예상 수익">
            📈 <MoneyDisplay amount={Math.floor(expectedIncome)} size="sm" showSign getBreakdown={() => getRevenueBreakdown(player, gameState)} />
            <span className={expectedIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}>/턴</span>
          </span>
          {/* 인플레이션: 모바일에서 숨김, 클릭 시 breakdown 팝업 */}
          <span
            ref={inflationRef}
            className={`hidden sm:inline-flex items-center gap-0.5 cursor-pointer border-b border-dashed border-current/30 ${gameState.cumulativeInflation > 1.2 ? 'text-red-400' : 'text-orange-400'}`}
            title={`누적 x${gameState.cumulativeInflation.toFixed(2)}`}
            onClick={handleInflationClick}
          >
            🏷️ {(gameState.inflation * 100).toFixed(1)}%
          </span>
        </div>

        <span className="text-sm font-bold text-slate-200">
          턴 {turn}/{maxTurns}
        </span>
      </div>

      {/* Row 2: 특성 | 목표 | 경기 */}
      <div className="flex items-center justify-between px-3 pb-2">
        {/* 특성 — 모바일 오버플로우 방지 */}
        <div className="flex-1 overflow-x-auto max-w-[120px] sm:max-w-none">
          <TraitBar traits={activeTraits} />
        </div>

        {/* 목표 — 모바일에서 텍스트·패딩 축소 */}
        {gameState.selectedGoal && (
          <div className="flex items-center gap-2 px-2 sm:px-3 py-0.5 sm:py-1 bg-slate-800/50 rounded border border-slate-600">
            {goalCompleted ? (
              <CheckCircle size={14} className="text-emerald-400" />
            ) : (
              <Target size={14} className="text-amber-400" />
            )}
            <span className={`text-xs sm:text-sm font-medium ${goalCompleted ? 'text-emerald-400' : 'text-slate-300'}`}>
              {gameState.selectedGoal.name}
            </span>
            {goalCompleted && (
              <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                달성!
              </span>
            )}
          </div>
        )}

        {/* 경기 상태 */}
        <div className="min-w-[60px] flex justify-end">
          <MarketIndicator condition={market.condition} />
        </div>
      </div>
      {/* 인플레이션 breakdown 팝업 */}
      {inflationBreakdown && (
        <BreakdownPopover
          breakdown={inflationBreakdown}
          anchorEl={inflationRef.current}
          onClose={() => setInflationBreakdown(null)}
          formatFinal={(v) => `x${v.toFixed(2)}`}
        />
      )}
    </header>
  )
}
