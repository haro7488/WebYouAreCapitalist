import { useGameStore } from '@stores/gameStore'
import { ASSETS } from '@game/index'
import { AssetCard } from './AssetCard'

/** 구매 가능한 자산 목록 그리드 */
export function AssetMarket() {
  const money = useGameStore((s) => s.gameState?.companies[0].cash ?? 0)
  const submitAction = useGameStore((s) => s.submitAction)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ASSETS.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          canAfford={money >= asset.cost}
          onBuy={() => submitAction({ type: 'buy', assetId: asset.id })}
        />
      ))}
    </div>
  )
}
