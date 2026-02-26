import type { GameState, Company, EventEffect, Sector, DominanceInfo, DominanceLevel, OwnedAsset, SectorProfile } from './types'
import {
  SECTORS,
  SECTOR_TREND_MULTIPLIER,
  DOMINANCE_THRESHOLDS,
  SECTOR_UPGRADE_INCOME_MULTIPLIER,
  SCORE_NETWORTH_WEIGHT,
  SCORE_INFLUENCE_WEIGHT,
  SCORE_TURN_BONUS,
  SCORE_DOMINANCE_BONUS,
  INFLUENCE_TIERS,
  SECTOR_DEMAND_PREMIUM,
} from './constants'
import { getCompanyTraitEffects, getCompanySectorTraitEffects } from './logic/traitEngine'

/** 섹터 프로필을 ID로 조회 */
export function findSector(sectorId: Sector): SectorProfile | undefined {
  return SECTORS.find((s) => s.id === sectorId)
}

const ALL_SECTORS: Sector[] = ['food', 'tech', 'realEstate', 'logistics', 'energy', 'finance', 'information']

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

/** 해당 섹터에 투자 중인 경쟁사 수 (매입자 제외) */
function countCompetitorsInSector(companies: Company[], buyerIndex: number, sector: Sector): number {
  let count = 0
  for (let i = 0; i < companies.length; i++) {
    if (i === buyerIndex) continue
    if (companies[i].assets.some((a) => a.assetId === sector)) {
      count++
    }
  }
  return count
}

/** 섹터 수요 프리미엄 배율 (경쟁사 투자 집중 → +5~15%) */
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

/** 로컬 지배력: 섹터별 보유 구좌 수 기반 (share 미포함 — UI 표시용) */
export function calculateDominance(assets: OwnedAsset[]): Record<Sector, DominanceInfo> {
  const counts: Record<Sector, number> = {
    food: 0, tech: 0, realEstate: 0, logistics: 0, energy: 0, finance: 0, information: 0,
  }

  for (const owned of assets) {
    counts[owned.assetId]++
  }

  const result = {} as Record<Sector, DominanceInfo>
  for (const sector of Object.keys(counts) as Sector[]) {
    const count = counts[sector]
    if (count >= DOMINANCE_THRESHOLDS.dominant.count) {
      result[sector] = { level: 'dominant', count, share: 0, incomeBonus: DOMINANCE_THRESHOLDS.dominant.incomeBonus }
    } else if (count >= DOMINANCE_THRESHOLDS.competitor.count) {
      result[sector] = { level: 'competitor', count, share: 0, incomeBonus: DOMINANCE_THRESHOLDS.competitor.incomeBonus }
    } else {
      result[sector] = { level: 'entrant', count, share: 0, incomeBonus: DOMINANCE_THRESHOLDS.entrant.incomeBonus }
    }
  }

  return result
}

