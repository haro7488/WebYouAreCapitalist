import type { Asset } from '@game/index'
import { Button, Card, Badge, MoneyDisplay } from '@components/common'
import { GlossaryText } from '@components/glossary'
import { formatMoney } from '@game/index'

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

// 섹터 한국어 매핑
const SECTOR_LABEL: Record<string, string> = {
  food: '외식',
  tech: '기술',
  realEstate: '부동산',
  logistics: '물류',
  energy: '에너지',
  information: '정보',
  finance: '금융',
}

interface AssetCardProps {
  asset: Asset
  canAfford: boolean
  onBuy: () => void
}

/** 개별 자산 카드 */
export function AssetCard({ asset, canAfford, onBuy }: AssetCardProps) {
  const { name, description, cost, riskLevel, baseIncome, sector, tier, marketMultiplier } = asset
  const disabled = !canAfford

  return (
    <Card header={name}>
      {/* 섹터 + 티어 + 리스크 배지 */}
      <div className="flex justify-between -mt-1 mb-1">
        <div className="flex gap-1">
          <Badge variant="info" label={SECTOR_LABEL[sector]} />
          <Badge variant="info" label={`Tier ${tier}`} />
        </div>
        <Badge variant={RISK_VARIANT[riskLevel]} label={RISK_LABEL[riskLevel]} />
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
        <span className="text-xs text-slate-500">매입가</span>
        <MoneyDisplay amount={cost} size="sm" />
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500">기본 소득</span>
        <span className="text-sm font-medium text-money-400">
          {formatMoney(baseIncome)}/턴
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
