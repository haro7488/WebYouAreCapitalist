// 금액 내역 분해 함수 — 기존 계산 로직을 미러링하되 중간값을 BreakdownItem[]으로 반환
import type { GameState, Company, OwnedAsset, Sector, MoneyBreakdown, BreakdownItem } from './types'
import {
  SECTOR_TREND_MULTIPLIER,
  SECTOR_UPGRADE_INCOME_MULTIPLIER,
  SELL_BASE_RATIO,
  SELL_MARKET_RATIO,
} from './constants'
import {
  findSector,
  calculateSectorDemandPremium,
  getInfluenceTier,
  calculateGlobalDominance,
  calculateCompanyTotalIncome,
  mergeEffects,
} from './economy'
import { getCompanyTraitEffects, getCompanySectorTraitEffects } from './logic/traitEngine'

/** 섹터 현재 매입가 계산 (breakdown 없이 단순 계산) */
export function calculateCurrentPrice(sector: Sector, state: GameState): number {
  const profile = findSector(sector)
  if (!profile) return 0
  const marketMult = profile.marketMultiplier[state.market.condition]
  const trendMult = SECTOR_TREND_MULTIPLIER[state.sectorStates[sector].trend]
  return Math.floor(profile.baseCost * marketMult * trendMult * state.cumulativeInflation)
}

/** 구좌 매입 비용 분해 */
export function getPurchaseCostBreakdown(
  state: GameState,
  companyIndex: number,
  sector: Sector,
): MoneyBreakdown {
  const profile = findSector(sector)
  const company = state.companies[companyIndex]

  if (!profile || !company) {
    return { title: '매입 비용', items: [], final: 0 }
  }

  const marketMult = profile.marketMultiplier[state.market.condition]
  const trendMult = SECTOR_TREND_MULTIPLIER[state.sectorStates[sector].trend]
  const inflationMult = state.cumulativeInflation
  const basePrice = profile.baseCost * marketMult * trendMult * inflationMult

  const demandPremium = calculateSectorDemandPremium(state.companies, companyIndex, sector)
  const influenceTier = getInfluenceTier(company.influence)
  const nextDiscount = company.activeEffects.reduce(
    (acc, e) => acc + (e.nextPurchaseDiscount ?? 0),
    0,
  )
  const traitEffects = getCompanyTraitEffects(company)
  const sectorTraitEffects = getCompanySectorTraitEffects(company)
  const sectorDiscount = sectorTraitEffects.purchaseDiscounts[sector] ?? 0
  const totalDiscount = influenceTier.purchaseDiscount + nextDiscount + traitEffects.purchaseDiscount + sectorDiscount
  const cost = Math.floor(basePrice * demandPremium * (1 - totalDiscount))

  const items: BreakdownItem[] = [
    { label: '기본가', value: profile.baseCost, type: 'base' },
  ]

  if (marketMult !== 1) {
    items.push({ label: '시장 배율', value: marketMult, type: 'multiply' })
  }
  if (trendMult !== 1) {
    items.push({ label: '섹터 트렌드', value: trendMult, type: 'multiply' })
  }
  if (inflationMult !== 1) {
    items.push({ label: '인플레이션', value: inflationMult, type: 'multiply' })
  }
  if (demandPremium !== 1) {
    items.push({ label: '수요 프리미엄', value: demandPremium, type: 'multiply' })
  }
  if (totalDiscount > 0) {
    items.push({ label: '할인율', value: 1 - totalDiscount, type: 'multiply' })
  }

  return { title: '매입 비용', items, final: cost }
}

/** 소득유형 표시명 */
const INCOME_TYPE_LABELS: Record<string, string> = {
  stable: '안정형 소득',
  marketLinked: '시장연동 소득',
  valueLinked: '가치연동 소득',
  inverse: '역행형 소득',
  leveraged: '레버리지 소득',
  special: '특수 소득',
}

