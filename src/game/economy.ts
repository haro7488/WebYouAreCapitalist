import type { GameState, Company, EventEffect, Sector, DominanceInfo, OwnedAsset } from './types'
import {
  ASSETS,
  SECTOR_TREND_MULTIPLIER,
  DOMINANCE_THRESHOLDS,
  ASSET_UPGRADE_INCOME_MULTIPLIER,
  SCORE_NETWORTH_WEIGHT,
  SCORE_INFLUENCE_WEIGHT,
  SCORE_TURN_BONUS,
  SCORE_DOMINANCE_BONUS,
  INFLUENCE_TIERS,
  SECTOR_DEMAND_PREMIUM,
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

// === 섹터 수요 프리미엄 ===

const ALL_SECTORS: Sector[] = ['food', 'tech', 'realEstate', 'logistics', 'energy', 'finance', 'information']

/** 해당 섹터에 투자 중인 경쟁사 수 (매입자 제외) */
function countCompetitorsInSector(companies: Company[], buyerIndex: number, sector: Sector): number {
  let count = 0
  for (let i = 0; i < companies.length; i++) {
    if (i === buyerIndex) continue
    for (const owned of companies[i].assets) {
      const asset = findAsset(owned.assetId)
      if (asset && asset.sector === sector) {
        count++
        break // 이 기업은 이미 투자 중이므로 다음 기업으로
      }
    }
  }
  return count
}

/** 섹터 수요 프리미엄 배율 (경쟁사 투자 집중 → +10~20%) */
export function calculateSectorDemandPremium(
  companies: Company[],
  buyerIndex: number,
  sector: Sector,
): number {
  const competitorCount = countCompetitorsInSector(companies, buyerIndex, sector)
  const key = Math.min(competitorCount, 3)
  return 1 + (SECTOR_DEMAND_PREMIUM[key] ?? 0)
}

// === 지배력 ===

/** 섹터별 보유 자산 수 계산 → 지배력 판정 */
export function calculateDominance(assets: OwnedAsset[]): Record<Sector, DominanceInfo> {
  const counts: Record<Sector, number> = {
    food: 0, tech: 0, realEstate: 0, logistics: 0, energy: 0, finance: 0, information: 0,
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

/** 글로벌 지배력: 섹터당 지배자 1명만 (섹터 내 자산 가치 기준) */
export function calculateGlobalDominance(
  company: Company,
  allCompanies: Company[],
): Record<Sector, DominanceInfo> {
  const localDominance = calculateDominance(company.assets)

  for (const sector of ALL_SECTORS) {
    if (localDominance[sector].level !== 'dominant') continue

    // 같은 섹터에서 dominant인 다른 기업이 있으면 자산 가치로 비교
    const myValue = calculateCompanySectorValue(company, sector)
    for (const other of allCompanies) {
      if (other.id === company.id) continue
      const otherDominance = calculateDominance(other.assets)
      if (otherDominance[sector].level === 'dominant') {
        const otherValue = calculateCompanySectorValue(other, sector)
        if (otherValue > myValue) {
          // 패배 → competitor로 강등
          localDominance[sector] = {
            level: 'competitor',
            count: localDominance[sector].count,
            incomeBonus: DOMINANCE_THRESHOLDS.competitor.incomeBonus,
          }
          break
        }
      }
    }
  }

  return localDominance
}

/** 순위 계산: netWorth 내림차순 정렬된 기업 인덱스 배열 반환 */
export function calculateRankings(companies: Company[]): number[] {
  return companies
    .map((c, i) => ({ index: i, netWorth: c.netWorth }))
    .sort((a, b) => b.netWorth - a.netWorth)
    .map((r) => r.index)
}

/** 특정 기업의 순위 반환 (1-based) */
export function getCompanyRank(companies: Company[], companyIndex: number): number {
  const rankings = calculateRankings(companies)
  return rankings.indexOf(companyIndex) + 1
}

/** 섹터별 점유율 계산 (모든 기업) */
export function calculateSectorShares(
  companies: Company[],
  sector: Sector,
): { companyId: string; companyName: string; share: number }[] {
  const totalValue = calculateSectorAssetValue(companies, sector)
  if (totalValue === 0) return []

  return companies
    .map((company) => {
      const value = calculateCompanySectorValue(company, sector)
      return {
        companyId: company.id,
        companyName: company.name,
        share: value / totalValue,
      }
    })
    .filter((s) => s.share > 0)
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

/** 특정 기업의 섹터별 소득 계산 (baseIncome 기반, 글로벌 지배력 적용) */
export function calculateCompanySectorIncome(
  company: Company,
  sector: Sector,
  state: GameState,
): number {
  const dominance = calculateGlobalDominance(company, state.companies)
  let total = 0
  for (const owned of company.assets) {
    const asset = findAsset(owned.assetId)
    if (asset && asset.sector === sector) {
      total += calculateAssetIncome(owned, state, dominance)
    }
  }
  return total
}

/** 기업의 총 소득 계산 (baseIncome 기반 전 자산 합산) */
export function calculateCompanyTotalIncome(company: Company, state: GameState): number {
  const dominance = calculateGlobalDominance(company, state.companies)
  let total = 0
  for (const owned of company.assets) {
    total += calculateAssetIncome(owned, state, dominance)
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
 * 기업의 턴 수익 계산 (baseIncome 기반)
 * precomputedIncome: 풀 비례 축소가 적용된 소득 (resolveEconomy에서 전달)
 */
export function calculateCompanyNetIncome(
  company: Company,
  state: GameState,
  precomputedIncome?: number,
): { revenue: number; expenses: number; net: number } {
  const effects = mergeEffects(company.activeEffects)

  const totalIncome = precomputedIncome ?? calculateCompanyTotalIncome(company, state)

  const revenue = Math.floor(totalIncome * effects.revenueMultiplier!)
  const expenses = Math.floor(state.config.baseExpenses * effects.expenseMultiplier!)
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

/** 개별 자산의 턴 소득 계산 (baseIncome × 업그레이드 × 시장 × 트렌드 × 지배력) */
export function calculateAssetIncome(
  owned: OwnedAsset,
  state: GameState,
  dominance: Record<Sector, DominanceInfo>,
): number {
  const asset = findAsset(owned.assetId)
  if (!asset) return 0

  const upgradeMult = Math.pow(ASSET_UPGRADE_INCOME_MULTIPLIER, owned.upgradeLevel)
  const marketMult = asset.marketMultiplier[state.market.condition]
  const trendMult = SECTOR_TREND_MULTIPLIER[state.sectorStates[asset.sector].trend]
  const dominanceMult = dominance[asset.sector].incomeBonus

  return asset.baseIncome * upgradeMult * marketMult * trendMult * dominanceMult
}

/** 모든 보유 자산의 턴당 소득 합산 (하위 호환) */
export function calculateTotalAssetIncome(state: GameState): number {
  return calculateCompanyTotalIncome(getPlayerCompany(state), state)
}

// === 시장 풀 비례 축소 ===

/** 모든 기업의 소득을 계산하고 marketPool 부족 시 비례 축소 적용 */
export function calculatePoolScaledIncomes(state: GameState): { scaledIncomes: number[]; scaleFactor: number } {
  const rawIncomes = state.companies.map((company) => calculateCompanyTotalIncome(company, state))
  const totalDemand = rawIncomes.reduce((sum, inc) => sum + inc, 0)

  if (totalDemand <= 0) return { scaledIncomes: rawIncomes, scaleFactor: 1 }

  // marketPool이 부족하면 모든 기업 동일 비율로 축소
  const scaleFactor = Math.min(1, state.marketPool / totalDemand)
  const scaledIncomes = rawIncomes.map((inc) => inc * scaleFactor)

  return { scaledIncomes, scaleFactor }
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
