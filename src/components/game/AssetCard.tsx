import type { SectorProfile } from '@game/index'
import { Button, Card, Badge, MoneyDisplay } from '@components/common'
import { GlossaryText } from '@components/glossary'
import { formatMoney, getPurchaseCostBreakdown, calculateCurrentPrice } from '@game/index'
import { useGameStore } from '@stores/gameStore'

// 리스크 레벨 한국어 매핑
const RISK_LABEL: Record<string, string> = {
  low: '안정',
  medium: '변동',
  high: '고위험',
}

const RISK_VARIANT: Record<string, 'low' | 'medium' | 'high'> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
}

// 리스크 레벨 설명
const RISK_DESC: Record<string, string> = {
  low: '안정적 수익, 시장 변동 영향 적음',
  medium: '적절한 수익, 보통 수준의 변동',
  high: '고수익 가능, 시장 변동 영향 큼',
}

// 소득 유형 한국어 표시
const INCOME_TYPE_LABEL: Record<string, string> = {
  stable: '고정 소득',
  marketLinked: '시장 연동',
  valueLinked: '가치 연동',
  inverse: '역시장',
  leveraged: '레버리지',
  special: '특수',
}

interface AssetCardProps {
  asset: SectorProfile
  canAfford: boolean
  onBuy: () => void
}

/** 섹터 투자 카드 */
export function AssetCard({ asset, canAfford, onBuy }: AssetCardProps) {
  const gameState = useGameStore((s) => s.gameState)
  const { name, description, baseCost, riskLevel, incomeType, baseIncome, yieldRate, icon, marketMultiplier } = asset
  const disabled = !canAfford

  // 현재 동적 가격
  const currentPrice = gameState ? calculateCurrentPrice(asset.id, gameState) : baseCost

  return (
    <Card header={<>{icon} {name}</>}>
      {/* 소득 유형 + 리스크 배지 */}
      <div className="flex justify-between -mt-1 mb-1">
        <div className="flex gap-1">
          <Badge variant="info" label={<GlossaryText>{INCOME_TYPE_LABEL[incomeType] ?? incomeType}</GlossaryText>} />
        </div>
        <Badge variant={RISK_VARIANT[riskLevel]} label={<GlossaryText>{RISK_LABEL[riskLevel]}</GlossaryText>} />
      </div>
      {/* 리스크 설명 + 시장 배율 요약 */}
      <p className="text-xs text-slate-500 mb-2">
        <GlossaryText>{RISK_DESC[riskLevel]}</GlossaryText>
        <span className="text-slate-600 ml-1">
          — 호황 ×{marketMultiplier.boom} / 불황 ×{marketMultiplier.recession}
        </span>
      </p>

      {/* 설명 */}
      <p className="text-sm text-slate-400 mb-3">
        <GlossaryText>{description}</GlossaryText>
      </p>

      {/* 비용 및 기본 소득 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">현재 매입가</span>
        <MoneyDisplay amount={currentPrice} size="sm" getBreakdown={gameState ? () => getPurchaseCostBreakdown(gameState, 0, asset.id) : undefined} />
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500">
          {yieldRate > 0 ? '수익률' : '기본 소득'}
        </span>
        <span className="text-sm font-medium text-money-400">
          {yieldRate > 0 ? `${(yieldRate * 100).toFixed(0)}%/턴` : `${formatMoney(baseIncome)}/턴`}
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
        disabled={disabled}
        onClick={onBuy}
      >
        {canAfford ? '매입하기' : '자금 부족'}
      </Button>
    </Card>
  )
}
