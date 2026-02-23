import type { GameState, Company, MetaState, RunResult, RunResultRanking, Sector, DominanceInfo } from './types'
import {
  STARTING_MONEY,
  MAX_TURNS,
  STARTING_INFLUENCE,
  BASE_ACTION_POINTS,
  META_CURRENCY_RATE,
  INITIAL_MARKET_POOL,
  PLAYER_COMPANY_ID,
  DEFAULT_COMPANY_NAME,
  DEFAULT_COMPETITOR_COUNT,
} from './constants'
import { createRng, generateRunId, generateSeed } from './utils'
import { assignCompanyNames } from './competitor/names'
import { STRATEGIES } from './competitor/strategies'
import { createInitialMarket, createInitialSectorStates } from './market'
import { getMetaEffects } from './meta'
import { calculateScore, calculateNetWorth, calculateDominance } from './economy'

/** 새 런 시작 */
export function startNewRun(meta: MetaState): GameState {
  const seed = generateSeed()
  const rng = createRng(seed)
  const metaEffects = getMetaEffects(meta)

  const maxAp = BASE_ACTION_POINTS + metaEffects.extraActionPoints
  const startingCash = STARTING_MONEY + metaEffects.startingMoneyBonus

  const playerCompany: Company = {
    id: PLAYER_COMPANY_ID,
    name: DEFAULT_COMPANY_NAME,
    cash: startingCash,
    assets: [],
    influence: STARTING_INFLUENCE + metaEffects.startingInfluence,
    ap: maxAp,
    maxAp,
    revenue: 0,
    expenses: 0,
    actionsThisTurn: [],
    researchResult: null,
    activeEffects: [],
    netWorth: startingCash,
    dominatedSectors: [],
  }

  // 경쟁사 생성
  const competitorNames = assignCompanyNames(DEFAULT_COMPETITOR_COUNT, rng.random)
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
      ap: BASE_ACTION_POINTS,
      maxAp: BASE_ACTION_POINTS,
      revenue: 0,
      expenses: 0,
      actionsThisTurn: [],
      researchResult: null,
      activeEffects: [],
      netWorth: startingCash,
      dominatedSectors: [],
    }
  })

  const competitorTotalCash = startingCash * DEFAULT_COMPETITOR_COUNT

  return {
    runId: generateRunId(),
    seed,
    turn: 1,
    maxTurns: MAX_TURNS + metaEffects.extraTurns,
    phase: 'planning',

    companies: [playerCompany, ...competitors],

    marketPool: INITIAL_MARKET_POOL + competitorTotalCash,
    totalMoney: INITIAL_MARKET_POOL + startingCash + competitorTotalCash,

    market: createInitialMarket(rng),
    sectorStates: createInitialSectorStates(rng),

    currentEvent: null,
    eventHistory: [],

    aiStrategies,

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
  }

  const updatedMeta: MetaState = {
    ...meta,
    currency: meta.currency + metaCurrencyEarned,
    totalRunsPlayed: meta.totalRunsPlayed + 1,
    bestScore: Math.max(meta.bestScore, score),
  }

  return { result, updatedMeta }
}
