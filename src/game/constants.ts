import type {
  Asset,
  AssetTier,
  MarketCondition,
  MetaUpgrade,
  Sector,
  SectorTrend,
} from './types'

// === 경제 상수 ===
export const STARTING_MONEY = 1_000
export const MAX_TURNS = 30
export const BASE_EXPENSES = 15 // 기본 턴당 지출 (유지비)
export const STARTING_INFLUENCE = 0
export const BASE_ACTION_POINTS = 2

// === 시장 풀 상수 ===
export const INITIAL_MARKET_POOL = 20_000 // 시장 풀 초기 화폐량
export const PLAYER_COMPANY_ID = 'player' // 플레이어 기업 ID
export const DEFAULT_COMPANY_NAME = '내 기업' // 플레이어 기업 기본 이름

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

// === 자산 데이터 (5섹터 x 3티어 = 15개) ===
export const ASSETS: Asset[] = [
  // --- 외식 섹터 ---
  {
    id: 'food-cart',
    name: '포장마차',
    description: '길거리 음식 사업으로 소자본 시작',
    sector: 'food',
    tier: 1,
    cost: 100,
    baseIncome: 8,
    appreciation: 0.01,
    riskLevel: 'low',
    marketMultiplier: { boom: 1.2, stable: 1.0, recession: 0.85 },
    maxUpgradeLevel: 3,
  },
  {
    id: 'restaurant',
    name: '레스토랑',
    description: '본격적인 외식 사업 진출',
    sector: 'food',
    tier: 2,
    cost: 400,
    baseIncome: 28,
    appreciation: 0.02,
    riskLevel: 'medium',
    marketMultiplier: { boom: 1.3, stable: 1.0, recession: 0.8 },
    maxUpgradeLevel: 3,
  },
  {
    id: 'franchise',
    name: '프랜차이즈',
    description: '전국 체인으로 외식 시장 장악',
    sector: 'food',
    tier: 3,
    cost: 1_200,
    baseIncome: 72,
    appreciation: 0.03,
    riskLevel: 'medium',
    marketMultiplier: { boom: 1.4, stable: 1.0, recession: 0.7 },
    maxUpgradeLevel: 3,
  },

  // --- 기술 섹터 ---
  {
    id: 'app-startup',
    name: '앱 스타트업',
    description: '모바일 앱 개발 스타트업에 투자',
    sector: 'tech',
    tier: 1,
    cost: 150,
    baseIncome: 12,
    appreciation: 0.03,
    riskLevel: 'high',
    marketMultiplier: { boom: 1.6, stable: 0.9, recession: 0.5 },
    maxUpgradeLevel: 3,
  },
  {
    id: 'saas',
    name: 'SaaS 기업',
    description: '구독형 소프트웨어 서비스 기업',
    sector: 'tech',
    tier: 2,
    cost: 500,
    baseIncome: 40,
    appreciation: 0.04,
    riskLevel: 'high',
    marketMultiplier: { boom: 1.7, stable: 0.9, recession: 0.4 },
    maxUpgradeLevel: 3,
  },
  {
    id: 'tech-giant',
    name: '테크 대기업',
    description: '글로벌 기술 기업 대규모 지분 확보',
    sector: 'tech',
    tier: 3,
    cost: 1_500,
    baseIncome: 105,
    appreciation: 0.05,
    riskLevel: 'high',
    marketMultiplier: { boom: 1.8, stable: 0.9, recession: 0.3 },
    maxUpgradeLevel: 3,
  },

  // --- 부동산 섹터 ---
  {
    id: 'studio-rental',
    name: '원룸 임대',
    description: '소형 임대 부동산으로 안정 수익',
    sector: 'realEstate',
    tier: 1,
    cost: 200,
    baseIncome: 12,
    appreciation: 0.02,
    riskLevel: 'low',
    marketMultiplier: { boom: 1.1, stable: 1.05, recession: 0.95 },
    maxUpgradeLevel: 3,
  },
  {
    id: 'commercial-building',
    name: '상가 건물',
    description: '상업용 건물 매입 및 임대',
    sector: 'realEstate',
    tier: 2,
    cost: 600,
    baseIncome: 30,
    appreciation: 0.03,
    riskLevel: 'low',
    marketMultiplier: { boom: 1.2, stable: 1.05, recession: 0.9 },
    maxUpgradeLevel: 3,
  },
  {
    id: 'office-tower',
    name: '오피스 타워',
    description: '대형 오피스 빌딩으로 프리미엄 임대 수익',
    sector: 'realEstate',
    tier: 3,
    cost: 2_000,
    baseIncome: 80,
    appreciation: 0.04,
    riskLevel: 'medium',
    marketMultiplier: { boom: 1.3, stable: 1.05, recession: 0.85 },
    maxUpgradeLevel: 3,
  },

  // --- 유통 섹터 ---
  {
    id: 'convenience-store',
    name: '편의점',
    description: '24시간 편의점 운영',
    sector: 'retail',
    tier: 1,
    cost: 120,
    baseIncome: 10,
    appreciation: 0.015,
    riskLevel: 'low',
    marketMultiplier: { boom: 1.3, stable: 1.0, recession: 0.7 },
    maxUpgradeLevel: 3,
  },
  {
    id: 'mart-chain',
    name: '마트 체인',
    description: '지역 마트 체인 사업 확장',
    sector: 'retail',
    tier: 2,
    cost: 450,
    baseIncome: 32,
    appreciation: 0.025,
    riskLevel: 'medium',
    marketMultiplier: { boom: 1.4, stable: 1.0, recession: 0.6 },
    maxUpgradeLevel: 3,
  },
  {
    id: 'mega-distributor',
    name: '대형 유통사',
    description: '전국 유통망을 장악한 대형 유통 기업',
    sector: 'retail',
    tier: 3,
    cost: 1_300,
    baseIncome: 78,
    appreciation: 0.03,
    riskLevel: 'medium',
    marketMultiplier: { boom: 1.5, stable: 1.0, recession: 0.5 },
    maxUpgradeLevel: 3,
  },

  // --- 금융 섹터 ---
  {
    id: 'p2p-lending',
    name: 'P2P 대출',
    description: '개인 간 대출 플랫폼 투자',
    sector: 'finance',
    tier: 1,
    cost: 180,
    baseIncome: 15,
    appreciation: 0,
    riskLevel: 'high',
    marketMultiplier: { boom: 1.5, stable: 0.8, recession: 0.3 },
    maxUpgradeLevel: 3,
  },
  {
    id: 'investment-fund',
    name: '투자 펀드',
    description: '전문 투자 펀드 운용',
    sector: 'finance',
    tier: 2,
    cost: 550,
    baseIncome: 44,
    appreciation: 0.01,
    riskLevel: 'high',
    marketMultiplier: { boom: 1.8, stable: 0.9, recession: 0.2 },
    maxUpgradeLevel: 3,
  },
  {
    id: 'bank-stake',
    name: '은행 지분',
    description: '시중 은행의 대주주로 참여',
    sector: 'finance',
    tier: 3,
    cost: 1_800,
    baseIncome: 126,
    appreciation: 0.02,
    riskLevel: 'high',
    marketMultiplier: { boom: 2.0, stable: 0.9, recession: 0.1 },
    maxUpgradeLevel: 3,
  },
]

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