/** 글로벌 지배력: 구좌 수 + 점유율 이중 조건 (소득 계산용) */
export function calculateGlobalDominance(
  company: Company,
  allCompanies: Company[],
): Record<Sector, DominanceInfo> {
  const result = {} as Record<Sector, DominanceInfo>

  for (const sector of ALL_SECTORS) {
    const myCount = company.assets.filter((a) => a.assetId === sector).length

    // 전체 구좌 수
    let totalCount = 0
    for (const c of allCompanies) {
      totalCount += c.assets.filter((a) => a.assetId === sector).length
    }

    const share = totalCount > 0 ? myCount / totalCount : 0

    // 이중 조건 판정
    let level: DominanceLevel = 'entrant'
    let incomeBonus = DOMINANCE_THRESHOLDS.entrant.incomeBonus

    if (myCount >= DOMINANCE_THRESHOLDS.dominant.count && share >= DOMINANCE_THRESHOLDS.dominant.sharePercent) {
      // 지배 후보 → 동일 조건 충족 경쟁사가 있으면 가치로 비교
      let isDominant = true
      const myValue = company.assets.filter((a) => a.assetId === sector).reduce((sum, a) => sum + a.currentValue, 0)

      for (const other of allCompanies) {
        if (other.id === company.id) continue
        const otherCount = other.assets.filter((a) => a.assetId === sector).length
        const otherShare = totalCount > 0 ? otherCount / totalCount : 0

        if (otherCount >= DOMINANCE_THRESHOLDS.dominant.count && otherShare >= DOMINANCE_THRESHOLDS.dominant.sharePercent) {
          const otherValue = other.assets.filter((a) => a.assetId === sector).reduce((sum, a) => sum + a.currentValue, 0)
          if (otherValue > myValue) {
            isDominant = false
            break
          }
        }
      }

      if (isDominant) {
        level = 'dominant'
        incomeBonus = DOMINANCE_THRESHOLDS.dominant.incomeBonus
      } else {
        level = 'competitor'
        incomeBonus = DOMINANCE_THRESHOLDS.competitor.incomeBonus
      }
    } else if (myCount >= DOMINANCE_THRESHOLDS.competitor.count && share >= DOMINANCE_THRESHOLDS.competitor.sharePercent) {
      level = 'competitor'
      incomeBonus = DOMINANCE_THRESHOLDS.competitor.incomeBonus
    }

    result[sector] = { level, count: myCount, share, incomeBonus }
  }

  return result
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

/** 섹터별 점유율 계산 (구좌 수 기반) */
export function calculateSectorShares(
  companies: Company[],
  sector: Sector,
): { companyId: string; companyName: string; share: number }[] {
  let totalCount = 0
  const companyCounts: number[] = []
  for (const company of companies) {
    const count = company.assets.filter((a) => a.assetId === sector).length
    companyCounts.push(count)
    totalCount += count
  }
  if (totalCount === 0) return []

  return companies
    .map((company, i) => ({
      companyId: company.id,
      companyName: company.name,
      share: companyCounts[i] / totalCount,
    }))
    .filter((s) => s.share > 0)
}

// === 소득 계산 ===

/** 섹터의 총 자산 가치 합산 (모든 기업) */
function calculateSectorAssetValue(companies: Company[], sector: Sector): number {
  let total = 0
  for (const company of companies) {
    for (const owned of company.assets) {
      if (owned.assetId === sector) total += owned.currentValue
    }
  }
  return total
}

/** 특정 기업의 섹터 내 자산 가치 합산 */
function calculateCompanySectorValue(company: Company, sector: Sector): number {
  let total = 0
  for (const owned of company.assets) {
    if (owned.assetId === sector) total += owned.currentValue
  }
  return total
}

/** 특정 기업의 섹터별 소득 계산 */
export function calculateCompanySectorIncome(
  company: Company,
  sector: Sector,
  state: GameState,
): number {
  const dominance = calculateGlobalDominance(company, state.companies)
  const sectorEffects = getCompanySectorTraitEffects(company)
  const traitEffects = getCompanyTraitEffects(company)
  const sectorMult = sectorEffects.incomeMultipliers[sector] ?? 1
  const upgradeLevel = company.sectorUpgrades[sector] ?? 0
  let total = 0
  for (const owned of company.assets) {
    if (owned.assetId === sector) {
      total += calculateAssetIncome(owned, state, dominance, sectorMult, traitEffects.dominanceBonusMultiplier, upgradeLevel)
    }
  }
  return total
}

/** 기업의 총 소득 계산 (전 구좌 합산) */
export function calculateCompanyTotalIncome(company: Company, state: GameState): number {
  const dominance = calculateGlobalDominance(company, state.companies)
  const sectorEffects = getCompanySectorTraitEffects(company)
  const traitEffects = getCompanyTraitEffects(company)
  let total = 0
  for (const owned of company.assets) {
    const sectorMult = sectorEffects.incomeMultipliers[owned.assetId] ?? 1
    const upgradeLevel = company.sectorUpgrades[owned.assetId] ?? 0
    total += calculateAssetIncome(owned, state, dominance, sectorMult, traitEffects.dominanceBonusMultiplier, upgradeLevel)
  }
  return total
}

/**
 * 구좌 현재 평가액 재계산 (매 턴 갱신)
 * 현재가 = baseCost × 시장배율 × 트렌드배율 × 인플레이션
 */
export function calculateAssetValue(owned: OwnedAsset, state: GameState): number {
  const sector = findSector(owned.assetId)
  if (!sector) return owned.currentValue

  const marketMult = sector.marketMultiplier[state.market.condition]
  const trendMult = SECTOR_TREND_MULTIPLIER[state.sectorStates[owned.assetId].trend]

  return Math.floor(sector.baseCost * marketMult * trendMult * state.cumulativeInflation)
}

/** 기업의 순자산 계산 (현금 + 모든 보유 구좌 현재 가치 + 목표 보너스) */
export function calculateCompanyNetWorth(company: Company, goal?: { bonus: number } | null): number {
  const assetValue = company.assets.reduce((sum, owned) => sum + owned.currentValue, 0)
  const baseNetWorth = company.cash + assetValue

  // 목표 달성 시 보너스 가산
  const goalBonus = (company.goalCompleted && goal) ? goal.bonus : 0

  return baseNetWorth + goalBonus
}

/** GameState의 순자산 계산 (하위 호환 — companies[0] 기준) */
export function calculateNetWorth(state: GameState): number {
  return calculateCompanyNetWorth(getPlayerCompany(state), state.selectedGoal)
}

/** 활성 효과들을 합산 */
export function mergeEffects(effects: EventEffect[]): EventEffect {
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
 * 기업의 턴 수익 계산
 * precomputedIncome: 풀 비례 축소가 적용된 소득 (resolveEconomy에서 전달)
 */
export function calculateCompanyNetIncome(
  company: Company,
  state: GameState,
  precomputedIncome?: number,
): { revenue: number; expenses: number; net: number } {
  const effects = mergeEffects(company.activeEffects)
  const traitEffects = getCompanyTraitEffects(company)

  const totalIncome = precomputedIncome ?? calculateCompanyTotalIncome(company, state)

  const inflationMult = state.cumulativeInflation
  const revenue = Math.floor(totalIncome * effects.revenueMultiplier! * inflationMult)
  const expenses = Math.floor(state.config.baseExpenses * effects.expenseMultiplier! * traitEffects.expenseMultiplier * inflationMult)
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

/**
 * 개별 구좌의 턴 소득 계산 (소득유형별 분기)
 *
 * - stable: baseIncome × trendMult (시장배율 미적용)
 * - marketLinked: currentValue × yieldRate × marketMult
 * - valueLinked: currentValue × yieldRate
 * - inverse: baseIncome / marketMult (불황시 증가)
 * - leveraged: currentValue × yieldRate × marketMult²
 * - special: baseIncome (고정)
 *
 * × upgradeMult × dominanceMult × sectorTraitMult
 */
export function calculateAssetIncome(
  owned: OwnedAsset,
  state: GameState,
  dominance: Record<Sector, DominanceInfo>,
  sectorTraitMultiplier: number = 1,
  dominanceBonusMultiplier: number = 1,
  upgradeLevel: number = 0,
): number {
  const sector = findSector(owned.assetId)
  if (!sector) return 0

  const marketMult = sector.marketMultiplier[state.market.condition]
  const trendMult = SECTOR_TREND_MULTIPLIER[state.sectorStates[owned.assetId].trend]
  const upgradeMult = Math.pow(SECTOR_UPGRADE_INCOME_MULTIPLIER, upgradeLevel)

  // 소득유형별 기본 소득 계산
  let baseCalc: number
  switch (sector.incomeType) {
    case 'stable':
      baseCalc = sector.baseIncome * trendMult
      break
    case 'marketLinked':
      baseCalc = owned.currentValue * sector.yieldRate * marketMult
      break
    case 'valueLinked':
      baseCalc = owned.currentValue * sector.yieldRate
      break
    case 'inverse':
      // 불황 시 소득 증가, 호황 시 소득 감소
      baseCalc = sector.baseIncome * (1 / marketMult)
      break
    case 'leveraged':
      baseCalc = owned.currentValue * sector.yieldRate * marketMult * marketMult
      break
    case 'special':
      baseCalc = sector.baseIncome
      break
  }

  // 지배력 보너스에 특성 배율 적용
  const rawDominanceBonus = dominance[owned.assetId]?.incomeBonus ?? 1
  const dominanceMult = rawDominanceBonus === 1
    ? 1
    : 1 + (rawDominanceBonus - 1) * dominanceBonusMultiplier

  return baseCalc * upgradeMult * dominanceMult * sectorTraitMultiplier
}

/** 모든 보유 구좌의 턴당 소득 합산 (하위 호환) */
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
  const tolerance = state.totalMoney * 0.001
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
