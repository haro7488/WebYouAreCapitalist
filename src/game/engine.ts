import type { GameState, TurnAction, EventChoice, MarketCondition } from './types'
import { INVESTMENTS } from './constants'
import { createRng } from './utils'
import { calculateNetIncome } from './economy'
import { updateMarket } from './market'
import { rollForEvent } from './events'
import { clamp } from './utils'

/** 액션 적용 → 새 상태 반환 */
function applyAction(state: GameState, action: TurnAction): GameState {
  switch (action.type) {
    case 'invest': {
      const investment = INVESTMENTS.find((i) => i.id === action.investmentId)
      if (!investment || state.money < action.amount) return state
      const cost = Math.min(action.amount, state.money)
      return {
        ...state,
        money: state.money - cost,
        investments: [
          ...state.investments,
          { investmentId: action.investmentId, purchaseTurn: state.turn, amount: cost },
        ],
      }
    }
    case 'sell': {
      const owned = state.investments[action.ownedIndex]
      if (!owned) return state
      const investment = INVESTMENTS.find((i) => i.id === owned.investmentId)
      if (!investment) return state
      // 매각 시 현재 시장 가치로 돌려받음
      const marketMult = investment.marketMultiplier[state.market.condition]
      const sellValue = Math.floor(owned.amount * (0.8 + marketMult * 0.2)) // 최소 80% + 시장 보너스
      const newInvestments = [...state.investments]
      newInvestments.splice(action.ownedIndex, 1)
      return {
        ...state,
        money: state.money + sellValue,
        investments: newInvestments,
      }
    }
    case 'upgrade':
      // Phase 2: 사업 업그레이드 (placeholder)
      return state
    case 'skip':
      return state
  }
}

/** 이벤트 선택지 효과 적용 */
function applyEventChoice(state: GameState, choice: EventChoice): GameState {
  const effect = choice.effect
  let newState = {
    ...state,
    money: state.money + (effect.money ?? 0),
    reputation: clamp(state.reputation + (effect.reputation ?? 0), 0, 100),
    activeEffects: [...state.activeEffects, effect],
    eventHistory: [...state.eventHistory, state.currentEvent!.id],
    currentEvent: null,
  }

  // 시장 강제 전환
  if (effect.marketShift) {
    newState = {
      ...newState,
      market: { ...newState.market, condition: effect.marketShift as MarketCondition },
    }
  }

  return newState
}

/** 경제 계산 + 시장 업데이트 */
function resolveEconomy(state: GameState): GameState {
  const rng = createRng(state.rngState)
  const income = calculateNetIncome(state)
  const newMarket = updateMarket(state.market, rng)

  return {
    ...state,
    money: state.money + income.net,
    revenue: income.revenue,
    expenses: income.expenses,
    market: newMarket,
    activeEffects: [], // 턴 효과 초기화
    rngState: rng.getState(),
  }
}

/** 승패 판정 */
function checkGameOver(state: GameState): GameState {
  if (state.money < 0) {
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
 * planning → event (이벤트 있으면) 또는 resolution
 */
export function submitAction(state: GameState, action: TurnAction): GameState {
  if (state.phase !== 'planning' || state.isGameOver) return state

  let newState = applyAction(state, action)
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

  // 이벤트 없으면 바로 resolution으로
  return {
    ...newState,
    phase: 'resolution',
    rngState: rng.getState(),
  }
}

/**
 * Event Phase: 이벤트 선택지 처리
 * event → resolution
 */
export function submitEventChoice(state: GameState, choiceId: string): GameState {
  if (state.phase !== 'event' || !state.currentEvent) return state

  const choice = state.currentEvent.choices.find((c) => c.id === choiceId)
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
  }
}

/**
 * 편의 함수: 이벤트 없는 턴을 한번에 처리 (planning → result)
 */
export function processFullTurn(state: GameState, action: TurnAction, eventChoiceId?: string): GameState {
  let current = submitAction(state, action)

  if (current.phase === 'event' && eventChoiceId) {
    current = submitEventChoice(current, eventChoiceId)
  }

  if (current.phase === 'resolution') {
    current = resolvePhase(current)
  }

  return current
}
