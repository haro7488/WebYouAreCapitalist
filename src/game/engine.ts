import type { GameState, Company, TurnAction, EventChoice, EventEffect, GameEvent, GovernmentEvent, OwnedAsset, Sector, ResearchResult, MarketCondition } from './types'
import { INFORMATION_SECTOR } from './types'
import {
  SECTOR_TREND_MULTIPLIER,
  SECTOR_UPGRADE_COST_RATIO,
  SECTOR_MAX_UPGRADE_LEVEL,
  SELL_BASE_RATIO,
  SELL_MARKET_RATIO,
  INFLUENCE_DECAY_PER_TURN,
  INFLUENCE_PER_PURCHASE,
  RANK_FIRST_INFLUENCE_BONUS,
  BANKRUPTCY_INTEREST_RATE,
} from './constants'
import { createRng, clamp } from './utils'
import {
  findSector,
  calculateCompanyNetIncome,
  calculatePoolScaledIncomes,
  calculateAssetValue,
  calculateDominance,
  calculateGlobalDominance,
  calculateSectorDemandPremium,
  calculateRankings,
  getCompanyRank,
  calculateSectorShares,
  getInfluenceTier,
  getPlayerCompany,
  updateCompany,
  calculateCompanyNetWorth,
  recalculateMarketPool,
  assertMoneyConservation,
} from './economy'
import { updateMarket, updateSectorTrends } from './market'
import { rollForEvents } from './events'
import { getAIActions, getAIEventChoice } from './competitor/ai'
import { applyInflation } from './logic/inflation'
import { getCompanyTraitEffects, getCompanySectorTraitEffects } from './logic/traitEngine'
import { checkGoalCompletion, calculateGoalBonus } from './logic/goalEngine'
import { GOVERNMENT_EVENTS } from './schema/governmentEvents.schema'
import { checkEventConditions } from './logic/eventConditions'

// === 편의 함수 ===

/** 기업 상태를 교체한 새 GameState 반환 (companies[0]) */
function withPlayer(state: GameState, updated: Company): GameState {
  return { ...state, companies: updateCompany(state, 0, updated) }
}

/** 특정 인덱스의 기업 상태를 교체한 새 GameState 반환 */
function withCompany(state: GameState, index: number, updated: Company): GameState {
  return { ...state, companies: updateCompany(state, index, updated) }
}

/** 섹터의 현재 시장가 계산 */
function getCurrentSectorPrice(sector: Sector, state: GameState): number {
  const profile = findSector(sector)
  if (!profile) return 0
  const marketMult = profile.marketMultiplier[state.market.condition]
  const trendMult = SECTOR_TREND_MULTIPLIER[state.sectorStates[sector].trend]
  return Math.floor(profile.baseCost * marketMult * trendMult * state.cumulativeInflation)
}

// === 액션 처리 (Company 인덱스 기반 — 플레이어/AI 공통) ===

