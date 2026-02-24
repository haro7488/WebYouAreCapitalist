import { useState } from 'react'
import { useGameStore } from '@stores/gameStore'
import { useUIStore } from '@stores/uiStore'
import { MarketIndicator } from './MarketIndicator'
import { Home, HelpCircle, Target, CheckCircle } from 'lucide-react'
import { TRAIT_REGISTRY, type Trait } from '@game/traits'
import { calculateCompanyNetWorth, calculateCompanyTotalIncome } from '@game/economy'
import { checkPlayerGoalCompletion } from '@game/logic/goalEngine'
import { formatMoney } from '@game/utils'

interface GameHeaderProps {
  onHome?: () => void
}

// 샘플: 테스트용 활성 특성 (이후 gameState에서 가져올 예정)
// 실제 traits는 gameState에서 가져옴

function TraitIcon({ trait }: { trait: Trait }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const borderColor = trait.type === 'positive' ? 'border-emerald-500' : 'border-red-500'
  const bgColor = trait.type === 'positive' ? 'bg-emerald-500/10' : 'bg-red-500/10'

  return (
    <div className="relative">
      <button
        onClick={() => setShowTooltip((v) => !v)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`w-8 h-8 flex items-center justify-center rounded border-2 ${borderColor} ${bgColor} text-sm cursor-pointer hover:scale-110 transition-transform`}
        title={trait.name}
      >
        {trait.icon}
      </button>
      {showTooltip && (
        <div className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 w-48 bg-slate-900 border border-slate-600 rounded-lg shadow-xl px-3 py-2 pointer-events-none">
          <p className={`text-xs font-bold ${trait.type === 'positive' ? 'text-emerald-400' : 'text-red-400'}`}>
            {trait.name}
          </p>
          <p className="text-[11px] text-slate-300 mt-0.5">{trait.description}</p>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0">
            <div className="w-2 h-2 bg-slate-900 border-l border-t border-slate-600 rotate-45 translate-y-1" />
          </div>
        </div>
      )}
    </div>
  )
}

function TraitBar({ traits }: { traits: Trait[] }) {
  const positive = traits.filter((t) => t.type === 'positive')
  const negative = traits.filter((t) => t.type === 'negative')

  if (traits.length === 0) {
    return <div className="text-xs text-slate-600 italic">특성 없음</div>
  }

  return (
    <div className="flex items-center gap-1">
      {/* 좋은 특성 (왼쪽) */}
      {positive.map((t) => <TraitIcon key={t.id} trait={t} />)}
      {/* 구분선 (둘 다 있을 때) */}
      {positive.length > 0 && negative.length > 0 && (
        <div className="w-px h-6 bg-slate-600 mx-1" />
      )}
      {/* 나쁜 특성 (오른쪽) */}
      {negative.map((t) => <TraitIcon key={t.id} trait={t} />)}
    </div>
  )
}

export function GameHeader({ onHome }: GameHeaderProps) {
  const gameState = useGameStore((s) => s.gameState)
  const openHelp = useUIStore((s) => s.openHelp)

  if (!gameState) return null

  const player = gameState.companies[0]
  const { turn, maxTurns, market } = gameState
  const { influence, cash } = player
  const netWorth = calculateCompanyNetWorth(player)
  const expectedIncome = calculateCompanyTotalIncome(player, gameState)

  // TODO: gameState에서 traits 가져오기 (현재 샘플)
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

        {/* 중앙: 핵심 지표 */}
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
          <span className="text-yellow-400" title="순자산">
            💰 {formatMoney(netWorth)}
          </span>
          <span className={`${expectedIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}`} title="예상 수익">
            📈 {expectedIncome >= 0 ? '+' : ''}{formatMoney(Math.floor(expectedIncome))}/턴
          </span>
        </div>

        <span className="text-sm font-bold text-slate-200">
          턴 {turn}/{maxTurns}
        </span>
      </div>

      {/* Row 2: 특성 | 목표 | 경기 */}
      <div className="flex items-center justify-between px-3 pb-2">
        {/* 특성 */}
        <div className="flex-1">
          <TraitBar traits={activeTraits} />
        </div>

        {/* 목표 */}
        {gameState.selectedGoal && (
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded border border-slate-600">
            {goalCompleted ? (
              <CheckCircle size={14} className="text-emerald-400" />
            ) : (
              <Target size={14} className="text-amber-400" />
            )}
            <span className={`text-xs font-medium ${goalCompleted ? 'text-emerald-400' : 'text-slate-300'}`}>
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
    </header>
  )
}
