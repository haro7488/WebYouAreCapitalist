import type { GameState, GameConfig, Company, MetaState, RunResult, RunResultRanking, Sector, DominanceInfo, StrategyId } from './types'
import {
  STARTING_INFLUENCE,
  META_CURRENCY_RATE,
  PLAYER_COMPANY_ID,
  DEFAULT_COMPANY_NAME,
  DEFAULT_GAME_CONFIG,
  SECTOR_TREND_MULTIPLIER,
  ALL_SECTORS,
} from './constants'
import { createRng, generateRunId, generateSeed } from './utils'
import type { Rng } from './utils'
import { assignCompanyNames } from './competitor/names'
import { STRATEGIES } from './competitor/strategies'
import { createInitialMarket, createInitialSectorStates } from './market'
import { getMetaEffects } from './meta'
import { findSector, calculateScore, calculateNetWorth, calculateDominance } from './economy'
import { TRAIT_REGISTRY } from './traits'

// 섹터 친화 → 기피 충돌 매핑
const SECTOR_AFFINITY_TO_AVERSION: Record<string, string> = {
  'food-affinity': 'food-aversion',
  'tech-affinity': 'tech-aversion',
  'estate-affinity': 'estate-aversion',
  'logistics-affinity': 'logistics-aversion',
  'finance-affinity': 'finance-aversion',
  'energy-affinity': 'energy-aversion',
}

/** 시작 특성 배정: 긍정 1개 + 부정 1개 (섹터 충돌 방지) */
function assignStartingTraits(rng: Rng): string[] {
  const positiveTraits = TRAIT_REGISTRY.filter(t => t.type === 'positive')
  const negativeTraits = TRAIT_REGISTRY.filter(t => t.type === 'negative')

  // 긍정 특성 1개 랜덤
  const positive = rng.pick(positiveTraits)

  // 같은 섹터의 기피 특성 제외
  const excludeId = SECTOR_AFFINITY_TO_AVERSION[positive.id]
  const eligibleNegatives = excludeId
    ? negativeTraits.filter(t => t.id !== excludeId)
    : negativeTraits

  // 부정 특성 1개 랜덤
  const negative = rng.pick(eligibleNegatives)

  return [positive.id, negative.id]
}

