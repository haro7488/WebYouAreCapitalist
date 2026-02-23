import type { GameState, Company, TurnAction, EventChoice, OwnedAsset, Sector, ResearchResult, MarketCondition } from './types'
import {
  ASSETS,
  ASSET_UPGRADE_COST_RATIO,
  ASSET_UPGRADE_INCOME_MULTIPLIER,
  ASSET_MAX_UPGRADE_LEVEL,
  SELL_BASE_RATIO,
  SELL_MARKET_RATIO,
  INFLUENCE_DECAY_PER_TURN,
  INFLUENCE_PER_PURCHASE,
} from './constants'
import { createRng, clamp } from './utils'
import {
  calculateCompanyNetIncome,
  calculateAssetValue,
  calculateDominance,
  getInfluenceTier,
  getPlayerCompany,
  updateCompany,
  calculateCompanyNetWorth,
  recalculateMarketPool,
  assertMoneyConservation,
} from './economy'
import { updateMarket, updateSectorTrends } from './market'
import { rollForEvent } from './events'

// === 편의 함수 ===

/** 기업 상태를 교체한 새 GameState 반환 (companies[0]) */
function withPlayer(state: GameState, updated: Company): GameState {
  return { ...state, companies: updateCompany(state, 0, updated) }
}

// === 액션 처리 ===

/** 자산 매입 */
function applyBuy(state: GameState, assetId: string): GameState {
  const asset = ASSETS.find((a) => a.id === assetId)
  if (!asset) return state

  const player = getPlayerCompany(state)

  // 할인 적용: 영향력 티어 할인 + 이벤트 nextPurchaseDiscount
  const influenceTier = getInfluenceTier(player.influence)
  const nextDiscount = player.activeEffects.reduce(
    (acc, e) => acc + (e.nextPurchaseDiscount ?? 0), 0,
  )
  const totalDiscount = influenceTier.purchaseDiscount + nextDiscount
  const cost = Math.floor(asset.cost * (1 - totalDiscount))
  if (player.cash < cost) return state

  const newOwned: OwnedAsset = {
    assetId: asset.id,
    purchaseTurn: state.turn,
    purchasePrice: cost,
    upgradeLevel: 0,
    currentValue: asset.cost, // 현재 가치는 원가 기준
  }

  const influenceGain = INFLUENCE_PER_PURCHASE[asset.tier] ?? 0

  // nextPurchaseDiscount 소모: 사용된 효과에서 제거
  const updatedEffects = nextDiscount > 0
    ? player.activeEffects.map((e) => e.nextPurchaseDiscount ? { ...e, nextPurchaseDiscount: 0 } : e)
    : player.activeEffects

  const updatedPlayer: Company = {
    ...player,
    cash: player.cash - cost,
    assets: [...player.assets, newOwned],
    influence: clamp(player.influence + influenceGain, 0, 100),
    ap: player.ap - 1,
    actionsThisTurn: [...player.actionsThisTurn, { type: 'buy', assetId }],
    activeEffects: updatedEffects,
  }

  // 매입 비용은 시장 풀로 이동
  return {
    ...withPlayer(state, updatedPlayer),
    marketPool: state.marketPool + cost,
  }
}

/** 자산 매각 */
function applySell(state: GameState, ownedIndex: number): GameState {
  const player = getPlayerCompany(state)
  const owned = player.assets[ownedIndex]
  if (!owned) return state

  const asset = ASSETS.find((a) => a.id === owned.assetId)
  if (!asset) return state

  // 매각가 = 현재가치 x (기본비율 + 시장비율 x 시장배율)
  const marketMult = asset.marketMultiplier[state.market.condition]
  const sellValue = Math.floor(owned.currentValue * (SELL_BASE_RATIO + SELL_MARKET_RATIO * marketMult))

  const newAssets = [...player.assets]
  newAssets.splice(ownedIndex, 1)

  const updatedPlayer: Company = {
    ...player,
    cash: player.cash + sellValue,
    assets: newAssets,
    ap: player.ap - 1,
    actionsThisTurn: [...player.actionsThisTurn, { type: 'sell', ownedIndex }],
  }

  // 매각: 자산 가치가 시장 풀로 반환, 매각 대금은 기업으로
  // 풀 변화 = (자산 가치 - 매각 대금) = 차액이 풀로
  const poolChange = owned.currentValue - sellValue

  return {
    ...withPlayer(state, updatedPlayer),
    marketPool: state.marketPool + poolChange,
  }
}

