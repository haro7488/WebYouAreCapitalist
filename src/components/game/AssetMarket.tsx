import { useGameStore } from '@stores/gameStore'
import { SECTORS, INFORMATION_SECTOR, calculateCurrentPrice } from '@game/index'
import type { Sector, SectorProfile } from '@game/index'
import { AssetCard } from './AssetCard'

/** 섹터 표시 순서 (정보 최우선) */
const SECTOR_ORDER: Sector[] = ['information', 'food', 'tech', 'realEstate', 'logistics', 'energy', 'finance', 'rnd']

/** 구매 가능한 섹터 목록 — 반응형 그리드 */
export function AssetMarket() {
  const gameState = useGameStore((s) => s.gameState)
  const money = gameState?.companies[0].cash ?? 0
  const submitAction = useGameStore((s) => s.submitAction)

  // 섹터 순서대로 정렬
  const orderedSectors = SECTOR_ORDER
    .map(id => SECTORS.find(s => s.id === id))
    .filter((s): s is SectorProfile => s != null)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
      {orderedSectors.map((sector) => {
        const isInformation = sector.id === INFORMATION_SECTOR
        const trend = gameState?.sectorStates[sector.id]?.trend
        const currentPrice = gameState ? calculateCurrentPrice(sector.id, gameState) : sector.baseCost

        return (
          <AssetCard
            key={sector.id}
            asset={sector}
            canAfford={money >= currentPrice}
            onBuy={() => submitAction({ type: 'buy', sector: sector.id })}
            trend={trend}
            isInformation={isInformation}
          />
        )
      })}
    </div>
  )
}
