import type { MarketCondition, Sector } from '@game/index'
import { TrendingUp, Minus, TrendingDown } from 'lucide-react'
import { Badge } from '@components/common'
import { useGameStore } from '@stores/gameStore'
import { getCompanyTraitEffects } from '@game/logic/traitEngine'
import { previewNextTrends } from '@game/market'

// 시장 상태별 아이콘 및 라벨 매핑
const MARKET_CONFIG: Record<MarketCondition, { icon: typeof TrendingUp; label: string }> = {
  boom: { icon: TrendingUp, label: '호황' },
  stable: { icon: Minus, label: '보합' },
  recession: { icon: TrendingDown, label: '불황' },
}

const SECTOR_LABELS: Record<Sector, string> = {
  food: '외식',
  tech: '기술',
  realEstate: '부동산',
  logistics: '물류',
  energy: '에너지',
  finance: '금융',
  information: '정보',
}

const TREND_NEXT_LABEL: Record<string, string> = {
  hot: '📈 상승',
  neutral: '➡️ 보합',
  cold: '📉 하락',
}

const TREND_NEXT_COLOR: Record<string, string> = {
  hot: 'text-orange-400',
  neutral: 'text-slate-400',
  cold: 'text-blue-400',
}

interface MarketIndicatorProps {
  condition: MarketCondition
}

/** 현재 시장 상태를 아이콘 + 배지로 표시.
 *  trendForesight 특성 보유 시 다음 턴 섹터 트렌드 변화 힌트도 표시. */
export function MarketIndicator({ condition }: MarketIndicatorProps) {
  const { icon: Icon, label } = MARKET_CONFIG[condition]
  const gameState = useGameStore((s) => s.gameState)

  // trendForesight 효과 확인
  let changingNextTurn: Array<{ sector: Sector; nextTrend: string }> = []
  if (gameState) {
    const company = gameState.companies[0]
    const effects = getCompanyTraitEffects(company)
    if (effects.trendForesight > 0) {
      const nextTrends = previewNextTrends(gameState)
      // 현재 트렌드와 달라지는 섹터만 표시
      for (const sector of Object.keys(nextTrends) as Sector[]) {
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
        <Badge variant={condition} label={label} />
      </div>

      {/* trendForesight: 다음 턴 트렌드 변화 힌트 */}
      {changingNextTurn.length > 0 && (
        <div className="text-[10px] space-y-0.5 text-right">
          {changingNextTurn.map(({ sector, nextTrend }) => (
            <div key={sector} className="flex items-center justify-end gap-1">
              <span className="text-slate-500">{SECTOR_LABELS[sector]}</span>
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
