import { Button, Card, StatRow, MoneyDisplay, Badge } from '@components/common'
import { RankingChart } from '@components/game/RankingChart'
import { HistoryChart } from '@components/game/HistoryChart'
import { useGameStore } from '@stores/gameStore'
import { useUIStore } from '@stores/uiStore'
import { findSector } from '@game/index'
import type { Sector } from '@game/index'

// 섹터 한국어 이름 매핑
const SECTOR_LABELS: Record<Sector, string> = {
  food: '식품',
  tech: '기술',
  realEstate: '부동산',
  logistics: '물류',
  energy: '에너지',
  information: '정보',
  finance: '금융',
  rnd: '연구개발',
}

// 런 결과 화면
export function RunResultScreen() {
  const lastRunResult = useGameStore((s) => s.lastRunResult)
  const startRun = useGameStore((s) => s.startRun)
  const navigateTo = useUIStore((s) => s.navigateTo)

  // 결과가 없으면 렌더링하지 않음
  if (!lastRunResult) return null

  const {
    finalMoney,
    netWorth,
    totalTurns,
    score,
    metaCurrencyEarned,
    ownedAssets,
    dominatedSectors,
    rankings,
    rankingHistory,
    companyNames,
    companyNetWorthHistories,
    companyRevenueHistories,
  } = lastRunResult

  // 보유 자산을 섹터별로 그룹핑 (assetId가 곧 Sector)
  const assetsBySector = ownedAssets.reduce<Record<string, { name: string; currentValue: number; count: number }[]>>(
    (acc, owned) => {
      const sector = owned.assetId
      const profile = findSector(sector)
      if (!profile) return acc
      // 같은 섹터는 합산
      if (!acc[sector]) acc[sector] = []
      const existing = acc[sector].find(e => e.name === profile.name)
      if (existing) {
        existing.currentValue += owned.currentValue
        existing.count++
      } else {
        acc[sector].push({ name: profile.name, currentValue: owned.currentValue, count: 1 })
      }
      return acc
    },
    {},
  )

  const handleRestart = () => {
    startRun()
    navigateTo('game')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-lg w-full px-4 flex flex-col gap-6">
        {/* 타이틀: 모바일에서 축소 */}
        <h1 className="text-2xl sm:text-3xl font-bold text-center">게임 종료!</h1>

        {/* 최종 결과 카드 */}
        <Card header="최종 결과">
          <StatRow label="최종 자금" value={<MoneyDisplay amount={finalMoney} />} />
          <StatRow label="순자산" value={<MoneyDisplay amount={netWorth} />} />
          <StatRow label="진행 턴" value={`${totalTurns}턴`} />
          <StatRow label="최종 점수" value={score.toLocaleString()} />
          <StatRow label="획득 화폐" value={`🪙 ${metaCurrencyEarned}`} />

          {/* 지배 섹터 배지 */}
          {dominatedSectors.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {dominatedSectors.map((sector) => (
                <Badge key={sector} variant="boom" label={SECTOR_LABELS[sector]} />
              ))}
            </div>
          )}
        </Card>

        {/* 최종 순위 카드 */}
        <Card header="최종 순위">
          <div className="space-y-1">
            {rankings.map((entry, idx) => {
              const rank = idx + 1
              const isPlayer = entry.isPlayer
              return (
                <div
                  key={entry.name}
                  className={`flex items-center gap-2 py-2 px-2 rounded ${
                    isPlayer ? 'bg-money-400/10 ring-1 ring-money-400/30' : ''
                  }`}
                >
                  <span className="text-slate-500 text-sm w-5 text-right shrink-0">{rank}.</span>
                  <span className="w-5 text-center shrink-0">{isPlayer ? '⭐' : '🏢'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className={`text-sm truncate ${isPlayer ? 'text-money-300 font-semibold' : 'text-slate-200'}`}>
                        {entry.name}
                      </span>
                      {entry.dominatedSectors.length > 0 && (
                        <span className="text-xs shrink-0">
                          {entry.dominatedSectors.map((s) => SECTOR_LABELS[s]).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <MoneyDisplay amount={entry.netWorth} size="sm" />
                </div>
              )
            })}
          </div>
        </Card>

        {/* 순위 변동 차트 카드 */}
        {rankingHistory && rankingHistory.length >= 1 && companyNames && (
          <Card header="순위 변동">
            <RankingChart
              rankingHistory={rankingHistory}
              companyNames={companyNames}
              playerIndex={0}
            />
          </Card>
        )}

        {/* 순자산 변동 차트 카드 */}
        {companyNetWorthHistories && companyNetWorthHistories[0]?.length >= 1 && companyNames && (
          <Card header="순자산 변동">
            <HistoryChart
              histories={companyNetWorthHistories}
              companyNames={companyNames}
              playerIndex={0}
            />
          </Card>
        )}

        {/* 수익 변동 차트 카드 */}
        {companyRevenueHistories && companyRevenueHistories[0]?.length >= 1 && companyNames && (
          <Card header="수익 변동">
            <HistoryChart
              histories={companyRevenueHistories}
              companyNames={companyNames}
              playerIndex={0}
            />
          </Card>
        )}

        {/* 최종 포트폴리오 카드 */}
        {ownedAssets.length > 0 && (
          <Card header="최종 포트폴리오">
            {Object.entries(assetsBySector).map(([sector, assets]) => (
              <div key={sector} className="mb-3 last:mb-0">
                <div className="text-sm font-medium text-slate-400 mb-1">
                  {SECTOR_LABELS[sector as Sector]}
                </div>
                {assets.map((asset) => (
                  <StatRow
                    key={asset.name}
                    label={`${asset.name}${asset.count > 1 ? ` ×${asset.count}` : ''}`}
                    value={<MoneyDisplay amount={asset.currentValue} />}
                  />
                ))}
              </div>
            ))}
          </Card>
        )}

        {/* 액션 버튼 */}
        <div className="flex flex-col gap-3">
          <Button variant="primary" fullWidth onClick={handleRestart}>
            다시 하기
          </Button>
          <Button variant="secondary" fullWidth onClick={() => navigateTo('mainMenu')}>
            메인으로
          </Button>
        </div>
      </div>
    </div>
  )
}
