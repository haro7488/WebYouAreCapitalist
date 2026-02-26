// === 턴 페이즈 ===
export type TurnPhase = 'planning' | 'government' | 'event' | 'resolution' | 'result'

// === 시장 ===
export type MarketCondition = 'boom' | 'stable' | 'recession'

export interface MarketState {
  condition: MarketCondition
  turnsRemaining: number // 이 상태가 유지될 남은 턴
  volatility: number // 0-1, 이벤트 발생 확률에 영향
}

// === 섹터 ===
export type Sector = 'food' | 'tech' | 'realEstate' | 'logistics' | 'energy' | 'finance' | 'information' | 'rnd'
export type SectorTrend = 'hot' | 'neutral' | 'cold'
export type IncomeType = 'stable' | 'marketLinked' | 'valueLinked' | 'inverse' | 'leveraged' | 'special'

// 섹터 식별자 상수 (리터럴 하드코딩 방지)
export const INFORMATION_SECTOR: Sector = 'information'
export const RND_SECTOR: Sector = 'rnd'

export interface SectorState {
  trend: SectorTrend
  turnsRemaining: number
}

// === 지배력 ===
export type DominanceLevel = 'entrant' | 'competitor' | 'dominant'

export interface DominanceInfo {
  level: DominanceLevel
  count: number // 보유 구좌 수
  share: number // 점유율 (0~1)
  incomeBonus: number // 1.0, 1.1, 1.25
}

// === 섹터 프로필 (투자 대상 정의) ===
export type RiskLevel = 'low' | 'medium' | 'high'

export interface SectorProfile {
  id: Sector
  name: string
  icon: string
  baseCost: number // 구좌 기본 가격
  incomeType: IncomeType
  baseIncome: number // 안정형/역행형/특수형용 고정소득
  yieldRate: number // 시장연동/가치연동/레버리지형용 수익률 (0~1)
  theme: string
  description: string
  riskLevel: RiskLevel
  marketMultiplier: Record<MarketCondition, number>
}

// === 보유 구좌 ===
export interface OwnedAsset {
  assetId: Sector // 섹터 ID
  purchaseTurn: number
  purchasePrice: number // 매입 시 실제 지불가
  currentValue: number // 현재 평가액 (매 턴 갱신)
  valueHistory: number[] // 턴별 가치 히스토리
}

// === 시장 조사 ===

/** 조사 기록 1건 */
export interface ResearchRecord {
  turn: number
  result: ResearchResult
}

export type ResearchResult =
  | { type: 'market'; turnsToChange: number; likelyNext: MarketCondition }
  | { type: 'sector'; sector: Sector; nextTrend: SectorTrend }
  | { type: 'event'; hint: string }
  | { type: 'competitor'; companyId: string; companyName: string; assets: OwnedAsset[] }
  | { type: 'strategy'; companyId: string; companyName: string; strategyId: string }
  | { type: 'share'; sector: Sector; shares: { companyId: string; companyName: string; share: number }[] }
  | { type: 'government'; currentInflation: number; inflationTrend: 'rising' | 'stable' | 'falling'; likelyPolicy: { title: string; description: string } | null; affectedSectors: Sector[] }

// === 이벤트 ===
export interface EventEffect {
  money?: number // 직접 자금 변화
  revenueMultiplier?: number // 수익 배율 (1턴간)
  expenseMultiplier?: number // 지출 배율 (1턴간)
  influence?: number // 영향력 변화
  marketShift?: MarketCondition // 시장 강제 전환
  sectorShift?: { sector: Sector; trend: SectorTrend } // 섹터 트렌드 강제 전환
  freeAsset?: Sector // 무료 구좌 획득 섹터
  nextPurchaseDiscount?: number // 다음 매입 할인율 (0-1)
  traitGrant?: string // 특성 부여
  traitRemove?: string // 특성 제거
  inflationDelta?: number // 인플레이션율 변동
}

export interface EventChoice {
  id: string
  text: string
  effect: EventEffect
}

