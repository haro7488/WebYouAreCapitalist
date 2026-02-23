import type { GameState, Company, EventEffect, Sector, DominanceInfo, OwnedAsset } from './types'
import {
  ASSETS,
  BASE_EXPENSES,
  SECTOR_TREND_MULTIPLIER,
  DOMINANCE_THRESHOLDS,
  ASSET_UPGRADE_INCOME_MULTIPLIER,
  SCORE_NETWORTH_WEIGHT,
  SCORE_INFLUENCE_WEIGHT,
  SCORE_TURN_BONUS,
  SCORE_DOMINANCE_BONUS,
  INFLUENCE_TIERS,
  SECTOR_FLOW_RATE,
  SECTOR_MARKET_MULTIPLIER,
} from './constants'

/** 자산 정보를 ID로 조회 */
function findAsset(assetId: string) {
  return ASSETS.find((a) => a.id === assetId)
}

// === 편의 함수 ===

/** 플레이어 기업(companies[0]) 반환 */
export function getPlayerCompany(state: GameState): Company {
  return state.companies[0]
}

/** companies 배열에서 특정 기업을 교체한 새 배열 반환 */
export function updateCompany(state: GameState, index: number, updated: Company): Company[] {
  const newCompanies = [...state.companies]
  newCompanies[index] = updated
  return newCompanies
}

// === 지배력 ===

/** 섹터별 보유 자산 수 계산 → 지배력 판정 */
export function calculateDominance(assets: OwnedAsset[]): Record<Sector, DominanceInfo> {
  const counts: Record<Sector, number> = {
    food: 0, tech: 0, realEstate: 0, retail: 0, finance: 0,
  }

  for (const owned of assets) {
    const asset = findAsset(owned.assetId)
    if (!asset) continue
    counts[asset.sector]++
  }

  const result = {} as Record<Sector, DominanceInfo>
  for (const sector of Object.keys(counts) as Sector[]) {
    const count = counts[sector]
    if (count >= DOMINANCE_THRESHOLDS.dominant.count) {
      result[sector] = { level: 'dominant', count, incomeBonus: DOMINANCE_THRESHOLDS.dominant.incomeBonus }
    } else if (count >= DOMINANCE_THRESHOLDS.competitor.count) {
      result[sector] = { level: 'competitor', count, incomeBonus: DOMINANCE_THRESHOLDS.competitor.incomeBonus }
    } else {
      result[sector] = { level: 'entrant', count, incomeBonus: DOMINANCE_THRESHOLDS.entrant.incomeBonus }
    }
  }

  return result
}

// === 시장 풀 기반 소득 계산 ===

/** 섹터의 총 자산 가치 합산 (모든 기업) */
function calculateSectorAssetValue(companies: Company[], sector: Sector): number {
  let total = 0
  for (const company of companies) {
    for (const owned of company.assets) {
      const asset = findAsset(owned.assetId)
      if (asset && asset.sector === sector) {
        total += owned.currentValue
      }
    }
  }
  return total
}

/** 특정 기업의 섹터 내 자산 가치 합산 */
function calculateCompanySectorValue(company: Company, sector: Sector): number {
  let total = 0
  for (const owned of company.assets) {
    const asset = findAsset(owned.assetId)
    if (asset && asset.sector === sector) {
      total += owned.currentValue
    }
  }
  return total
}

/** 섹터별 유입량 계산 */
export function calculateSectorFlow(
  sector: Sector,
  marketPool: number,
  state: GameState,
): number {
  const flowRate = SECTOR_FLOW_RATE[sector]
  const marketMult = SECTOR_MARKET_MULTIPLIER[sector][state.market.condition]
  const trendMult = SECTOR_TREND_MULTIPLIER[state.sectorStates[sector].trend]
  return marketPool * flowRate * marketMult * trendMult
}

/** 특정 기업의 섹터별 소득 계산 (시장 풀 기반) */
export function calculateCompanySectorIncome(
  company: Company,
  sector: Sector,
  state: GameState,
): number {
  const sectorFlow = calculateSectorFlow(sector, state.marketPool, state)
  const totalSectorValue = calculateSectorAssetValue(state.companies, sector)
  if (totalSectorValue === 0) return 0

  const companyValue = calculateCompanySectorValue(company, sector)
  if (companyValue === 0) return 0

  const share = companyValue / totalSectorValue
  const dominance = calculateDominance(company.assets)
  const dominanceMult = dominance[sector].incomeBonus

  return sectorFlow * share * dominanceMult
}

/** 기업의 총 소득 계산 (모든 섹터 합산) */
export function calculateCompanyTotalIncome(company: Company, state: GameState): number {
  const sectors: Sector[] = ['food', 'tech', 'realEstate', 'retail', 'finance']
  let total = 0
  for (const sector of sectors) {
    total += calculateCompanySectorIncome(company, sector, state)
  }
  return total
}

/** 보유 자산의 현재 가치 갱신 (appreciation 적용) */
export function calculateAssetValue(owned: OwnedAsset, state: GameState): number {
  const asset = findAsset(owned.assetId)
  if (!asset) return owned.currentValue

  const sectorTrend = state.sectorStates[asset.sector].trend
  // hot: +2%/턴 추가, cold: -1%/턴 감소
  const trendAppreciation = sectorTrend === 'hot' ? 0.02 : sectorTrend === 'cold' ? -0.01 : 0
  const totalAppreciation = asset.appreciation + trendAppreciation

  return owned.currentValue * (1 + totalAppreciation)
}

