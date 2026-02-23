import type { GameState, Company, TurnAction, GameEvent } from '../types'
import type { CompetitorStrategy } from './types'
import { getStrategyById } from './strategies'

/** AI 경쟁사의 턴 행동 결정 */
export function processAITurn(
  state: GameState,
  company: Company,
  strategy: CompetitorStrategy,
): TurnAction[] {
  return strategy.decide(state, company)
}

/** AI 경쟁사의 이벤트 선택 */
export function processAIEvent(
  state: GameState,
  company: Company,
  strategy: CompetitorStrategy,
  event: GameEvent,
): string {
  return strategy.chooseEvent(state, company, event)
}

/** GameState의 전략 매핑으로 AI 턴 액션 생성 */
export function getAIActions(state: GameState, company: Company): TurnAction[] {
  const strategyId = state.aiStrategies[company.id]
  if (!strategyId) return [{ type: 'endTurn' }]
  const strategy = getStrategyById(strategyId)
  return processAITurn(state, company, strategy)
}

/** GameState의 전략 매핑으로 AI 이벤트 선택 */
export function getAIEventChoice(state: GameState, company: Company, event: GameEvent): string {
  const strategyId = state.aiStrategies[company.id]
  if (!strategyId) return event.choices[0].id
  const strategy = getStrategyById(strategyId)
  return processAIEvent(state, company, strategy, event)
}
