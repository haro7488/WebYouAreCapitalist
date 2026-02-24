import type { AssetTier, MarketCondition, Sector, SectorTrend } from '../types'
import raw from '../data/balance.json'

// === 단순 숫자 상수 ===
export const STARTING_MONEY: number = raw.STARTING_MONEY
export const MAX_TURNS: number = raw.MAX_TURNS
export const BASE_EXPENSES: number = raw.BASE_EXPENSES
export const STARTING_INFLUENCE: number = raw.STARTING_INFLUENCE

export const INITIAL_MARKET_POOL: number = raw.INITIAL_MARKET_POOL
export const DEFAULT_COMPETITOR_COUNT: number = raw.DEFAULT_COMPETITOR_COUNT

export const RANK_FIRST_INFLUENCE_BONUS: number = raw.RANK_FIRST_INFLUENCE_BONUS

export const MARKET_CHANGE_MIN_TURNS: number = raw.MARKET_CHANGE_MIN_TURNS
export const MARKET_CHANGE_MAX_TURNS: number = raw.MARKET_CHANGE_MAX_TURNS
export const EVENT_BASE_PROBABILITY: number = raw.EVENT_BASE_PROBABILITY
export const VOLATILITY_EVENT_BONUS: number = raw.VOLATILITY_EVENT_BONUS

export const SECTOR_TREND_MIN_TURNS: number = raw.SECTOR_TREND_MIN_TURNS
export const SECTOR_TREND_MAX_TURNS: number = raw.SECTOR_TREND_MAX_TURNS

export const INFLUENCE_DECAY_PER_TURN: number = raw.INFLUENCE_DECAY_PER_TURN
export const INFLUENCE_DOMINANCE_BONUS: number = raw.INFLUENCE_DOMINANCE_BONUS

export const ASSET_UPGRADE_COST_RATIO: number = raw.ASSET_UPGRADE_COST_RATIO
export const ASSET_UPGRADE_INCOME_MULTIPLIER: number = raw.ASSET_UPGRADE_INCOME_MULTIPLIER
export const ASSET_MAX_UPGRADE_LEVEL: number = raw.ASSET_MAX_UPGRADE_LEVEL

export const SELL_BASE_RATIO: number = raw.SELL_BASE_RATIO
export const SELL_MARKET_RATIO: number = raw.SELL_MARKET_RATIO

export const SCORE_NETWORTH_WEIGHT: number = raw.SCORE_NETWORTH_WEIGHT
export const SCORE_INFLUENCE_WEIGHT: number = raw.SCORE_INFLUENCE_WEIGHT
export const SCORE_TURN_BONUS: number = raw.SCORE_TURN_BONUS
export const SCORE_DOMINANCE_BONUS: number = raw.SCORE_DOMINANCE_BONUS
export const META_CURRENCY_RATE: number = raw.META_CURRENCY_RATE

// === Record 타입 상수 ===
export const SECTOR_FLOW_RATE = raw.SECTOR_FLOW_RATE as Record<Sector, number>
export const SECTOR_MARKET_MULTIPLIER = raw.SECTOR_MARKET_MULTIPLIER as Record<Sector, Record<MarketCondition, number>>
export const SECTOR_DEMAND_PREMIUM = raw.SECTOR_DEMAND_PREMIUM as Record<number, number>
export const SECTOR_TREND_MULTIPLIER = raw.SECTOR_TREND_MULTIPLIER as Record<SectorTrend, number>
export const SECTOR_TREND_TRANSITION = raw.SECTOR_TREND_TRANSITION as Record<SectorTrend, Record<SectorTrend, number>>
export const DOMINANCE_THRESHOLDS = raw.DOMINANCE_THRESHOLDS as {
  entrant: { count: number; incomeBonus: number }
  competitor: { count: number; incomeBonus: number }
  dominant: { count: number; incomeBonus: number }
}
export const INFLUENCE_TIERS = raw.INFLUENCE_TIERS as {
  minInfluence: number; title: string; purchaseDiscount: number; eventBonus: number; freeResearch: boolean
}[]
export const INFLUENCE_PER_PURCHASE = raw.INFLUENCE_PER_PURCHASE as unknown as Record<AssetTier, number>
export const MARKET_TRANSITION = raw.MARKET_TRANSITION as Record<MarketCondition, Record<MarketCondition, number>>