/** 특정 기업의 구좌 매입 */
function applyBuyFor(state: GameState, companyIndex: number, sector: Sector): GameState {
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
function applySellFor(state: GameState, companyIndex: number, ownedIndex: number): GameState {
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

/** 특정 기업의 섹터 강화 */
function applySectorUpgradeFor(state: GameState, companyIndex: number, sector: Sector): GameState {
  const company = state.companies[companyIndex]
  if (!company) return state

  const profile = findSector(sector)
  if (!profile) return state

  const currentLevel = company.sectorUpgrades[sector] ?? 0
  if (currentLevel >= SECTOR_MAX_UPGRADE_LEVEL) return state

  // 해당 섹터에 구좌 보유해야 강화 가능
  const hasUnitsInSector = company.assets.some((a) => a.assetId === sector)
  if (!hasUnitsInSector) return state

  const traitEffects = getCompanyTraitEffects(company)
  const upgradeCost = Math.floor(profile.baseCost * SECTOR_UPGRADE_COST_RATIO * (currentLevel + 1) * traitEffects.upgradeCostMultiplier)
  if (company.cash < upgradeCost) return state

  const updated: Company = {
    ...company,
    cash: company.cash - upgradeCost,
    sectorUpgrades: { ...company.sectorUpgrades, [sector]: currentLevel + 1 },
    actionsThisTurn: [...company.actionsThisTurn, { type: 'sectorUpgrade', sector }],
  }

  return {
    ...withCompany(state, companyIndex, updated),
    marketPool: state.marketPool + upgradeCost,
  }
}

// === 하위 호환 래퍼 (플레이어 = companies[0]) ===

function applyBuy(state: GameState, sector: Sector): GameState {
  return applyBuyFor(state, 0, sector)
}

function applySell(state: GameState, ownedIndex: number): GameState {
  return applySellFor(state, 0, ownedIndex)
}

function applySectorUpgrade(state: GameState, sector: Sector): GameState {
  return applySectorUpgradeFor(state, 0, sector)
}

/** 시장 조사 */
function applyResearch(
  state: GameState,
  target: 'market' | 'sector' | 'event' | 'competitor' | 'strategy' | 'share' | 'government',
  sector?: Sector,
  targetCompanyId?: string,
): GameState {
  const player = getPlayerCompany(state)

  // 정보 섹터 구좌 수 = 조사 가능 횟수
  const infoAssets = player.assets.filter((a) => a.assetId === INFORMATION_SECTOR)
  const maxResearches = infoAssets.length

  // 정보 구좌가 없으면 조사 불가
  if (maxResearches === 0) return state

  // 이번 턴에 이미 사용한 조사 횟수 체크
  const researchesUsed = player.actionsThisTurn.filter((a) => a.type === 'research').length

  // 조사 횟수 초과 시 불가
  if (researchesUsed >= maxResearches) return state

  const rng = createRng(state.rngState)

  // 특성 효과 (paranoid: investigateAccuracyPenalty)
  const traitEffects = getCompanyTraitEffects(player)
  const accuracyPenalty = traitEffects.investigateAccuracyPenalty

  let result: ResearchResult

  // accuracyPenalty가 있으면 정확도 왜곡 확률 적용
  const isAccurate = rng.random() > accuracyPenalty

  switch (target) {
    case 'market':
      result = {
        type: 'market',
        turnsToChange: state.market.turnsRemaining,
        likelyNext: isAccurate
          ? rng.pick(['boom', 'stable', 'recession'] as MarketCondition[])
          : rng.pick(['boom', 'stable', 'recession'] as MarketCondition[]),
      }
      break
    case 'sector': {
      const targetSector = sector ?? rng.pick(['food', 'tech', 'realEstate', 'logistics', 'energy', 'finance', 'information'] as Sector[])
      const sectorState = state.sectorStates[targetSector]
      const actualTrend = sectorState.turnsRemaining <= 2
        ? rng.pick(['hot', 'neutral', 'cold'] as const)
        : sectorState.trend
      result = {
        type: 'sector',
        sector: targetSector,
        nextTrend: isAccurate
          ? actualTrend
          : rng.pick(['hot', 'neutral', 'cold'] as const),
      }
      break
    }
    case 'event': {
      const accurateHints = [
        '경제 관련 이벤트가 예상됩니다',
        '섹터 변동 이벤트가 올 수 있습니다',
        '개인적인 사건이 발생할 수 있습니다',
        '특별한 기회가 올 수 있습니다',
      ]
      const vagueHints = [
        '무언가 일어날 것 같습니다',
        '확실하지 않습니다',
        '정보가 불확실합니다',
      ]
      result = {
        type: 'event',
        hint: isAccurate ? rng.pick(accurateHints) : rng.pick(vagueHints),
      }
      break
    }
    case 'competitor': {
      const aiCompanies = state.companies.filter((_, i) => i > 0)
      const targetCompany = targetCompanyId
        ? state.companies.find((c) => c.id === targetCompanyId)
        : rng.pick(aiCompanies)
      if (!targetCompany) return state

      const visibleAssets = isAccurate
        ? [...targetCompany.assets]
        : targetCompany.assets.slice(0, Math.ceil(targetCompany.assets.length / 2))

      result = {
        type: 'competitor',
        companyId: targetCompany.id,
        companyName: targetCompany.name,
        assets: visibleAssets,
      }
      break
    }
    case 'strategy': {
      const aiCompanies2 = state.companies.filter((_, i) => i > 0)
      const targetCompany2 = targetCompanyId
        ? state.companies.find((c) => c.id === targetCompanyId)
        : rng.pick(aiCompanies2)
      if (!targetCompany2) return state
      const strategyId = state.aiStrategies[targetCompany2.id] ?? 'unknown'

      const strategies = ['growth', 'conservative', 'volatile', 'sector-focused', 'balanced']
      result = {
        type: 'strategy',
        companyId: targetCompany2.id,
        companyName: targetCompany2.name,
        strategyId: isAccurate ? strategyId : rng.pick(strategies),
      }
      break
    }
    case 'share': {
      const targetSector = sector ?? rng.pick(['food', 'tech', 'realEstate', 'logistics', 'energy', 'finance', 'information'] as Sector[])
      const actualShares = calculateSectorShares(state.companies, targetSector)

      const shares = isAccurate
        ? actualShares
        : actualShares.map((s) => ({
            ...s,
            share: Math.max(0, Math.min(1, s.share + (rng.random() - 0.5) * accuracyPenalty)),
          }))

      result = {
        type: 'share',
        sector: targetSector,
        shares,
      }
      break
    }
    case 'government': {
      const govEligible = (GOVERNMENT_EVENTS as GovernmentEvent[]).filter((e) =>
        !e.conditions || checkEventConditions(e.conditions, state, player),
      )

      let totalInflationDelta = 0
      for (const e of govEligible) {
        if (e.effect?.inflationDelta) {
          totalInflationDelta += e.effect.inflationDelta
        }
        if (e.choices) {
          for (const c of e.choices) {
            if (c.effect.inflationDelta) {
              totalInflationDelta += c.effect.inflationDelta * 0.5
            }
          }
        }
      }

      let inflationTrend: 'rising' | 'stable' | 'falling'
      if (totalInflationDelta > 0.005) {
        inflationTrend = 'rising'
      } else if (totalInflationDelta < -0.005) {
        inflationTrend = 'falling'
      } else {
        inflationTrend = 'stable'
      }

      let likelyPolicy: { title: string; description: string } | null = null
      if (govEligible.length > 0) {
        const topEvent = govEligible.reduce((best, e) => {
          const bestDelta = Math.abs(best.effect?.inflationDelta ?? 0)
          const eDelta = Math.abs(e.effect?.inflationDelta ?? 0)
          return eDelta > bestDelta ? e : best
        }, govEligible[0])
        likelyPolicy = { title: topEvent.title, description: topEvent.description }
      }

      const affectedSectorsSet = new Set<Sector>()
      for (const e of govEligible) {
        if (e.effect?.sectorShift) {
          affectedSectorsSet.add(e.effect.sectorShift.sector)
        }
        if (e.choices) {
          for (const c of e.choices) {
            if (c.effect.sectorShift) {
              affectedSectorsSet.add(c.effect.sectorShift.sector)
            }
          }
        }
      }
      const affectedSectors = Array.from(affectedSectorsSet)

      result = {
        type: 'government',
        currentInflation: state.inflation,
        inflationTrend,
        likelyPolicy,
        affectedSectors,
      }
      break
    }
  }

  const updatedPlayer: Company = {
    ...player,
    researchResult: result!,
    researchHistory: [...player.researchHistory, { turn: state.turn, result: result! }],
    actionsThisTurn: [...player.actionsThisTurn, { type: 'research', target, sector }],
  }

  return {
    ...withPlayer(state, updatedPlayer),
    rngState: rng.getState(),
  }
}

/** 액션 적용 → 새 상태 반환 */
function applyAction(state: GameState, action: TurnAction): GameState {
  switch (action.type) {
    case 'buy':
      return applyBuy(state, action.sector)
    case 'sell':
      return applySell(state, action.ownedIndex)
    case 'sectorUpgrade':
      return applySectorUpgrade(state, action.sector)
    case 'research':
      return applyResearch(state, action.target, action.sector, action.targetCompanyId)
    case 'endTurn': {
      const player = getPlayerCompany(state)
      return withPlayer(state, {
        ...player,
        actionsThisTurn: [...player.actionsThisTurn, { type: 'endTurn' }],
      })
    }
  }
}

// === AI 경쟁사 턴 처리 ===

/** 모든 AI 경쟁사의 Planning 행동을 처리 */
function processAICompanies(state: GameState): GameState {
  let current = state

  for (let i = 1; i < current.companies.length; i++) {
    const company = current.companies[i]
    const actions = getAIActions(current, company)

    for (const action of actions) {
      if (action.type === 'endTurn') break
      switch (action.type) {
        case 'buy':
          current = applyBuyFor(current, i, action.sector)
          break
        case 'sell':
          current = applySellFor(current, i, action.ownedIndex)
          break
        case 'sectorUpgrade':
          current = applySectorUpgradeFor(current, i, action.sector)
          break
        default:
          break
      }
    }
  }

  return current
}

/** AI 경쟁사의 이벤트 선택 적용 */
function processAIEventChoices(state: GameState, event: GameEvent): GameState {
  let current = state

  for (let i = 1; i < current.companies.length; i++) {
    const company = current.companies[i]
    const choiceId = getAIEventChoice(current, company, event)
    const choice = event.choices.find((c) => c.id === choiceId)
    if (!choice) continue

    const effect = choice.effect
    let updated: Company = {
      ...company,
      cash: company.cash + (effect.money ?? 0),
      influence: clamp(company.influence + (effect.influence ?? 0), 0, 100),
      activeEffects: [...company.activeEffects, effect],
    }

    // 특성 부여/제거 (AI도 적용)
    updated = applyTraitEffects(updated, effect)

    // 무료 구좌 획득
    if (effect.freeAsset) {
      const currentValue = getCurrentSectorPrice(effect.freeAsset, current)
      updated.assets = [...updated.assets, {
        assetId: effect.freeAsset,
        purchaseTurn: current.turn,
        purchasePrice: 0,
        currentValue,
        valueHistory: [currentValue],
      }]
    }

    // 화폐 이동
    const moneyEffect = effect.money ?? 0
    const freeAssetValue = effect.freeAsset
      ? getCurrentSectorPrice(effect.freeAsset, current)
      : 0

    current = {
      ...withCompany(current, i, updated),
      marketPool: current.marketPool - moneyEffect - freeAssetValue,
    }

    // 이벤트 파급: 경쟁사 선택이 시장/섹터에 영향
    if (effect.marketShift) {
      current = {
        ...current,
        market: { ...current.market, condition: effect.marketShift },
      }
    }
    if (effect.sectorShift) {
      const { sector, trend } = effect.sectorShift
      current = {
        ...current,
        sectorStates: {
          ...current.sectorStates,
          [sector]: { ...current.sectorStates[sector], trend },
        },
      }
    }
  }

  return current
}

// === 이벤트 처리 ===

/** 특성 부여/제거 적용 */
function applyTraitEffects(company: Company, effect: EventEffect): Company {
  let traits = [...company.traits]
  if (effect.traitGrant && !traits.includes(effect.traitGrant)) {
    traits = [...traits, effect.traitGrant]
  }
  if (effect.traitRemove) {
    traits = traits.filter((t) => t !== effect.traitRemove)
  }
  return { ...company, traits }
}

/** 이벤트 선택지 효과 적용 */
function applyEventChoice(state: GameState, choice: EventChoice): GameState {
  const effect = choice.effect
  const player = getPlayerCompany(state)

  let updatedPlayer: Company = {
    ...player,
    cash: player.cash + (effect.money ?? 0),
    influence: clamp(player.influence + (effect.influence ?? 0), 0, 100),
    activeEffects: [...player.activeEffects, effect],
  }

  // 특성 부여/제거
  updatedPlayer = applyTraitEffects(updatedPlayer, effect)

  // 무료 구좌 획득
  if (effect.freeAsset) {
    const currentValue = getCurrentSectorPrice(effect.freeAsset, state)
    const freeOwned: OwnedAsset = {
      assetId: effect.freeAsset,
      purchaseTurn: state.turn,
      purchasePrice: 0,
      currentValue,
      valueHistory: [currentValue],
    }
    updatedPlayer = {
      ...updatedPlayer,
      assets: [...updatedPlayer.assets, freeOwned],
    }
  }

  let newState: GameState = {
    ...withPlayer(state, updatedPlayer),
    eventHistory: [...state.eventHistory, state.currentEvent!.id],
    currentEvent: null,
  }

  // 이벤트 효과에 의한 화폐 이동
  const moneyEffect = effect.money ?? 0
  const freeAssetValue = effect.freeAsset
    ? getCurrentSectorPrice(effect.freeAsset, state)
    : 0
  newState = {
    ...newState,
    marketPool: newState.marketPool - moneyEffect - freeAssetValue,
  }

  // 시장 강제 전환
  if (effect.marketShift) {
    newState = {
      ...newState,
      market: { ...newState.market, condition: effect.marketShift },
    }
  }

  // 섹터 트렌드 강제 전환
  if (effect.sectorShift) {
    const { sector, trend } = effect.sectorShift
    newState = {
      ...newState,
      sectorStates: {
        ...newState.sectorStates,
        [sector]: { ...newState.sectorStates[sector], trend },
      },
    }
  }

  return newState
}

// === 턴 해결 ===

/** 경제 계산 + 구좌 가치 갱신 + 시장/섹터 업데이트 (전체 Company 순회) */
function resolveEconomy(state: GameState): GameState {
  const rng = createRng(state.rngState)

  // 1단계: 시장 풀 비례 축소 적용한 소득 계산
  const { scaledIncomes } = calculatePoolScaledIncomes(state)

  let totalInterestCollected = 0
  let totalAssetValueIncrease = 0

  let updatedCompanies = state.companies.map((company, idx) => {
    const income = calculateCompanyNetIncome(company, state, scaledIncomes[idx])

    // 보유 구좌 현재 가치 갱신 전 총 가치 계산
    const oldAssetValue = company.assets.reduce((sum, owned) => sum + owned.currentValue, 0)

    // 보유 구좌 현재 가치 갱신 (시장가 기반)
    const updatedAssets = company.assets.map((owned) => ({
      ...owned,
      currentValue: calculateAssetValue(owned, state),
    }))

    // 자산 가치 증가분 추적
    const newAssetValue = updatedAssets.reduce((sum, owned) => sum + owned.currentValue, 0)
    const assetValueIncrease = newAssetValue - oldAssetValue
    totalAssetValueIncrease += assetValueIncrease

    // 영향력 자연 감소 (특성에 의한 감소 배율 적용)
    const companyTraitEffects = getCompanyTraitEffects(company)
    const influenceDecay = INFLUENCE_DECAY_PER_TURN * companyTraitEffects.influenceDecayMultiplier
    const newInfluence = clamp(company.influence - influenceDecay, 0, 100)

    let newCash = company.cash + income.net

    // 파산 이자 페널티: cash < 0이면 마이너스가 증폭
    let interestPenalty = 0
    if (newCash < 0) {
      interestPenalty = Math.abs(newCash) * BANKRUPTCY_INTEREST_RATE
      newCash = newCash - interestPenalty
      totalInterestCollected += interestPenalty
    }

    const updatedCompany: Company = {
      ...company,
      cash: newCash,
      revenue: income.revenue,
      expenses: income.expenses,
      influence: newInfluence,
      assets: updatedAssets,
      activeEffects: [], // 턴 효과 초기화
      netWorth: 0, // 아래에서 재계산
      dominatedSectors: [],
    }

    return {
      ...updatedCompany,
      netWorth: calculateCompanyNetWorth(updatedCompany),
    }
  })

  // 2단계: 글로벌 지배력 — 점유율 기반
  updatedCompanies = updatedCompanies.map((company) => {
    const dominance = calculateGlobalDominance(company, updatedCompanies)
    const dominatedSectors = (Object.entries(dominance) as [Sector, { level: string }][])
      .filter(([, info]) => info.level === 'dominant')
      .map(([sector]) => sector)
    return { ...company, dominatedSectors }
  })

  // 2.5단계: 목표 달성 체크 및 보너스 적용 (플레이어만)
  if (state.selectedGoal) {
    const playerIndex = 0
    const player = updatedCompanies[playerIndex]

    const isGoalCompleted = checkGoalCompletion(state, player, state.selectedGoal.id)

    if (isGoalCompleted && !player.goalCompleted) {
      const bonus = calculateGoalBonus(state.selectedGoal)
      updatedCompanies = updatedCompanies.map((company, i) => {
        if (i === playerIndex) {
          return {
            ...company,
            netWorth: company.netWorth + bonus,
            goalCompleted: true,
          }
        }
        return company
      })
    } else if (!isGoalCompleted) {
      updatedCompanies = updatedCompanies.map((company, i) => {
        if (i === playerIndex) {
          return { ...company, goalCompleted: false }
        }
        return company
      })
    }
  }

  // 3단계: 순위 효과 — 1위 영향력 보너스
  const rankings = calculateRankings(updatedCompanies)
  const firstPlaceIdx = rankings[0]
  updatedCompanies = updatedCompanies.map((company, i) => {
    if (i === firstPlaceIdx) {
      return {
        ...company,
        influence: clamp(company.influence + RANK_FIRST_INFLUENCE_BONUS, 0, 100),
      }
    }
    return company
  })

  // 인플레이션 누적 업데이트
  const inflatedState = applyInflation({ ...state, companies: updatedCompanies })

  // 시장 + 섹터 트렌드 업데이트
  const newMarket = updateMarket(state.market, rng)
  const newSectorStates = updateSectorTrends(state.sectorStates, newMarket.condition, rng)

  const newState: GameState = {
    ...inflatedState,
    market: newMarket,
    sectorStates: newSectorStates,
    rngState: rng.getState(),
  }

  // 화폐 보존: 자산 가치 증가분 반영 후 풀 재계산
  const newTotalMoney = newState.totalMoney + totalAssetValueIncrease
  const stateWithUpdatedMoney: GameState = {
    ...newState,
    totalMoney: newTotalMoney,
  }

  const updatedState: GameState = {
    ...stateWithUpdatedMoney,
    marketPool: recalculateMarketPool(stateWithUpdatedMoney) + totalInterestCollected,
  }

  // 화폐 보존 검증
  assertMoneyConservation(updatedState)

  return updatedState
}

/** 승패 판정 */
function checkGameOver(state: GameState): GameState {
  if (state.turn >= state.maxTurns) {
    return { ...state, isGameOver: true, gameOverReason: 'completed' }
  }
  return state
}

// === Public API ===

/**
 * Planning Phase: 플레이어 액션 처리
 * 현금이 행동력 — endTurn 시에만 다음 페이즈로 전환
 */
export function submitAction(state: GameState, action: TurnAction): GameState {
  if (state.phase !== 'planning' || state.isGameOver) return state

  const newState = applyAction(state, action)

  // endTurn → AI 턴 처리 → 정부 → 이벤트 → 정산
  if (action.type === 'endTurn') {
    const afterAI = processAICompanies(newState)
    return {
      ...afterAI,
      phase: 'government',
    }
  }

  // endTurn이 아님 → planning 유지
  return newState
}

/**
 * Event Phase: 이벤트 선택지 처리
 */
export function submitEventChoice(state: GameState, choiceId: string): GameState {
  if (state.phase !== 'event' || !state.currentEvent) return state

  const player = getPlayerCompany(state)

  let choice = state.currentEvent.choices.find((c) => c.id === choiceId)

  // dominanceChoice에서 찾기
  if (!choice && state.currentEvent.dominanceChoice) {
    const dc = state.currentEvent.dominanceChoice
    if (dc.choice.id === choiceId) {
      const dominance = calculateDominance(player.assets)
      if (dominance[dc.sector].level === 'dominant') {
        choice = dc.choice
      }
    }
  }

  if (!choice) return state

  const newState = applyEventChoice(state, choice)

  // 다음 대기 이벤트가 있으면 event phase 유지
  const nextIndex = state.currentEventIndex + 1
  if (nextIndex < state.pendingEvents.length) {
    const nextEvent = state.pendingEvents[nextIndex]
    return {
      ...newState,
      phase: 'event',
      currentEvent: nextEvent,
      currentEventIndex: nextIndex,
    }
  }

  // 모든 이벤트 처리 완료 → resolution
  return {
    ...newState,
    phase: 'resolution',
    pendingEvents: [],
    currentEventIndex: 0,
  }
}

/** 이벤트 롤링 후 event phase 또는 resolution으로 전환 */
function rollAndSetEvents(state: GameState): GameState {
  const rng = createRng(state.rngState)
  const events = rollForEvents(state, rng)

  if (events.length > 0) {
    const firstEvent = events[0]
    let afterAIEvent = { ...state, rngState: rng.getState() }
    for (const evt of events) {
      afterAIEvent = processAIEventChoices(
        { ...afterAIEvent, currentEvent: evt },
        evt,
      )
    }
    return {
      ...afterAIEvent,
      phase: 'event' as const,
      currentEvent: firstEvent,
      pendingEvents: events,
      currentEventIndex: 0,
    }
  }

  return { ...state, phase: 'resolution' as const, rngState: rng.getState() }
}

export function processGovernmentPhase(state: GameState): GameState {
  if (state.phase !== 'government') return state

  const rng = createRng(state.rngState)

  const player = state.companies[0]
  const eligible = (GOVERNMENT_EVENTS as GovernmentEvent[]).filter((e: GovernmentEvent) =>
    !e.conditions || checkEventConditions(e.conditions, state, player),
  )

  if (eligible.length === 0) {
    const defaultEvent: GovernmentEvent = {
      id: 'gov-none',
      title: '안정적 경제',
      description: '이번 턴은 특별한 정부 정책이 없습니다.',
      autoApply: true,
      effect: {},
    }
    return {
      ...state,
      governmentEvent: defaultEvent,
      phase: 'government',
      rngState: rng.getState(),
    }
  }

  const govEvent = rng.pick(eligible) as GovernmentEvent

  if (govEvent.autoApply && govEvent.effect) {
    let newInflation = state.inflation
    if (govEvent.effect.inflationDelta) {
      newInflation = Math.max(0, state.inflation + govEvent.effect.inflationDelta)
    }
    return {
      ...state,
      inflation: newInflation,
      governmentEvent: govEvent,
      phase: 'government',
      rngState: rng.getState(),
    }
  }

  if (govEvent.choices) {
    return {
      ...state,
      governmentEvent: govEvent,
      phase: 'government',
      rngState: rng.getState(),
    }
  }

  return rollAndSetEvents({ ...state, governmentEvent: govEvent, rngState: rng.getState() })
}

export function submitGovernmentChoice(state: GameState, choiceId: string): GameState {
  if (state.phase !== 'government' || !state.governmentEvent?.choices) return state

  const choice = state.governmentEvent.choices.find((c) => c.id === choiceId)
  if (!choice) return state

  let newInflation = state.inflation
  if (choice.effect.inflationDelta) {
    newInflation = Math.max(0, state.inflation + choice.effect.inflationDelta)
  }

  const player = state.companies[0]
  const updatedPlayer: Company = {
    ...player,
    cash: player.cash + (choice.effect.money ?? 0),
    influence: Math.min(100, Math.max(0, player.influence + (choice.effect.influence ?? 0))),
  }

  return rollAndSetEvents({
    ...withPlayer(state, updatedPlayer),
    inflation: newInflation,
  })
}

export function confirmGovernmentEvent(state: GameState): GameState {
  if (state.phase !== 'government' || !state.governmentEvent) return state
  return rollAndSetEvents(state)
}

/**
 * Resolution Phase: 경제 계산 실행
 */
export function resolvePhase(state: GameState): GameState {
  if (state.phase !== 'resolution') return state

  const newCumulativeInflation = state.cumulativeInflation * (1 + state.inflation)
  const resolved = resolveEconomy({ ...state, cumulativeInflation: newCumulativeInflation })
  return { ...resolved, phase: 'result' }
}

/**
 * Result Phase: 다음 턴으로 진행
 */
export function advanceTurn(state: GameState): GameState {
  if (state.phase !== 'result') return state

  const checked = checkGameOver(state)
  if (checked.isGameOver) return checked

  // 순위 기록 추가
  const currentRanks = checked.companies.map((_, i) => getCompanyRank(checked.companies, i))
  const newRankingHistory = [...checked.rankingHistory, currentRanks]

  // 기업별 수치 히스토리 기록
  const historiedCompanies = checked.companies.map(c => ({
    ...c,
    netWorthHistory: [...(c.netWorthHistory ?? []), c.netWorth],
    revenueHistory: [...(c.revenueHistory ?? []), c.revenue],
    expenseHistory: [...(c.expenseHistory ?? []), c.expenses],
    assets: c.assets.map(a => ({
      ...a,
      valueHistory: [...(a.valueHistory ?? []), a.currentValue],
    })),
  }))

  // 인플레이션 히스토리
  const newInflationHistory = [...(checked.inflationHistory ?? []), checked.cumulativeInflation]

  // 턴 상태 초기화
  const resetCompanies = historiedCompanies.map((company) => ({
    ...company,
    actionsThisTurn: [] as TurnAction[],
    researchResult: null,
  }))

  return {
    ...checked,
    turn: checked.turn + 1,
    phase: 'planning',
    companies: resetCompanies,
    rankingHistory: newRankingHistory,
    inflationHistory: newInflationHistory,
  }
}

/**
 * 편의 함수: 턴을 한번에 처리
 */
export function processFullTurn(state: GameState, actions: TurnAction[], eventChoiceId?: string): GameState {
  let current = state

  for (const action of actions) {
    current = submitAction(current, action)
    if (current.phase !== 'planning') break
  }

  if (current.phase === 'planning') {
    current = submitAction(current, { type: 'endTurn' })
  }

  if (current.phase === 'government') {
    current = processGovernmentPhase(current)

    if (current.phase === 'government' && current.governmentEvent?.choices) {
      const firstChoice = current.governmentEvent.choices[0]
      if (firstChoice) {
        current = submitGovernmentChoice(current, firstChoice.id)
      }
    }
  }

  while (current.phase === 'event' && eventChoiceId) {
    current = submitEventChoice(current, eventChoiceId)
  }

  if (current.phase === 'resolution') {
    current = resolvePhase(current)
  }

  return current
}
