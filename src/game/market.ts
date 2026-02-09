import type { MarketState, MarketCondition, Sector, SectorState, SectorTrend } from './types'
import type { Rng } from './utils'
import {
  MARKET_CHANGE_MIN_TURNS,
  MARKET_CHANGE_MAX_TURNS,
  MARKET_TRANSITION,
  SECTOR_TREND_MIN_TURNS,
  SECTOR_TREND_MAX_TURNS,
  SECTOR_TREND_TRANSITION,
} from './constants'

const CONDITIONS: MarketCondition[] = ['boom', 'stable', 'recession']
const TRENDS: SectorTrend[] = ['hot', 'neutral', 'cold']
const SECTORS: Sector[] = ['food', 'tech', 'realEstate', 'retail', 'finance']

/** 가중치 기반 랜덤 선택 */
function weightedPick<T extends string>(
  options: T[],
  weights: Record<T, number>,
  rng: Rng,
): T {
  const roll = rng.random()
  let cumulative = 0
  for (const option of options) {
    cumulative += weights[option]
    if (roll < cumulative) return option
  }
  return options[options.length - 1]
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
  const newCondition = weightedPick(CONDITIONS, MARKET_TRANSITION[market.condition], rng)

  return {
    condition: newCondition,
    turnsRemaining: rng.int(MARKET_CHANGE_MIN_TURNS, MARKET_CHANGE_MAX_TURNS + 1),
    volatility: newCondition === 'boom' ? 0.2 + rng.random() * 0.3
      : newCondition === 'recession' ? 0.5 + rng.random() * 0.4
      : 0.3 + rng.random() * 0.4,
  }
}

/** 초기 섹터 트렌드 상태 생성 */
export function createInitialSectorStates(rng: Rng): Record<Sector, SectorState> {
  const states = {} as Record<Sector, SectorState>
  for (const sector of SECTORS) {
    states[sector] = {
      trend: rng.pick(TRENDS),
      turnsRemaining: rng.int(SECTOR_TREND_MIN_TURNS, SECTOR_TREND_MAX_TURNS + 1),
    }
  }
  return states
}

/** 섹터 트렌드 업데이트 (매 턴 호출) */
export function updateSectorTrends(
  sectorStates: Record<Sector, SectorState>,
  marketCondition: MarketCondition,
  rng: Rng,
): Record<Sector, SectorState> {
  const updated = {} as Record<Sector, SectorState>

  for (const sector of SECTORS) {
    const current = sectorStates[sector]
    const remaining = current.turnsRemaining - 1

    if (remaining > 0) {
      updated[sector] = { ...current, turnsRemaining: remaining }
      continue
    }

    // 트렌드 전환: 글로벌 시장이 hot 확률에 영향
    const baseWeights = SECTOR_TREND_TRANSITION[current.trend]
    const adjusted = { ...baseWeights }

    // 호황 시 hot 확률 +10%, 불황 시 cold 확률 +10%
    if (marketCondition === 'boom') {
      adjusted.hot += 0.10
      adjusted.neutral -= 0.05
      adjusted.cold -= 0.05
    } else if (marketCondition === 'recession') {
      adjusted.cold += 0.10
      adjusted.neutral -= 0.05
      adjusted.hot -= 0.05
    }

    const newTrend = weightedPick(TRENDS, adjusted, rng)

    updated[sector] = {
      trend: newTrend,
      turnsRemaining: rng.int(SECTOR_TREND_MIN_TURNS, SECTOR_TREND_MAX_TURNS + 1),
    }
  }

  return updated
}