/** 선언형 이벤트 조건 (JSON 기반, AND 평가) */
export interface EventConditions {
  minTurn?: number
  maxTurn?: number
  marketIs?: MarketCondition
  marketNot?: MarketCondition
  minInfluence?: number
  maxInfluence?: number
  minAssets?: number
  minNetWorth?: number
  minCash?: number
  maxCash?: number
  hasTrait?: string
  notTrait?: string
  dominatesSector?: Sector
  dominatesCount?: number
  rank?: number // 최소 순위 (3 = 3위 이하)
  hasSector?: Sector // 해당 섹터 구좌 보유 여부
  hasSectorAsset?: Sector // hasSector 동의어 — JSON 이벤트 조건용
  minInflation?: number
  // 하위 호환
  sectorTrendNot?: { sector: Sector; trend: SectorTrend }
  hasDominance?: boolean
  minRank?: number // rank와 동일
}

export interface GameEvent {
  id: string
  title: string
  description: string
  type?: 'opportunity' | 'choice' | 'pressure' // 이벤트 유형 (가중치 보정용)
  choices: [EventChoice, EventChoice] // 기본 2개 선택지
  minTurn: number // 이 이벤트가 나올 수 있는 최소 턴
  weight: number // 등장 확률 가중치
  conditions?: EventConditions // 선언형 조건
  dominanceChoice?: {
    sector: Sector
    choice: EventChoice // 지배자 등급 시 활성화되는 제3 선택지
  }
}

// === 턴 액션 ===
export type TurnAction =
  | { type: 'buy'; sector: Sector }
  | { type: 'sell'; ownedIndex: number }
  | { type: 'sectorUpgrade'; sector: Sector }
  | { type: 'research'; target: 'market' | 'sector' | 'event' | 'competitor' | 'strategy' | 'share' | 'government'; sector?: Sector; targetCompanyId?: string }
  | { type: 'endTurn' }

// === 기업 엔티티 (플레이어/AI 공통) ===
export interface Company {
  id: string
  name: string
  cash: number // 보유 현금
  assets: OwnedAsset[] // 보유 구좌
  influence: number // 0-100, 영향력
  debt: number // 파산 시 부채
  traits: string[] // 보유 특성 id 목록

  // 섹터 강화 레벨 (0 = 미강화, 최대 10)
  sectorUpgrades: Partial<Record<Sector, number>>

  // 연구 시스템
  researchPoints: number // 보유 연구포인트 (R&D 구좌 1개당 1포인트/턴)
  researchPity: Partial<Record<Sector, number>> // 섹터별 실패 횟수 (천장 확률 시스템)

  // 턴별 계산 결과
  revenue: number // 이번 턴 수익
  expenses: number // 이번 턴 지출

  // 턴별 추적
  actionsThisTurn: TurnAction[]
  researchResult: ResearchResult | null
  researchHistory: ResearchRecord[] // 누적 조사 기록
  activeEffects: EventEffect[]

  // 매 턴 resolution에서 갱신
  netWorth: number // cash + Σ(asset value)
  dominatedSectors: Sector[] // 지배 중인 섹터 목록
  goalCompleted: boolean // 목표 달성 여부

  // 턴별 히스토리
  netWorthHistory: number[]
  revenueHistory: number[]
  expenseHistory: number[]
  cashHistory: number[]
}

// === 핵심 게임 상태 ===
export interface GameState {
  runId: string
  seed: number
  turn: number
  maxTurns: number
  phase: TurnPhase

  // 기업 배열 (동일 엔티티 원칙: human/ai 구분 없음)
  companies: Company[]

  // 시장 풀 경제 모델
  marketPool: number // 시장에 남아있는 총 화폐
  totalMoney: number // 초기 총 화폐량 (불변, 보존 검증용)

  market: MarketState
  sectorStates: Record<Sector, SectorState> // 섹터별 트렌드 상태

  // 이벤트
  currentEvent: GameEvent | null
  pendingEvents: GameEvent[] // 대기 중인 이벤트 목록 (1~2개)
  currentEventIndex: number // 현재 처리 중인 이벤트 인덱스
  eventHistory: string[] // 발생한 이벤트 ID 목록

