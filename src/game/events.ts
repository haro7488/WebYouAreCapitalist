import type { GameEvent, GameState } from './types'
import type { Rng } from './utils'
import { VOLATILITY_EVENT_BONUS } from './constants'
import { EVENT_REGISTRY } from './schema/events.schema'
import { checkEventConditions } from './logic/eventConditions'
import { getCompanyTraitEffects } from './logic/traitEngine'

export { EVENT_REGISTRY }

/** 조건을 충족하는 이벤트 필터링 */
function getEligibleEvents(state: GameState, excludeIds: string[] = []): GameEvent[] {
  const player = state.companies[0]
  const recentEvents = state.eventHistory.slice(-5)
  return EVENT_REGISTRY.filter((e) => {
    if (state.turn < e.minTurn) return false
    if (!checkEventConditions(e.conditions, state, player)) return false
    if (recentEvents.includes(e.id)) return false
    if (excludeIds.includes(e.id)) return false
    return true
  })
}

/** 가중치 기반 이벤트 선택 (플레이어 특성 보정 포함) */
function pickWeightedEvent(eligible: GameEvent[], rng: Rng, state: GameState): GameEvent {
  const player = state.companies[0]
  const traitEffects = getCompanyTraitEffects(player)

  const effectiveWeight = (e: GameEvent): number => {
    let w = e.weight
    if (e.type === 'opportunity') w += traitEffects.opportunityWeightBonus
    if (e.type === 'pressure') w += traitEffects.pressureWeightBonus
    return Math.max(w, 0)
  }

  const totalWeight = eligible.reduce((sum, e) => sum + effectiveWeight(e), 0)
  let roll = rng.random() * totalWeight
  for (const event of eligible) {
    roll -= effectiveWeight(event)
    if (roll <= 0) return event
  }
  return eligible[eligible.length - 1]
}

/** 이벤트 발생 판정: 1개 보장 + 추가 확률 판정으로 최대 2개 반환 */
export function rollForEvents(state: GameState, rng: Rng): GameEvent[] {
  const eligible = getEligibleEvents(state)
  if (eligible.length === 0) return []

  // 1번째: 조건 충족 이벤트에서 무조건 1개 선택 (guaranteed)
  const first = pickWeightedEvent(eligible, rng, state)
  const result: GameEvent[] = [first]

  // 2번째: 기존 확률 판정으로 추가 이벤트 (1번째와 다른 이벤트)
  const probability = state.config.eventProbability + state.market.volatility * VOLATILITY_EVENT_BONUS
  if (rng.random() <= probability) {
    const secondEligible = getEligibleEvents(state, [first.id])
    if (secondEligible.length > 0) {
      result.push(pickWeightedEvent(secondEligible, rng, state))
    }
  }

  return result
}

/** 하위 호환: 단일 이벤트 반환 (사용처가 있으면 유지) */
export function rollForEvent(state: GameState, rng: Rng): GameEvent | null {
  const events = rollForEvents(state, rng)
  return events.length > 0 ? events[0] : null
}

/** ID로 이벤트 레지스트리에서 이벤트 조회 */
export function findEventById(id: string): GameEvent | null {
  return EVENT_REGISTRY.find((e) => e.id === id) ?? null
}
