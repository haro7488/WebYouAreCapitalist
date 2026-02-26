import { useGameStore } from '@stores/gameStore'
import { findSector, calculateDominance, formatMoney, getAssetIncomeBreakdown, getSellPriceBreakdown } from '@game/index'
import { SECTOR_MAX_UPGRADE_LEVEL } from '@game/index'
import type { Sector, SectorTrend, DominanceLevel, MoneyBreakdown } from '@game/index'
import { Card, MoneyDisplay, Badge, Button } from '@components/common'
import { GlossaryText } from '@components/glossary'

// 섹터 한국어 라벨
const SECTOR_LABEL: Record<Sector, string> = {
  food: '외식',
  tech: '기술',
  realEstate: '부동산',
  logistics: '물류',
  energy: '에너지',
  information: '정보',
  finance: '금융',
  rnd: '연구개발',
}

// 섹터 트렌드 → Badge 매핑
const TREND_LABEL: Record<SectorTrend, { variant: 'boom' | 'stable' | 'recession'; text: string }> = {
  hot: { variant: 'boom', text: '과열' },
  neutral: { variant: 'stable', text: '보통' },
  cold: { variant: 'recession', text: '침체' },
}

// 트렌드 방향 표시
const TREND_ARROW: Record<SectorTrend, { symbol: string; color: string }> = {
  hot: { symbol: '↑', color: 'text-red-400' },
  neutral: { symbol: '→', color: 'text-slate-400' },
  cold: { symbol: '↓', color: 'text-blue-400' },
}

// 지배력 표시
const DOMINANCE_LABEL: Record<DominanceLevel, { text: string; color: string }> = {
  entrant: { text: '진입', color: 'text-slate-500' },
  competitor: { text: '경쟁자', color: 'text-amber-400' },
  dominant: { text: '지배', color: 'text-money-400' },
}

/** 섹터 그룹 합산 소득 breakdown 생성 */
function getSectorIncomeBreakdown(
  items: { owned: Parameters<typeof getAssetIncomeBreakdown>[0]; index: number }[],
  gameState: Parameters<typeof getAssetIncomeBreakdown>[1],
  player: Parameters<typeof getAssetIncomeBreakdown>[2],
): MoneyBreakdown {
  const breakdowns = items.map(({ owned }) => getAssetIncomeBreakdown(owned, gameState, player))
  const total = breakdowns.reduce((sum, b) => sum + b.final, 0)

  // 섹터 자산 가치 합산 히스토리 (우측 정렬)
  const histories = items.map(({ owned }) => owned.valueHistory ?? [])
  const maxLen = Math.max(...histories.map(h => h.length), 0)
  const combinedHistory: number[] = []
  for (let i = 0; i < maxLen; i++) {
    let sum = 0
    for (const hist of histories) {
      const offset = maxLen - hist.length
      if (i >= offset) sum += hist[i - offset]
    }
    combinedHistory.push(sum)
  }

  return {
    title: `섹터 소득 합계 (${items.length}구좌)`,
    items: breakdowns.map((b, i) => ({
      label: `구좌 ${i + 1} (턴${items[i].owned.purchaseTurn})`,
      value: b.final,
      type: 'add' as const,
    })),
    final: total,
    history: combinedHistory.length > 0 ? combinedHistory : undefined,
    maxValue: combinedHistory.length > 0 ? Math.max(...combinedHistory, total) * 1.2 : undefined,
  }
}

interface PortfolioProps {
  onResearchNavigate?: (sector: Sector) => void
}