/** 새 런 시작 */
export function startNewRun(meta: MetaState, config?: Partial<GameConfig>): GameState {
  const cfg: GameConfig = { ...DEFAULT_GAME_CONFIG, ...config }
  const seed = generateSeed()
  const rng = createRng(seed)
  const metaEffects = getMetaEffects(meta)

  const startingCash = cfg.startingMoney + metaEffects.startingMoneyBonus

  const playerCompany: Company = {
    id: PLAYER_COMPANY_ID,
    name: DEFAULT_COMPANY_NAME,
    cash: startingCash,
    assets: [],
    sectorUpgrades: {},
    researchPoints: 0,
    researchPity: {},
    influence: STARTING_INFLUENCE + metaEffects.startingInfluence,
    debt: 0,
    revenue: 0,
    expenses: 0,
    actionsThisTurn: [],
    researchResult: null,
    researchHistory: [],
    activeEffects: [],
    netWorth: startingCash,
    dominatedSectors: [],
    traits: assignStartingTraits(rng),
    goalCompleted: false,
    netWorthHistory: [startingCash],
    revenueHistory: [0],
    expenseHistory: [0],
    cashHistory: [startingCash],
  }

  // 경쟁사 생성
  const competitorNames = assignCompanyNames(cfg.competitorCount, rng.random)
  const strategyKeys = Object.keys(STRATEGIES) as StrategyId[]
  const aiStrategies: Record<string, StrategyId> = {}
  const competitors: Company[] = competitorNames.map((name, i) => {
    const id = `competitor-${i}`
    aiStrategies[id] = rng.pick(strategyKeys)
    return {
      id,
      name,
      cash: startingCash,
      assets: [],
      sectorUpgrades: {},
      researchPoints: 0,
      researchPity: {},
      influence: STARTING_INFLUENCE,
      debt: 0,
      revenue: 0,
      expenses: 0,
      actionsThisTurn: [],
      researchResult: null,
      researchHistory: [],
      activeEffects: [],
      netWorth: startingCash,
      dominatedSectors: [],
      traits: assignStartingTraits(rng),
      goalCompleted: false,
      netWorthHistory: [startingCash],
      revenueHistory: [0],
      expenseHistory: [0],
      cashHistory: [startingCash],
    }
  })

  const competitorTotalCash = startingCash * cfg.competitorCount

  const allCompanies = [playerCompany, ...competitors]

  // 초기 순위: 모두 동일 순자산이므로 인덱스 순서대로 1~N
  const initialRanks = allCompanies.map((_, i) => i + 1)

  const initialMarket = createInitialMarket(rng)
  const initialSectorStates = createInitialSectorStates(rng)

  // 초기 섹터별 매입가
  const initialSectorPrices: Partial<Record<Sector, number[]>> = {}
  for (const sectorId of ALL_SECTORS) {
    const profile = findSector(sectorId)
    if (!profile) continue
    const marketMult = profile.marketMultiplier[initialMarket.condition]
    const trendMult = SECTOR_TREND_MULTIPLIER[initialSectorStates[sectorId].trend]
    const price = Math.floor(profile.baseCost * marketMult * trendMult) // 초기 인플레이션 = 1
    initialSectorPrices[sectorId] = [price]
  }

  return {
    runId: generateRunId(),
    seed,
    turn: 1,
    maxTurns: cfg.maxTurns + metaEffects.extraTurns,
    phase: 'planning',

    companies: allCompanies,

    marketPool: cfg.marketPool + competitorTotalCash,
    totalMoney: cfg.marketPool + startingCash + competitorTotalCash,

    market: initialMarket,
    sectorStates: initialSectorStates,

    currentEvent: null,
    pendingEvents: [],
    currentEventIndex: 0,
    eventHistory: [],

    inflation: 0.02,
    cumulativeInflation: 1,
    governmentEvent: null,
    selectedGoal: null,

    aiStrategies,
    config: cfg,

    rankingHistory: [initialRanks],

    inflationHistory: [1],
    inflationRateHistory: [0.02],

    sectorPriceHistory: initialSectorPrices,

    marketConditionHistory: [],
    volatilityHistory: [],

    lastResearchResult: null,

    rngState: rng.getState(),

    isGameOver: false,
    gameOverReason: null,
  }
}

/** 런 종료 처리 */
export function endRun(finalState: GameState, meta: MetaState): { result: RunResult; updatedMeta: MetaState } {
  const player = finalState.companies[0]
  const score = calculateScore(finalState)
  const netWorth = calculateNetWorth(finalState)
  const metaCurrencyEarned = Math.max(1, Math.floor(score * META_CURRENCY_RATE))

  // 지배 섹터 계산
  const dominance = calculateDominance(player.assets)
  const dominatedSectors = (Object.entries(dominance) as [Sector, DominanceInfo][])
    .filter(([, info]) => info.level === 'dominant')
    .map(([sector]) => sector)

  // 전체 기업 순위 (순자산 내림차순)
  const rankings: RunResultRanking[] = finalState.companies
    .map((c, i) => {
      const dom = calculateDominance(c.assets)
      const domSectors = (Object.entries(dom) as [Sector, DominanceInfo][])
        .filter(([, info]) => info.level === 'dominant')
        .map(([s]) => s)
      return {
        name: c.name,
        netWorth: c.netWorth,
        dominatedSectors: domSectors,
        isPlayer: i === 0,
      }
    })
    .sort((a, b) => b.netWorth - a.netWorth)

  const result: RunResult = {
    finalMoney: player.cash,
    netWorth,
    totalTurns: finalState.turn,
    score,
    metaCurrencyEarned,
    ownedAssets: player.assets,
    dominatedSectors,
    maxInfluence: player.influence,
    rankings,
    rankingHistory: finalState.rankingHistory,
    companyNames: finalState.companies.map(c => c.name),
    companyNetWorthHistories: finalState.companies.map(c => c.netWorthHistory),
    companyRevenueHistories: finalState.companies.map(c => c.revenueHistory),
    goalAchieved: player.goalCompleted,
    goalBonus: player.goalCompleted && finalState.selectedGoal ? finalState.selectedGoal.bonus : undefined,
  }

  const updatedMeta: MetaState = {
    ...meta,
    currency: meta.currency + metaCurrencyEarned,
    totalRunsPlayed: meta.totalRunsPlayed + 1,
    bestScore: Math.max(meta.bestScore, score),
  }

  return { result, updatedMeta }
}
