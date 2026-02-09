import type { OwnedAsset, Asset, MarketCondition } from '@game/index'
import { Button, MoneyDisplay } from '@components/common'
import { formatMoney } from '@game/index'

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
  return (
    <div className="flex items-center justify-between p-3 border-b border-slate-700">
      {/* 좌측: 이름 + 구매 턴 + 업그레이드 레벨 */}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-slate-200">
          {asset.name}
          {owned.upgradeLevel > 0 && (
            <span className="text-xs text-money-400 ml-1">Lv.{owned.upgradeLevel}</span>
          )}
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

      {/* 우측: 업그레이드 + 매각 버튼 */}
      <div className="flex gap-1">
        {owned.upgradeLevel < (asset.maxUpgradeLevel ?? 3) && (
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