/** 구좌 턴 소득 분해 */
export function getAssetIncomeBreakdown(
  owned: OwnedAsset,
  state: GameState,
  company: Company,
): MoneyBreakdown {
  const sector = findSector(owned.assetId)
  if (!sector) return { title: '구좌 소득', items: [], final: 0 }

  const dominance = calculateGlobalDominance(company, state.companies)
  const traitEffects = getCompanyTraitEffects(company)
  const sectorTraitEffects = getCompanySectorTraitEffects(company)
  const upgradeLevel = company.sectorUpgrades[owned.assetId] ?? 0
  const upgradeMult = Math.pow(SECTOR_UPGRADE_INCOME_MULTIPLIER, upgradeLevel)
  const marketMult = sector.marketMultiplier[state.market.condition]
  const trendMult = SECTOR_TREND_MULTIPLIER[state.sectorStates[owned.assetId].trend]
  const rawDominanceBonus = dominance[owned.assetId]?.incomeBonus ?? 1
  const dominanceMult = rawDominanceBonus === 1
    ? 1
    : 1 + (rawDominanceBonus - 1) * traitEffects.dominanceBonusMultiplier
  const sectorMult = sectorTraitEffects.incomeMultipliers[owned.assetId] ?? 1

  // 소득유형별 기본 소득
  let baseCalc: number
  const items: BreakdownItem[] = []

  switch (sector.incomeType) {
    case 'stable':
      baseCalc = sector.baseIncome * trendMult
      items.push({ label: '고정 소득', value: sector.baseIncome, type: 'base' })
      if (trendMult !== 1) items.push({ label: '트렌드 배율', value: trendMult, type: 'multiply' })
      break
    case 'marketLinked':
      baseCalc = owned.currentValue * sector.yieldRate * marketMult
      items.push({ label: '평가액', value: owned.currentValue, type: 'base' })
      items.push({ label: '수익률', value: sector.yieldRate, type: 'multiply' })
      items.push({ label: '시장 배율', value: marketMult, type: 'multiply' })
      break
    case 'valueLinked':
      baseCalc = owned.currentValue * sector.yieldRate
      items.push({ label: '평가액', value: owned.currentValue, type: 'base' })
      items.push({ label: '수익률', value: sector.yieldRate, type: 'multiply' })
      break
    case 'inverse':
      baseCalc = sector.baseIncome * (1 / marketMult)
      items.push({ label: '고정 소득', value: sector.baseIncome, type: 'base' })
      items.push({ label: '역시장 배율', value: 1 / marketMult, type: 'multiply' })
      break
    case 'leveraged':
      baseCalc = owned.currentValue * sector.yieldRate * marketMult * marketMult
      items.push({ label: '평가액', value: owned.currentValue, type: 'base' })
      items.push({ label: '수익률', value: sector.yieldRate, type: 'multiply' })
      items.push({ label: '시장 배율²', value: marketMult * marketMult, type: 'multiply' })
      break
    case 'special':
      baseCalc = sector.baseIncome
      items.push({ label: '고정 소득', value: sector.baseIncome, type: 'base' })
      break
  }

  if (upgradeLevel > 0) {
    items.push({ label: `섹터 강화 Lv.${upgradeLevel}`, value: upgradeMult, type: 'multiply' })
  }

  if (dominanceMult !== 1) {
    items.push({ label: '지배력 보너스', value: dominanceMult, type: 'multiply' })
  }

  if (sectorMult !== 1) {
    items.push({ label: sectorMult > 1 ? '섹터 친화 보너스' : '섹터 기피 페널티', value: sectorMult, type: 'multiply' })
  }

  const income = baseCalc * upgradeMult * dominanceMult * sectorMult

  return {
    title: `${sector.name} ${INCOME_TYPE_LABELS[sector.incomeType] ?? '소득'}`,
    items,
    final: income,
    history: owned.valueHistory,
  }
}

