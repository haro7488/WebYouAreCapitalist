// 특성 효과 엔진 — 기업이 보유한 특성들의 합산 효과 계산
import type { Company, Sector } from '../types'
import type { TraitEffect } from '../traits'
import { findTrait } from '../traits'

/** 기본 효과값 (특성 없을 때) */
const DEFAULT_EFFECT: Required<Omit<TraitEffect, 'sectorIncomeBonus' | 'sectorPurchaseDiscount'>> = {
  purchaseDiscount: 0,
  sellPenalty: 0,
  sellBonus: 0,
  expenseMultiplier: 1,
  influenceGainMultiplier: 1,
  influenceDecayMultiplier: 1,
  dominanceBonusMultiplier: 1,
  upgradeCostMultiplier: 1,
  opportunityWeightBonus: 0,
  pressureWeightBonus: 0,
  trendForesight: 0,
  investigateAccuracyPenalty: 0,
  lockRandomChoice: false,
}

/** 범용 효과 집계 결과 타입 */
export type AggregatedTraitEffect = typeof DEFAULT_EFFECT

/** 기업이 보유한 모든 특성의 범용 효과를 합산하여 반환 */
export function getCompanyTraitEffects(company: Company): AggregatedTraitEffect {
  const result = { ...DEFAULT_EFFECT }

  for (const traitId of company.traits) {
    const trait = findTrait(traitId)
    if (!trait?.effects) continue
    const e = trait.effects

    // 가산형
    result.purchaseDiscount += e.purchaseDiscount ?? 0
    result.sellPenalty += e.sellPenalty ?? 0
    result.sellBonus += e.sellBonus ?? 0
    result.opportunityWeightBonus += e.opportunityWeightBonus ?? 0
    result.pressureWeightBonus += e.pressureWeightBonus ?? 0
    result.trendForesight += e.trendForesight ?? 0
    result.investigateAccuracyPenalty += e.investigateAccuracyPenalty ?? 0

    // 곱산형
    result.expenseMultiplier *= e.expenseMultiplier ?? 1
    result.influenceGainMultiplier *= e.influenceGainMultiplier ?? 1
    result.influenceDecayMultiplier *= e.influenceDecayMultiplier ?? 1
    result.dominanceBonusMultiplier *= e.dominanceBonusMultiplier ?? 1
    result.upgradeCostMultiplier *= e.upgradeCostMultiplier ?? 1

    // 불리언 OR
    if (e.lockRandomChoice) result.lockRandomChoice = true
  }

  return result
}

/** 섹터별 특성 효과 집계 결과 */
export interface SectorTraitEffects {
  incomeMultipliers: Partial<Record<Sector, number>>
  purchaseDiscounts: Partial<Record<Sector, number>>
}

/** 기업이 보유한 특성의 섹터별 효과를 집계하여 반환 */
export function getCompanySectorTraitEffects(company: Company): SectorTraitEffects {
  const incomeMultipliers: Partial<Record<Sector, number>> = {}
  const purchaseDiscounts: Partial<Record<Sector, number>> = {}

  for (const traitId of company.traits) {
    const trait = findTrait(traitId)
    if (!trait?.effects) continue
    const e = trait.effects

    if (e.sectorIncomeBonus) {
      const s = e.sectorIncomeBonus.sector as Sector
      incomeMultipliers[s] = (incomeMultipliers[s] ?? 1) * e.sectorIncomeBonus.multiplier
    }
    if (e.sectorPurchaseDiscount) {
      const s = e.sectorPurchaseDiscount.sector as Sector
      purchaseDiscounts[s] = (purchaseDiscounts[s] ?? 0) + e.sectorPurchaseDiscount.discount
    }
  }

  return { incomeMultipliers, purchaseDiscounts }
}
