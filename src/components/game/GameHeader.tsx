import { useState, useRef, useCallback, useEffect } from 'react'
import { useGameStore } from '@stores/gameStore'
import { useUIStore } from '@stores/uiStore'
import { MarketIndicator } from './MarketIndicator'
import { TraitBar } from './TraitDisplay'
import { Home, HelpCircle, Target, CheckCircle } from 'lucide-react'
import { TRAIT_REGISTRY, type Trait } from '@game/traits'
import { calculateCompanyNetWorth, calculateCompanyTotalIncome, getInfluenceTier } from '@game/economy'
import { INFLUENCE_TIERS } from '@game/constants'
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
  const rateHistory = gameState.inflationRateHistory ?? []
  const currentRate = gameState.inflation
  const prevRate = rateHistory.length >= 2 ? rateHistory[rateHistory.length - 2] : currentRate
  const rateDelta = currentRate - prevRate

  const items: MoneyBreakdown['items'] = [
    { label: '현재 인플레이션율', value: currentRate, type: 'base' },
    { label: '누적 인플레이션 배율', value: gameState.cumulativeInflation, type: 'multiply' },
  ]

  if (rateDelta !== 0) {
    items.push({
      label: rateDelta > 0 ? '전턴 대비 상승' : '전턴 대비 하락',
      value: rateDelta,
      type: 'add',
    })
  }

  return {
    title: '인플레이션',
    items,
    final: gameState.cumulativeInflation,
    history: rateHistory,
    maxValue: Math.max(...rateHistory, currentRate) * 1.2,
    formatY: (v) => `${(v * 100).toFixed(1)}%`,
  }
}

export function GameHeader({ onHome }: GameHeaderProps) {
  const gameState = useGameStore((s) => s.gameState)
  const openHelp = useUIStore((s) => s.openHelp)

  // 인플레이션 팝업 상태
  const [inflationBreakdown, setInflationBreakdown] = useState<MoneyBreakdown | null>(null)
  const inflationRef = useRef<HTMLSpanElement>(null)

  // 목표 툴팁 상태
  const [showGoalTooltip, setShowGoalTooltip] = useState(false)
  const goalRef = useRef<HTMLDivElement>(null)

  // 영향력 툴팁 상태
  const [showInfluenceTooltip, setShowInfluenceTooltip] = useState(false)
  const influenceRef = useRef<HTMLDivElement>(null)

  // 목표·영향력 툴팁 바깥 클릭 닫기
  useEffect(() => {
    if (!showGoalTooltip && !showInfluenceTooltip) return
    function handleClick(e: MouseEvent) {
      if (showGoalTooltip && goalRef.current && !goalRef.current.contains(e.target as Node)) {
        setShowGoalTooltip(false)
      }
      if (showInfluenceTooltip && influenceRef.current && !influenceRef.current.contains(e.target as Node)) {
        setShowInfluenceTooltip(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showGoalTooltip, showInfluenceTooltip])

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
          {/* 영향력 — 클릭 시 티어 상세 툴팁 */}
          {(() => {
            const tier = getInfluenceTier(influence)
            const tierIdx = INFLUENCE_TIERS.findIndex(t => t.minInfluence === tier.minInfluence)
            const nextTier = tierIdx < INFLUENCE_TIERS.length - 1 ? INFLUENCE_TIERS[tierIdx + 1] : null
            return (
              <div ref={influenceRef} className="relative">
                <span
                  className="text-purple-400 cursor-pointer border-b border-dashed border-purple-400/30 inline-flex items-center gap-1"
                  onClick={() => setShowInfluenceTooltip(v => !v)}
                >
                  ⭐ {influence}
                  <span className="hidden sm:inline text-[10px] text-purple-300">{tier.title}</span>
                </span>
                {showInfluenceTooltip && (
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-56 rounded-lg border border-slate-600 bg-slate-800 shadow-xl p-3">
                    <div className="absolute left-1/2 top-[-6px] -translate-x-1/2 w-3 h-3 rotate-45 bg-slate-800 border-l border-t border-slate-600" />
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">영향력</div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-purple-300">{tier.title}</span>
                      <span className="text-sm text-slate-200">⭐ {influence}</span>
                    </div>
                    <div className="space-y-1 text-xs border-t border-slate-700 pt-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">매입 할인</span>
                        <span className={tier.purchaseDiscount > 0 ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                          {tier.purchaseDiscount > 0 ? `-${(tier.purchaseDiscount * 100).toFixed(0)}%` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">이벤트 보너스</span>
                        <span className={tier.eventBonus > 0 ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                          {tier.eventBonus > 0 ? `+${(tier.eventBonus * 100).toFixed(0)}%` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">무료 조사</span>
                        <span className={tier.freeResearch ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                          {tier.freeResearch ? '✓' : '-'}
                        </span>
                      </div>
                    </div>
                    {nextTier && (
                      <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-slate-700">
                        <span className="text-slate-500">다음: {nextTier.title}</span>
                        <span className="text-amber-400 font-medium">{nextTier.minInfluence - influence}↑</span>
                      </div>
                    )}
                    <div className="text-[10px] text-slate-600 mt-2 pt-2 border-t border-slate-700 space-y-0.5">
                      <div>매입 +3 · 1위 +2/턴</div>
                      <div>자연감소 -1/턴</div>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
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

        {/* 목표 — 클릭 시 상세 툴팁 */}
        {gameState.selectedGoal && (
          <div className="relative">
            <div
              ref={goalRef}
              className="flex items-center gap-2 px-2 sm:px-3 py-0.5 sm:py-1 bg-slate-800/50 rounded border border-slate-600 cursor-pointer hover:bg-slate-700/50 transition-colors"
              onClick={() => setShowGoalTooltip(v => !v)}
            >
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
            {showGoalTooltip && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-64 rounded-lg border border-slate-600 bg-slate-800 shadow-xl p-3">
                <div className="absolute left-1/2 top-[-6px] -translate-x-1/2 w-3 h-3 rotate-45 bg-slate-800 border-l border-t border-slate-600" />
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">목표</div>
                <div className={`text-sm font-semibold mb-1 ${goalCompleted ? 'text-emerald-400' : 'text-slate-200'}`}>
                  {gameState.selectedGoal.name}
                </div>
                <p className="text-xs text-slate-400 mb-2">{gameState.selectedGoal.description}</p>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-700">
                  <span className="text-slate-500">달성 보너스</span>
                  <span className="text-money-400 font-medium">{formatMoney(gameState.selectedGoal.bonus)}</span>
                </div>
                <div className="flex justify-between items-center text-xs mt-1">
                  <span className="text-slate-500">상태</span>
                  <span className={goalCompleted ? 'text-emerald-400 font-medium' : 'text-amber-400'}>
                    {goalCompleted ? '달성 완료!' : '진행 중'}
                  </span>
                </div>
              </div>
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
