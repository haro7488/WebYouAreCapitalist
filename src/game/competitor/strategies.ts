import type { CompetitorStrategy } from './types'
import type { GameState, Company, TurnAction, Sector, GameEvent } from '../types'
import { ASSETS } from '../constants'
import { calculateDominance } from '../economy'
import { createRng } from '../utils'

// === 공용 헬퍼 ===

const ALL_SECTORS: Sector[] = ['food', 'tech', 'realEstate', 'logistics', 'energy', 'finance', 'information']

/** 기업이 구매 가능한 자산 필터 (보유 중 제외) */
function getAffordableAssets(company: Company, cash: number, maxTier?: number) {
  const owned = new Set(company.assets.map(a => a.assetId))
  return ASSETS.filter(a =>
    a.cost <= cash &&
    (!maxTier || a.tier <= maxTier) &&
    !owned.has(a.id),
  )
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

/** 기업이 보유한 섹터별 자산 수 맵 */
function getOwnedSectors(company: Company): Set<Sector> {
  const sectors = new Set<Sector>()
  for (const owned of company.assets) {
    const asset = ASSETS.find(a => a.id === owned.assetId)
    if (asset) sectors.add(asset.sector)
  }
  return sectors
}

// === 🏦 보수형: Tier 1~2 분산, 불황 시 현금 비축 ===

export const conservativeStrategy: CompetitorStrategy = {
  decide(state: GameState, company: Company): TurnAction[] {
    const actions: TurnAction[] = []
    let cash = company.cash

    // 불황 시 현금 비축
    if (state.market.condition === 'recession') {
      return [{ type: 'endTurn' }]
    }

    // Tier 1~2 분산 매입 (미보유 섹터 우선, 가격 오름차순)
    const ownedSectors = getOwnedSectors(company)
    const affordable = getAffordableAssets(company, cash, 2)
      .sort((a, b) => {
        const aNew = ownedSectors.has(a.sector) ? 0 : 1
        const bNew = ownedSectors.has(b.sector) ? 0 : 1
        if (aNew !== bNew) return bNew - aNew
        return a.cost - b.cost
      })

    for (const asset of affordable) {
      if (cash < asset.cost) break
      actions.push({ type: 'buy', assetId: asset.id })
      cash -= asset.cost
    }

    if (actions.length === 0) actions.push({ type: 'endTurn' })
    return actions
  },

  chooseEvent(_state: GameState, _company: Company, event: GameEvent): string {
    return chooseSafestEvent(event)
  },
}

// === 🚀 공격형: Tier 2~3 집중, 호황 시 공격적 매입 ===

export const aggressiveStrategy: CompetitorStrategy = {
  decide(state: GameState, company: Company): TurnAction[] {
    const actions: TurnAction[] = []
    let cash = company.cash

    // Tier 2~3 집중 (호황 시 Tier 2+, 평시 Tier 1+)
    const minTier = state.market.condition === 'boom' ? 2 : 1
    const affordable = getAffordableAssets(company, cash)
      .filter(a => a.tier >= minTier)
      .sort((a, b) => b.cost - a.cost) // 비싼 것부터

    for (const asset of affordable) {
      if (cash < asset.cost) break
      actions.push({ type: 'buy', assetId: asset.id })
      cash -= asset.cost
    }

    // 매입 못하면 기존 자산 업그레이드
    if (actions.length === 0 && company.assets.length > 0) {
      const upgradeIdx = company.assets.reduce((best, a, i) =>
        a.currentValue > (company.assets[best]?.currentValue ?? 0) ? i : best, 0)
      if (company.assets[upgradeIdx].upgradeLevel < 3) {
        const asset = ASSETS.find(a => a.id === company.assets[upgradeIdx].assetId)
        const cost = asset ? Math.floor(asset.cost * 0.3 * (company.assets[upgradeIdx].upgradeLevel + 1)) : Infinity
        if (cash >= cost) {
          actions.push({ type: 'upgrade', ownedIndex: upgradeIdx })
        }
      }
    }

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

    // 타겟 섹터: 가장 많은 자산을 보유한 섹터 (없으면 시드 RNG로 선택)
    const dominance = calculateDominance(company.assets)
    let targetSector = ALL_SECTORS.reduce((best, s) =>
      dominance[s].count > dominance[best].count ? s : best, ALL_SECTORS[0])

    if (company.assets.length === 0) {
      // 보유 자산 없으면 시드 기반으로 선택
      const rng = createRng(state.seed + company.id.charCodeAt(company.id.length - 1) * 1000)
      targetSector = rng.pick(ALL_SECTORS)
    }

    // 타겟 섹터만 매입 (비싼 것부터)
    const affordable = ASSETS
      .filter(a => a.sector === targetSector && a.cost <= cash && !company.assets.some(o => o.assetId === a.id))
      .sort((a, b) => b.cost - a.cost)

    for (const asset of affordable) {
      if (cash < asset.cost) break
      actions.push({ type: 'buy', assetId: asset.id })
      cash -= asset.cost
    }

    // 타겟 섹터 기존 자산 업그레이드
    for (let i = 0; i < company.assets.length; i++) {
      const owned = company.assets[i]
      const asset = ASSETS.find(a => a.id === owned.assetId)
      if (asset?.sector === targetSector && owned.upgradeLevel < 3) {
        const upgradeCost = Math.floor(asset.cost * 0.3 * (owned.upgradeLevel + 1))
        if (cash >= upgradeCost) {
          actions.push({ type: 'upgrade', ownedIndex: i })
          cash -= upgradeCost
        }
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
      const asset = ASSETS.find(a => a.id === owned.assetId)
      if (asset && state.sectorStates[asset.sector].trend === 'cold') {
        actions.push({ type: 'sell', ownedIndex: i })
        cash += Math.floor(owned.currentValue * 0.85) // 대략적 매각 대금 추정
      }
    }

    // hot 섹터 매입 (없으면 neutral)
    const hotSectors = ALL_SECTORS.filter(s => state.sectorStates[s].trend === 'hot')
    const targetSectors = hotSectors.length > 0
      ? hotSectors
      : ALL_SECTORS.filter(s => state.sectorStates[s].trend === 'neutral')

    const affordable = ASSETS
      .filter(a => targetSectors.includes(a.sector) && a.cost <= cash && !company.assets.some(o => o.assetId === a.id))
      .sort((a, b) => b.cost - a.cost)

    for (const asset of affordable) {
      if (cash < asset.cost) break
      actions.push({ type: 'buy', assetId: asset.id })
      cash -= asset.cost
    }

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

export const STRATEGIES: Record<string, CompetitorStrategy> = {
  conservative: conservativeStrategy,
  aggressive: aggressiveStrategy,
  domination: dominationStrategy,
  opportunist: opportunistStrategy,
}

/** ID로 전략 조회 (없으면 보수형 폴백) */
export function getStrategyById(id: string): CompetitorStrategy {
  return STRATEGIES[id] ?? conservativeStrategy
}
