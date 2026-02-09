import type { Investment } from '@game/index'
import { Button, Card, Badge, MoneyDisplay } from '@components/common'

// 리스크 레벨 한국어 매핑
const RISK_LABEL: Record<string, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
}

interface InvestmentCardProps {
  investment: Investment
  canAfford: boolean
  onBuy: () => void
}

/** 개별 투자 상품 카드 */
export function InvestmentCard({ investment, canAfford, onBuy }: InvestmentCardProps) {
  const { name, description, cost, riskLevel, baseReturn, marketMultiplier } = investment

  return (
    <Card header={name}>
      {/* 리스크 배지 */}
      <div className="flex justify-end -mt-1 mb-2">
        <Badge variant={riskLevel} label={RISK_LABEL[riskLevel]} />
      </div>

      {/* 설명 */}
      <p className="text-sm text-slate-400 mb-3">{description}</p>

      {/* 비용 및 수익률 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">비용</span>
        <MoneyDisplay amount={cost} size="sm" />
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500">기본 수익률</span>
        <span className="text-sm font-medium text-money-400">
          {(baseReturn * 100).toFixed(0)}%
        </span>
      </div>

      {/* 시장 배율 */}
      <div className="flex gap-2 text-xs text-slate-500 mb-4">
        <span>호황 x{marketMultiplier.boom}</span>
        <span>보합 x{marketMultiplier.stable}</span>
        <span>불황 x{marketMultiplier.recession}</span>
      </div>

      {/* 구매 버튼 */}
      <Button
        variant="primary"
        size="sm"
        fullWidth
        disabled={!canAfford}
        onClick={onBuy}
      >
        {canAfford ? '투자하기' : '자금 부족'}
      </Button>
    </Card>
  )
}
