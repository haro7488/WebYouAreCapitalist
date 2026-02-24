import type { EventConditions, GameState, Company } from '../types'
import { ASSETS } from '../schema/assets.schema'

/**
 * 선언형 조건 객체를 평가하여 이벤트 발생 가능 여부를 판정한다.
 * 모든 조건은 AND로 결합 — 하나라도 실패하면 false.
 */
export function checkEventConditions(
  conditions: EventConditions | undefined,
  state: GameState,
  company: Company,
): boolean {
  if (!conditions) return true

  // 턴
  if (conditions.minTurn !== undefined && state.turn < conditions.minTurn) return false
  if (conditions.maxTurn !== undefined && state.turn > conditions.maxTurn) return false

  // 시장 상태
  if (conditions.marketIs !== undefined && state.market.condition !== conditions.marketIs) return false
  if (conditions.marketNot !== undefined && state.market.condition === conditions.marketNot) return false

  // 영향력
  if (conditions.minInfluence !== undefined && company.influence < conditions.minInfluence) return false
  if (conditions.maxInfluence !== undefined && company.influence > conditions.maxInfluence) return false

  // 자산 수
  if (conditions.minAssets !== undefined && company.assets.length < conditions.minAssets) return false

  // 순자산
  if (conditions.minNetWorth !== undefined && company.netWorth < conditions.minNetWorth) return false

  // 현금
  if (conditions.minCash !== undefined && company.cash < conditions.minCash) return false
  if (conditions.maxCash !== undefined && company.cash > conditions.maxCash) return false

  // 특성
  if (conditions.hasTrait !== undefined && !company.traits.includes(conditions.hasTrait)) return false
  if (conditions.notTrait !== undefined && company.traits.includes(conditions.notTrait)) return false

  // 섹터 지배
  if (conditions.dominatesSector !== undefined && !company.dominatedSectors.includes(conditions.dominatesSector))
    return false
  if (conditions.dominatesCount !== undefined && company.dominatedSectors.length < conditions.dominatesCount)
    return false
  if (conditions.hasDominance && company.dominatedSectors.length === 0) return false

  // 순위 (rank / minRank — 값이 클수록 하위 순위)
  const rankThreshold = conditions.rank ?? conditions.minRank
  if (rankThreshold !== undefined) {
    const sorted = [...state.companies].sort((a, b) => b.netWorth - a.netWorth)
    const currentRank = sorted.findIndex((co) => co.id === company.id) + 1
    if (currentRank < rankThreshold) return false
  }

  // 특정 섹터 자산 보유
  const sectorCheck = conditions.hasSector ?? conditions.hasSectorAsset
  if (sectorCheck !== undefined) {
    const sectorAssetIds = new Set(
      ASSETS.filter((a) => a.sector === sectorCheck).map((a) => a.id),
    )
    const owns = company.assets.some((oa) => sectorAssetIds.has(oa.assetId))
    if (!owns) return false
  }

  // 섹터 트렌드 제외
  if (conditions.sectorTrendNot) {
    const { sector, trend } = conditions.sectorTrendNot
    if (state.sectorStates[sector].trend === trend) return false
  }

  // 인플레이션
  if (conditions.minInflation !== undefined && state.inflation < conditions.minInflation) return false

  return true
}
