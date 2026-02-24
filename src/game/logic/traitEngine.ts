// 특성 효과 엔진 — 기업이 보유한 특성들의 합산 효과 계산
import type { Company } from '../types'
import type { TraitEffect } from '../traits'
import { findTrait } from '../traits'

/** 기본 효과값 (특성 없을 때) */
const DEFAULT_EFFECT: Required<TraitEffect> = {
  purchaseDiscount: 0,
  sellPenalty: 0,
  expenseMultiplier: 1,
  influenceGainMultiplier: 1,
  opportunityWeightBonus: 0,
  pressureWeightBonus: 0,
  trendForesight: 0,
  investigateAccuracyPenalty: 0,
  lockRandomChoice: false,
}

/** 기업이 보유한 모든 특성의 효과를 합산하여 반환 */
export function getCompanyTraitEffects(company: Company): Required<TraitEffect> {
  const result = { ...DEFAULT_EFFECT }

  for (const traitId of company.traits) {
    const trait = findTrait(traitId)
    if (!trait?.effects) continue
    const e = trait.effects

    // 가산형
    result.purchaseDiscount += e.purchaseDiscount ?? 0
    result.sellPenalty += e.sellPenalty ?? 0
    result.opportunityWeightBonus += e.opportunityWeightBonus ?? 0
    result.pressureWeightBonus += e.pressureWeightBonus ?? 0
    result.trendForesight += e.trendForesight ?? 0
    result.investigateAccuracyPenalty += e.investigateAccuracyPenalty ?? 0

    // 곱산형
    result.expenseMultiplier *= e.expenseMultiplier ?? 1
    result.influenceGainMultiplier *= e.influenceGainMultiplier ?? 1

    // 불리언 OR
    if (e.lockRandomChoice) result.lockRandomChoice = true
  }

  return result
}
