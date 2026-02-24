import { useMetaStore } from '@stores/metaStore'
import { useUIStore } from '@stores/uiStore'
import { Card, Button, Badge, ProgressBar } from '@components/common'
import { META_UPGRADES } from '@game/index'
import type { MetaUpgrade, MetaEffect } from '@game/index'
import { ArrowLeft, Coins } from 'lucide-react'

/** 메타 효과를 사람이 읽을 수 있는 한국어 문자열로 변환 */
function describeEffect(effect: MetaEffect): string {
  const parts: string[] = []

  if (effect.startingMoneyBonus > 0) parts.push(`시작 자금 +$${effect.startingMoneyBonus.toLocaleString()}`)
  if (effect.extraTurns > 0) parts.push(`최대 턴 +${effect.extraTurns}`)
  if (effect.incomeMultiplier > 1) parts.push(`소득 x${effect.incomeMultiplier.toFixed(2)}`)
  if (effect.purchaseCostDiscount > 0) parts.push(`매입 할인 ${Math.round(effect.purchaseCostDiscount * 100)}%`)
  if (effect.eventRerollChance > 0) parts.push(`이벤트 리롤 ${Math.round(effect.eventRerollChance * 100)}%`)
  if (effect.startingInfluence > 0) parts.push(`시작 영향력 +${effect.startingInfluence}`)

  return parts.length > 0 ? parts.join(', ') : '효과 없음'
}

/** 개별 업그레이드 카드 */
function UpgradeCard({ upgrade }: { upgrade: MetaUpgrade }) {
  const currency = useMetaStore((s) => s.metaState.currency)
  const currentLevel = useMetaStore((s) => s.metaState.upgrades[upgrade.id] ?? 0)
  const purchaseUpgrade = useMetaStore((s) => s.purchaseUpgrade)

  const isMaxed = currentLevel >= upgrade.maxLevel
  const cost = upgrade.cost * (currentLevel + 1)
  const canAfford = currency >= cost

  // 현재 레벨 효과 텍스트
  const currentEffect = currentLevel > 0
    ? describeEffect(upgrade.effect(currentLevel))
    : '효과 없음'

  const header = (
    <div className="flex items-center justify-between">
      <span>{upgrade.name}</span>
      <span className="text-sm text-slate-400">Lv.{currentLevel}/{upgrade.maxLevel}</span>
    </div>
  )

  return (
    <Card header={header}>
      {/* 설명 */}
      <p className="text-sm text-slate-400">{upgrade.description}</p>

      {/* 레벨 진행도 */}
      <div className="mt-3">
        <ProgressBar value={currentLevel} max={upgrade.maxLevel} color="money" />
      </div>

      {/* 현재 효과 */}
      <p className="mt-2 text-xs text-slate-300">
        현재 효과: <span className="text-money-400">{currentEffect}</span>
      </p>

      {/* 구매 버튼 또는 최대 레벨 배지 */}
      <div className="mt-3 flex items-center justify-between">
        {isMaxed ? (
          <Badge variant="info" label="최대 레벨" />
        ) : (
          <>
            <span className="text-sm text-slate-400">
              비용: <span className="text-slate-200">{cost}</span>
              <Coins className="ml-1 inline h-3.5 w-3.5 text-money-400" />
            </span>
            <Button
              variant="primary"
              size="sm"
              disabled={!canAfford}
              onClick={() => purchaseUpgrade(upgrade.id)}
            >
              {canAfford ? '구매' : '화폐 부족'}
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}

/** 메타 상점 화면 — 영구 업그레이드 구매 */
export function MetaShop() {
  const currency = useMetaStore((s) => s.metaState.currency)
  const goBack = useUIStore((s) => s.goBack)

  return (
    <div className="min-h-screen bg-slate-900">
      {/* 상단 헤더 (고정) */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-slate-900/95 px-4 py-3 backdrop-blur">
        <button
          className="flex items-center gap-1 text-sm text-slate-300 hover:text-slate-100 transition-colors"
          onClick={goBack}
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </button>
        <h1 className="text-lg font-bold text-slate-100">메타 상점</h1>
        <div className="flex items-center gap-1 text-sm text-money-400">
          <Coins className="h-4 w-4" />
          <span>{currency}</span>
        </div>
      </header>

      {/* 업그레이드 목록 */}
      <main className="mx-auto max-w-lg px-4 py-4 space-y-4">
        {META_UPGRADES.map((upgrade) => (
          <UpgradeCard key={upgrade.id} upgrade={upgrade} />
        ))}
      </main>
    </div>
  )
}