/** 구좌 매각가 분해 */
export function getSellPriceBreakdown(
  owned: OwnedAsset,
  state: GameState,
  company: Company,
): MoneyBreakdown {
  const sector = findSector(owned.assetId)
  if (!sector) return { title: '매각가', items: [], final: 0 }

  const marketMult = sector.marketMultiplier[state.market.condition]
  const traitEffects = getCompanyTraitEffects(company)
  const baseSellValue = Math.floor(owned.currentValue * (SELL_BASE_RATIO + SELL_MARKET_RATIO * marketMult))
  const sellValue = Math.floor(baseSellValue * (1 - traitEffects.sellPenalty) * (1 + traitEffects.sellBonus))

  const items: BreakdownItem[] = [
    { label: '현재 가치', value: owned.currentValue, type: 'base' },
    { label: '매각 비율', value: SELL_BASE_RATIO + SELL_MARKET_RATIO * marketMult, type: 'multiply' },
  ]

  if (traitEffects.sellPenalty > 0) {
    items.push({ label: '매각 페널티', value: 1 - traitEffects.sellPenalty, type: 'multiply' })
  }

  if (traitEffects.sellBonus > 0) {
    items.push({ label: '빠른 손절 보너스', value: 1 + traitEffects.sellBonus, type: 'multiply' })
  }

  return { title: '매각가', items, final: sellValue }
}

/** 수익 분해 */
export function getRevenueBreakdown(
  company: Company,
  state: GameState,
): MoneyBreakdown {
  const effects = mergeEffects(company.activeEffects)
  const totalIncome = calculateCompanyTotalIncome(company, state)
  const inflationMult = state.cumulativeInflation
  const revenue = Math.floor(totalIncome * (effects.revenueMultiplier ?? 1) * inflationMult)

  const items: BreakdownItem[] = [
    { label: '총 구좌 소득', value: totalIncome, type: 'base' },
  ]

  if ((effects.revenueMultiplier ?? 1) !== 1) {
    items.push({ label: '수익 배율 (이벤트)', value: effects.revenueMultiplier ?? 1, type: 'multiply' })
  }

  if (inflationMult !== 1) {
    items.push({ label: '인플레이션 배율', value: inflationMult, type: 'multiply' })
  }

  const allRevMax = Math.max(...state.companies.map(c => Math.max(...(c.revenueHistory ?? []), c.revenue, 1)))
  return {
    title: '수익',
    items,
    final: revenue,
    history: company.revenueHistory,
    maxValue: allRevMax * 1.2,
  }
}

/** 지출 분해 */
export function getExpenseBreakdown(
  company: Company,
  state: GameState,
): MoneyBreakdown {
  const effects = mergeEffects(company.activeEffects)
  const traitEffects = getCompanyTraitEffects(company)
  const inflationMult = state.cumulativeInflation
  const expenses = Math.floor(
    state.config.baseExpenses *
      (effects.expenseMultiplier ?? 1) *
      traitEffects.expenseMultiplier *
      inflationMult,
  )

  const items: BreakdownItem[] = [
    { label: '기본 지출', value: state.config.baseExpenses, type: 'base' },
  ]

  if ((effects.expenseMultiplier ?? 1) !== 1) {
    items.push({ label: '지출 배율 (이벤트)', value: effects.expenseMultiplier ?? 1, type: 'multiply' })
  }

  if (traitEffects.expenseMultiplier !== 1) {
    items.push({ label: '지출 배율 (특성)', value: traitEffects.expenseMultiplier, type: 'multiply' })
  }

  if (inflationMult !== 1) {
    items.push({ label: '인플레이션 배율', value: inflationMult, type: 'multiply' })
  }

  const allExpMax = Math.max(...state.companies.map(c => Math.max(...(c.expenseHistory ?? []), c.expenses, 1)))
  return {
    title: '지출',
    items,
    final: expenses,
    history: company.expenseHistory,
    maxValue: allExpMax * 1.2,
  }
}

/** 순자산 분해 */
export function getNetWorthBreakdown(
  company: Company,
  state: GameState,
  goalBonus?: number,
): MoneyBreakdown {
  const assetValue = company.assets.reduce((sum, owned) => sum + owned.currentValue, 0)
  const bonus = goalBonus ?? 0
  const final = company.cash + assetValue + bonus

  const items: BreakdownItem[] = [
    { label: '현금', value: company.cash, type: 'base' },
    { label: '구좌 가치', value: assetValue, type: 'add' },
  ]

  if (bonus !== 0) {
    items.push({ label: '목표 보너스', value: bonus, type: 'add' })
  }

  const allNwMax = Math.max(...state.companies.map(c => Math.max(...(c.netWorthHistory ?? []), c.netWorth, 1)))
  return {
    title: '순자산',
    items,
    final,
    history: company.netWorthHistory,
    maxValue: allNwMax * 1.2,
  }
}
