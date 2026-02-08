import type { Investment, MetaUpgrade } from './types'

// === Balance Constants ===
export const STARTING_MONEY = 1000
export const MAX_TURNS = 30
export const BASE_REVENUE = 50 // 기본 턴당 수익 (레스토랑 기본 매출)
export const BASE_EXPENSES = 30 // 기본 턴당 지출 (임대료, 유지비)
export const STARTING_REPUTATION = 50

// === Market Constants ===
export const MARKET_CHANGE_MIN_TURNS = 4
export const MARKET_CHANGE_MAX_TURNS = 8
export const EVENT_BASE_PROBABILITY = 0.4 // 40% 기본 이벤트 확률
export const VOLATILITY_EVENT_BONUS = 0.3 // 변동성 1일 때 추가 확률

// === Score Formula ===
export const SCORE_MONEY_WEIGHT = 1
export const SCORE_REPUTATION_WEIGHT = 10
export const SCORE_TURN_BONUS = 5 // 완주 시 턴당 보너스
export const META_CURRENCY_RATE = 0.01 // 점수의 1%를 메타 화폐로

// === Investments ===
export const INVESTMENTS: Investment[] = [
  {
    id: 'savings',
    name: '정기 예금',
    description: '안전하지만 수익이 낮은 예금',
    cost: 100,
    riskLevel: 'low',
    baseReturn: 0.03,
    marketMultiplier: { boom: 1.0, stable: 1.0, recession: 1.0 },
  },
  {
    id: 'food-truck',
    name: '푸드트럭 투자',
    description: '거리 음식 사업에 투자',
    cost: 200,
    riskLevel: 'low',
    baseReturn: 0.05,
    marketMultiplier: { boom: 1.3, stable: 1.0, recession: 0.7 },
  },
  {
    id: 'stock-index',
    name: '인덱스 펀드',
    description: '시장을 따라가는 인덱스 펀드',
    cost: 300,
    riskLevel: 'medium',
    baseReturn: 0.08,
    marketMultiplier: { boom: 1.5, stable: 1.0, recession: 0.5 },
  },
  {
    id: 'franchise',
    name: '프랜차이즈 확장',
    description: '새 지점을 열어 사업 확장',
    cost: 500,
    riskLevel: 'medium',
    baseReturn: 0.12,
    marketMultiplier: { boom: 1.4, stable: 0.9, recession: 0.4 },
  },
  {
    id: 'crypto',
    name: '암호화폐',
    description: '높은 수익, 높은 위험의 디지털 자산',
    cost: 250,
    riskLevel: 'high',
    baseReturn: 0.20,
    marketMultiplier: { boom: 2.0, stable: 0.8, recession: 0.2 },
  },
  {
    id: 'real-estate',
    name: '부동산 투자',
    description: '상업용 부동산 매입',
    cost: 800,
    riskLevel: 'high',
    baseReturn: 0.15,
    marketMultiplier: { boom: 1.8, stable: 1.1, recession: 0.3 },
  },
]

// === Meta Upgrades ===
export const META_UPGRADES: MetaUpgrade[] = [
  {
    id: 'seed-money',
    name: '시드 머니',
    description: '시작 자금 증가',
    cost: 5,
    maxLevel: 5,
    effect: (level) => ({ startingMoneyBonus: level * 200 }),
  },
  {
    id: 'extra-time',
    name: '추가 시간',
    description: '최대 턴 수 증가',
    cost: 8,
    maxLevel: 3,
    effect: (level) => ({ extraTurns: level * 2 }),
  },
  {
    id: 'business-acumen',
    name: '사업 감각',
    description: '기본 수익 증가',
    cost: 10,
    maxLevel: 5,
    effect: (level) => ({ revenueMultiplier: 1 + level * 0.1 }),
  },
  {
    id: 'negotiator',
    name: '협상의 달인',
    description: '투자 비용 할인',
    cost: 7,
    maxLevel: 3,
    effect: (level) => ({ investmentCostDiscount: level * 0.1 }),
  },
  {
    id: 'fortune',
    name: '행운의 별',
    description: '나쁜 이벤트 리롤 기회',
    cost: 12,
    maxLevel: 2,
    effect: (level) => ({ eventRerollChance: level * 0.15 }),
  },
]
