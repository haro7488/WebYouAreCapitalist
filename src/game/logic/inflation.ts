import type { GameState } from '../types'

/** 매 턴 인플레이션 누적 계산 */
export function applyInflation(state: GameState): GameState {
  // 인플레이션율 0% 미만 방지 (디플레 없음)
  const inflation = Math.max(0, state.inflation)
  const newCumulativeInflation = state.cumulativeInflation * (1 + inflation)

  return {
    ...state,
    inflation,
    cumulativeInflation: newCumulativeInflation,
  }
}

/** 인플레이션 반영 비용 */
export function getInflatedCost(baseCost: number, cumulativeInflation: number): number {
  return baseCost * cumulativeInflation
}

/** 인플레이션 반영 소득 */
export function getInflatedIncome(baseIncome: number, cumulativeInflation: number): number {
  return baseIncome * cumulativeInflation
}
