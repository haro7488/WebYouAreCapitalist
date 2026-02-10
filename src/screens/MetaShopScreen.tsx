import { Button } from '@components/common/Button'
import { Card } from '@components/common/Card'
import { Badge } from '@components/common/Badge'
import { useMetaStore } from '@stores/metaStore'
import { useUIStore } from '@stores/uiStore'
import { META_UPGRADES, formatMoney } from '@game/index'
import type { MetaUpgrade, MetaEffect } from '@game/index'

// === 내부 컴포넌트: 업그레이드 카드 ===

function UpgradeCard({
  upgrade,
  level,
  currency,
  onPurchase,
}: {
  upgrade: MetaUpgrade
  level: number
  currency: number
  onPurchase: () => void
}) {
  const isMaxed = level >= upgrade.maxLevel
  const nextCost = upgrade.cost * (level + 1)
  const canAfford = currency >= nextCost

  // 현재 효과 표시 (레벨 1 이상일 때)
  const effectLabel = level > 0 ? getEffectLabel(upgrade.effect(level)) : null

  return (
    <Card
      header={
        <div className="flex items-center justify-between">
          <span>{upgrade.name}</span>
          <span className="text-sm text-slate-400">
            Lv {level}/{upgrade.maxLevel}
          </span>
        </div>
      }
    >
      <p className="text-slate-400 text-sm mb-3">{upgrade.description}</p>

      {/* 현재 효과 */}
      {effectLabel && (
        <p className="text-emerald-400 text-sm mb-3">{effectLabel}</p>
      )}

      {/* 다음 레벨 비용 또는 최대 레벨 */}
      {isMaxed ? (
        <Badge variant="info" label="최대 레벨" />
      ) : (
        <>
          <p className="text-slate-500 text-xs mb-2">
            다음 레벨: 🪙 {formatMoney(nextCost)}
          </p>
          <Button
            variant="primary"
            size="sm"
            fullWidth
            disabled={!canAfford}
            onClick={onPurchase}
          >
            {canAfford ? '업그레이드' : '화폐 부족'}
          </Button>
        </>
      )}
    </Card>
  )
}

// 효과 값을 한국어 라벨로 변환
function getEffectLabel(effect: MetaEffect): string | null {
  if (effect.startingMoneyBonus > 0)
    return `시작 자금 +$${formatMoney(effect.startingMoneyBonus)}`
  if (effect.extraTurns > 0) return `추가 턴 +${effect.extraTurns}`
  if (effect.incomeMultiplier > 1)
    return `소득 ×${effect.incomeMultiplier.toFixed(2)}`
  if (effect.purchaseCostDiscount > 0)
    return `매입 할인 ${(effect.purchaseCostDiscount * 100).toFixed(0)}%`
  if (effect.eventRerollChance > 0)
    return `리롤 확률 ${(effect.eventRerollChance * 100).toFixed(0)}%`
  if (effect.extraActionPoints > 0) return `AP +${effect.extraActionPoints}`
  if (effect.startingInfluence > 0)
    return `시작 영향력 +${effect.startingInfluence}`
  return null
}

// === 메인 화면 ===

export function MetaShopScreen() {
  const { metaState, purchaseUpgrade } = useMetaStore()
  const navigateTo = useUIStore((s) => s.navigateTo)

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigateTo('mainMenu')}
        >
          ← 돌아가기
        </Button>
        <h1 className="text-2xl font-bold">메타 상점</h1>
        <span className="text-money-400 font-bold">
          🪙 {formatMoney(metaState.currency)}
        </span>
      </div>

      {/* 업그레이드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {META_UPGRADES.map((upgrade) => (
          <UpgradeCard
            key={upgrade.id}
            upgrade={upgrade}
            level={metaState.upgrades[upgrade.id] || 0}
            currency={metaState.currency}
            onPurchase={() => purchaseUpgrade(upgrade.id)}
          />
        ))}
      </div>
    </div>
  )
}
