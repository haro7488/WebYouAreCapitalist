import type { OwnedInvestment, Investment, MarketCondition } from '@game/index'
import { Button, MoneyDisplay } from '@components/common'

// 시장 상태별 방향 표시
const MARKET_ARROW: Record<MarketCondition, string> = {
  boom: '\u2191',
  stable: '\u2192',
  recession: '\u2193',
}

interface OwnedInvestmentRowProps {
  owned: OwnedInvestment
  investment: Investment
  index: number
  marketCondition: MarketCondition
  onSell: (index: number) => void
}

/** 보유 투자 항목 1행 */
export function OwnedInvestmentRow({
  owned,
  investment,
  index,
  marketCondition,
  onSell,
}: OwnedInvestmentRowProps) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-slate-700">
      {/* 좌측: 이름 + 구매 턴 */}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-slate-200">{investment.name}</span>
        <span className="text-xs text-slate-500">구매 턴: {owned.purchaseTurn}</span>
      </div>

      {/* 중앙: 투자 금액 + 시장 방향 */}
      <div className="flex items-center gap-2">
        <MoneyDisplay amount={owned.amount} size="sm" />
        <span className="text-sm text-slate-400">{MARKET_ARROW[marketCondition]}</span>
      </div>

      {/* 우측: 매각 버튼 */}
      <Button variant="danger" size="sm" onClick={() => onSell(index)}>
        매각
      </Button>
    </div>
  )
}
