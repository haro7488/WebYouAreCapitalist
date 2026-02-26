import type { GameState, Company, OwnedAsset, Sector } from '../types'
import {
  SECTOR_TREND_MULTIPLIER,
  SECTOR_MAX_UPGRADE_LEVEL,
  SELL_BASE_RATIO,
  SELL_MARKET_RATIO,
  INFLUENCE_PER_PURCHASE,
  RESEARCH_POINT_COST,
} from '../constants'
import { createRng, clamp } from '../utils'
import {
  findSector,
  calculateSectorDemandPremium,
  getInfluenceTier,
  calculateResearchSuccessRate,
} from '../economy'
import { getCompanyTraitEffects, getCompanySectorTraitEffects } from '../logic/traitEngine'
import { withCompany } from './helpers'

// === 액션 처리 (Company 인덱스 기반 — 플레이어/AI 공통) ===

/** 특정 기업의 구좌 매입 */
export function applyBuyFor(state: GameState, companyIndex: number, sector: Sector): GameState {
  const profile = findSector(sector)
  if (!profile) return state

  const company = state.companies[companyIndex]
  if (!company) return state

  // 현재 시장가 계산
  const marketMult = profile.marketMultiplier[state.market.condition]
  const trendMult = SECTOR_TREND_MULTIPLIER[state.sectorStates[sector].trend]
  const basePrice = profile.baseCost * marketMult * trendMult * state.cumulativeInflation

  // 수요 프리미엄: 경쟁사 투자 집중 섹터 → 매입 비용 상승
  const demandPremium = calculateSectorDemandPremium(state.companies, companyIndex, sector)

  // 할인 적용: 영향력 티어 + 이벤트 + 특성 + 섹터 특성 + 메타
  const influenceTier = getInfluenceTier(company.influence)
  const nextDiscount = company.activeEffects.reduce(
    (acc, e) => acc + (e.nextPurchaseDiscount ?? 0), 0,
  )
  const traitEffects = getCompanyTraitEffects(company)
  const sectorTraitEffects = getCompanySectorTraitEffects(company)
  const sectorDiscount = sectorTraitEffects.purchaseDiscounts[sector] ?? 0
  const totalDiscount = influenceTier.purchaseDiscount + nextDiscount + traitEffects.purchaseDiscount + sectorDiscount
  const cost = Math.floor(basePrice * demandPremium * (1 - totalDiscount))
  if (company.cash < cost) return state

  const currentValue = Math.floor(basePrice) // 할인 전 시장가 기준

  const newOwned: OwnedAsset = {
    assetId: sector,
    purchaseTurn: state.turn,
    purchasePrice: cost,
    currentValue,
    valueHistory: [currentValue],
  }

  const influenceGain = Math.round(INFLUENCE_PER_PURCHASE * traitEffects.influenceGainMultiplier)

  const updatedEffects = nextDiscount > 0
    ? company.activeEffects.map((e) => e.nextPurchaseDiscount ? { ...e, nextPurchaseDiscount: 0 } : e)
    : company.activeEffects

  const updated: Company = {
    ...company,
    cash: company.cash - cost,
    assets: [...company.assets, newOwned],
    influence: clamp(company.influence + influenceGain, 0, 100),
    actionsThisTurn: [...company.actionsThisTurn, { type: 'buy', sector }],
    activeEffects: updatedEffects,
  }

  return {
    ...withCompany(state, companyIndex, updated),
    marketPool: state.marketPool + cost,
  }
}

/** 특정 기업의 구좌 매각 */
export function applySellFor(state: GameState, companyIndex: number, ownedIndex: number): GameState {
  const company = state.companies[companyIndex]
  if (!company) return state
  const owned = company.assets[ownedIndex]
  if (!owned) return state

  const profile = findSector(owned.assetId)
  if (!profile) return state

  const marketMult = profile.marketMultiplier[state.market.condition]
  const traitEffects = getCompanyTraitEffects(company)
  const baseSellValue = Math.floor(owned.currentValue * (SELL_BASE_RATIO + SELL_MARKET_RATIO * marketMult))
  const sellValue = Math.floor(baseSellValue * (1 - traitEffects.sellPenalty) * (1 + traitEffects.sellBonus))

  const newAssets = [...company.assets]
  newAssets.splice(ownedIndex, 1)

  const updated: Company = {
    ...company,
    cash: company.cash + sellValue,
    assets: newAssets,
    actionsThisTurn: [...company.actionsThisTurn, { type: 'sell', ownedIndex }],
  }

  const poolChange = owned.currentValue - sellValue

  return {
    ...withCompany(state, companyIndex, updated),
    marketPool: state.marketPool + poolChange,
  }
}

/** 연구 성공 확률 계산 */
/** 특정 기업의 섹터 강화 (연구포인트 + 확률 기반) */
export function applySectorUpgradeFor(state: GameState, companyIndex: number, sector: Sector): GameState {
  const company = state.companies[companyIndex]
  if (!company) return state

  const profile = findSector(sector)
  if (!profile) return state

  const currentLevel = company.sectorUpgrades[sector] ?? 0
  if (currentLevel >= SECTOR_MAX_UPGRADE_LEVEL) return state

  // 해당 섹터에 구좌 보유해야 강화 가능
  const hasUnitsInSector = company.assets.some((a) => a.assetId === sector)
  if (!hasUnitsInSector) return state

  // 연구포인트 확인
  if (company.researchPoints < RESEARCH_POINT_COST) return state

  // RNG로 성공 여부 결정
  const rng = createRng(state.rngState)
  const successRate = calculateResearchSuccessRate(company, sector)
  const roll = rng.random()
  const success = roll < successRate

  const updated: Company = {
    ...company,
    researchPoints: company.researchPoints - RESEARCH_POINT_COST,
    sectorUpgrades: success
      ? { ...company.sectorUpgrades, [sector]: currentLevel + 1 }
      : company.sectorUpgrades,
    researchPity: success
      ? { ...company.researchPity, [sector]: 0 }
      : { ...company.researchPity, [sector]: (company.researchPity[sector] ?? 0) + 1 },
    actionsThisTurn: [...company.actionsThisTurn, { type: 'sectorUpgrade', sector }],
  }

  return {
    ...withCompany(state, companyIndex, updated),
    lastResearchResult: companyIndex === 0
      ? { sector, success, newLevel: success ? currentLevel + 1 : currentLevel }
      : state.lastResearchResult,
    rngState: rng.getState(),
  }
}

// === 플레이어 래퍼 (companies[0]) ===

export function applyBuy(state: GameState, sector: Sector): GameState {
  return applyBuyFor(state, 0, sector)
}

export function applySell(state: GameState, ownedIndex: number): GameState {
  return applySellFor(state, 0, ownedIndex)
}

export function applySectorUpgrade(state: GameState, sector: Sector): GameState {
  return applySectorUpgradeFor(state, 0, sector)
}
