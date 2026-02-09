import type { GameState, TurnAction, EventChoice, MarketCondition, OwnedAsset, Sector, ResearchResult } from './types'
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
import { calculateNetIncome, calculateAssetValue, calculateDominance, getInfluenceTier } from './economy'
import { updateMarket, updateSectorTrends } from './market'
import { rollForEvent } from './events'

// === 액션 처리 ===

/** 자산 매입 */
function applyBuy(state: GameState, assetId: string): GameState {
  const asset = ASSETS.find((a) => a.id === assetId)
  if (!asset) return state

  // 할인 적용: 영향력 티어 할인 + 이벤트 nextPurchaseDiscount
  const influenceTier = getInfluenceTier(state.influence)
  const nextDiscount = state.activeEffects.reduce(
    (acc, e) => acc + (e.nextPurchaseDiscount ?? 0), 0,
  )
  const totalDiscount = influenceTier.purchaseDiscount + nextDiscount
  const cost = Math.floor(asset.cost * (1 - totalDiscount))
  if (state.money < cost) return state

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
    ? state.activeEffects.map((e) => e.nextPurchaseDiscount ? { ...e, nextPurchaseDiscount: 0 } : e)
    : state.activeEffects

  return {
    ...state,
    money: state.money - cost,
    ownedAssets: [...state.ownedAssets, newOwned],
    influence: clamp(state.influence + influenceGain, 0, 100),
    actionPoints: state.actionPoints - 1,
    actionsThisTurn: [...state.actionsThisTurn, { type: 'buy', assetId }],
    activeEffects: updatedEffects,
  }
}

/** 자산 매각 */
function applySell(state: GameState, ownedIndex: number): GameState {
  const owned = state.ownedAssets[ownedIndex]
  if (!owned) return state

  const asset = ASSETS.find((a) => a.id === owned.assetId)
  if (!asset) return state

  // 매각가 = 현재가치 x (기본비율 + 시장비율 x 시장배율)
  const marketMult = asset.marketMultiplier[state.market.condition]
  const sellValue = Math.floor(owned.currentValue * (SELL_BASE_RATIO + SELL_MARKET_RATIO * marketMult))

  const newOwnedAssets = [...state.ownedAssets]
  newOwnedAssets.splice(ownedIndex, 1)

  return {
    ...state,
    money: state.money + sellValue,
    ownedAssets: newOwnedAssets,
    actionPoints: state.actionPoints - 1,
    actionsThisTurn: [...state.actionsThisTurn, { type: 'sell', ownedIndex }],
  }
}

/** 자산 업그레이드 */
function applyUpgrade(state: GameState, ownedIndex: number): GameState {
  const owned = state.ownedAssets[ownedIndex]
  if (!owned) return state
  if (owned.upgradeLevel >= ASSET_MAX_UPGRADE_LEVEL) return state

  const asset = ASSETS.find((a) => a.id === owned.assetId)
  if (!asset) return state

  // 업그레이드 비용 = 원가 x 비율 x (현재레벨+1)
  const upgradeCost = Math.floor(asset.cost * ASSET_UPGRADE_COST_RATIO * (owned.upgradeLevel + 1))
  if (state.money < upgradeCost) return state

  const newOwnedAssets = [...state.ownedAssets]
  newOwnedAssets[ownedIndex] = {
    ...owned,
    upgradeLevel: owned.upgradeLevel + 1,
    // 업그레이드 시 현재 가치도 반영
    currentValue: owned.currentValue * ASSET_UPGRADE_INCOME_MULTIPLIER,
  }

  return {
    ...state,
    money: state.money - upgradeCost,
    ownedAssets: newOwnedAssets,
    actionPoints: state.actionPoints - 1,
    actionsThisTurn: [...state.actionsThisTurn, { type: 'upgrade', ownedIndex }],
  }
}

/** 시장 조사 */
function applyResearch(state: GameState, target: 'market' | 'sector' | 'event', sector?: Sector): GameState {
  const rng = createRng(state.rngState)

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

  return {
    ...state,
    researchResult: result,
    actionPoints: state.actionPoints - 1,
    actionsThisTurn: [...state.actionsThisTurn, { type: 'research', target, sector }],
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
    case 'endTurn':
      return {
        ...state,
        actionsThisTurn: [...state.actionsThisTurn, { type: 'endTurn' }],
      }
  }
}

// === 이벤트 처리 ===

/** 이벤트 선택지 효과 적용 */
function applyEventChoice(state: GameState, choice: EventChoice): GameState {
  const effect = choice.effect
  let newState: GameState = {
    ...state,
    money: state.money + (effect.money ?? 0),
    influence: clamp(state.influence + (effect.influence ?? 0), 0, 100),
    activeEffects: [...state.activeEffects, effect],
    eventHistory: [...state.eventHistory, state.currentEvent!.id],
    currentEvent: null,
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
      newState = {
        ...newState,
        ownedAssets: [...newState.ownedAssets, freeOwned],
      }
    }
  }

  return newState
}

// === 턴 해결 ===

/** 경제 계산 + 자산 가치 갱신 + 시장/섹터 업데이트 */
function resolveEconomy(state: GameState): GameState {
  const rng = createRng(state.rngState)
  const income = calculateNetIncome(state)

  // 보유 자산 현재 가치 갱신
  const updatedAssets = state.ownedAssets.map((owned) => ({
    ...owned,
    currentValue: calculateAssetValue(owned, state),
  }))

  // 시장 + 섹터 트렌드 업데이트
  const newMarket = updateMarket(state.market, rng)
  const newSectorStates = updateSectorTrends(state.sectorStates, newMarket.condition, rng)

  // 영향력 자연 감소
  const newInfluence = clamp(state.influence - INFLUENCE_DECAY_PER_TURN, 0, 100)

  return {
    ...state,
    money: state.money + income.net,
    revenue: income.revenue,
    expenses: income.expenses,
    influence: newInfluence,
    market: newMarket,
    sectorStates: newSectorStates,
    ownedAssets: updatedAssets,
    activeEffects: [], // 턴 효과 초기화
    researchResult: null, // 조사 결과 초기화
    rngState: rng.getState(),
  }
}

/** 승패 판정 (파산: 현금 < 0 이고 매각 가능 자산 없음) */
function checkGameOver(state: GameState): GameState {
  if (state.money < 0 && state.ownedAssets.length === 0) {
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

  // endTurn이 아닌 액션은 AP 필요
  if (action.type !== 'endTurn' && state.actionPoints <= 0) return state

  const newState = applyAction(state, action)

  // endTurn이거나 AP 소진 → 이벤트 체크 후 다음 페이즈로
  if (action.type === 'endTurn' || newState.actionPoints <= 0) {
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

  // 기본 선택지에서 찾기
  let choice = state.currentEvent.choices.find((c) => c.id === choiceId)

  // dominanceChoice에서 찾기
  if (!choice && state.currentEvent.dominanceChoice) {
    const dc = state.currentEvent.dominanceChoice
    if (dc.choice.id === choiceId) {
      // 지배력 확인
      const dominance = calculateDominance(state.ownedAssets)
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

  return {
    ...checked,
    turn: checked.turn + 1,
    phase: 'planning',
    actionPoints: checked.maxActionPoints,
    actionsThisTurn: [],
    researchResult: null,
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
