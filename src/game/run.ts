import type { GameState, GameConfig, Company, MetaState, RunResult, RunResultRanking, Sector, DominanceInfo } from './types'
import {
  STARTING_INFLUENCE,
  META_CURRENCY_RATE,
  PLAYER_COMPANY_ID,
  DEFAULT_COMPANY_NAME,
  DEFAULT_GAME_CONFIG,
} from './constants'
import { createRng, generateRunId, generateSeed } from './utils'
import { assignCompanyNames } from './competitor/names'
import { STRATEGIES } from './competitor/strategies'
import { createInitialMarket, createInitialSectorStates } from './market'
import { getMetaEffects } from './meta'
import { calculateScore, calculateNetWorth, calculateDominance } from './economy'

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
    traits: [],
    goalCompleted: false,
  }

  // 경쟁사 생성
  const competitorNames = assignCompanyNames(cfg.competitorCount, rng.random)
  const strategyKeys = Object.keys(STRATEGIES)
  const aiStrategies: Record<string, string> = {}
  const competitors: Company[] = competitorNames.map((name, i) => {
    const id = `competitor-${i}`
    aiStrategies[id] = rng.pick(strategyKeys)
    return {
      id,
      name,
      cash: startingCash,
      assets: [],
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
      traits: [],
      goalCompleted: false,
    }
  })

  const competitorTotalCash = startingCash * cfg.competitorCount

  const allCompanies = [playerCompany, ...competitors]

  // 초기 순위: 모두 동일 순자산이므로 인덱스 순서대로 1~N
  const initialRanks = allCompanies.map((_, i) => i + 1)

  return {
    runId: generateRunId(),
    seed,
    turn: 1,
    maxTurns: cfg.maxTurns + metaEffects.extraTurns,
    phase: 'planning',

    companies: allCompanies,

    marketPool: cfg.marketPool + competitorTotalCash,
    totalMoney: cfg.marketPool + startingCash + competitorTotalCash,

    market: createInitialMarket(rng),
    sectorStates: createInitialSectorStates(rng),

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
