import type { GameState, Company, GovernmentEvent } from '../types'
import { createRng } from '../utils'
import { GOVERNMENT_EVENTS } from '../schema/governmentEvents.schema'
import { checkEventConditions } from '../logic/eventConditions'
import { withPlayer } from './helpers'
import { rollAndSetEvents } from './eventProcessor'

export function processGovernmentPhase(state: GameState): GameState {
  if (state.phase !== 'government') return state

  const rng = createRng(state.rngState)

  const player = state.companies[0]
  const eligible = GOVERNMENT_EVENTS.filter((e) =>
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
