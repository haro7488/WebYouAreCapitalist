// === 턴 페이즈 ===
export type TurnPhase = 'planning' | 'event' | 'resolution' | 'result'

// === 시장 ===
export type MarketCondition = 'boom' | 'stable' | 'recession'

export interface MarketState {
  condition: MarketCondition
  turnsRemaining: number // 이 상태가 유지될 남은 턴
  volatility: number // 0-1, 이벤트 발생 확률에 영향
}

// === 섹터 ===
export type Sector = 'food' | 'tech' | 'realEstate' | 'retail' | 'finance'
export type AssetTier = 1 | 2 | 3
export type SectorTrend = 'hot' | 'neutral' | 'cold'

export interface SectorState {
  trend: SectorTrend
  turnsRemaining: number
}

// === 지배력 ===
export type DominanceLevel = 'entrant' | 'competitor' | 'dominant'

export interface DominanceInfo {
  level: DominanceLevel
  count: number
  incomeBonus: number // 1.0, 1.1, 1.25
}

// === 자산 ===
export type RiskLevel = 'low' | 'medium' | 'high'

export interface Asset {
  id: string
  name: string
  description: string
  sector: Sector
  tier: AssetTier
  cost: number
  baseIncome: number // 턴당 절대 수익 ($)
  appreciation: number // 턴당 자산가치 상승률 (0.02 = 2%)
  riskLevel: RiskLevel
  marketMultiplier: Record<MarketCondition, number>
  maxUpgradeLevel: number // 0~3
}

export interface OwnedAsset {
  assetId: string
  purchaseTurn: number
  purchasePrice: number // 매입가
  upgradeLevel: number // 0~3
  currentValue: number // 현재 평가 가치 (매 턴 갱신)
}

// === 시장 조사 ===
export type ResearchResult =
  | { type: 'market'; turnsToChange: number; likelyNext: MarketCondition }
  | { type: 'sector'; sector: Sector; nextTrend: SectorTrend }
  | { type: 'event'; hint: string }

// === 이벤트 ===
export interface EventEffect {
  money?: number // 직접 자금 변화
  revenueMultiplier?: number // 수익 배율 (1턴간)
  expenseMultiplier?: number // 지출 배율 (1턴간)
  influence?: number // 영향력 변화
  marketShift?: MarketCondition // 시장 강제 전환
  sectorShift?: { sector: Sector; trend: SectorTrend } // 섹터 트렌드 강제 전환
  freeAsset?: string // 무료로 획득하는 자산 ID
  nextPurchaseDiscount?: number // 다음 매입 할인율 (0-1)
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
  choices: [EventChoice, EventChoice] // 기본 2개 선택지
  minTurn: number // 이 이벤트가 나올 수 있는 최소 턴
  weight: number // 등장 확률 가중치
  condition?: (state: GameState) => boolean // 조건부 이벤트
  dominanceChoice?: {
    sector: Sector
    choice: EventChoice // 지배자 등급 시 활성화되는 제3 선택지
  }
}

// === 턴 액션 ===
export type TurnAction =
  | { type: 'buy'; assetId: string }
  | { type: 'sell'; ownedIndex: number }
  | { type: 'upgrade'; ownedIndex: number }
  | { type: 'research'; target: 'market' | 'sector' | 'event'; sector?: Sector }
  | { type: 'endTurn' }

// === 핵심 게임 상태 ===
export interface GameState {
  runId: string
  seed: number
  turn: number
  maxTurns: number
  phase: TurnPhase

  money: number
  revenue: number // 이번 턴 수익
  expenses: number // 이번 턴 지출
  influence: number // 0-100, 영향력

  market: MarketState
  sectorStates: Record<Sector, SectorState> // 섹터별 트렌드 상태
  ownedAssets: OwnedAsset[] // 보유 자산

  actionPoints: number // 이번 턴 남은 AP
  maxActionPoints: number // 이번 턴 최대 AP
  actionsThisTurn: TurnAction[] // 이번 턴 수행한 액션 기록
  researchResult: ResearchResult | null // 시장 조사 결과

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

// === 메타 진행 ===
export interface MetaEffect {
  startingMoneyBonus: number
  extraTurns: number
  incomeMultiplier: number // 소득 배율
  purchaseCostDiscount: number // 매입 비용 할인율 (0-1)
  eventRerollChance: number // 이벤트 리롤 확률 (0-1)
  extraActionPoints: number // 추가 AP
  startingInfluence: number // 시작 영향력
}

export interface MetaUpgrade {
  id: string
  name: string
  description: string
  cost: number // 메타 화폐 비용
  maxLevel: number
  effect: (level: number) => MetaEffect
}

export interface MetaState {
  currency: number // 메타 화폐
  totalRunsPlayed: number
  bestScore: number
  upgrades: Record<string, number> // upgradeId -> level
}

// === 런 결과 ===
export interface RunResult {
  finalMoney: number
  netWorth: number // 현금 + 자산 가치
  totalTurns: number
  score: number
  metaCurrencyEarned: number
  ownedAssets: OwnedAsset[]
  dominatedSectors: Sector[]
  maxInfluence: number
}
