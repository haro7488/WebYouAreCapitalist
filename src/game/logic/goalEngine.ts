import type { GameState, Company } from '../types'
import { calculateCompanyNetWorth, calculateDominance } from '../economy'

/**
 * 목표 달성 여부 확인
 * @param state 현재 게임 상태
 * @param company 확인할 기업
 * @param goalId 목표 ID
 * @returns 목표 달성 여부
 */
export function checkGoalCompletion(state: GameState, company: Company, goalId: string): boolean {
  if (!state.selectedGoal || state.selectedGoal.id !== goalId) {
    return false
  }

  const goal = state.selectedGoal
  const condition = goal.condition

  switch (goal.type) {
    case 'domination': {
      // 섹터 지배자 목표
      if (condition.minDominatedSectors !== undefined) {
        const dominance = calculateDominance(company.assets)
        const dominatedCount = Object.values(dominance).filter((d) => d.level === 'dominant').length
        return dominatedCount >= condition.minDominatedSectors
      }
      return false
    }

    case 'asset': {
      // 순자산 목표
      if (condition.minNetWorth !== undefined) {
        const netWorth = calculateCompanyNetWorth(company)
        return netWorth >= condition.minNetWorth
      }
      return false
    }

    case 'influence': {
      // 영향력 목표
      if (condition.minInfluence !== undefined) {
        return company.influence >= condition.minInfluence
      }
      return false
    }

    default:
      return false
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

/**
 * 목표 보너스 금액 반환
 */
export function calculateGoalBonus(goal: { bonus: number }): number {
  return goal.bonus
}
