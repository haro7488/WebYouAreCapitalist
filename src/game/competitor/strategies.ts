import type { CompetitorStrategy } from './types'
import type { GameState, Company, TurnAction, Sector, GameEvent, StrategyId } from '../types'
import { SECTORS, ALL_SECTORS, SECTOR_MAX_UPGRADE_LEVEL } from '../constants'
import { calculateCurrentPrice } from '../breakdown'
import { createRng } from '../utils'

// === 공용 헬퍼 ===

/** 현재 가격 기준 구매 가능한 섹터 목록 (가격 포함) */
function getAffordableSectors(state: GameState, cash: number): { sector: Sector; price: number }[] {
  return SECTORS
    .map(s => ({ sector: s.id, price: calculateCurrentPrice(s.id, state) }))
    .filter(s => s.price <= cash)
}

/** 기업이 보유한 섹터별 구좌 수 */
function countBySector(company: Company): Record<Sector, number> {
  const counts = {} as Record<Sector, number>
  for (const s of ALL_SECTORS) counts[s] = 0
  for (const owned of company.assets) {
    counts[owned.assetId] = (counts[owned.assetId] || 0) + 1
  }
  return counts
}

/** 연구 포인트가 있으면 가장 많이 보유한 섹터 업그레이드 액션 추가 */
function appendUpgradeAction(actions: TurnAction[], company: Company): void {
  if ((company.researchPoints ?? 0) < 1) return
  const sectorCounts = countBySector(company)
  const bestSector = ALL_SECTORS
    .filter(s => sectorCounts[s] > 0 && (company.sectorUpgrades?.[s] ?? 0) < SECTOR_MAX_UPGRADE_LEVEL)
    .sort((a, b) => sectorCounts[b] - sectorCounts[a])[0]
  if (bestSector) {
    actions.push({ type: 'sectorUpgrade', sector: bestSector })
  }
}

/** 이벤트 선택지 중 금전적으로 가장 안전한 것 선택 */
function chooseSafestEvent(event: GameEvent): string {
  const sorted = [...event.choices].sort(
    (a, b) => (b.effect.money ?? 0) - (a.effect.money ?? 0),
  )
  return sorted[0].id
}

/** 이벤트 선택지 중 기대 가치가 가장 높은 것 선택 */
function chooseHighValueEvent(event: GameEvent): string {
  const scored = event.choices.map(c => ({
    id: c.id,
    score: (c.effect.influence ?? 0)
      + ((c.effect.revenueMultiplier ?? 1) - 1) * 100
      + (c.effect.freeAsset ? 50 : 0)
      + (c.effect.money ?? 0) * 0.1,
  }))
  scored.sort((a, b) => b.score - a.score)
  return scored[0].id
}

// === 🏦 보수형: 저가 섹터 분산, 불황 시 현금 비축 ===

export const conservativeStrategy: CompetitorStrategy = {
  decide(state: GameState, company: Company): TurnAction[] {
    const actions: TurnAction[] = []
    let cash = company.cash
    const sectorCounts = countBySector(company)

    if (state.market.condition === 'recession') {
      // 불황 시 안정형 섹터(food, energy, logistics) 할인 매수
      const defensiveSectors: Sector[] = ['food', 'energy', 'logistics']
      const affordable = getAffordableSectors(state, cash)
        .filter(s => defensiveSectors.includes(s.sector) && sectorCounts[s.sector] < 2)
        .sort((a, b) => a.price - b.price)
      if (affordable.length > 0 && cash >= affordable[0].price) {
        actions.push({ type: 'buy', sector: affordable[0].sector })
      }
    } else {
      // 미보유 섹터 우선, 가격 오름차순 매입
      const affordable = getAffordableSectors(state, cash)
        .sort((a, b) => {
          const aNew = sectorCounts[a.sector] === 0 ? 1 : 0
          const bNew = sectorCounts[b.sector] === 0 ? 1 : 0
          if (aNew !== bNew) return bNew - aNew
          return a.price - b.price
        })

      for (const { sector, price } of affordable) {
        if (cash < price) continue
        // 보수형: 섹터당 최대 2구좌
        if (sectorCounts[sector] >= 2) continue
        actions.push({ type: 'buy', sector })
        cash -= price
        sectorCounts[sector]++
      }
    }

    // 연구 포인트 활용
    appendUpgradeAction(actions, company)

    if (actions.length === 0) actions.push({ type: 'endTurn' })
    return actions
  },

  chooseEvent(_state: GameState, _company: Company, event: GameEvent): string {
    return chooseSafestEvent(event)
  },
}

// === 🚀 공격형: 고가 섹터 집중, 호황 시 공격적 매입 ===

