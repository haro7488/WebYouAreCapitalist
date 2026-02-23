// Types
export type {
  GameState,
  GameConfig,
  TurnPhase,
  MarketCondition,
  MarketState,
  Sector,
  AssetTier,
  SectorTrend,
  SectorState,
  DominanceLevel,
  DominanceInfo,
  RiskLevel,
  Asset,
  OwnedAsset,
  ResearchResult,
  EventEffect,
  EventChoice,
  GameEvent,
  TurnAction,
  MetaUpgrade,
  MetaEffect,
  MetaState,
  RunResult,
} from './types'

// Constants
export {
  DEFAULT_GAME_CONFIG,
  STARTING_MONEY,
  MAX_TURNS,
  BASE_EXPENSES,
  STARTING_INFLUENCE,
  BASE_ACTION_POINTS,
  ASSETS,
  META_UPGRADES,
  MARKET_TRANSITION,
  SECTOR_TREND_MULTIPLIER,
  SECTOR_TREND_TRANSITION,
  DOMINANCE_THRESHOLDS,
  INFLUENCE_TIERS,
  INFLUENCE_DECAY_PER_TURN,
  INFLUENCE_PER_PURCHASE,
  INFLUENCE_DOMINANCE_BONUS,
  ASSET_UPGRADE_COST_RATIO,
  ASSET_UPGRADE_INCOME_MULTIPLIER,
  ASSET_MAX_UPGRADE_LEVEL,
  SELL_BASE_RATIO,
  SELL_MARKET_RATIO,
  SCORE_NETWORTH_WEIGHT,
  SCORE_INFLUENCE_WEIGHT,
  SCORE_TURN_BONUS,
  SCORE_DOMINANCE_BONUS,
  META_CURRENCY_RATE,
} from './constants'

// Utils
export { createRng, generateRunId, generateSeed, formatMoney, clamp } from './utils'
export type { Rng } from './utils'

// Engine
export { submitAction, submitEventChoice, resolvePhase, advanceTurn, processFullTurn } from './engine'

// Economy
export {
  calculateNetIncome,
  calculateAssetIncome,
  calculateTotalAssetIncome,
  calculateAssetValue,
  calculateNetWorth,
  calculateCompanyTotalIncome,
  calculateDominance,
  calculateScore,
  getInfluenceTier,
} from './economy'

// Market
export { createInitialMarket, updateMarket, createInitialSectorStates, updateSectorTrends } from './market'

// Events
export { EVENT_REGISTRY, rollForEvent, findEventById } from './events'

// Run
export { startNewRun, endRun } from './run'

// Meta
export { getMetaEffects, purchaseUpgrade, createInitialMeta } from './meta'
