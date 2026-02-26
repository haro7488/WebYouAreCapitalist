import type { OwnedAsset, SectorProfile, SectorTrend } from '@game/index'
import { Button, MoneyDisplay } from '@components/common'
import { GlossaryText } from '@components/glossary'
import { formatMoney, SECTOR_UPGRADE_COST_RATIO, SECTOR_UPGRADE_INCOME_MULTIPLIER, SECTOR_MAX_UPGRADE_LEVEL, getAssetIncomeBreakdown } from '@game/index'
import { useGameStore } from '@stores/gameStore'

// 섹터 트렌드별 방향 표시
const TREND_ARROW: Record<SectorTrend, { symbol: string; color: string }> = {
  hot: { symbol: '↑', color: 'text-red-400' },
  neutral: { symbol: '→', color: 'text-slate-400' },
  cold: { symbol: '↓', color: 'text-blue-400' },
}

interface OwnedAssetRowProps {
  owned: OwnedAsset
  asset: SectorProfile
  index: number
  sectorTrend: SectorTrend
  sectorUpgradeLevel: number
  onSell: (index: number) => void
  onSectorUpgrade: (sector: string) => void
  /** 같은 섹터의 첫 번째 행일 때만 강화 버튼 표시 */
  showUpgradeButton: boolean
}

/** 보유 자산 항목 1행 */
export function OwnedAssetRow({
  owned,
  asset,
  index,
  sectorTrend,
  sectorUpgradeLevel,
  onSell,
  onSectorUpgrade,
  showUpgradeButton,
}: OwnedAssetRowProps) {
  const gameState = useGameStore((s) => s.gameState)
  const player = gameState?.companies[0]
  const maxLevel = SECTOR_MAX_UPGRADE_LEVEL
  const isMaxLevel = sectorUpgradeLevel >= maxLevel
  const upgradeCost = isMaxLevel
    ? 0
    : Math.floor(asset.baseCost * SECTOR_UPGRADE_COST_RATIO * (sectorUpgradeLevel + 1))
  const incomeBonus = Math.round((SECTOR_UPGRADE_INCOME_MULTIPLIER - 1) * 100)

  return (
    // 모바일에서 버튼이 두 번째 줄로 내려가도록 flex-wrap 적용
    <div className="flex flex-wrap items-center justify-between p-3 border-b border-slate-700">
      {/* 좌측: 이름 + 소득 정보 — 텍스트 넘침 방지 */}
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-medium text-slate-200 truncate">
          <GlossaryText>{asset.name}</GlossaryText>
          {sectorUpgradeLevel > 0 && (
            <span className="text-xs text-amber-400 ml-1.5">
              Lv.{sectorUpgradeLevel}/{maxLevel}
            </span>
          )}
        </span>
        <span className="text-xs text-slate-500 truncate flex items-center gap-0.5">
          <GlossaryText>{`매입 ${formatMoney(owned.purchasePrice)}`}</GlossaryText>
          {` (턴${owned.purchaseTurn})`}
          {' | 소득 '}
          <MoneyDisplay amount={asset.baseIncome || Math.floor(owned.currentValue * asset.yieldRate)} size="sm" getBreakdown={gameState && player ? () => getAssetIncomeBreakdown(owned, gameState, player) : undefined} />
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
        {showUpgradeButton && (
          isMaxLevel ? (
            <span className="text-xs text-amber-400 font-medium">최대</span>
          ) : (
            <>
              <div className="flex flex-col items-end text-xs text-slate-400">
                <span>{formatMoney(upgradeCost)} · 소득 +{incomeBonus}%</span>
              </div>
              <Button variant="secondary" size="sm" onClick={() => onSectorUpgrade(asset.id)}>
                강화
              </Button>
            </>
          )
        )}
        <Button variant="danger" size="sm" onClick={() => onSell(index)}>
          매각
        </Button>
      </div>
    </div>
  )
}
