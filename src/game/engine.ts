import type { GameState, Company, TurnAction, EventChoice, EventEffect, GameEvent, OwnedAsset, Sector, ResearchResult, MarketCondition } from './types'
import {
  ASSETS,
  ASSET_UPGRADE_COST_RATIO,
  ASSET_UPGRADE_INCOME_MULTIPLIER,
  ASSET_MAX_UPGRADE_LEVEL,
  SELL_BASE_RATIO,
  SELL_MARKET_RATIO,
  INFLUENCE_DECAY_PER_TURN,
  INFLUENCE_PER_PURCHASE,
  RANK_FIRST_INFLUENCE_BONUS,
} from './constants'
import { createRng, clamp } from './utils'
import {
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

// === 편의 함수 ===

/** 기업 상태를 교체한 새 GameState 반환 (companies[0]) */
function withPlayer(state: GameState, updated: Company): GameState {
  return { ...state, companies: updateCompany(state, 0, updated) }
}

/** 특정 인덱스의 기업 상태를 교체한 새 GameState 반환 */
function withCompany(state: GameState, index: number, updated: Company): GameState {
  return { ...state, companies: updateCompany(state, index, updated) }
}

// === 액션 처리 (Company 인덱스 기반 — 플레이어/AI 공통) ===

/** 특정 기업의 자산 매입 */
function applyBuyFor(state: GameState, companyIndex: number, assetId: string): GameState {
  const asset = ASSETS.find((a) => a.id === assetId)
  if (!asset) return state

  const company = state.companies[companyIndex]
  if (!company) return state

  // AP 체크
  if (company.ap <= 0) return state

  // 중복 자산 체크
  if (company.assets.some((a) => a.assetId === assetId)) return state

  // 수요 프리미엄: 경쟁사 투자 집중 섹터 → 매입 비용 상승
  const demandPremium = calculateSectorDemandPremium(state.companies, companyIndex, asset.sector)

  // 할인 적용: 영향력 티어 할인 + 이벤트 nextPurchaseDiscount
  const influenceTier = getInfluenceTier(company.influence)
  const nextDiscount = company.activeEffects.reduce(
    (acc, e) => acc + (e.nextPurchaseDiscount ?? 0), 0,
  )
  const totalDiscount = influenceTier.purchaseDiscount + nextDiscount
  const cost = Math.floor(asset.cost * demandPremium * (1 - totalDiscount))
  if (company.cash < cost) return state

  const newOwned: OwnedAsset = {
    assetId: asset.id,
    purchaseTurn: state.turn,
    purchasePrice: cost,
    upgradeLevel: 0,
    currentValue: asset.cost,
  }

  const influenceGain = INFLUENCE_PER_PURCHASE[asset.tier] ?? 0

  const updatedEffects = nextDiscount > 0
    ? company.activeEffects.map((e) => e.nextPurchaseDiscount ? { ...e, nextPurchaseDiscount: 0 } : e)
    : company.activeEffects

  const updated: Company = {
    ...company,
    cash: company.cash - cost,
    assets: [...company.assets, newOwned],
    influence: clamp(company.influence + influenceGain, 0, 100),
    ap: company.ap - 1,
    actionsThisTurn: [...company.actionsThisTurn, { type: 'buy', assetId }],
    activeEffects: updatedEffects,
  }

  return {
    ...withCompany(state, companyIndex, updated),
    marketPool: state.marketPool + cost,
  }
}

/** 특정 기업의 자산 매각 */
function applySellFor(state: GameState, companyIndex: number, ownedIndex: number): GameState {
  const company = state.companies[companyIndex]
  if (!company) return state
  if (company.ap <= 0) return state
  const owned = company.assets[ownedIndex]
  if (!owned) return state

  const asset = ASSETS.find((a) => a.id === owned.assetId)
  if (!asset) return state

  const marketMult = asset.marketMultiplier[state.market.condition]
  const sellValue = Math.floor(owned.currentValue * (SELL_BASE_RATIO + SELL_MARKET_RATIO * marketMult))

  const newAssets = [...company.assets]
  newAssets.splice(ownedIndex, 1)

  const updated: Company = {
    ...company,
    cash: company.cash + sellValue,
    assets: newAssets,
    ap: company.ap - 1,
    actionsThisTurn: [...company.actionsThisTurn, { type: 'sell', ownedIndex }],
  }

  const poolChange = owned.currentValue - sellValue

  return {
    ...withCompany(state, companyIndex, updated),
    marketPool: state.marketPool + poolChange,
  }
}

/** 특정 기업의 자산 업그레이드 */
function applyUpgradeFor(state: GameState, companyIndex: number, ownedIndex: number): GameState {
  const company = state.companies[companyIndex]
  if (!company) return state
  if (company.ap <= 0) return state
  const owned = company.assets[ownedIndex]
  if (!owned) return state
  if (owned.upgradeLevel >= ASSET_MAX_UPGRADE_LEVEL) return state

  const asset = ASSETS.find((a) => a.id === owned.assetId)
  if (!asset) return state

  const upgradeCost = Math.floor(asset.cost * ASSET_UPGRADE_COST_RATIO * (owned.upgradeLevel + 1))
  if (company.cash < upgradeCost) return state

  const newAssets = [...company.assets]
  const newValue = owned.currentValue * ASSET_UPGRADE_INCOME_MULTIPLIER
  newAssets[ownedIndex] = {
    ...owned,
    upgradeLevel: owned.upgradeLevel + 1,
    currentValue: newValue,
  }

  const updated: Company = {
    ...company,
    cash: company.cash - upgradeCost,
    assets: newAssets,
    ap: company.ap - 1,
    actionsThisTurn: [...company.actionsThisTurn, { type: 'upgrade', ownedIndex }],
  }

  const valueIncrease = newValue - owned.currentValue
  const poolChange = upgradeCost - valueIncrease

  return {
    ...withCompany(state, companyIndex, updated),
    marketPool: state.marketPool + poolChange,
  }
}

// === 하위 호환 래퍼 (플레이어 = companies[0]) ===

function applyBuy(state: GameState, assetId: string): GameState {
  return applyBuyFor(state, 0, assetId)
}

function applySell(state: GameState, ownedIndex: number): GameState {
  return applySellFor(state, 0, ownedIndex)
}

function applyUpgrade(state: GameState, ownedIndex: number): GameState {
  return applyUpgradeFor(state, 0, ownedIndex)
}

/** 시장 조사 (기존 market/sector/event + 신규 competitor/strategy/share) */
function applyResearch(
  state: GameState,
  target: 'market' | 'sector' | 'event' | 'competitor' | 'strategy' | 'share',
  sector?: Sector,
  targetCompanyId?: string,
): GameState {
  const rng = createRng(state.rngState)
  const player = getPlayerCompany(state)
  const influenceTier = getInfluenceTier(player.influence)
  const apCost = influenceTier.freeResearch ? 0 : 1

  let result: ResearchResult
  switch (target) {
    case 'market':
      result = {
        type: 'market',
        turnsToChange: state.market.turnsRemaining,
        likelyNext: rng.pick(['boom', 'stable', 'recession'] as MarketCondition[]),
      }
      break
    case 'sector': {
      const targetSector = sector ?? rng.pick(['food', 'tech', 'realEstate', 'retail', 'finance'] as Sector[])
      const sectorState = state.sectorStates[targetSector]
      result = {
        type: 'sector',
        sector: targetSector,
        nextTrend: sectorState.turnsRemaining <= 2
          ? rng.pick(['hot', 'neutral', 'cold'] as const)
          : sectorState.trend,
      }
      break
    }
    case 'event': {
      const hints = [
        '경제 관련 이벤트가 예상됩니다',
        '섹터 변동 이벤트가 올 수 있습니다',
        '개인적인 사건이 발생할 수 있습니다',
        '특별한 기회가 올 수 있습니다',
        '당분간 큰 이벤트는 없을 것 같습니다',
      ]
      result = { type: 'event', hint: rng.pick(hints) }
      break
    }
    case 'competitor': {
      // 특정 경쟁사 포트폴리오 공개
      const aiCompanies = state.companies.filter((_, i) => i > 0)
      const targetCompany = targetCompanyId
        ? state.companies.find((c) => c.id === targetCompanyId)
        : rng.pick(aiCompanies)
      if (!targetCompany) return state
      result = {
        type: 'competitor',
        companyId: targetCompany.id,
        companyName: targetCompany.name,
        assets: [...targetCompany.assets],
      }
      break
    }
    case 'strategy': {
      // 경쟁사 전략 타입 공개
      const aiCompanies2 = state.companies.filter((_, i) => i > 0)
      const targetCompany2 = targetCompanyId
        ? state.companies.find((c) => c.id === targetCompanyId)
        : rng.pick(aiCompanies2)
      if (!targetCompany2) return state
      const strategyId = state.aiStrategies[targetCompany2.id] ?? 'unknown'
      result = {
        type: 'strategy',
        companyId: targetCompany2.id,
        companyName: targetCompany2.name,
        strategyId,
      }
      break
    }
    case 'share': {
      // 섹터 내 점유율 공개
      const targetSector = sector ?? rng.pick(['food', 'tech', 'realEstate', 'retail', 'finance'] as Sector[])
      result = {
        type: 'share',
        sector: targetSector,
        shares: calculateSectorShares(state.companies, targetSector),
      }
      break
    }
  }

  const updatedPlayer: Company = {
    ...player,
    researchResult: result,
    ap: player.ap - apCost,
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
      return applyBuy(state, action.assetId)
    case 'sell':
      return applySell(state, action.ownedIndex)
    case 'upgrade':
      return applyUpgrade(state, action.ownedIndex)
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

  // companies[1+]이 AI
  for (let i = 1; i < current.companies.length; i++) {
    const company = current.companies[i]
    const actions = getAIActions(current, company)

    for (const action of actions) {
      if (action.type === 'endTurn') break
      switch (action.type) {
        case 'buy':
          current = applyBuyFor(current, i, action.assetId)
          break
        case 'sell':
          current = applySellFor(current, i, action.ownedIndex)
          break
        case 'upgrade':
          current = applyUpgradeFor(current, i, action.ownedIndex)
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

    // 무료 자산 획득
    if (effect.freeAsset) {
      const asset = ASSETS.find((a) => a.id === effect.freeAsset)
      if (asset) {
        updated.assets = [...updated.assets, {
          assetId: asset.id,
          purchaseTurn: current.turn,
          purchasePrice: 0,
          upgradeLevel: 0,
          currentValue: asset.cost,
        }]
      }
    }

    // 화폐 이동
    const moneyEffect = effect.money ?? 0
    const freeAssetValue = effect.freeAsset
      ? (ASSETS.find((a) => a.id === effect.freeAsset)?.cost ?? 0)
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

  // 무료 자산 획득
  if (effect.freeAsset) {
    const asset = ASSETS.find((a) => a.id === effect.freeAsset)
    if (asset) {
      const freeOwned: OwnedAsset = {
        assetId: asset.id,
        purchaseTurn: state.turn,
        purchasePrice: 0,
        upgradeLevel: 0,
        currentValue: asset.cost,
      }
      updatedPlayer = {
        ...updatedPlayer,
        assets: [...updatedPlayer.assets, freeOwned],
      }
    }
  }

  let newState: GameState = {
    ...withPlayer(state, updatedPlayer),
    eventHistory: [...state.eventHistory, state.currentEvent!.id],
    currentEvent: null,
  }

  // 이벤트 효과에 의한 화폐 이동: 돈은 시장 풀에서 기업으로 (또는 반대)
  const moneyEffect = effect.money ?? 0
  const freeAssetValue = effect.freeAsset
    ? (ASSETS.find((a) => a.id === effect.freeAsset)?.cost ?? 0)
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

/** 경제 계산 + 자산 가치 갱신 + 시장/섹터 업데이트 (전체 Company 순회) */
function resolveEconomy(state: GameState): GameState {
  const rng = createRng(state.rngState)

  // 1단계: 시장 풀 비례 축소 적용한 소득 계산
  const { scaledIncomes } = calculatePoolScaledIncomes(state)

  let updatedCompanies = state.companies.map((company, idx) => {
    const income = calculateCompanyNetIncome(company, state, scaledIncomes[idx])

    // 보유 자산 현재 가치 갱신
    const updatedAssets = company.assets.map((owned) => ({
      ...owned,
      currentValue: calculateAssetValue(owned, state),
    }))

    // 영향력 자연 감소
    const newInfluence = clamp(company.influence - INFLUENCE_DECAY_PER_TURN, 0, 100)

    const updatedCompany: Company = {
      ...company,
      cash: company.cash + income.net,
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

  // 2단계: 글로벌 지배력 — 섹터당 지배자 1명만
  updatedCompanies = updatedCompanies.map((company) => {
    const dominance = calculateGlobalDominance(company, updatedCompanies)
    const dominatedSectors = (Object.entries(dominance) as [Sector, { level: string }][])
      .filter(([, info]) => info.level === 'dominant')
      .map(([sector]) => sector)
    return { ...company, dominatedSectors }
  })

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

  // 시장 + 섹터 트렌드 업데이트
  const newMarket = updateMarket(state.market, rng)
  const newSectorStates = updateSectorTrends(state.sectorStates, newMarket.condition, rng)

  const newState: GameState = {
    ...state,
    companies: updatedCompanies,
    market: newMarket,
    sectorStates: newSectorStates,
    rngState: rng.getState(),
  }

  // 화폐 보존: 풀 재계산
  const updatedState: GameState = {
    ...newState,
    marketPool: recalculateMarketPool(newState),
  }

  // 화폐 보존 검증
  assertMoneyConservation(updatedState)

  return updatedState
}

/** 승패 판정 (파산: 현금 < 0 이고 매각 가능 자산 없음) */
function checkGameOver(state: GameState): GameState {
  const player = getPlayerCompany(state)
  if (player.cash < 0 && player.assets.length === 0) {
    return { ...state, isGameOver: true, gameOverReason: 'bankrupt' }
  }
  if (state.turn >= state.maxTurns) {
    return { ...state, isGameOver: true, gameOverReason: 'completed' }
  }
  return state
}

// === Public API ===

/**
 * Planning Phase: 플레이어 액션 처리
 * AP가 남으면 planning 유지, endTurn 또는 AP 소진 시 → event/resolution
 */
export function submitAction(state: GameState, action: TurnAction): GameState {
  if (state.phase !== 'planning' || state.isGameOver) return state

  const player = getPlayerCompany(state)

  // endTurn이 아닌 액션은 AP 필요
  if (action.type !== 'endTurn' && player.ap <= 0) {
    if (action.type === 'research' && getInfluenceTier(player.influence).freeResearch) {
      // 무료 조사 허용
    } else {
      return state
    }
  }

  const newState = applyAction(state, action)
  const newPlayer = getPlayerCompany(newState)

  // endTurn이거나 AP 소진 → AI 턴 처리 → 이벤트 체크 → 다음 페이즈
  // 단, 조사 결과가 있으면 플레이어가 확인할 수 있도록 planning 유지
  if (action.type === 'endTurn' || (newPlayer.ap <= 0 && !newPlayer.researchResult)) {
    // AI 경쟁사 행동 처리
    let afterAI = processAICompanies(newState)

    const rng = createRng(afterAI.rngState)
    const events = rollForEvents(afterAI, rng)

    if (events.length > 0) {
      const firstEvent = events[0]
      // AI도 모든 이벤트에 대응
      let afterAIEvent = { ...afterAI, rngState: rng.getState() }
      for (const evt of events) {
        afterAIEvent = processAIEventChoices(
          { ...afterAIEvent, currentEvent: evt },
          evt,
        )
      }
      return {
        ...afterAIEvent,
        phase: 'event',
        currentEvent: firstEvent,
        pendingEvents: events,
        currentEventIndex: 0,
      }
    }

    return {
      ...afterAI,
      phase: 'resolution',
      rngState: rng.getState(),
    }
  }

  // AP 남음 → planning 유지
  return newState
}

/**
 * Event Phase: 이벤트 선택지 처리
 * pendingEvents를 순차 처리: 다음 이벤트가 있으면 event 유지, 없으면 → resolution
 */
export function submitEventChoice(state: GameState, choiceId: string): GameState {
  if (state.phase !== 'event' || !state.currentEvent) return state

  const player = getPlayerCompany(state)

  // 기본 선택지에서 찾기
  let choice = state.currentEvent.choices.find((c) => c.id === choiceId)

  // dominanceChoice에서 찾기
  if (!choice && state.currentEvent.dominanceChoice) {
    const dc = state.currentEvent.dominanceChoice
    if (dc.choice.id === choiceId) {
      // 지배력 확인
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

/**
 * Resolution Phase: 경제 계산 실행
 * resolution → result
 */
export function resolvePhase(state: GameState): GameState {
  if (state.phase !== 'resolution') return state

  const resolved = resolveEconomy(state)
  return { ...resolved, phase: 'result' }
}

/**
 * Result Phase: 다음 턴으로 진행
 * result → planning (또는 게임 오버)
 */
export function advanceTurn(state: GameState): GameState {
  if (state.phase !== 'result') return state

  const checked = checkGameOver(state)
  if (checked.isGameOver) return checked

  // 순위 기록 추가
  const currentRanks = checked.companies.map((_, i) => getCompanyRank(checked.companies, i))
  const newRankingHistory = [...checked.rankingHistory, currentRanks]

  // 모든 기업의 AP 리셋 + 턴 상태 초기화
  const resetCompanies = checked.companies.map((company) => ({
    ...company,
    ap: company.maxAp,
    actionsThisTurn: [] as TurnAction[],
    researchResult: null,
  }))

  return {
    ...checked,
    turn: checked.turn + 1,
    phase: 'planning',
    companies: resetCompanies,
    rankingHistory: newRankingHistory,
  }
}

/**
 * 편의 함수: 턴을 한번에 처리 (planning → result)
 */
export function processFullTurn(state: GameState, actions: TurnAction[], eventChoiceId?: string): GameState {
  let current = state

  // 모든 액션 순차 실행
  for (const action of actions) {
    current = submitAction(current, action)
    if (current.phase !== 'planning') break
  }

  // 마지막 액션 후에도 planning이면 endTurn
  if (current.phase === 'planning') {
    current = submitAction(current, { type: 'endTurn' })
  }

  // 이벤트가 여러 개일 수 있으므로 모든 이벤트에 동일한 선택지 ID 적용
  while (current.phase === 'event' && eventChoiceId) {
    current = submitEventChoice(current, eventChoiceId)
  }

  if (current.phase === 'resolution') {
    current = resolvePhase(current)
  }

  return current
}
