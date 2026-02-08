import type { GameState, MetaState, RunResult } from './types'
import { STARTING_MONEY, MAX_TURNS, STARTING_REPUTATION, META_CURRENCY_RATE } from './constants'
import { createRng, generateRunId, generateSeed } from './utils'
import { createInitialMarket } from './market'
import { getMetaEffects } from './meta'
import { calculateScore } from './economy'

/** 새 런 시작 */
export function startNewRun(meta: MetaState): GameState {
  const seed = generateSeed()
  const rng = createRng(seed)
  const metaEffects = getMetaEffects(meta)

  return {
    runId: generateRunId(),
    seed,
    turn: 1,
    maxTurns: MAX_TURNS + (metaEffects.extraTurns ?? 0),
    phase: 'planning',

    money: STARTING_MONEY + (metaEffects.startingMoneyBonus ?? 0),
    revenue: 0,
    expenses: 0,
    reputation: STARTING_REPUTATION,

    market: createInitialMarket(rng),
    investments: [],

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
  const metaCurrencyEarned = Math.max(1, Math.floor(score * META_CURRENCY_RATE))

  const result: RunResult = {
    finalMoney: finalState.money,
    totalTurns: finalState.turn,
    score,
    metaCurrencyEarned,
    investments: finalState.investments,
  }

  const updatedMeta: MetaState = {
    ...meta,
    currency: meta.currency + metaCurrencyEarned,
    totalRunsPlayed: meta.totalRunsPlayed + 1,
    bestScore: Math.max(meta.bestScore, score),
  }

  return { result, updatedMeta }
}
