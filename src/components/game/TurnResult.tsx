import { useGameStore } from '@stores/gameStore'
import { Card, StatRow, MoneyDisplay, Button } from '@components/common'
import { MarketIndicator } from './MarketIndicator'
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react'

/** 턴 결과 요약 카드 */
export function TurnResult() {
  const gameState = useGameStore((s) => s.gameState)
  const advanceTurn = useGameStore((s) => s.advanceTurn)
  const endCurrentRun = useGameStore((s) => s.endCurrentRun)

  if (!gameState) return null

  const { turn, revenue, expenses, money, market, isGameOver } = gameState
  const netIncome = revenue - expenses

  return (
    <Card header={`턴 ${turn} 결과`}>
      {/* 수익/지출 통계 */}
      <div className="space-y-2 mb-4">
        <StatRow
          label="기본 수익"
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
            label="순수익"
            value={<MoneyDisplay amount={netIncome} size="sm" showSign />}
          />
        </div>
        <StatRow
          label="잔고"
          value={<MoneyDisplay amount={money} size="sm" />}
          icon={Wallet}
        />
      </div>

      {/* 시장 상태 */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-400">시장 상태</span>
        <MarketIndicator condition={market.condition} />
      </div>

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
