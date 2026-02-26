import { useGameStore } from '@stores/gameStore'
import { GlossaryText } from '@components/glossary'
import { Badge } from '@components/common'
import { SECTORS, INFORMATION_SECTOR, calculateCurrentPrice } from '@game/index'
import type { Sector, SectorTrend, SectorProfile } from '@game/index'
import { AssetCard } from './AssetCard'

const TREND_BADGE: Record<SectorTrend, { variant: 'boom' | 'stable' | 'recession'; text: string }> = {
  hot: { variant: 'boom', text: '호황' },
  neutral: { variant: 'stable', text: '보통' },
  cold: { variant: 'recession', text: '침체' },
}

/** 섹터 표시 순서 (정보 최우선) */
const SECTOR_ORDER: Sector[] = ['information', 'food', 'tech', 'realEstate', 'logistics', 'energy', 'finance']

/** 구매 가능한 섹터 목록 — 섹터별 카드 표시 */
export function AssetMarket() {
  const gameState = useGameStore((s) => s.gameState)
  const money = gameState?.companies[0].cash ?? 0
  const submitAction = useGameStore((s) => s.submitAction)

  // 섹터 순서대로 정렬
  const orderedSectors = SECTOR_ORDER
    .map(id => SECTORS.find(s => s.id === id))
    .filter((s): s is SectorProfile => s != null)

  return (
    <div className="space-y-8">
      {orderedSectors.map((sector) => {
        const isInformation = sector.id === INFORMATION_SECTOR
        const trend = gameState?.sectorStates[sector.id]?.trend
        const currentPrice = gameState ? calculateCurrentPrice(sector.id, gameState) : sector.baseCost

        return (
          <section key={sector.id}>
            {/* 섹터 헤더 */}
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700 flex-wrap">
              <span className="text-xl">{sector.icon}</span>
              <h3 className="text-base font-bold text-slate-200"><GlossaryText>{sector.name}</GlossaryText></h3>
              {trend && <Badge variant={TREND_BADGE[trend].variant} label={TREND_BADGE[trend].text} />}
              <span className="text-xs text-slate-500 ml-auto">
                호황<span className="text-blue-400">×{sector.marketMultiplier.boom}</span>
                {' '}불황<span className={sector.marketMultiplier.recession < 0.5 ? 'text-red-400' : sector.marketMultiplier.recession >= 0.8 ? 'text-emerald-400' : 'text-orange-400'}>×{sector.marketMultiplier.recession}</span>
              </span>
              {isInformation && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-900/60 text-amber-300 border border-amber-700">
                  💡 <GlossaryText>조사에 필요!</GlossaryText>
                </span>
              )}
            </div>

            {/* 섹터 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AssetCard
                asset={sector}
                canAfford={money >= currentPrice}
                onBuy={() => submitAction({ type: 'buy', sector: sector.id })}
              />
            </div>
          </section>
        )
      })}
    </div>
  )
}
