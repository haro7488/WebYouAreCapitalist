import type { GameState, Company, TurnAction, Sector } from '../types'
import { RND_SECTOR } from '../types'
import {
  SECTOR_TREND_MULTIPLIER,
  INFLUENCE_DECAY_PER_TURN,
  RANK_FIRST_INFLUENCE_BONUS,
  BANKRUPTCY_INTEREST_RATE,
} from '../constants'
import { createRng, clamp } from '../utils'
import {
  findSector,
  calculateCompanyNetIncome,
  calculatePoolScaledIncomes,
  calculateAssetValue,
  calculateGlobalDominance,
  calculateRankings,
  getCompanyRank,
  calculateCompanyNetWorth,
  recalculateMarketPool,
  assertMoneyConservation,
} from '../economy'
import { updateMarket, updateSectorTrends } from '../market'
import { applyInflation } from '../logic/inflation'
import { getCompanyTraitEffects } from '../logic/traitEngine'
import { checkGoalCompletion } from '../logic/goalEngine'

// === 턴 해결 ===

/** 경제 계산 + 구좌 가치 갱신 + 시장/섹터 업데이트 (전체 Company 순회) */
export function resolveEconomy(state: GameState): GameState {
  const rng = createRng(state.rngState)

  // 1단계: 시장 풀 비례 축소 적용한 소득 계산
  const { scaledIncomes } = calculatePoolScaledIncomes(state)

  let totalInterestCollected = 0
  let totalAssetValueIncrease = 0

  let updatedCompanies = state.companies.map((company, idx) => {
    const income = calculateCompanyNetIncome(company, state, scaledIncomes[idx])

    // 보유 구좌 현재 가치 갱신 전 총 가치 계산
    const oldAssetValue = company.assets.reduce((sum, owned) => sum + owned.currentValue, 0)

    // 보유 구좌 현재 가치 갱신 (시장가 기반)
    const updatedAssets = company.assets.map((owned) => ({
      ...owned,
      currentValue: calculateAssetValue(owned, state),
    }))

    // 자산 가치 증가분 추적
    const newAssetValue = updatedAssets.reduce((sum, owned) => sum + owned.currentValue, 0)
    const assetValueIncrease = newAssetValue - oldAssetValue
    totalAssetValueIncrease += assetValueIncrease

    // 영향력 자연 감소 (특성에 의한 감소 배율 적용)
    const companyTraitEffects = getCompanyTraitEffects(company)
    const influenceDecay = INFLUENCE_DECAY_PER_TURN * companyTraitEffects.influenceDecayMultiplier
    const newInfluence = clamp(company.influence - influenceDecay, 0, 100)

    let newCash = company.cash + income.net

    // 파산 이자 페널티: cash < 0이면 마이너스가 증폭
    let interestPenalty = 0
    if (newCash < 0) {
      interestPenalty = Math.abs(newCash) * BANKRUPTCY_INTEREST_RATE
      newCash = newCash - interestPenalty
      totalInterestCollected += interestPenalty
    }

    const updatedCompany: Company = {
      ...company,
      cash: newCash,
      revenue: income.revenue,
      expenses: income.expenses,
      influence: newInfluence,
      assets: updatedAssets,
      activeEffects: [], // 턴 효과 초기화
      netWorth: 0, // 아래에서 재계산
      dominatedSectors: [],
    }

    return {
      ...updatedCompany,
      netWorth: calculateCompanyNetWorth(updatedCompany),
    }
  })

  // 2단계: 글로벌 지배력 — 점유율 기반
  updatedCompanies = updatedCompanies.map((company) => {
    const dominance = calculateGlobalDominance(company, updatedCompanies)
    const dominatedSectors = (Object.entries(dominance) as [Sector, { level: string }][])
      .filter(([, info]) => info.level === 'dominant')
      .map(([sector]) => sector)
    return { ...company, dominatedSectors }
  })

  // 2.5단계: 목표 달성 체크 및 보너스 적용 (플레이어만)
  if (state.selectedGoal) {
    const playerIndex = 0
    const player = updatedCompanies[playerIndex]

    const isGoalCompleted = checkGoalCompletion(state, player, state.selectedGoal.id)

    if (isGoalCompleted && !player.goalCompleted) {
      const bonus = state.selectedGoal.bonus
      updatedCompanies = updatedCompanies.map((company, i) => {
        if (i === playerIndex) {
          return {
            ...company,
            netWorth: company.netWorth + bonus,
            goalCompleted: true,
          }
        }
        return company
      })
    } else if (!isGoalCompleted) {
      updatedCompanies = updatedCompanies.map((company, i) => {
        if (i === playerIndex) {
          return { ...company, goalCompleted: false }
        }
        return company
      })
    }
  }

  // 3단계: 순위 효과 — 1위 영향력 보너스
  const rankings = calculateRankings(updatedCompanies)
  const firstPlaceIdx = rankings[0]
  updatedCompanies = updatedCompanies.map((company, i) => {
    if (i === firstPlaceIdx) {
      return {
        ...company,
        influence: clamp(company.influence + RANK_FIRST_INFLUENCE_BONUS, 0, 100),
      }
    }
    return company
  })

  // 인플레이션 누적 업데이트
  const inflatedState = applyInflation({ ...state, companies: updatedCompanies })

  // 시장 + 섹터 트렌드 업데이트
  const newMarket = updateMarket(state.market, rng)
  const newSectorStates = updateSectorTrends(state.sectorStates, newMarket.condition, rng)

  const newState: GameState = {
    ...inflatedState,
    market: newMarket,
    sectorStates: newSectorStates,
    rngState: rng.getState(),
  }

  // 화폐 보존: 자산 가치 증가분 반영 후 풀 재계산
  const newTotalMoney = newState.totalMoney + totalAssetValueIncrease
  const stateWithUpdatedMoney: GameState = {
    ...newState,
    totalMoney: newTotalMoney,
  }

  const updatedState: GameState = {
    ...stateWithUpdatedMoney,
    marketPool: recalculateMarketPool(stateWithUpdatedMoney) + totalInterestCollected,
  }

  // 화폐 보존 검증
  assertMoneyConservation(updatedState)

  return updatedState
}

