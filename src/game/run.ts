import type { GameState, MetaState, RunResult, Sector, DominanceInfo } from './types'
import {
  STARTING_MONEY,
  MAX_TURNS,
  STARTING_INFLUENCE,
  BASE_ACTION_POINTS,
  META_CURRENCY_RATE,
} from './constants'
import { createRng, generateRunId, generateSeed } from './utils'
import { createInitialMarket, createInitialSectorStates } from './market'
import { getMetaEffects } from './meta'
import { calculateScore, calculateNetWorth, calculateDominance } from './economy'

/** 새 런 시작 */
export function startNewRun(meta: MetaState): GameState {
  const seed = generateSeed()
  const rng = createRng(seed)
  const metaEffects = getMetaEffects(meta)

  const maxActionPoints = BASE_ACTION_POINTS + metaEffects.extraActionPoints

  return {
    runId: generateRunId(),
    seed,
    turn: 1,
    maxTurns: MAX_TURNS + metaEffects.extraTurns,
    phase: 'planning',

    money: STARTING_MONEY + metaEffects.startingMoneyBonus,
    revenue: 0,
    expenses: 0,
    influence: STARTING_INFLUENCE + metaEffects.startingInfluence,

    market: createInitialMarket(rng),
    sectorStates: createInitialSectorStates(rng),
    ownedAssets: [],

    actionPoints: maxActionPoints,
    maxActionPoints,
    actionsThisTurn: [],
    researchResult: null,

    activeEffects: [],
    currentEvent: null,
    eventHistory: [],

    rngState: rng.getState(),

    isGameOver: false,
    gameOverReason: null,
  }
}

/** 런 종료 처리 */
export function endRun(finalState: GameState, meta: MetaState): { result: RunResult; updatedMeta: MetaState } {
  const score = calculateScore(finalState)
  const netWorth = calculateNetWorth(finalState)
  const metaCurrencyEarned = Math.max(1, Math.floor(score * META_CURRENCY_RATE))

  // 지배 섹터 계산
  const dominance = calculateDominance(finalState.ownedAssets)
  const dominatedSectors = (Object.entries(dominance) as [Sector, DominanceInfo][])
    .filter(([, info]) => info.level === 'dominant')
    .map(([sector]) => sector)

  const result: RunResult = {
    finalMoney: finalState.money,
    netWorth,
    totalTurns: finalState.turn,
    score,
    metaCurrencyEarned,
    ownedAssets: finalState.ownedAssets,
    dominatedSectors,
    maxInfluence: finalState.influence,
  }

  const updatedMeta: MetaState = {
    ...meta,
    currency: meta.currency + metaCurrencyEarned,
    totalRunsPlayed: meta.totalRunsPlayed + 1,
    bestScore: Math.max(meta.bestScore, score),
  }

  return { result, updatedMeta }
}
