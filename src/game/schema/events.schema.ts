import type { GameEvent, GameState, MarketCondition, Sector, SectorTrend } from '../types'
import rawEvents from '../data/events.json'

/** 선언형 조건 (JSON용) */
interface EventConditions {
  minInfluence?: number
  minCash?: number
  minAssets?: number
  marketIs?: MarketCondition
  marketNot?: MarketCondition
  sectorTrendNot?: { sector: Sector; trend: SectorTrend }
  hasDominance?: boolean
  hasTrait?: string
  minRank?: number
}

interface RawGameEvent extends Omit<GameEvent, 'condition'> {
  conditions?: EventConditions
}

/** 선언형 조건 → 함수 변환 */
function buildCondition(c: EventConditions): (state: GameState) => boolean {
  return (state) => {
    const player = state.companies[0]
    if (c.minInfluence !== undefined && player.influence < c.minInfluence) return false
    if (c.minCash !== undefined && player.cash < c.minCash) return false
    if (c.minAssets !== undefined && player.assets.length < c.minAssets) return false
    if (c.marketIs !== undefined && state.market.condition !== c.marketIs) return false
    if (c.marketNot !== undefined && state.market.condition === c.marketNot) return false
    if (c.sectorTrendNot) {
      const { sector, trend } = c.sectorTrendNot
      if (state.sectorStates[sector].trend === trend) return false
    }
    if (c.hasDominance && player.dominatedSectors.length === 0) return false
    if (c.hasTrait !== undefined && !player.traits.includes(c.hasTrait)) return false
    if (c.minRank !== undefined) {
      const sorted = [...state.companies].sort((a, b) => b.netWorth - a.netWorth)
      const rank = sorted.findIndex((co) => co.id === player.id) + 1
      if (rank < c.minRank) return false
    }
    return true
  }
}

export const EVENT_REGISTRY: GameEvent[] = (rawEvents as unknown as RawGameEvent[]).map(
  ({ conditions, ...rest }) => ({
    ...rest,
    ...(conditions ? { condition: buildCondition(conditions) } : {}),
  }),
)
