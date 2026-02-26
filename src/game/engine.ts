/**
 * 게임 엔진 오케스트레이터
 *
 * 각 하위 모듈의 함수를 조합하여 Public API를 제공한다.
 * 하위 모듈: helpers, actions, research, eventProcessor, government, resolution
 */
import type { GameState, TurnAction } from './types'
import { getPlayerCompany, calculateDominance } from './economy'
import { withPlayer } from './engine/helpers'
import { applyBuy, applySell, applySectorUpgrade } from './engine/actions'
import { applyResearch } from './engine/research'
import { processAICompanies, applyEventChoice } from './engine/eventProcessor'
import { processGovernmentPhase, submitGovernmentChoice, confirmGovernmentEvent } from './engine/government'
import { resolvePhase, advanceTurn } from './engine/resolution'

// === 액션 dispatch ===

/** 액션 적용 → 새 상태 반환 */
function applyAction(state: GameState, action: TurnAction): GameState {
  // sectorUpgrade 외 액션 시 연구 결과 피드백 초기화
  const cleared = action.type !== 'sectorUpgrade'
    ? { ...state, lastResearchResult: null }
    : state

  switch (action.type) {
    case 'buy':
      return applyBuy(cleared, action.sector)
    case 'sell':
      return applySell(cleared, action.ownedIndex)
    case 'sectorUpgrade':
      return applySectorUpgrade(cleared, action.sector)
    case 'research':
      return applyResearch(cleared, action.target, action.sector, action.targetCompanyId)
    case 'endTurn': {
      const player = getPlayerCompany(state)
      return withPlayer(state, {
        ...player,
        actionsThisTurn: [...player.actionsThisTurn, { type: 'endTurn' }],
      })
    }
  }
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

// 정부 이벤트 public API re-export
export { processGovernmentPhase, submitGovernmentChoice, confirmGovernmentEvent }

// Resolution/Turn public API re-export
export { resolvePhase, advanceTurn }

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
