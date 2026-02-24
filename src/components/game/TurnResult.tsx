import { useGameStore } from '@stores/gameStore'
import { Card, StatRow, MoneyDisplay, Button } from '@components/common'
import { GlossaryText } from '@components/glossary'
import { MarketIndicator } from './MarketIndicator'
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from 'lucide-react'
import { ASSETS } from '@game/index'

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

  return (
    <Card header={`턴 ${turn} 결과`}>
      {/* 수익/지출 통계 */}
      <div className="space-y-2 mb-4">
        <StatRow
          label="자산 수익"
          value={<MoneyDisplay amount={revenue} size="sm" showSign />}
          icon={ArrowUpRight}
        />
        <StatRow
          label="지출"
          value={<MoneyDisplay amount={-expenses} size="sm" showSign />}
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
          value={<MoneyDisplay amount={netWorth} size="sm" />}
          icon={TrendingUp}
        />
      </div>

      {/* 영향력 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">영향력</span>
        <span className="text-sm font-medium text-slate-200">{Math.floor(influence)}</span>
      </div>

      {/* 시장 상태 */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-400">시장 상태</span>
        <MarketIndicator condition={market.condition} />
      </div>

      {/* 경쟁사 주요 행동 */}
      {(() => {
        const competitors = gameState.companies.slice(1)
        const assetMap = new Map(ASSETS.map((a) => [a.id, a]))
        const actions = competitors.flatMap((c) =>
          c.actionsThisTurn
            .filter((a): a is { type: 'buy'; assetId: string } => a.type === 'buy')
            .map((a) => {
              const asset = assetMap.get(a.assetId)
              const sectorLabels: Record<string, string> = {
                food: '식품', tech: '기술', realEstate: '부동산', logistics: '물류', finance: '금융',
  energy: '에너지',
  information: '정보',
              }
              return asset
                ? `${c.name}이(가) ${sectorLabels[asset.sector] ?? asset.sector} 섹터에 투자했습니다`
                : null
            })
            .filter(Boolean),
        )
        if (actions.length === 0) return null
        return (
          <div className="mb-4 space-y-1">
            <span className="text-xs font-medium text-slate-400">경쟁사 동향</span>
            {actions.map((msg, i) => (
              <div key={i} className="text-xs text-slate-300 bg-slate-700/50 rounded px-2 py-1">
                <GlossaryText>{msg as string}</GlossaryText>
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
