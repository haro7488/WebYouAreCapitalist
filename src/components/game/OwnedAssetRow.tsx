import type { OwnedAsset, Asset, MarketCondition } from '@game/index'
import { Button, MoneyDisplay } from '@components/common'
import { formatMoney, ASSET_UPGRADE_COST_RATIO, ASSET_UPGRADE_INCOME_MULTIPLIER } from '@game/index'

// 시장 상태별 방향 표시
const MARKET_ARROW: Record<MarketCondition, string> = {
  boom: '\u2191',
  stable: '\u2192',
  recession: '\u2193',
}

interface OwnedAssetRowProps {
  owned: OwnedAsset
  asset: Asset
  index: number
  marketCondition: MarketCondition
  hasAP: boolean
  onSell: (index: number) => void
  onUpgrade: (index: number) => void
}

/** 보유 자산 항목 1행 */
export function OwnedAssetRow({
  owned,
  asset,
  index,
  marketCondition,
  hasAP,
  onSell,
  onUpgrade,
}: OwnedAssetRowProps) {
  const maxLevel = asset.maxUpgradeLevel ?? 3
  const isMaxLevel = owned.upgradeLevel >= maxLevel
  const upgradeCost = isMaxLevel
    ? 0
    : Math.floor(asset.cost * ASSET_UPGRADE_COST_RATIO * (owned.upgradeLevel + 1))
  const incomeBonus = Math.round((ASSET_UPGRADE_INCOME_MULTIPLIER - 1) * 100)

  return (
    <div className="flex items-center justify-between p-3 border-b border-slate-700">
      {/* 좌측: 이름 + 레벨 + 소득 정보 */}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-slate-200">
          {asset.name}
          <span className="text-xs text-slate-400 ml-1.5">
            Lv.{owned.upgradeLevel}/{maxLevel}
          </span>
        </span>
        <span className="text-xs text-slate-500">
          매입 턴{owned.purchaseTurn} | 소득 {formatMoney(asset.baseIncome)}/턴
        </span>
      </div>

      {/* 중앙: 현재 가치 + 시장 방향 */}
      <div className="flex items-center gap-2">
        <MoneyDisplay amount={owned.currentValue} size="sm" />
        <span className="text-sm text-slate-400">{MARKET_ARROW[marketCondition]}</span>
      </div>

      {/* 우측: 업그레이드 정보 + 버튼 */}
      <div className="flex items-center gap-2">
        {isMaxLevel ? (
          <span className="text-xs text-amber-400 font-medium">최대</span>
        ) : (
          <div className="flex flex-col items-end text-xs text-slate-400">
            <span>{formatMoney(upgradeCost)} · 소득 +{incomeBonus}%</span>
          </div>
        )}
        {!isMaxLevel && (
          <Button variant="secondary" size="sm" disabled={!hasAP} onClick={() => onUpgrade(index)}>
            강화
          </Button>
        )}
        <Button variant="danger" size="sm" disabled={!hasAP} onClick={() => onSell(index)}>
          매각
        </Button>
      </div>
    </div>
  )
}
