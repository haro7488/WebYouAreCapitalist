import { useGameStore } from '@stores/gameStore'
import { ASSETS } from '@game/index'
import type { Sector } from '@game/index'
import { Card, MoneyDisplay } from '@components/common'
import { OwnedAssetRow } from './OwnedAssetRow'

// 섹터 한국어 라벨
const SECTOR_LABEL: Record<Sector, string> = {
  food: '외식',
  tech: '기술',
  realEstate: '부동산',
  retail: '유통',
  finance: '금융',
}

/** 보유 자산 포트폴리오 카드 (섹터별 그룹핑) */
export function Portfolio() {
  const gameState = useGameStore((s) => s.gameState)
  const submitAction = useGameStore((s) => s.submitAction)

  if (!gameState) return null

  const player = gameState.companies[0]
  const { assets: ownedAssets } = player
  const { market } = gameState
  const hasAP = player.ap > 0

  // 자산 ID → 정의 매핑
  const assetMap = new Map(ASSETS.map((a) => [a.id, a]))

  // 섹터별 그룹핑
  const bySector = new Map<Sector, { owned: typeof ownedAssets[number]; index: number }[]>()
  ownedAssets.forEach((owned, index) => {
    const asset = assetMap.get(owned.assetId)
    if (!asset) return
    const list = bySector.get(asset.sector) ?? []
    list.push({ owned, index })
    bySector.set(asset.sector, list)
  })

  // 총 자산 가치
  const totalValue = ownedAssets.reduce((sum, a) => sum + a.currentValue, 0)

  return (
    <Card header={`내 포트폴리오 (${ownedAssets.length}개)`}>
      {ownedAssets.length === 0 ? (
        <p className="text-slate-500 text-center py-8">보유 자산이 없습니다</p>
      ) : (
        <>
          {/* 총 자산 가치 */}
          <div className="flex items-center justify-between px-3 py-2 mb-2 bg-slate-800/50 rounded">
            <span className="text-xs text-slate-400">총 자산 가치</span>
            <MoneyDisplay amount={totalValue} size="sm" />
          </div>

          {/* 섹터별 그룹 */}
          {Array.from(bySector.entries()).map(([sector, items]) => (
            <div key={sector} className="mb-2">
              <div className="px-3 py-1 text-xs font-medium text-slate-500 uppercase">
                {SECTOR_LABEL[sector]} ({items.length})
              </div>
              {items.map(({ owned, index }) => {
                const def = assetMap.get(owned.assetId)
                if (!def) return null
                return (
                  <OwnedAssetRow
                    key={`${owned.assetId}-${index}`}
                    owned={owned}
                    asset={def}
                    index={index}
                    marketCondition={market.condition}
                    hasAP={hasAP}
                    onSell={(idx) => submitAction({ type: 'sell', ownedIndex: idx })}
                    onUpgrade={(idx) => submitAction({ type: 'upgrade', ownedIndex: idx })}
                  />
                )
              })}
            </div>
          ))}
        </>
      )}
    </Card>
  )
}
