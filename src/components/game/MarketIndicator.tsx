import { ALL_SECTORS } from '@game/index'
import type { MarketCondition, Sector, SectorTrend } from '@game/index'
import { GlossaryText } from '@components/glossary'
import { TrendingUp, Minus, TrendingDown } from 'lucide-react'
import { Badge } from '@components/common'
import { useGameStore } from '@stores/gameStore'
import { getCompanyTraitEffects } from '@game/logic/traitEngine'
import { previewNextTrends } from '@game/market'
import { SECTOR_NAMES } from '@/constants/sectors'
import { MARKET_LABELS } from '@/constants/market'
import { TREND_NEXT_LABEL, TREND_NEXT_COLOR } from '@/constants/trends'

// 시장 상태별 아이콘 매핑
const MARKET_ICON: Record<MarketCondition, typeof TrendingUp> = {
  boom: TrendingUp,
  stable: Minus,
  recession: TrendingDown,
}

interface MarketIndicatorProps {
  condition: MarketCondition
}

/** 현재 시장 상태를 아이콘 + 배지로 표시.
 *  trendForesight 특성 보유 시 다음 턴 섹터 트렌드 변화 힌트도 표시. */
export function MarketIndicator({ condition }: MarketIndicatorProps) {
  const Icon = MARKET_ICON[condition]
  const label = MARKET_LABELS[condition]
  const gameState = useGameStore((s) => s.gameState)

  // trendForesight 효과 확인
  let changingNextTurn: Array<{ sector: Sector; nextTrend: SectorTrend }> = []
  if (gameState) {
    const company = gameState.companies[0]
    const effects = getCompanyTraitEffects(company)
    if (effects.trendForesight > 0) {
      const nextTrends = previewNextTrends(gameState)
      // 현재 트렌드와 달라지는 섹터만 표시
      for (const sector of ALL_SECTORS) {
        const currentTrend = gameState.sectorStates[sector].trend
        const nextTrend = nextTrends[sector]
        if (nextTrend !== currentTrend) {
          changingNextTurn.push({ sector, nextTrend })
        }
      }
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <Icon size={16} />
        <Badge variant={condition} label={<GlossaryText>{label}</GlossaryText>} />
      </div>

      {/* trendForesight: 다음 턴 트렌드 변화 힌트 */}
      {changingNextTurn.length > 0 && (
        <div className="text-[10px] space-y-0.5 text-right">
          {changingNextTurn.map(({ sector, nextTrend }) => (
            <div key={sector} className="flex items-center justify-end gap-1">
              <span className="text-slate-500"><GlossaryText>{SECTOR_NAMES[sector]}</GlossaryText></span>
              <span className={TREND_NEXT_COLOR[nextTrend] ?? 'text-slate-400'}>
                {TREND_NEXT_LABEL[nextTrend] ?? nextTrend}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