  // 인플레이션
  inflation: number // 현재 인플레이션율
  cumulativeInflation: number // 누적 인플레이션 배율

  // 정부 이벤트
  governmentEvent: GovernmentEvent | null

  // 목표
  selectedGoal: Goal | null

  // AI 경쟁사 전략 매핑 (companyId → strategyId)
  aiStrategies: Record<string, string>

  // 턴별 순위 기록 (각 원소 = 기업별 순위 배열)
  rankingHistory: number[][]

  // 인플레이션 히스토리
  inflationHistory: number[]         // 누적 인플레이션 배율
  inflationRateHistory: number[]     // 턴별 인플레이션율

  // 섹터별 매입가 히스토리
  sectorPriceHistory: Partial<Record<Sector, number[]>>

  // 시장 상태 히스토리 (경기·변동성)
  marketConditionHistory: MarketCondition[]
  volatilityHistory: number[]

  // 연구 결과 피드백 (UI 표시용, 다음 액션 시 초기화)
  lastResearchResult: { sector: Sector; success: boolean; newLevel: number } | null

  // RNG 상태
  rngState: number

  // 게임 설정 (테스트 파라미터 오버라이드)
  config: GameConfig

  // 게임 종료
  isGameOver: boolean
  gameOverReason: 'bankrupt' | 'completed' | null
}

// === 정부 이벤트 ===
export interface GovernmentEvent {
  id: string
  title: string
  description: string
  autoApply: boolean // true면 자동 적용, false면 선택지 표시
  conditions?: EventConditions
  effect?: EventEffect
  choices?: EventChoice[]
}

// === 목표 ===
export type GoalType = 'domination' | 'asset' | 'influence'

export type GoalCondition =
  | { minDominatedSectors: number }
  | { minNetWorth: number }
  | { minInfluence: number }

export interface Goal {
  id: string
  name: string
  description: string
  type: GoalType
  condition: GoalCondition
  bonus: number // 달성 시 순자산에 가산
}

// === 메타 진행 ===
export interface MetaEffect {
  startingMoneyBonus: number
  extraTurns: number
  incomeMultiplier: number // 소득 배율
  purchaseCostDiscount: number // 매입 비용 할인율 (0-1)
  eventRerollChance: number // 이벤트 리롤 확률 (0-1)
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

// === 게임 설정 (테스트 파라미터) ===
export interface GameConfig {
  startingMoney: number
  marketPool: number
  competitorCount: number
  maxTurns: number
  baseExpenses: number
  sectorFlowRate: number // 섹터 유입률 배율 (1.0 = 기본)
  eventProbability: number // 이벤트 기본 발생 확률
}

// === 런 결과 ===
export interface RunResultRanking {
  name: string
  netWorth: number
  dominatedSectors: Sector[]
  isPlayer: boolean
}

export interface RunResult {
  finalMoney: number
  netWorth: number // 현금 + 자산 가치
  totalTurns: number
  score: number
  metaCurrencyEarned: number
  ownedAssets: OwnedAsset[]
  dominatedSectors: Sector[]
  maxInfluence: number
  rankings: RunResultRanking[] // 순자산 내림차순 정렬된 전체 기업 순위
  rankingHistory: number[][] // 턴별 기업 순위 기록
  companyNames: string[] // 기업명 (rankingHistory 인덱스 매칭)
  companyNetWorthHistories: number[][] // 기업별 순자산 히스토리 [companyIdx][turnIdx]
  companyRevenueHistories: number[][] // 기업별 수익 히스토리 [companyIdx][turnIdx]
  goalAchieved?: boolean
  goalBonus?: number
}

// === 금액 내역 분해 ===
export interface BreakdownItem {
  label: string
  value: number
  type: 'base' | 'add' | 'multiply'
}

export interface MoneyBreakdown {
  title?: string
  items: BreakdownItem[]
  final: number
  history?: number[] // 턴별 변동 추이
  maxValue?: number // 차트 Y축 최대값
  formatY?: (v: number) => string // 차트 Y축 포맷
}