export const aggressiveStrategy: CompetitorStrategy = {
  decide(state: GameState, company: Company): TurnAction[] {
    const actions: TurnAction[] = []
    let cash = company.cash
    const sectorCounts = countBySector(company)

    // 턴 10+ 자산 3개+ → R&D 1구좌 확보 (연구 포인트 생성용)
    if (state.turn >= 10 && company.assets.length >= 3 && sectorCounts['rnd'] === 0) {
      const rndPrice = calculateCurrentPrice('rnd', state)
      if (cash >= rndPrice) {
        actions.push({ type: 'buy', sector: 'rnd' })
        cash -= rndPrice
      }
    }

    // 고가 섹터 우선 매입 (비싼 것부터)
    const affordable = getAffordableSectors(state, cash)
      .sort((a, b) => b.price - a.price)

    for (const { sector, price } of affordable) {
      if (cash < price) break
      actions.push({ type: 'buy', sector })
      cash -= price
    }

    // 연구 포인트 활용
    appendUpgradeAction(actions, company)

    if (actions.length === 0) actions.push({ type: 'endTurn' })
    return actions
  },

  chooseEvent(_state: GameState, _company: Company, event: GameEvent): string {
    return chooseHighValueEvent(event)
  },
}

// === 🎯 지배형: 한 섹터 올인, 지배력 최우선 ===

export const dominationStrategy: CompetitorStrategy = {
  decide(state: GameState, company: Company): TurnAction[] {
    const actions: TurnAction[] = []
    let cash = company.cash

    // 타겟 섹터: 가장 많이 보유한 섹터 (없으면 시드 RNG로 선택)
    const sectorCounts = countBySector(company)
    let targetSector: Sector

    if (company.assets.length === 0) {
      const rng = createRng(state.seed + company.id.charCodeAt(company.id.length - 1) * 1000)
      targetSector = rng.pick(ALL_SECTORS)
    } else {
      targetSector = ALL_SECTORS.reduce((best, s) =>
        sectorCounts[s] > sectorCounts[best] ? s : best, ALL_SECTORS[0])
    }

    // 타겟 섹터 구좌 매입 (최대 5회, 매번 가격 재계산)
    for (let bought = 0; bought < 5; bought++) {
      const price = calculateCurrentPrice(targetSector, state)
      if (cash < price) break
      actions.push({ type: 'buy', sector: targetSector })
      cash -= price
    }

    // 연구 포인트 활용 (타겟 섹터 우선)
    if ((company.researchPoints ?? 0) >= 1) {
      const level = company.sectorUpgrades?.[targetSector] ?? 0
      if (level < SECTOR_MAX_UPGRADE_LEVEL && sectorCounts[targetSector] > 0) {
        actions.push({ type: 'sectorUpgrade', sector: targetSector })
      } else {
        appendUpgradeAction(actions, company)
      }
    }

    if (actions.length === 0) actions.push({ type: 'endTurn' })
    return actions
  },

  chooseEvent(_state: GameState, _company: Company, event: GameEvent): string {
    return chooseSafestEvent(event)
  },
}

// === 🎲 기회형: hot 섹터 추격매수, 시세차익 ===

export const opportunistStrategy: CompetitorStrategy = {
  decide(state: GameState, company: Company): TurnAction[] {
    const actions: TurnAction[] = []
    let cash = company.cash

    // cold 섹터 자산 매각 (역순으로 처리해 인덱스 안정성 확보)
    for (let i = company.assets.length - 1; i >= 0; i--) {
      const owned = company.assets[i]
      if (state.sectorStates[owned.assetId].trend === 'cold') {
        actions.push({ type: 'sell', ownedIndex: i })
        cash += Math.floor(owned.currentValue * 0.85) // 대략적 매각 대금 추정
      }
    }

    // hot 섹터 매입 (없으면 neutral)
    const hotSectors = ALL_SECTORS.filter(s => state.sectorStates[s].trend === 'hot')
    const targetSectors = hotSectors.length > 0
      ? hotSectors
      : ALL_SECTORS.filter(s => state.sectorStates[s].trend === 'neutral')

    const affordable = getAffordableSectors(state, cash)
      .filter(s => targetSectors.includes(s.sector))
      .sort((a, b) => b.price - a.price)

    for (const { sector, price } of affordable) {
      if (cash < price) break
      actions.push({ type: 'buy', sector })
      cash -= price
    }

    // 연구 포인트 활용
    appendUpgradeAction(actions, company)

    if (actions.length === 0) actions.push({ type: 'endTurn' })
    return actions
  },

  chooseEvent(_state: GameState, _company: Company, event: GameEvent): string {
    // 섹터를 hot으로 바꾸는 선택지 우선
    for (const choice of event.choices) {
      if (choice.effect.sectorShift?.trend === 'hot') return choice.id
    }
    return chooseHighValueEvent(event)
  },
}

// === 전략 레지스트리 ===

export const STRATEGIES: Record<StrategyId, CompetitorStrategy> = {
  conservative: conservativeStrategy,
  aggressive: aggressiveStrategy,
  domination: dominationStrategy,
  opportunist: opportunistStrategy,
}

/** ID로 전략 조회 (없으면 보수형 폴백) */
export function getStrategyById(id: StrategyId): CompetitorStrategy {
  return STRATEGIES[id] ?? conservativeStrategy
}
