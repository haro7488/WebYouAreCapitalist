import { useGameStore } from '@stores/gameStore'
import { Card, StatRow, MoneyDisplay, Button } from '@components/common'
import { GlossaryText } from '@components/glossary'
import { MarketIndicator } from './MarketIndicator'
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from 'lucide-react'
import { ASSETS, getCompanyRank, getRevenueBreakdown, getExpenseBreakdown, getNetWorthBreakdown } from '@game/index'

/** 턴 결과 요약 카드 */
export function TurnResult() {
  const gameState = useGameStore((s) => s.gameState)
  const advanceTurn = useGameStore((s) => s.advanceTurn)
  const endCurrentRun = useGameStore((s) => s.endCurrentRun)

  if (!gameState) return null

  const player = gameState.companies[0]
  const { turn, market, isGameOver } = gameState
  const { revenue, expenses, cash: money, influence, assets: ownedAssets } = player
  const netIncome = revenue - expenses
  const assetValue = ownedAssets.reduce((sum, a) => sum + a.currentValue, 0)
  const netWorth = money + assetValue

  // 순위 변동 계산
  const currentRank = getCompanyRank(gameState.companies, 0)
  const { rankingHistory } = gameState
  const prevRank = rankingHistory.length > 0
    ? rankingHistory[rankingHistory.length - 1][0]
    : currentRank
  const rankDiff = prevRank - currentRank

  return (
    <Card header={`턴 ${turn} 결과`}>
      {/* 수익/지출 통계 */}
      <div className="space-y-2 mb-4">
        <StatRow
          label="자산 수익"
          value={<MoneyDisplay amount={revenue} size="sm" showSign getBreakdown={() => getRevenueBreakdown(player, gameState)} />}
          icon={ArrowUpRight}
        />
        <StatRow
          label="지출"
          value={<MoneyDisplay amount={-expenses} size="sm" showSign getBreakdown={() => getExpenseBreakdown(player, gameState)} />}
          icon={ArrowDownRight}
        />
        <div className="border-t border-slate-700 pt-2">
          <StatRow
            label={<GlossaryText>순수익</GlossaryText>}
            value={<MoneyDisplay amount={netIncome} size="sm" showSign />}
          />
        </div>
        <StatRow
          label="잔고"
          value={<MoneyDisplay amount={money} size="sm" />}
          icon={Wallet}
        />
        <StatRow
          label={<GlossaryText>순자산</GlossaryText>}
          value={<MoneyDisplay amount={netWorth} size="sm" getBreakdown={() => getNetWorthBreakdown(player, gameState)} />}
          icon={TrendingUp}
        />
      </div>

      {/* 영향력 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">영향력</span>
        <span className="text-sm font-medium text-slate-200">{Math.floor(influence)}</span>
      </div>

      {/* 순위 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">순위</span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-slate-200">{currentRank}위 / {gameState.companies.length}</span>
          {rankDiff > 0 && <span className="text-money-400 text-xs">▲{rankDiff}</span>}
          {rankDiff < 0 && <span className="text-danger-400 text-xs">▼{Math.abs(rankDiff)}</span>}
          {rankDiff === 0 && <span className="text-slate-500 text-xs">─</span>}
        </div>
      </div>

      {/* 시장 상태 */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-400">시장 상태</span>
        <MarketIndicator condition={market.condition} />
      </div>

      {/* 경쟁사 주요 행동 */}
      {(() => {
        // 섹터 한국어 라벨 매핑
        const SECTOR_NAMES: Record<string, string> = {
          food: '식품',
          tech: '기술',
          realEstate: '부동산',
          logistics: '물류',
          finance: '금융',
          energy: '에너지',
          information: '정보',
        }

        const competitors = gameState.companies.slice(1)
        const assetMap = new Map(ASSETS.map((a) => [a.id, a]))

        // buy/sell/upgrade 액션을 모두 수집하고 아이콘·색상·메시지를 결정
        const actions = competitors.flatMap((c) =>
          c.actionsThisTurn
            .filter(
              (a): a is
                | { type: 'buy'; assetId: string }
                | { type: 'sell'; ownedIndex: number; assetId: string }
                | { type: 'upgrade'; ownedIndex: number; assetId: string } =>
                a.type === 'buy' || a.type === 'sell' || a.type === 'upgrade',
            )
            .map((a) => {
              const asset = assetMap.get(a.assetId)
              if (!asset) return null

              if (a.type === 'buy') {
                return {
                  icon: '📈',
                  colorClass: 'text-green-400',
                  msg: `${c.name}이(가) ${SECTOR_NAMES[asset.sector] ?? asset.sector} 섹터에 투자`,
                }
              } else if (a.type === 'sell') {
                return {
                  icon: '📉',
                  colorClass: 'text-red-400',
                  msg: `${c.name}이(가) ${asset.name}을(를) 매각`,
                }
              } else {
                // upgrade
                return {
                  icon: '⬆️',
                  colorClass: 'text-blue-400',
                  msg: `${c.name}이(가) ${asset.name}을(를) 강화`,
                }
              }
            })
            .filter(Boolean),
        ) as { icon: string; colorClass: string; msg: string }[]

        if (actions.length === 0) return null

        return (
          <div className="mb-4 space-y-1">
            {/* 경쟁사 동향 헤더에 건수 표시 */}
            <span className="text-xs font-medium text-slate-400">
              경쟁사 동향 ({actions.length}건)
            </span>
            {actions.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-xs bg-slate-700/50 rounded px-2 py-1"
              >
                <span>{item.icon}</span>
                <span className={item.colorClass}>
                  <GlossaryText>{item.msg}</GlossaryText>
                </span>
              </div>
            ))}
          </div>
        )
      })()}

      {/* 다음 턴 또는 결과 보기 */}
      <Button
        variant="primary"
        fullWidth
        onClick={isGameOver ? () => endCurrentRun() : advanceTurn}
      >
        {isGameOver ? '결과 보기' : '다음 턴'}
      </Button>
    </Card>
  )
}
