import { useGameStore } from '@stores/gameStore'
import { ASSETS } from '@game/index'
import { AssetCard } from './AssetCard'

/** 섹터 표시 정보 */
const SECTOR_META: Record<string, { label: string; icon: string }> = {
  information: { label: '정보', icon: '🔍' },
  food: { label: '외식', icon: '🍽️' },
  tech: { label: '기술', icon: '💻' },
  realEstate: { label: '부동산', icon: '🏢' },
  logistics: { label: '물류', icon: '🚚' },
  energy: { label: '에너지', icon: '⚡' },
  finance: { label: '금융', icon: '💹' },
}

/** 섹터 표시 순서 (정보 최우선) */
const SECTOR_ORDER = ['information', 'food', 'tech', 'realEstate', 'logistics', 'energy', 'finance']

/** 구매 가능한 자산 목록 — 섹터별 그룹 표시 */
export function AssetMarket() {
  const money = useGameStore((s) => s.gameState?.companies[0].cash ?? 0)
  const submitAction = useGameStore((s) => s.submitAction)

  // 섹터별 그룹핑
  const grouped = SECTOR_ORDER.reduce<Record<string, typeof ASSETS>>((acc, sector) => {
    const assets = ASSETS.filter((a) => a.sector === sector)
    if (assets.length > 0) acc[sector] = assets
    return acc
  }, {})

  // SECTOR_ORDER에 없는 섹터 후미에 추가
  ASSETS.forEach((a) => {
    if (!SECTOR_ORDER.includes(a.sector) && !grouped[a.sector]) {
      grouped[a.sector] = ASSETS.filter((x) => x.sector === a.sector)
    }
  })

  const sectors = [
    ...SECTOR_ORDER.filter((s) => grouped[s]),
    ...Object.keys(grouped).filter((s) => !SECTOR_ORDER.includes(s)),
  ]

  return (
    <div className="space-y-8">
      {sectors.map((sector) => {
        const meta = SECTOR_META[sector] ?? { label: sector, icon: '📦' }
        const isInformation = sector === 'information'
        const assets = grouped[sector]

        return (
          <section key={sector}>
            {/* 섹터 헤더 */}
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
              <span className="text-xl">{meta.icon}</span>
              <h3 className="text-base font-bold text-slate-200">{meta.label}</h3>
              {isInformation && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-900/60 text-amber-300 border border-amber-700">
                  💡 조사에 필요!
                </span>
              )}
            </div>

            {/* 자산 카드 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  canAfford={money >= asset.cost}
                  onBuy={() => submitAction({ type: 'buy', assetId: asset.id })}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