/** 기업의 순자산 계산 (현금 + 모든 보유 자산 현재 가치) */
export function calculateCompanyNetWorth(company: Company): number {
  const assetValue = company.assets.reduce((sum, owned) => sum + owned.currentValue, 0)
  return company.cash + assetValue
}

/** GameState의 순자산 계산 (하위 호환 — companies[0] 기준) */
export function calculateNetWorth(state: GameState): number {
  return calculateCompanyNetWorth(getPlayerCompany(state))
}

/** 활성 효과들을 합산 */
function mergeEffects(effects: EventEffect[]): EventEffect {
  const merged: EventEffect = {
    money: 0,
    revenueMultiplier: 1,
    expenseMultiplier: 1,
    influence: 0,
  }
  for (const effect of effects) {
    merged.money! += effect.money ?? 0
    merged.revenueMultiplier! *= effect.revenueMultiplier ?? 1
    merged.expenseMultiplier! *= effect.expenseMultiplier ?? 1
    merged.influence! += effect.influence ?? 0
  }
  return merged
}

/**
 * 기업의 턴 수익 계산 (시장 풀 기반)
 * 자산 소득 = 섹터별 점유율 × 섹터 유입량
 */
export function calculateCompanyNetIncome(
  company: Company,
  state: GameState,
): { revenue: number; expenses: number; net: number } {
  const effects = mergeEffects(company.activeEffects)

  // 시장 풀 기반 소득 합산
  const totalIncome = calculateCompanyTotalIncome(company, state)

  const revenue = Math.floor(totalIncome * effects.revenueMultiplier!)
  const expenses = Math.floor(BASE_EXPENSES * effects.expenseMultiplier!)
  const directMoney = effects.money ?? 0

  return {
    revenue,
    expenses,
    net: revenue - expenses + directMoney,
  }
}

/** 하위 호환: GameState 기반 턴 수익 계산 (companies[0]) */
export function calculateNetIncome(state: GameState): { revenue: number; expenses: number; net: number } {
  return calculateCompanyNetIncome(getPlayerCompany(state), state)
}

/** 개별 자산의 턴 소득 계산 (UI 표시용, 시장 풀 기반 추정) */
export function calculateAssetIncome(
  owned: OwnedAsset,
  state: GameState,
  dominance: Record<Sector, DominanceInfo>,
): number {
  const asset = findAsset(owned.assetId)
  if (!asset) return 0

  // 이 자산의 섹터 유입량
  const sectorFlow = calculateSectorFlow(asset.sector, state.marketPool, state)
  const totalSectorValue = calculateSectorAssetValue(state.companies, asset.sector)
  if (totalSectorValue === 0) return 0

  // 이 자산의 점유율
  const share = owned.currentValue / totalSectorValue
  const dominanceMult = dominance[asset.sector].incomeBonus
  const upgradeMult = Math.pow(ASSET_UPGRADE_INCOME_MULTIPLIER, owned.upgradeLevel)

  return sectorFlow * share * dominanceMult * upgradeMult
}

/** 모든 보유 자산의 턴당 소득 합산 (하위 호환) */
export function calculateTotalAssetIncome(state: GameState): number {
  return calculateCompanyTotalIncome(getPlayerCompany(state), state)
}

// === 화폐 보존 검증 ===

/** 시스템 내 총 화폐량 계산 */
export function calculateTotalSystemMoney(state: GameState): number {
  let total = state.marketPool
  for (const company of state.companies) {
    total += company.cash
    for (const owned of company.assets) {
      total += owned.currentValue
    }
  }
  return total
}

/** 화폐 보존 법칙 검증 (허용 오차: 부동소수점 누적) */
export function assertMoneyConservation(state: GameState): void {
  const actual = calculateTotalSystemMoney(state)
  const tolerance = state.totalMoney * 0.001 // 0.1% 허용 오차
  if (Math.abs(actual - state.totalMoney) > tolerance) {
    console.error(
      `[화폐 보존 위반] 기대: ${state.totalMoney}, 실제: ${actual.toFixed(2)}, 차이: ${(actual - state.totalMoney).toFixed(2)}`,
    )
  }
}

/** marketPool 재계산 (보존 법칙 기반) */
export function recalculateMarketPool(state: GameState): number {
  let companiesTotal = 0
  for (const company of state.companies) {
    companiesTotal += company.cash
    for (const owned of company.assets) {
      companiesTotal += owned.currentValue
    }
  }
  return state.totalMoney - companiesTotal
}

// === 점수 ===

/** 최종 점수 계산 (순자산 + 영향력 + 턴 + 지배 섹터) */
export function calculateScore(state: GameState): number {
  const player = getPlayerCompany(state)
  const netWorth = calculateCompanyNetWorth(player)
  const dominance = calculateDominance(player.assets)
  const dominatedCount = (Object.values(dominance) as DominanceInfo[])
    .filter((d) => d.level === 'dominant').length

  const netWorthScore = Math.max(0, netWorth) * SCORE_NETWORTH_WEIGHT
  const influenceScore = player.influence * SCORE_INFLUENCE_WEIGHT
  const turnBonus = state.turn * SCORE_TURN_BONUS
  const dominanceBonus = dominatedCount * SCORE_DOMINANCE_BONUS

  return Math.floor(netWorthScore + influenceScore + turnBonus + dominanceBonus)
}

/** 현재 영향력에 해당하는 영향력 티어 반환 */
export function getInfluenceTier(influence: number) {
  let tier = INFLUENCE_TIERS[0]
  for (const t of INFLUENCE_TIERS) {
    if (influence >= t.minInfluence) tier = t
  }
  return tier
}
