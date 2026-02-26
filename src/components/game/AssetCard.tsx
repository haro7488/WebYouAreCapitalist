import type { SectorProfile, SectorTrend } from '@game/index'
import { Button, Card, Badge, MoneyDisplay } from '@components/common'
import { TREND_BADGE } from '@/constants/trends'
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
  /** 현재 섹터 트렌드 */
  trend?: SectorTrend
  /** 정보 섹터 여부 */
  isInformation?: boolean
}

/** 섹터 투자 카드 */
export function AssetCard({ asset, canAfford, onBuy, trend, isInformation }: AssetCardProps) {
  const gameState = useGameStore((s) => s.gameState)
  const { name, description, baseCost, riskLevel, incomeType, baseIncome, yieldRate, icon, marketMultiplier } = asset
  const disabled = !canAfford

  // 현재 동적 가격
  const currentPrice = gameState ? calculateCurrentPrice(asset.id, gameState) : baseCost

  return (
    <Card header={
      <div className="flex items-center gap-2 flex-wrap">
        <span>{icon} {name}</span>
        {trend && <Badge variant={TREND_BADGE[trend].variant} label={<GlossaryText>{TREND_BADGE[trend].text}</GlossaryText>} />}
        {isInformation && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-900/60 text-amber-300 border border-amber-700">
            💡 <GlossaryText>조사 필요</GlossaryText>
          </span>
        )}
      </div>
    }>
      {/* 소득 유형 + 리스크 배지 */}
      <div className="flex justify-between -mt-1 mb-1">
        <div className="flex gap-1">
          <Badge variant="info" label={<GlossaryText>{INCOME_TYPE_LABEL[incomeType] ?? incomeType}</GlossaryText>} />
        </div>
        <Badge variant={RISK_VARIANT[riskLevel]} label={<GlossaryText>{RISK_LABEL[riskLevel]}</GlossaryText>} />
      </div>

      {/* 설명 */}
      <p className="text-xs text-slate-400 mb-3 line-clamp-2">
        <GlossaryText>{description}</GlossaryText>
      </p>

      {/* 비용 및 기본 소득 */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-500"><GlossaryText>현재 매입가</GlossaryText></span>
        <MoneyDisplay amount={currentPrice} size="sm" getBreakdown={gameState ? () => getPurchaseCostBreakdown(gameState, 0, asset.id) : undefined} />
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500">
          <GlossaryText>{yieldRate > 0 ? '수익률' : '기본 소득'}</GlossaryText>
        </span>
        <span className="text-sm font-medium text-money-400">
          {yieldRate > 0 ? `${(yieldRate * 100).toFixed(0)}%/턴` : `${formatMoney(baseIncome)}/턴`}
        </span>
      </div>

      {/* 시장 배율 */}
      <div className="flex gap-2 text-xs text-slate-500 mb-3">
        <span><GlossaryText>호황</GlossaryText> ×{marketMultiplier.boom}</span>
        <span><GlossaryText>보합</GlossaryText> ×{marketMultiplier.stable}</span>
        <span><GlossaryText>불황</GlossaryText> ×{marketMultiplier.recession}</span>
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
