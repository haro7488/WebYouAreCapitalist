import { useState } from 'react'
import { useGameStore } from '@stores/gameStore'
import { useUIStore } from '@stores/uiStore'
import { MarketIndicator } from './MarketIndicator'
import { Home, HelpCircle } from 'lucide-react'
import { TRAIT_REGISTRY, type Trait } from '@game/traits'

interface GameHeaderProps {
  onHome?: () => void
}

// 샘플: 테스트용 활성 특성 (이후 gameState에서 가져올 예정)
const SAMPLE_TRAITS = [
  TRAIT_REGISTRY.find((t) => t.id === 'sharp-eye')!,
  TRAIT_REGISTRY.find((t) => t.id === 'networker')!,
  TRAIT_REGISTRY.find((t) => t.id === 'reckless')!,
]

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
  const { ap: actionPoints, maxAp: maxActionPoints } = player

  // TODO: gameState에서 traits 가져오기 (현재 샘플)
  const activeTraits = SAMPLE_TRAITS

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-700">
      {/* Row 1: 홈+도움말 | | 턴 */}
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

        <span className="text-sm font-bold text-slate-200">
          턴 {turn}/{maxTurns}
        </span>
      </div>

      {/* Row 2: AP | 특성 | 경기 */}
      <div className="flex items-center justify-between px-3 pb-2">
        {/* AP */}
        <div className="flex items-center gap-1.5 min-w-[60px]">
          <span className="text-xs text-slate-400">AP</span>
          <div className="flex gap-0.5">
            {Array.from({ length: maxActionPoints }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-sm border ${
                  i < actionPoints
                    ? 'bg-amber-500 border-amber-400'
                    : 'bg-slate-700 border-slate-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 특성 (가운데) */}
        <div className="flex-1 flex justify-center">
          <TraitBar traits={activeTraits} />
        </div>

        {/* 경기 상태 */}
        <div className="min-w-[60px] flex justify-end">
          <MarketIndicator condition={market.condition} />
        </div>
      </div>
    </header>
  )
}