/** 승패 판정 */
export function checkGameOver(state: GameState): GameState {
  if (state.turn >= state.maxTurns) {
    return { ...state, isGameOver: true, gameOverReason: 'completed' }
  }
  return state
}

/** Resolution Phase: 경제 계산 실행 */
export function resolvePhase(state: GameState): GameState {
  if (state.phase !== 'resolution') return state

  const newCumulativeInflation = state.cumulativeInflation * (1 + state.inflation)
  const resolved = resolveEconomy({ ...state, cumulativeInflation: newCumulativeInflation })
  return { ...resolved, phase: 'result' }
}

/** Result Phase: 다음 턴으로 진행 */
export function advanceTurn(state: GameState): GameState {
  if (state.phase !== 'result') return state

  const checked = checkGameOver(state)
  if (checked.isGameOver) return checked

  // 순위 기록 추가
  const currentRanks = checked.companies.map((_, i) => getCompanyRank(checked.companies, i))
  const newRankingHistory = [...checked.rankingHistory, currentRanks]

  // 기업별 수치 히스토리 기록
  const historiedCompanies = checked.companies.map(c => ({
    ...c,
    netWorthHistory: [...(c.netWorthHistory ?? []), c.netWorth],
    revenueHistory: [...(c.revenueHistory ?? []), c.revenue],
    expenseHistory: [...(c.expenseHistory ?? []), c.expenses],
    cashHistory: [...(c.cashHistory ?? []), c.cash],
    assets: c.assets.map(a => ({
      ...a,
      valueHistory: [...(a.valueHistory ?? []), a.currentValue],
    })),
  }))

  // 인플레이션 히스토리
  const newInflationHistory = [...(checked.inflationHistory ?? []), checked.cumulativeInflation]
  const newInflationRateHistory = [...(checked.inflationRateHistory ?? []), checked.inflation]

  // 섹터별 매입가 히스토리
  const newSectorPriceHistory: Partial<Record<Sector, number[]>> = { ...checked.sectorPriceHistory }
  for (const sectorId of Object.keys(checked.sectorStates) as Sector[]) {
    const profile = findSector(sectorId)
    if (!profile) continue
    const marketMult = profile.marketMultiplier[checked.market.condition]
    const trendMult = SECTOR_TREND_MULTIPLIER[checked.sectorStates[sectorId].trend]
    const price = Math.floor(profile.baseCost * marketMult * trendMult * checked.cumulativeInflation)
    newSectorPriceHistory[sectorId] = [...(newSectorPriceHistory[sectorId] ?? []), price]
  }

  // 시장 상태 히스토리
  const newMarketConditionHistory = [...(checked.marketConditionHistory ?? []), checked.market.condition]
  const newVolatilityHistory = [...(checked.volatilityHistory ?? []), checked.market.volatility]

  // 턴 상태 초기화 + 연구포인트 지급 (R&D 구좌 1개당 1포인트)
  const resetCompanies = historiedCompanies.map((company) => {
    const rndAssets = company.assets.filter((a) => a.assetId === RND_SECTOR).length
    return {
      ...company,
      actionsThisTurn: [] as TurnAction[],
      researchResult: null,
      researchPoints: (company.researchPoints ?? 0) + rndAssets,
    }
  })

  return {
    ...checked,
    turn: checked.turn + 1,
    phase: 'planning',
    companies: resetCompanies,
    rankingHistory: newRankingHistory,
    inflationHistory: newInflationHistory,
    inflationRateHistory: newInflationRateHistory,
    sectorPriceHistory: newSectorPriceHistory,
    marketConditionHistory: newMarketConditionHistory,
    volatilityHistory: newVolatilityHistory,
  }
}
