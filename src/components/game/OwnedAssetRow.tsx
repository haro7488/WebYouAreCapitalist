import type { OwnedAsset, Asset, SectorTrend } from '@game/index'
import { Button, MoneyDisplay } from '@components/common'
import { GlossaryText } from '@components/glossary'
import { formatMoney, ASSET_UPGRADE_COST_RATIO, ASSET_UPGRADE_INCOME_MULTIPLIER, getAssetIncomeBreakdown } from '@game/index'
import { useGameStore } from '@stores/gameStore'

// 섹터 트렌드별 방향 표시
const TREND_ARROW: Record<SectorTrend, { symbol: string; color: string }> = {
  hot: { symbol: '↑', color: 'text-red-400' },
  neutral: { symbol: '→', color: 'text-slate-400' },
  cold: { symbol: '↓', color: 'text-blue-400' },
}

interface OwnedAssetRowProps {
  owned: OwnedAsset
  asset: Asset
  index: number
  sectorTrend: SectorTrend
  onSell: (index: number) => void
  onUpgrade: (index: number) => void
}

/** 보유 자산 항목 1행 */
export function OwnedAssetRow({
  owned,
  asset,
  index,
  sectorTrend,
  onSell,
  onUpgrade,
}: OwnedAssetRowProps) {
  const gameState = useGameStore((s) => s.gameState)
  const player = gameState?.companies[0]
  const maxLevel = asset.maxUpgradeLevel ?? 3
  const isMaxLevel = owned.upgradeLevel >= maxLevel
  const upgradeCost = isMaxLevel
    ? 0
    : Math.floor(asset.cost * ASSET_UPGRADE_COST_RATIO * (owned.upgradeLevel + 1))
  const incomeBonus = Math.round((ASSET_UPGRADE_INCOME_MULTIPLIER - 1) * 100)

  return (
    // 모바일에서 버튼이 두 번째 줄로 내려가도록 flex-wrap 적용
    <div className="flex flex-wrap items-center justify-between p-3 border-b border-slate-700">
      {/* 좌측: 이름 + 레벨 + 소득 정보 — 텍스트 넘침 방지 */}
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-medium text-slate-200 truncate">
          <GlossaryText>{asset.name}</GlossaryText>
          <span className="text-xs text-slate-400 ml-1.5">
            Lv.{owned.upgradeLevel}/{maxLevel}
          </span>
        </span>
        <span className="text-xs text-slate-500 truncate flex items-center gap-0.5">
          <GlossaryText>{`매입 턴${owned.purchaseTurn}`}</GlossaryText>
          {' | 소득 '}
          <MoneyDisplay amount={asset.baseIncome} size="sm" getBreakdown={gameState && player ? () => getAssetIncomeBreakdown(owned, gameState, player) : undefined} />
          /턴
        </span>
      </div>

      {/* 중앙: 현재 가치 + 시장 방향 */}
      <div className="flex items-center gap-2">
        <MoneyDisplay amount={owned.currentValue} size="sm" getBreakdown={gameState && player ? () => getAssetIncomeBreakdown(owned, gameState, player) : undefined} />
        <span className={`text-sm ${TREND_ARROW[sectorTrend].color}`}>{TREND_ARROW[sectorTrend].symbol}</span>
      </div>

      {/* 우측: 업그레이드 정보 + 버튼 — 모바일에서 전체 너비로 두 번째 줄에 배치 */}
      <div className="w-full sm:w-auto flex items-center gap-2 justify-end mt-2 sm:mt-0">
        {isMaxLevel ? (
          <span className="text-xs text-amber-400 font-medium">최대</span>
        ) : (
          <div className="flex flex-col items-end text-xs text-slate-400">
            <span>{formatMoney(upgradeCost)} · 소득 +{incomeBonus}%</span>
          </div>
        )}
        {!isMaxLevel && (
          <Button variant="secondary" size="sm" onClick={() => onUpgrade(index)}>
            강화
          </Button>
        )}
        <Button variant="danger" size="sm" onClick={() => onSell(index)}>
          매각
        </Button>
      </div>
    </div>
  )
}
