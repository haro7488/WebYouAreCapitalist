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
  GoalType,
  GoalCondition,
  EventConditions,
  MoneyBreakdown,
  BreakdownItem,
  StrategyId,
  MetaUpgradeId,
} from './types'
export { INFORMATION_SECTOR, RND_SECTOR } from './types'

// Constants (외부에서 사용되는 것만 export)
export {
  DEFAULT_GAME_CONFIG,
  SECTORS,
  ALL_SECTORS,
  ALL_MARKET_CONDITIONS,
  META_UPGRADES,
  SECTOR_MARKET_MULTIPLIER,
  SECTOR_TREND_MULTIPLIER,
  INFLUENCE_TIERS,
  SECTOR_UPGRADE_COST_RATIO,
  SECTOR_UPGRADE_INCOME_MULTIPLIER,
  SECTOR_MAX_UPGRADE_LEVEL,
  RESEARCH_POINT_COST,
} from './constants'

// Utils (외부에서 사용되는 것만 export)
export { formatMoney } from './utils'

// Engine
export { submitAction, submitEventChoice, processGovernmentPhase, submitGovernmentChoice, confirmGovernmentEvent, resolvePhase, advanceTurn, processFullTurn } from './engine'

// Economy (외부에서 사용되는 것만 export)
export {
  findSector,
  calculateNetWorth,
  calculateCompanyNetWorth,
  calculateCompanyTotalIncome,
  calculateCompanyNetIncome,
  calculateDominance,
  calculateResearchSuccessRate,
  getInfluenceTier,
  getCompanyRank,
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
  getCashBreakdown,
  getAssetValueBreakdown,
  getNetIncomeBreakdown,
} from './breakdown'

// Market (외부에서 사용되는 것만 export)
export { previewNextTrends } from './market'

// Events (외부에서 사용되는 것만 export)
export { findEventById } from './events'

// Run
export { startNewRun, endRun } from './run'

// Meta
export { getMetaEffects, purchaseUpgrade, createInitialMeta } from './meta'

// Goal
export { GOALS } from './schema/goals.schema'
export { checkPlayerGoalCompletion } from './logic/goalEngine'

// Glossary
export { GLOSSARY, GLOSSARY_CATEGORIES } from './glossary'
export type { GlossaryCategory, GlossaryEntry } from './glossary'
export { TRAIT_REGISTRY, findTrait } from './traits'
export type { Trait, TraitType } from './traits'
