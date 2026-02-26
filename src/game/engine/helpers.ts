import type { GameState, Company, Sector } from '../types'
import { SECTOR_TREND_MULTIPLIER } from '../constants'
import { findSector, updateCompany } from '../economy'

// === 엔진 공용 헬퍼 ===

/** 기업 상태를 교체한 새 GameState 반환 (companies[0]) */
export function withPlayer(state: GameState, updated: Company): GameState {
  return { ...state, companies: updateCompany(state, 0, updated) }
}

/** 특정 인덱스의 기업 상태를 교체한 새 GameState 반환 */
export function withCompany(state: GameState, index: number, updated: Company): GameState {
  return { ...state, companies: updateCompany(state, index, updated) }
}

/** 섹터의 현재 시장가 계산 */
export function getCurrentSectorPrice(sector: Sector, state: GameState): number {
  const profile = findSector(sector)
  if (!profile) return 0
  const marketMult = profile.marketMultiplier[state.market.condition]
  const trendMult = SECTOR_TREND_MULTIPLIER[state.sectorStates[sector].trend]
  return Math.floor(profile.baseCost * marketMult * trendMult * state.cumulativeInflation)
}
