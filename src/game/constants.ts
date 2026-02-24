import type {
  AssetTier,
  GameConfig,
  MarketCondition,
  MetaUpgrade,
  Sector,
  SectorTrend,
} from './types'

// === 경제 상수 ===
export const STARTING_MONEY = 1_500
export const MAX_TURNS = 30
export const BASE_EXPENSES = 10 // 기본 턴당 지출 (유지비)
export const STARTING_INFLUENCE = 0
export const BASE_ACTION_POINTS = 3

// === 시장 풀 상수 ===
export const INITIAL_MARKET_POOL = 50_000 // 시장 풀 초기 화폐량
export const PLAYER_COMPANY_ID = 'player' // 플레이어 기업 ID
export const DEFAULT_COMPANY_NAME = '내 기업' // 플레이어 기업 기본 이름
export const DEFAULT_COMPETITOR_COUNT = 3 // 기본 AI 경쟁사 수

// 섹터별 유입률 (매 턴 marketPool에서 해당 섹터로 유입되는 비율)
export const SECTOR_FLOW_RATE: Record<Sector, number> = {
  food: 0.002,
  tech: 0.0025,
  realEstate: 0.002,
  retail: 0.002,
  finance: 0.0025,
}

// 섹터별 시장 상태 민감도 (글로벌 시장 조건에 따른 섹터 유입량 배율)
export const SECTOR_MARKET_MULTIPLIER: Record<Sector, Record<MarketCondition, number>> = {
  food: { boom: 1.3, stable: 1.0, recession: 0.8 },
  tech: { boom: 1.7, stable: 0.9, recession: 0.4 },
  realEstate: { boom: 1.2, stable: 1.05, recession: 0.9 },
  retail: { boom: 1.4, stable: 1.0, recession: 0.6 },
  finance: { boom: 1.8, stable: 0.9, recession: 0.2 },
}

// === 섹터 수요 프리미엄 (경쟁사 투자 집중 → 매입 비용 상승) ===
// 키: 해당 섹터에 투자 중인 경쟁사 수 → 프리미엄 비율
export const SECTOR_DEMAND_PREMIUM: Record<number, number> = {
  0: 0,
  1: 0.10, // 경쟁사 1개 → +10%
  2: 0.15, // 경쟁사 2개 → +15%
  3: 0.20, // 경쟁사 3개+ → +20%
}

// === 순위 효과 ===
export const RANK_FIRST_INFLUENCE_BONUS = 2 // 1위: 턴당 영향력 +2

// === 시장 상수 ===
export const MARKET_CHANGE_MIN_TURNS = 4
export const MARKET_CHANGE_MAX_TURNS = 8
export const EVENT_BASE_PROBABILITY = 0.4 // 40% 기본 이벤트 확률
export const VOLATILITY_EVENT_BONUS = 0.3 // 변동성 1일 때 추가 확률

// === 섹터 트렌드 상수 ===
export const SECTOR_TREND_MIN_TURNS = 2
export const SECTOR_TREND_MAX_TURNS = 6

export const SECTOR_TREND_MULTIPLIER: Record<SectorTrend, number> = {
  hot: 1.3,
  neutral: 1.0,
  cold: 0.7,
}

// 섹터 트렌드 전환 확률 매트릭스
export const SECTOR_TREND_TRANSITION: Record<SectorTrend, Record<SectorTrend, number>> = {
  hot: { hot: 0.15, neutral: 0.55, cold: 0.30 },
  neutral: { hot: 0.25, neutral: 0.50, cold: 0.25 },
  cold: { hot: 0.30, neutral: 0.55, cold: 0.15 },
}

// === 지배력 상수 ===
export const DOMINANCE_THRESHOLDS = {
  entrant: { count: 1, incomeBonus: 1.0 },
  competitor: { count: 2, incomeBonus: 1.1 },
  dominant: { count: 3, incomeBonus: 1.25 },
}

// === 영향력 상수 ===
export const INFLUENCE_TIERS = [
  { minInfluence: 0, title: '무명 투자자', purchaseDiscount: 0, eventBonus: 0, freeResearch: false },
  { minInfluence: 20, title: '주목받는 투자자', purchaseDiscount: 0, eventBonus: 0.05, freeResearch: false },
  { minInfluence: 40, title: '영향력 있는 투자자', purchaseDiscount: 0.05, eventBonus: 0.10, freeResearch: true },
  { minInfluence: 60, title: '시장의 큰 손', purchaseDiscount: 0.10, eventBonus: 0.15, freeResearch: true },
  { minInfluence: 80, title: '자본가', purchaseDiscount: 0.15, eventBonus: 0.20, freeResearch: true },
]
export const INFLUENCE_DECAY_PER_TURN = 1
export const INFLUENCE_PER_PURCHASE: Record<AssetTier, number> = { 1: 2, 2: 3, 3: 5 }
export const INFLUENCE_DOMINANCE_BONUS = 10

// === 업그레이드 상수 ===
export const ASSET_UPGRADE_COST_RATIO = 0.3 // 업그레이드 비용 = 원가 x 비율 x (레벨+1)
export const ASSET_UPGRADE_INCOME_MULTIPLIER = 1.25 // 업그레이드당 소득 배율
export const ASSET_MAX_UPGRADE_LEVEL = 3

