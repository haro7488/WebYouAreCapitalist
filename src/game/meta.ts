import type { MetaState, MetaEffect } from './types'
import { META_UPGRADES } from './constants'

/** 모든 메타 업그레이드 효과를 합산 */
export function getMetaEffects(meta: MetaState): MetaEffect {
  const combined: MetaEffect = {
    startingMoneyBonus: 0,
    extraTurns: 0,
    revenueMultiplier: 1,
    investmentCostDiscount: 0,
    eventRerollChance: 0,
  }

  for (const upgrade of META_UPGRADES) {
    const level = meta.upgrades[upgrade.id] ?? 0
    if (level === 0) continue

    const effect = upgrade.effect(level)
    combined.startingMoneyBonus! += effect.startingMoneyBonus ?? 0
    combined.extraTurns! += effect.extraTurns ?? 0
    combined.revenueMultiplier! *= effect.revenueMultiplier ?? 1
    combined.investmentCostDiscount! += effect.investmentCostDiscount ?? 0
    combined.eventRerollChance! += effect.eventRerollChance ?? 0
  }

  return combined
}

/** 메타 업그레이드 구매 */
export function purchaseUpgrade(meta: MetaState, upgradeId: string): MetaState | null {
  const upgrade = META_UPGRADES.find((u) => u.id === upgradeId)
  if (!upgrade) return null

  const currentLevel = meta.upgrades[upgradeId] ?? 0
  if (currentLevel >= upgrade.maxLevel) return null

  const cost = upgrade.cost * (currentLevel + 1) // 레벨이 오를수록 비용 증가
  if (meta.currency < cost) return null

  return {
    ...meta,
    currency: meta.currency - cost,
    upgrades: { ...meta.upgrades, [upgradeId]: currentLevel + 1 },
  }
}

/** 초기 메타 상태 */
export function createInitialMeta(): MetaState {
  return {
    currency: 0,
    totalRunsPlayed: 0,
    bestScore: 0,
    upgrades: {},
  }
}