/** 보유 자산 포트폴리오 카드 (섹터별 그룹핑) */
export function Portfolio({ onResearchNavigate }: PortfolioProps) {
  const gameState = useGameStore((s) => s.gameState)
  const submitAction = useGameStore((s) => s.submitAction)

  if (!gameState) return null

  const player = gameState.companies[0]
  const { assets: ownedAssets } = player
  const { sectorStates } = gameState
  const dominanceMap = calculateDominance(ownedAssets)

  // 섹터별 그룹핑 (assetId가 곧 Sector)
  const bySector = new Map<Sector, { owned: typeof ownedAssets[number]; index: number }[]>()
  ownedAssets.forEach((owned, index) => {
    const sector = owned.assetId as Sector
    const list = bySector.get(sector) ?? []
    list.push({ owned, index })
    bySector.set(sector, list)
  })

  // 총 자산 가치 / 총 매입 비용
  const totalValue = ownedAssets.reduce((sum, a) => sum + a.currentValue, 0)
  const totalCost = ownedAssets.reduce((sum, a) => sum + a.purchasePrice, 0)
  const totalPnL = totalValue - totalCost

  return (
    <Card header={<>내 <GlossaryText>포트폴리오</GlossaryText> ({ownedAssets.length}구좌)</>}>
      {ownedAssets.length === 0 ? (
        <p className="text-slate-500 text-center py-8"><GlossaryText>보유 자산이 없습니다</GlossaryText></p>
      ) : (
        <>
          {/* 총 자산 요약 */}
          <div className="px-3 py-2 mb-3 bg-slate-800/50 rounded space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400"><GlossaryText>총 매입 비용</GlossaryText></span>
              <MoneyDisplay amount={totalCost} size="sm" getBreakdown={() => ({
                title: '총 매입 비용',
                items: ownedAssets.map((a) => ({
                  label: `${SECTOR_LABEL[a.assetId as Sector]} (턴${a.purchaseTurn})`,
                  value: a.purchasePrice,
                  type: 'add' as const,
                })),
                final: totalCost,
              })} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400"><GlossaryText>총 자산 가치</GlossaryText></span>
              <MoneyDisplay amount={totalValue} size="sm" getBreakdown={() => {
                // 자산 가치 히스토리 = 순자산 - 현금
                const nwHist = player.netWorthHistory ?? []
                const cashHist = player.cashHistory ?? []
                const assetHist = nwHist.map((nw, i) => Math.max(0, nw - (cashHist[i] ?? 0)))
                return {
                  title: '총 자산 가치',
                  items: ownedAssets.map((a) => ({
                    label: `${SECTOR_LABEL[a.assetId as Sector]}`,
                    value: a.currentValue,
                    type: 'add' as const,
                  })),
                  final: totalValue,
                  history: assetHist.length > 0 ? assetHist : undefined,
                  maxValue: assetHist.length > 0 ? Math.max(...assetHist, totalValue) * 1.2 : undefined,
                }
              }} />
            </div>
            <div className="flex items-center justify-between border-t border-slate-700 pt-1">
              <span className="text-xs text-slate-400"><GlossaryText>평가 손익</GlossaryText></span>
              <span className={`text-xs font-medium ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalPnL >= 0 ? '+' : ''}{formatMoney(totalPnL)}
              </span>
            </div>
          </div>

          {/* 섹터별 그룹 */}
          <div className="space-y-3">
            {Array.from(bySector.entries()).map(([sector, items]) => {
              const profile = findSector(sector)
              const sectorUpgradeLevel = player.sectorUpgrades?.[sector] ?? 0
              const maxLevel = SECTOR_MAX_UPGRADE_LEVEL
              const isMaxLevel = sectorUpgradeLevel >= maxLevel
              const trend = sectorStates[sector].trend

              // 섹터 그룹 합계 소득 breakdown
              const sectorIncomeBreakdown = getSectorIncomeBreakdown(items, gameState, player)

              return (
                <div key={sector} className="bg-slate-800/40 rounded-lg border border-slate-700/50 overflow-hidden">
                  {/* 섹터 그룹 헤더 */}
                  <div className="px-3 py-2 flex flex-wrap items-center gap-2 bg-slate-800/60">
                    <span className="text-sm font-semibold text-slate-200">
                      {profile?.icon} <GlossaryText>{SECTOR_LABEL[sector]}</GlossaryText>
                    </span>
                    <span className="text-xs text-slate-500">{items.length}구좌</span>
                    <Badge
                      variant={TREND_LABEL[trend].variant}
                      label={<GlossaryText>{TREND_LABEL[trend].text}</GlossaryText>}
                    />
                    {sectorUpgradeLevel > 0 && (
                      <span className="text-xs text-amber-400 font-medium">
                        <GlossaryText>{`Lv.${sectorUpgradeLevel}/${maxLevel}`}</GlossaryText>
                      </span>
                    )}
                    {dominanceMap[sector]?.level !== 'entrant' && (
                      <span className={`text-xs font-medium ${DOMINANCE_LABEL[dominanceMap[sector].level].color}`}>
                        <GlossaryText>{DOMINANCE_LABEL[dominanceMap[sector].level].text}</GlossaryText>
                      </span>
                    )}
                    {/* 우측: 소득 합계 + 강화 */}
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        소득{' '}
                        <MoneyDisplay amount={sectorIncomeBreakdown.final} size="sm" getBreakdown={() => sectorIncomeBreakdown} />
                        /턴
                      </span>
                      {isMaxLevel ? (
                        <span className="text-xs text-amber-400 font-medium">최대</span>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onResearchNavigate?.(sector)}
                        >
                          🔬 연구 Lv.{sectorUpgradeLevel}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 구좌 목록 */}
                  {items.map(({ owned, index }) => {
                    const incomeBreakdown = getAssetIncomeBreakdown(owned, gameState, player)
                    const sellBreakdown = getSellPriceBreakdown(owned, gameState, player)

                    return (
                      <div
                        key={`${sector}-${index}`}
                        className="flex flex-wrap items-center justify-between px-3 py-2 border-t border-slate-700/50"
                      >
                        {/* 좌측: 매입 정보 + 소득 */}
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-xs text-slate-500 truncate">
                            <GlossaryText>{`매입 ${formatMoney(owned.purchasePrice)}`}</GlossaryText>
                            {` (턴${owned.purchaseTurn})`}
                            {' · 소득 '}
                            <MoneyDisplay amount={incomeBreakdown.final} size="sm" getBreakdown={() => incomeBreakdown} />
                            /턴
                          </span>
                        </div>

                        {/* 우측: 현재 가치 (히스토리 차트) + 매각가 + 매각 버튼 */}
                        <div className="flex items-center gap-2">
                          <MoneyDisplay
                            amount={owned.currentValue}
                            size="sm"
                            getBreakdown={() => ({
                              title: '자산 가치 변동',
                              items: [
                                { label: '매입가', value: owned.purchasePrice, type: 'base' },
                                { label: '평가 손익', value: owned.currentValue - owned.purchasePrice, type: 'add' },
                              ],
                              final: owned.currentValue,
                              history: owned.valueHistory,
                              maxValue: Math.max(...(owned.valueHistory.length > 0 ? owned.valueHistory : [owned.currentValue])) * 1.2,
                            })}
                          />
                          <span className={`text-sm ${TREND_ARROW[trend].color}`}>{TREND_ARROW[trend].symbol}</span>
                          <Button variant="danger" size="sm" onClick={() => submitAction({ type: 'sell', ownedIndex: index })}>
                            <MoneyDisplay amount={sellBreakdown.final} size="sm" getBreakdown={() => sellBreakdown} />
                            {' '}매각
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </>
      )}
    </Card>
  )
}
