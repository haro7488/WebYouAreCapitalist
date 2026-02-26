import type { GameState, Company } from '../types'
import { calculateCompanyNetWorth, calculateDominance } from '../economy'

/**
 * 목표 달성 여부 확인
 */
export function checkGoalCompletion(state: GameState, company: Company, goalId: string): boolean {
  if (!state.selectedGoal || state.selectedGoal.id !== goalId) {
    return false
  }

  const goal = state.selectedGoal
  const condition = goal.condition

  switch (goal.type) {
    case 'domination': {
      if ('minDominatedSectors' in condition) {
        const dominance = calculateDominance(company.assets)
        const dominatedCount = Object.values(dominance).filter((d) => d.level === 'dominant').length
        return dominatedCount >= condition.minDominatedSectors
      }
      return false
    }

    case 'asset': {
      if ('minNetWorth' in condition) {
        const netWorth = calculateCompanyNetWorth(company)
        return netWorth >= condition.minNetWorth
      }
      return false
    }

    case 'influence': {
      if ('minInfluence' in condition) {
        return company.influence >= condition.minInfluence
      }
      return false
    }
  }
}

/**
 * 플레이어의 목표 달성 여부 확인 (편의 함수)
 */
export function checkPlayerGoalCompletion(state: GameState): boolean {
  if (!state.selectedGoal) return false
  const player = state.companies[0]
  return checkGoalCompletion(state, player, state.selectedGoal.id)
}
