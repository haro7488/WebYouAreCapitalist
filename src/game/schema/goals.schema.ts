import type { Goal } from '../types'
import goalsData from '../data/goals.json'

/** 목표 JSON 로드 및 타입 변환 */
export const GOALS: Goal[] = goalsData as Goal[]

/** ID로 목표 조회 */
export function findGoal(goalId: string): Goal | undefined {
  return GOALS.find((g) => g.id === goalId)
}

/** 랜덤으로 N개 목표 선택 (시드 RNG 사용 권장) */
export function selectRandomGoals(count: number, rng: () => number): Goal[] {
  const shuffled = [...GOALS].sort(() => rng() - 0.5)
  return shuffled.slice(0, Math.min(count, GOALS.length))
}
