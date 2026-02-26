import type { GameState, Company, TurnAction, GameEvent, StrategyId } from '../types'

// === AI 경쟁사 전략 인터페이스 ===

/** 전략 패턴: AI 의사결정 로직을 캡슐화 */
export interface CompetitorStrategy {
  /** Planning Phase: 이번 턴 행동 결정 */
  decide(state: GameState, company: Company): TurnAction[]
  /** Event Phase: 이벤트 선택지 중 하나의 id 반환 */
  chooseEvent(state: GameState, company: Company, event: GameEvent): string
}

/** AI 경쟁사 설정 */
export interface CompetitorConfig {
  id: string
  name: string
  strategyId: StrategyId
}
