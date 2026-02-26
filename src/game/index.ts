// Types
export type {
  GameState,
  GameConfig,
  TurnPhase,
  MarketCondition,
  MarketState,
  Sector,
  IncomeType,
  SectorTrend,
  SectorState,
  DominanceLevel,
  DominanceInfo,
  RiskLevel,
  SectorProfile,
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
  GovernmentEvent,
  Goal,
  EventConditions,
  MoneyBreakdown,
  BreakdownItem,
} from './types'
export { INFORMATION_SECTOR, RND_SECTOR } from './types'

// Constants
export {
  DEFAULT_GAME_CONFIG,
  STARTING_MONEY,
  MAX_TURNS,
  BASE_EXPENSES,
  STARTING_INFLUENCE,
  SECTORS,
  ASSETS,
  META_UPGRADES,
  MARKET_TRANSITION,
  SECTOR_MARKET_MULTIPLIER,
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
export { submitAction, submitEventChoice, processGovernmentPhase, submitGovernmentChoice, confirmGovernmentEvent, resolvePhase, advanceTurn, processFullTurn } from './engine'

// Economy
export {
  findSector,
  calculateNetIncome,
  calculateAssetIncome,
  calculateTotalAssetIncome,
  calculateAssetValue,
  calculateNetWorth,
  calculateCompanyTotalIncome,
  calculateCompanyNetIncome,
  calculateDominance,
  calculateGlobalDominance,
  calculateScore,
  calculateResearchSuccessRate,
  getInfluenceTier,
  getCompanyRank,
  mergeEffects,
} from './economy'

// Breakdown
export {
  calculateCurrentPrice,
  getPurchaseCostBreakdown,
  getAssetIncomeBreakdown,
  getSellPriceBreakdown,
  getRevenueBreakdown,
  getExpenseBreakdown,
  getNetWorthBreakdown,
} from './breakdown'

// Market
export { createInitialMarket, updateMarket, createInitialSectorStates, updateSectorTrends, previewNextTrends } from './market'

// Events
export { EVENT_REGISTRY, rollForEvent, findEventById } from './events'
export { checkEventConditions } from './logic/eventConditions'
export { applyInflation, getInflatedCost, getInflatedIncome } from './logic/inflation'

// Run
export { startNewRun, endRun } from './run'

// Meta
export { getMetaEffects, purchaseUpgrade, createInitialMeta } from './meta'

// Glossary
export { GLOSSARY, GLOSSARY_CATEGORIES } from './glossary'
export type { GlossaryCategory, GlossaryEntry } from './glossary'
export { TRAIT_REGISTRY, findTrait } from './traits'
export type { Trait, TraitType } from './traits'
