import type { GameState, Company, TurnAction, GameEvent } from '../types'
import { getStrategyById } from './strategies'

/** GameState의 전략 매핑으로 AI 턴 액션 생성 */
export function getAIActions(state: GameState, company: Company): TurnAction[] {
  const strategyId = state.aiStrategies[company.id]
  if (!strategyId) return [{ type: 'endTurn' }]
  const strategy = getStrategyById(strategyId)
  return strategy.decide(state, company)
}

/** GameState의 전략 매핑으로 AI 이벤트 선택 */
export function getAIEventChoice(state: GameState, company: Company, event: GameEvent): string {
  const strategyId = state.aiStrategies[company.id]
  if (!strategyId) return event.choices[0].id
  const strategy = getStrategyById(strategyId)
  return strategy.chooseEvent(state, company, event)
}
