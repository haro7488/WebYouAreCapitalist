import type { GameConfig, MarketCondition, MetaUpgrade, Sector } from './types'
import {
  STARTING_MONEY,
  INITIAL_MARKET_POOL,
  DEFAULT_COMPETITOR_COUNT,
  MAX_TURNS,
  BASE_EXPENSES,
  EVENT_BASE_PROBABILITY,
} from './schema/balance.schema'

// === 밸런스 상수 → data/balance.json + schema/balance.schema.ts ===
export {
  STARTING_MONEY,
  MAX_TURNS,
  BASE_EXPENSES,
  STARTING_INFLUENCE,
  INITIAL_MARKET_POOL,
  DEFAULT_COMPETITOR_COUNT,
  SECTOR_FLOW_RATE,
  SECTOR_MARKET_MULTIPLIER,
  SECTOR_DEMAND_PREMIUM,
  RANK_FIRST_INFLUENCE_BONUS,
  MARKET_CHANGE_MIN_TURNS,
  MARKET_CHANGE_MAX_TURNS,
  EVENT_BASE_PROBABILITY,
  VOLATILITY_EVENT_BONUS,
  SECTOR_TREND_MIN_TURNS,
  SECTOR_TREND_MAX_TURNS,
  SECTOR_TREND_MULTIPLIER,
  SECTOR_TREND_TRANSITION,
  DOMINANCE_THRESHOLDS,
  INFLUENCE_TIERS,
  INFLUENCE_DECAY_PER_TURN,
  INFLUENCE_PER_PURCHASE,
  INFLUENCE_DOMINANCE_BONUS,
  SECTOR_UPGRADE_COST_RATIO,
  SECTOR_UPGRADE_INCOME_MULTIPLIER,
  SECTOR_MAX_UPGRADE_LEVEL,
  SELL_BASE_RATIO,
  SELL_MARKET_RATIO,
  RESEARCH_BASE_SUCCESS_RATE,
  RESEARCH_LEVEL_PENALTY,
  RESEARCH_PITY_INCREMENT,
  RESEARCH_RND_LEVEL_BONUS,
  RESEARCH_POINT_COST,
  BANKRUPTCY_INTEREST_RATE,
  SCORE_NETWORTH_WEIGHT,
  SCORE_INFLUENCE_WEIGHT,
  SCORE_TURN_BONUS,
  SCORE_DOMINANCE_BONUS,
  META_CURRENCY_RATE,
  MARKET_TRANSITION,
} from './schema/balance.schema'

// === 문자열 상수 (밸런스 아닌 식별자) ===
export const PLAYER_COMPANY_ID = 'player'
export const DEFAULT_COMPANY_NAME = '내 기업'

// === 섹터 프로필 데이터 → data/sectors.json + schema/sectors.schema.ts ===
export { SECTORS } from './schema/sectors.schema'

// === 전체 섹터 ID 배열 (단일 정의) ===
export const ALL_SECTORS: Sector[] = ['food', 'tech', 'realEstate', 'logistics', 'energy', 'finance', 'information', 'rnd']

// === 전체 시장 상태 배열 (단일 정의) ===
export const ALL_MARKET_CONDITIONS: MarketCondition[] = ['boom', 'stable', 'recession']

// === 메타 업그레이드 (함수 포함 → JSON 불가, TS 유지) ===
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
      startingInfluence: 0,
    }),
  },
  {
    id: 'negotiation',
    name: '협상력',
    description: '구좌 매입 비용 할인',
    cost: 7,
    maxLevel: 3,
    effect: (level) => ({
      startingMoneyBonus: 0,
      extraTurns: 0,
      incomeMultiplier: 1,
      purchaseCostDiscount: level * 0.08,
      eventRerollChance: 0,
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
  baseExpenses: BASE_EXPENSES,
  sectorFlowRate: 1.0,
  eventProbability: EVENT_BASE_PROBABILITY,
}