/** 자산 업그레이드 */
function applyUpgrade(state: GameState, ownedIndex: number): GameState {
  const player = getPlayerCompany(state)
  const owned = player.assets[ownedIndex]
  if (!owned) return state
  if (owned.upgradeLevel >= ASSET_MAX_UPGRADE_LEVEL) return state

  const asset = ASSETS.find((a) => a.id === owned.assetId)
  if (!asset) return state

  // 업그레이드 비용 = 원가 x 비율 x (현재레벨+1)
  const upgradeCost = Math.floor(asset.cost * ASSET_UPGRADE_COST_RATIO * (owned.upgradeLevel + 1))
  if (player.cash < upgradeCost) return state

  const newAssets = [...player.assets]
  const newValue = owned.currentValue * ASSET_UPGRADE_INCOME_MULTIPLIER
  newAssets[ownedIndex] = {
    ...owned,
    upgradeLevel: owned.upgradeLevel + 1,
    currentValue: newValue,
  }

  const updatedPlayer: Company = {
    ...player,
    cash: player.cash - upgradeCost,
    assets: newAssets,
    ap: player.ap - 1,
    actionsThisTurn: [...player.actionsThisTurn, { type: 'upgrade', ownedIndex }],
  }

  // 업그레이드 비용은 풀로. 가치 증가분은 풀에서 차감.
  const valueIncrease = newValue - owned.currentValue
  const poolChange = upgradeCost - valueIncrease

  return {
    ...withPlayer(state, updatedPlayer),
    marketPool: state.marketPool + poolChange,
  }
}

/** 시장 조사 */
function applyResearch(state: GameState, target: 'market' | 'sector' | 'event', sector?: Sector): GameState {
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
      return applyResearch(state, action.target, action.sector)
    case 'endTurn': {
      const player = getPlayerCompany(state)
      return withPlayer(state, {
        ...player,
        actionsThisTurn: [...player.actionsThisTurn, { type: 'endTurn' }],
      })
    }
  }
}

// === 이벤트 처리 ===

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

  // 모든 기업의 소득/지출 계산 + 자산 가치 갱신
  const updatedCompanies = state.companies.map((company) => {
    const income = calculateCompanyNetIncome(company, state)

    // 보유 자산 현재 가치 갱신
    const updatedAssets = company.assets.map((owned) => ({
      ...owned,
      currentValue: calculateAssetValue(owned, state),
    }))

    // 영향력 자연 감소
    const newInfluence = clamp(company.influence - INFLUENCE_DECAY_PER_TURN, 0, 100)

    // 지배 섹터 계산
    const dominance = calculateDominance(updatedAssets)
    const dominatedSectors = (Object.entries(dominance) as [Sector, { level: string }][])
      .filter(([, info]) => info.level === 'dominant')
      .map(([sector]) => sector)

    const updatedCompany: Company = {
      ...company,
      cash: company.cash + income.net,
      revenue: income.revenue,
      expenses: income.expenses,
      influence: newInfluence,
      assets: updatedAssets,
      activeEffects: [], // 턴 효과 초기화
      netWorth: 0, // 아래에서 재계산
      dominatedSectors,
    }

    return {
      ...updatedCompany,
      netWorth: calculateCompanyNetWorth(updatedCompany),
    }
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

  // endTurn이거나 AP 소진 → 이벤트 체크 후 다음 페이즈로
  if (action.type === 'endTurn' || newPlayer.ap <= 0) {
    const rng = createRng(newState.rngState)
    const event = rollForEvent(newState, rng)

    if (event) {
      return {
        ...newState,
        phase: 'event',
        currentEvent: event,
        rngState: rng.getState(),
      }
    }

    return {
      ...newState,
      phase: 'resolution',
      rngState: rng.getState(),
    }
  }

  // AP 남음 → planning 유지
  return newState
}

/**
 * Event Phase: 이벤트 선택지 처리
 * event → resolution
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
  return { ...newState, phase: 'resolution' }
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

  if (current.phase === 'event' && eventChoiceId) {
    current = submitEventChoice(current, eventChoiceId)
  }

  if (current.phase === 'resolution') {
    current = resolvePhase(current)
  }

  return current
}
