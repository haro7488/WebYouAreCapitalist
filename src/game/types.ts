// === Turn Phase ===
export type TurnPhase = 'planning' | 'event' | 'resolution' | 'result'

// === Market ===
export type MarketCondition = 'boom' | 'stable' | 'recession'

export interface MarketState {
  condition: MarketCondition
  turnsRemaining: number // 이 상태가 유지될 남은 턴
  volatility: number // 0-1, 이벤트 발생 확률에 영향
}

// === Investment ===
export type RiskLevel = 'low' | 'medium' | 'high'

export interface Investment {
  id: string
  name: string
  description: string
  cost: number
  riskLevel: RiskLevel
  baseReturn: number // 턴당 기본 수익률 (0.05 = 5%)
  marketMultiplier: Record<MarketCondition, number> // 시장 상태별 수익 배율
}

export interface OwnedInvestment {
  investmentId: string
  purchaseTurn: number
  amount: number // 투자 원금
}

// === Events ===
export interface EventEffect {
  money?: number // 직접 자금 변화
  revenueMultiplier?: number // 수익 배율 (1턴간)
  expenseMultiplier?: number // 지출 배율 (1턴간)
  reputation?: number // 평판 변화
  marketShift?: MarketCondition // 시장 강제 전환
}

export interface EventChoice {
  id: string
  text: string
  effect: EventEffect
}

export interface GameEvent {
  id: string
  title: string
  description: string
  choices: [EventChoice, EventChoice] // 항상 2개 선택지
  minTurn: number // 이 이벤트가 나올 수 있는 최소 턴
  weight: number // 등장 확률 가중치
  condition?: (state: GameState) => boolean // 조건부 이벤트
}

// === Turn Actions ===
export type TurnAction =
  | { type: 'invest'; investmentId: string; amount: number }
  | { type: 'sell'; ownedIndex: number } // 투자 매각
  | { type: 'upgrade'; upgradeId: string }
  | { type: 'skip' } // 턴 스킵

// === Core Game State ===
export interface GameState {
  runId: string
  seed: number
  turn: number
  maxTurns: number
  phase: TurnPhase

  money: number
  revenue: number // 이번 턴 수익
  expenses: number // 이번 턴 지출
  reputation: number // 0-100

  market: MarketState
  investments: OwnedInvestment[]

  // 턴 임시 효과
  activeEffects: EventEffect[]

  // 이벤트
  currentEvent: GameEvent | null
  eventHistory: string[] // 발생한 이벤트 ID 목록

  // RNG 상태
  rngState: number

  // 게임 종료
  isGameOver: boolean
  gameOverReason: 'bankrupt' | 'completed' | null
}

// === Meta Progression ===
export interface MetaUpgrade {
  id: string
  name: string
  description: string
  cost: number // 메타 화폐 비용
  maxLevel: number
  effect: (level: number) => MetaEffect
}

export interface MetaEffect {
  startingMoneyBonus?: number
  extraTurns?: number
  revenueMultiplier?: number
  investmentCostDiscount?: number // 0-1
  eventRerollChance?: number // 0-1
}

export interface MetaState {
  currency: number // 메타 화폐
  totalRunsPlayed: number
  bestScore: number
  upgrades: Record<string, number> // upgradeId -> level
}

// === Score ===
export interface RunResult {
  finalMoney: number
  totalTurns: number
  score: number
  metaCurrencyEarned: number
  investments: OwnedInvestment[]
}
