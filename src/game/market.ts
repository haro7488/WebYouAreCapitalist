import type { MarketState, MarketCondition } from './types'
import type { Rng } from './utils'
import { MARKET_CHANGE_MIN_TURNS, MARKET_CHANGE_MAX_TURNS } from './constants'

const CONDITIONS: MarketCondition[] = ['boom', 'stable', 'recession']
const TRANSITION_WEIGHTS: Record<MarketCondition, Record<MarketCondition, number>> = {
  boom: { boom: 0.2, stable: 0.5, recession: 0.3 },
  stable: { boom: 0.3, stable: 0.4, recession: 0.3 },
  recession: { boom: 0.3, stable: 0.5, recession: 0.2 },
}

/** 초기 시장 상태 생성 */
export function createInitialMarket(rng: Rng): MarketState {
  return {
    condition: rng.pick(CONDITIONS),
    turnsRemaining: rng.int(MARKET_CHANGE_MIN_TURNS, MARKET_CHANGE_MAX_TURNS + 1),
    volatility: 0.3 + rng.random() * 0.4, // 0.3 ~ 0.7
  }
}

/** 시장 상태 업데이트 (매 턴 호출) */
export function updateMarket(market: MarketState, rng: Rng): MarketState {
  const remaining = market.turnsRemaining - 1

  if (remaining > 0) {
    return { ...market, turnsRemaining: remaining }
  }

  // 시장 전환
  const weights = TRANSITION_WEIGHTS[market.condition]
  const roll = rng.random()
  let cumulative = 0
  let newCondition: MarketCondition = 'stable'

  for (const cond of CONDITIONS) {
    cumulative += weights[cond]
    if (roll < cumulative) {
      newCondition = cond
      break
    }
  }

  return {
    condition: newCondition,
    turnsRemaining: rng.int(MARKET_CHANGE_MIN_TURNS, MARKET_CHANGE_MAX_TURNS + 1),
    volatility: newCondition === 'boom' ? 0.2 + rng.random() * 0.3
      : newCondition === 'recession' ? 0.5 + rng.random() * 0.4
      : 0.3 + rng.random() * 0.4,
  }
}
