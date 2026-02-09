import type { GameState, EventEffect, Sector, DominanceInfo, OwnedAsset } from './types'
import {
  ASSETS,
  BASE_EXPENSES,
  SECTOR_TREND_MULTIPLIER,
  DOMINANCE_THRESHOLDS,
  ASSET_UPGRADE_INCOME_MULTIPLIER,
  SCORE_NETWORTH_WEIGHT,
  SCORE_INFLUENCE_WEIGHT,
  SCORE_TURN_BONUS,
  SCORE_DOMINANCE_BONUS,
  INFLUENCE_TIERS,
} from './constants'

/** 자산 정보를 ID로 조회 */
function findAsset(assetId: string) {
  return ASSETS.find((a) => a.id === assetId)
}

/** 섹터별 보유 자산 수 계산 → 지배력 판정 */
export function calculateDominance(ownedAssets: OwnedAsset[]): Record<Sector, DominanceInfo> {
  const counts: Record<Sector, number> = {
    food: 0, tech: 0, realEstate: 0, retail: 0, finance: 0,
  }

  for (const owned of ownedAssets) {
    const asset = findAsset(owned.assetId)
    if (!asset) continue
    counts[asset.sector]++
  }

  const result = {} as Record<Sector, DominanceInfo>
  for (const sector of Object.keys(counts) as Sector[]) {
    const count = counts[sector]
    if (count >= DOMINANCE_THRESHOLDS.dominant.count) {
      result[sector] = { level: 'dominant', count, incomeBonus: DOMINANCE_THRESHOLDS.dominant.incomeBonus }
    } else if (count >= DOMINANCE_THRESHOLDS.competitor.count) {
      result[sector] = { level: 'competitor', count, incomeBonus: DOMINANCE_THRESHOLDS.competitor.incomeBonus }
    } else {
      result[sector] = { level: 'entrant', count, incomeBonus: DOMINANCE_THRESHOLDS.entrant.incomeBonus }
    }
  }

  return result
}

/** 개별 자산의 턴 소득 계산 (시장/섹터트렌드/업그레이드/지배력 반영) */
export function calculateAssetIncome(
  owned: OwnedAsset,
  state: GameState,
  dominance: Record<Sector, DominanceInfo>,
): number {
  const asset = findAsset(owned.assetId)
  if (!asset) return 0

  const marketMult = asset.marketMultiplier[state.market.condition]
  const sectorTrend = state.sectorStates[asset.sector].trend
  const trendMult = SECTOR_TREND_MULTIPLIER[sectorTrend]
  const upgradeMult = Math.pow(ASSET_UPGRADE_INCOME_MULTIPLIER, owned.upgradeLevel)
  const dominanceMult = dominance[asset.sector].incomeBonus

  return asset.baseIncome * marketMult * trendMult * upgradeMult * dominanceMult
}

/** 모든 보유 자산의 턴당 소득 합산 */
export function calculateTotalAssetIncome(state: GameState): number {
  const dominance = calculateDominance(state.ownedAssets)
  let total = 0
  for (const owned of state.ownedAssets) {
    total += calculateAssetIncome(owned, state, dominance)
  }
  return total
}

/** 보유 자산의 현재 가치 갱신 (appreciation 적용) */
export function calculateAssetValue(owned: OwnedAsset, state: GameState): number {
  const asset = findAsset(owned.assetId)
  if (!asset) return owned.currentValue

  const sectorTrend = state.sectorStates[asset.sector].trend
  // hot: +2%/턴 추가, cold: -1%/턴 감소
  const trendAppreciation = sectorTrend === 'hot' ? 0.02 : sectorTrend === 'cold' ? -0.01 : 0
  const totalAppreciation = asset.appreciation + trendAppreciation

  return owned.currentValue * (1 + totalAppreciation)
}

/** 순자산 계산 (현금 + 모든 보유 자산 현재 가치) */
export function calculateNetWorth(state: GameState): number {
  const assetValue = state.ownedAssets.reduce((sum, owned) => sum + owned.currentValue, 0)
  return state.money + assetValue
}

/** 활성 효과들을 합산 */
function mergeEffects(effects: EventEffect[]): EventEffect {
  const merged: EventEffect = {
    money: 0,
    revenueMultiplier: 1,
    expenseMultiplier: 1,
    influence: 0,
  }
  for (const effect of effects) {
    merged.money! += effect.money ?? 0
    merged.revenueMultiplier! *= effect.revenueMultiplier ?? 1
    merged.expenseMultiplier! *= effect.expenseMultiplier ?? 1
    merged.influence! += effect.influence ?? 0
  }
  return merged
}

/** 턴 수익 계산 (기본 수익 없음 — 자산 소득이 유일한 수입원) */
export function calculateNetIncome(state: GameState): { revenue: number; expenses: number; net: number } {
  const effects = mergeEffects(state.activeEffects)
  const dominance = calculateDominance(state.ownedAssets)

  // 자산 소득 합산
  let totalAssetIncome = 0
  for (const owned of state.ownedAssets) {
    totalAssetIncome += calculateAssetIncome(owned, state, dominance)
  }

  const revenue = Math.floor(totalAssetIncome * effects.revenueMultiplier!)
  const expenses = Math.floor(BASE_EXPENSES * effects.expenseMultiplier!)
  const directMoney = effects.money ?? 0

  return {
    revenue,
    expenses,
    net: revenue - expenses + directMoney,
  }
}

/** 최종 점수 계산 (순자산 + 영향력 + 턴 + 지배 섹터) */
export function calculateScore(state: GameState): number {
  const netWorth = calculateNetWorth(state)
  const dominance = calculateDominance(state.ownedAssets)
  const dominatedCount = (Object.values(dominance) as DominanceInfo[])
    .filter((d) => d.level === 'dominant').length

  const netWorthScore = Math.max(0, netWorth) * SCORE_NETWORTH_WEIGHT
  const influenceScore = state.influence * SCORE_INFLUENCE_WEIGHT
  const turnBonus = state.turn * SCORE_TURN_BONUS
  const dominanceBonus = dominatedCount * SCORE_DOMINANCE_BONUS

  return Math.floor(netWorthScore + influenceScore + turnBonus + dominanceBonus)
}

/** 현재 영향력에 해당하는 영향력 티어 반환 */
export function getInfluenceTier(influence: number) {
  let tier = INFLUENCE_TIERS[0]
  for (const t of INFLUENCE_TIERS) {
    if (influence >= t.minInfluence) tier = t
  }
  return tier
}