// === 매각 상수 ===
export const SELL_BASE_RATIO = 0.85 // 기본 매각 비율 (현재가치의 85%)
export const SELL_MARKET_RATIO = 0.15 // 시장 상태 영향 비율

// === 점수 상수 ===
export const SCORE_NETWORTH_WEIGHT = 1
export const SCORE_INFLUENCE_WEIGHT = 20
export const SCORE_TURN_BONUS = 5 // 완주 시 턴당 보너스
export const SCORE_DOMINANCE_BONUS = 500 // 지배 섹터당 보너스
export const META_CURRENCY_RATE = 0.008 // 점수 → 메타 화폐 전환율

// === 시장 전환 매트릭스 ===
export const MARKET_TRANSITION: Record<MarketCondition, Record<MarketCondition, number>> = {
  boom: { boom: 0.2, stable: 0.5, recession: 0.3 },
  stable: { boom: 0.3, stable: 0.4, recession: 0.3 },
  recession: { boom: 0.3, stable: 0.5, recession: 0.2 },
}

// === 자산 데이터 → data/assets.json + schema/assets.schema.ts ===
export { ASSETS } from './schema/assets.schema'

// === 메타 업그레이드 (7개) ===
export const META_UPGRADES: MetaUpgrade[] = [
  {
    id: 'seed-capital',
    name: '시드 캐피탈',
    description: '시작 자금 증가',
    cost: 5,
    maxLevel: 5,
    effect: (level) => ({
      startingMoneyBonus: level * 400,
      extraTurns: 0,
      incomeMultiplier: 1,
      purchaseCostDiscount: 0,
      eventRerollChance: 0,
      extraActionPoints: 0,
      startingInfluence: 0,
    }),
  },
  {
    id: 'time-management',
    name: '시간 관리',
    description: '최대 턴 수 증가',
    cost: 8,
    maxLevel: 3,
    effect: (level) => ({
      startingMoneyBonus: 0,
      extraTurns: level * 2,
      incomeMultiplier: 1,
      purchaseCostDiscount: 0,
      eventRerollChance: 0,
      extraActionPoints: 0,
      startingInfluence: 0,
    }),
  },
  {
    id: 'investment-eye',
    name: '투자 안목',
    description: '전체 소득 배율 증가',
    cost: 10,
    maxLevel: 5,
    effect: (level) => ({
      startingMoneyBonus: 0,
      extraTurns: 0,
      incomeMultiplier: 1 + level * 0.08,
      purchaseCostDiscount: 0,
      eventRerollChance: 0,
      extraActionPoints: 0,
      startingInfluence: 0,
    }),
  },
  {
    id: 'negotiation',
    name: '협상력',
    description: '자산 매입 비용 할인',
    cost: 7,
    maxLevel: 3,
    effect: (level) => ({
      startingMoneyBonus: 0,
      extraTurns: 0,
      incomeMultiplier: 1,
      purchaseCostDiscount: level * 0.08,
      eventRerollChance: 0,
      extraActionPoints: 0,
      startingInfluence: 0,
    }),
  },
  {
    id: 'crisis-sense',
    name: '위기 감각',
    description: '나쁜 이벤트 리롤 기회',
    cost: 12,
    maxLevel: 2,
    effect: (level) => ({
      startingMoneyBonus: 0,
      extraTurns: 0,
      incomeMultiplier: 1,
      purchaseCostDiscount: 0,
      eventRerollChance: level * 0.15,
      extraActionPoints: 0,
      startingInfluence: 0,
    }),
  },
  {
    id: 'multitasking',
    name: '멀티태스킹',
    description: '턴당 액션 포인트 +1',
    cost: 20,
    maxLevel: 1,
    effect: (level) => ({
      startingMoneyBonus: 0,
      extraTurns: 0,
      incomeMultiplier: 1,
      purchaseCostDiscount: 0,
      eventRerollChance: 0,
      extraActionPoints: level,
      startingInfluence: 0,
    }),
  },
  {
    id: 'connections',
    name: '인맥',
    description: '시작 영향력 증가',
    cost: 8,
    maxLevel: 3,
    effect: (level) => ({
      startingMoneyBonus: 0,
      extraTurns: 0,
      incomeMultiplier: 1,
      purchaseCostDiscount: 0,
      eventRerollChance: 0,
      extraActionPoints: 0,
      startingInfluence: level * 15,
    }),
  },
]

// === 기본 게임 설정 ===
export const DEFAULT_GAME_CONFIG: GameConfig = {
  startingMoney: STARTING_MONEY,
  marketPool: INITIAL_MARKET_POOL,
  competitorCount: DEFAULT_COMPETITOR_COUNT,
  maxTurns: MAX_TURNS,
  baseAP: BASE_ACTION_POINTS,
  baseExpenses: BASE_EXPENSES,
  sectorFlowRate: 1.0, // 배율 (1.0 = 기본값)
  eventProbability: EVENT_BASE_PROBABILITY,
}
