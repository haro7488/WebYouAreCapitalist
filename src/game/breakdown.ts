// 금액 내역 분해 함수 — 기존 계산 로직을 미러링하되 중간값을 BreakdownItem[]으로 반환
import type { GameState, Company, OwnedAsset, MoneyBreakdown, BreakdownItem } from './types'
import {
  ASSETS,
  ASSET_UPGRADE_INCOME_MULTIPLIER,
  SECTOR_TREND_MULTIPLIER,
  SELL_BASE_RATIO,
  SELL_MARKET_RATIO,
} from './constants'
import {
  calculateSectorDemandPremium,
  getInfluenceTier,
  calculateGlobalDominance,
  calculateCompanyTotalIncome,
  mergeEffects,
} from './economy'
import { getCompanyTraitEffects, getCompanySectorTraitEffects } from './logic/traitEngine'

/** 자산 정보를 ID로 조회 */
function findAsset(assetId: string) {
  return ASSETS.find((a) => a.id === assetId)
}

/** 같은 티어 자산 중 최대값 계산 */
function getTierMax(tier: number, field: 'cost' | 'baseIncome'): number {
  const tierAssets = ASSETS.filter(a => a.tier === tier)
  return Math.max(...tierAssets.map(a => a[field]), 1)
}

/** 자산 매입 비용 분해 */
export function getPurchaseCostBreakdown(
  state: GameState,
  companyIndex: number,
  assetId: string,
): MoneyBreakdown {
  const asset = findAsset(assetId)
  const company = state.companies[companyIndex]

  if (!asset || !company) {
    return { title: '매입 비용', items: [], final: 0 }
  }

  const demandPremium = calculateSectorDemandPremium(state.companies, companyIndex, asset.sector)
  const influenceTier = getInfluenceTier(company.influence)
  const nextDiscount = company.activeEffects.reduce(
    (acc, e) => acc + (e.nextPurchaseDiscount ?? 0),
    0,
  )
  const traitEffects = getCompanyTraitEffects(company)
  const sectorTraitEffects = getCompanySectorTraitEffects(company)
  const sectorDiscount = sectorTraitEffects.purchaseDiscounts[asset.sector] ?? 0
  const totalDiscount = influenceTier.purchaseDiscount + nextDiscount + traitEffects.purchaseDiscount + sectorDiscount
  const cost = Math.floor(asset.cost * demandPremium * (1 - totalDiscount))

  const items: BreakdownItem[] = [
    { label: '기준가', value: asset.cost, type: 'base' },
  ]

  if (demandPremium !== 1) {
    items.push({ label: '수요 프리미엄', value: demandPremium, type: 'multiply' })
  }

  if (totalDiscount > 0) {
    items.push({ label: '할인율', value: 1 - totalDiscount, type: 'multiply' })
  }

  // 섹터 친화 할인은 totalDiscount에 이미 포함되어 있으므로 별도 표시 불필요

  return { title: '매입 비용', items, final: cost, maxValue: getTierMax(asset.tier, 'cost') * 2 }
}

/** 자산 턴 소득 분해 */
export function getAssetIncomeBreakdown(
  owned: OwnedAsset,
  state: GameState,
  company: Company,
): MoneyBreakdown {
  const asset = findAsset(owned.assetId)
  if (!asset) return { title: '자산 소득', items: [], final: 0 }

  const dominance = calculateGlobalDominance(company, state.companies)
  const traitEffects = getCompanyTraitEffects(company)
  const sectorTraitEffects = getCompanySectorTraitEffects(company)
  const upgradeMult = Math.pow(ASSET_UPGRADE_INCOME_MULTIPLIER, owned.upgradeLevel)
  const marketMult = asset.marketMultiplier[state.market.condition]
  const trendMult = SECTOR_TREND_MULTIPLIER[state.sectorStates[asset.sector].trend]
  const rawDominanceBonus = dominance[asset.sector].incomeBonus
  const dominanceMult = rawDominanceBonus === 1
    ? 1
    : 1 + (rawDominanceBonus - 1) * traitEffects.dominanceBonusMultiplier
  const sectorMult = sectorTraitEffects.incomeMultipliers[asset.sector] ?? 1
  const income = asset.baseIncome * upgradeMult * marketMult * trendMult * dominanceMult * sectorMult

  const items: BreakdownItem[] = [
    { label: '기본 소득', value: asset.baseIncome, type: 'base' },
  ]

  if (owned.upgradeLevel > 0) {
    items.push({ label: `업그레이드 Lv.${owned.upgradeLevel}`, value: upgradeMult, type: 'multiply' })
  }

  if (marketMult !== 1) {
    items.push({ label: '시장 상황', value: marketMult, type: 'multiply' })
  }

  if (trendMult !== 1) {
    items.push({ label: '섹터 트렌드', value: trendMult, type: 'multiply' })
  }

  if (dominanceMult !== 1) {
    items.push({ label: '지배력 보너스', value: dominanceMult, type: 'multiply' })
  }

  if (sectorMult !== 1) {
    items.push({ label: sectorMult > 1 ? '섹터 친화 보너스' : '섹터 기피 페널티', value: sectorMult, type: 'multiply' })
  }

  // 같은 티어 자산 최대 소득을 maxValue로
  const maxIncome = getTierMax(asset.tier, 'baseIncome') * 3 // 업그레이드+배율 고려
  return {
    title: `${asset.name} 소득`,
    items,
    final: income,
    history: owned.valueHistory,
    maxValue: maxIncome,
  }
}

/** 자산 매각가 분해 */
export function getSellPriceBreakdown(
  owned: OwnedAsset,
  state: GameState,
  company: Company,
): MoneyBreakdown {
  const asset = findAsset(owned.assetId)
  if (!asset) return { title: '매각가', items: [], final: 0 }

  const marketMult = asset.marketMultiplier[state.market.condition]
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
    { label: '총 자산 소득', value: totalIncome, type: 'base' },
  ]

  if ((effects.revenueMultiplier ?? 1) !== 1) {
    items.push({ label: '수익 배율 (이벤트)', value: effects.revenueMultiplier ?? 1, type: 'multiply' })
  }

  if (inflationMult !== 1) {
    items.push({ label: '인플레이션 배율', value: inflationMult, type: 'multiply' })
  }

  // 전체 기업 중 최대 수익을 maxValue로
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

  // 전체 기업 중 최대 지출을 maxValue로
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
    { label: '자산 가치', value: assetValue, type: 'add' },
  ]

  if (bonus !== 0) {
    items.push({ label: '목표 보너스', value: bonus, type: 'add' })
  }

  // 전체 기업 중 최대 순자산을 maxValue로
  const allNwMax = Math.max(...state.companies.map(c => Math.max(...(c.netWorthHistory ?? []), c.netWorth, 1)))
  return {
    title: '순자산',
    items,
    final,
    history: company.netWorthHistory,
    maxValue: allNwMax * 1.2,
  }
}
