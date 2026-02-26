import type { GameState, Company, EventChoice, EventEffect, GameEvent, OwnedAsset } from '../types'
import { createRng, clamp } from '../utils'
import {
  getPlayerCompany,
  getInfluenceTier,
} from '../economy'
import { rollForEvents } from '../events'
import { getAIActions, getAIEventChoice } from '../competitor/ai'
import { withPlayer, withCompany, getCurrentSectorPrice } from './helpers'
import { applyBuyFor, applySellFor, applySectorUpgradeFor } from './actions'

// === AI 경쟁사 턴 처리 ===

/** 모든 AI 경쟁사의 Planning 행동을 처리 */
export function processAICompanies(state: GameState): GameState {
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
export function processAIEventChoices(state: GameState, event: GameEvent): GameState {
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
export function applyTraitEffects(company: Company, effect: EventEffect): Company {
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
export function applyEventChoice(state: GameState, choice: EventChoice): GameState {
  const effect = choice.effect
  const player = getPlayerCompany(state)

  // 영향력 티어 eventBonus: 양수 보상 증폭
  const moneyReward = effect.money ?? 0
  const influenceTier = getInfluenceTier(player.influence)
  const boostedMoney = moneyReward > 0
    ? Math.floor(moneyReward * (1 + influenceTier.eventBonus))
    : moneyReward

  let updatedPlayer: Company = {
    ...player,
    cash: player.cash + boostedMoney,
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

  // 이벤트 효과에 의한 화폐 이동 (eventBonus 적용된 금액 사용)
  const freeAssetValue = effect.freeAsset
    ? getCurrentSectorPrice(effect.freeAsset, state)
    : 0
  newState = {
    ...newState,
    marketPool: newState.marketPool - boostedMoney - freeAssetValue,
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

/** 이벤트 롤링 후 event phase 또는 resolution으로 전환 */
export function rollAndSetEvents(state: GameState): GameState {
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
