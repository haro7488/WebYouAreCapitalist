import type { GameState, Company, Sector, ResearchResult, StrategyId } from '../types'
import { INFORMATION_SECTOR } from '../types'
import { ALL_SECTORS, ALL_MARKET_CONDITIONS } from '../constants'
import { createRng } from '../utils'
import {
  getPlayerCompany,
  getInfluenceTier,
  calculateSectorShares,
} from '../economy'
import { getCompanyTraitEffects } from '../logic/traitEngine'
import { GOVERNMENT_EVENTS } from '../schema/governmentEvents.schema'
import { checkEventConditions } from '../logic/eventConditions'
import { withPlayer } from './helpers'

/** 시장 조사 */
export function applyResearch(
  state: GameState,
  target: 'market' | 'sector' | 'event' | 'competitor' | 'strategy' | 'share' | 'government',
  sector?: Sector,
  targetCompanyId?: string,
): GameState {
  const player = getPlayerCompany(state)

  // 정보 섹터 구좌 수 = 조사 가능 횟수
  const infoAssets = player.assets.filter((a) => a.assetId === INFORMATION_SECTOR)
  const maxResearches = infoAssets.length

  // 정보 구좌가 없으면 조사 불가
  if (maxResearches === 0) return state

  // 이번 턴에 이미 사용한 조사 횟수 체크
  const researchesUsed = player.actionsThisTurn.filter((a) => a.type === 'research').length

  // 영향력 티어 freeResearch: 무료 조사 +1회
  const tier = getInfluenceTier(player.influence)
  const effectiveMax = tier.freeResearch ? maxResearches + 1 : maxResearches

  // 조사 횟수 초과 시 불가
  if (researchesUsed >= effectiveMax) return state

  const rng = createRng(state.rngState)

  // 특성 효과 (paranoid: investigateAccuracyPenalty)
  const traitEffects = getCompanyTraitEffects(player)
  const accuracyPenalty = traitEffects.investigateAccuracyPenalty

  let result: ResearchResult

  // accuracyPenalty가 있으면 정확도 왜곡 확률 적용
  const isAccurate = rng.random() > accuracyPenalty

  switch (target) {
    case 'market':
      result = {
        type: 'market',
        turnsToChange: state.market.turnsRemaining,
        likelyNext: isAccurate
          ? rng.pick(ALL_MARKET_CONDITIONS)
          : rng.pick(ALL_MARKET_CONDITIONS),
      }
      break
    case 'sector': {
      const targetSector = sector ?? rng.pick(ALL_SECTORS)
      const sectorState = state.sectorStates[targetSector]
      const actualTrend = sectorState.turnsRemaining <= 2
        ? rng.pick(['hot', 'neutral', 'cold'] as const)
        : sectorState.trend
      result = {
        type: 'sector',
        sector: targetSector,
        nextTrend: isAccurate
          ? actualTrend
          : rng.pick(['hot', 'neutral', 'cold'] as const),
      }
      break
    }
    case 'event': {
      const accurateHints = [
        '경제 관련 이벤트가 예상됩니다',
        '섹터 변동 이벤트가 올 수 있습니다',
        '개인적인 사건이 발생할 수 있습니다',
        '특별한 기회가 올 수 있습니다',
      ]
      const vagueHints = [
        '무언가 일어날 것 같습니다',
        '확실하지 않습니다',
        '정보가 불확실합니다',
      ]
      result = {
        type: 'event',
        hint: isAccurate ? rng.pick(accurateHints) : rng.pick(vagueHints),
      }
      break
    }
    case 'competitor': {
      const aiCompanies = state.companies.filter((_, i) => i > 0)
      const targetCompany = targetCompanyId
        ? state.companies.find((c) => c.id === targetCompanyId)
        : rng.pick(aiCompanies)
      if (!targetCompany) return state

      const visibleAssets = isAccurate
        ? [...targetCompany.assets]
        : targetCompany.assets.slice(0, Math.ceil(targetCompany.assets.length / 2))

      result = {
        type: 'competitor',
        companyId: targetCompany.id,
        companyName: targetCompany.name,
        assets: visibleAssets,
      }
      break
    }
    case 'strategy': {
      const aiCompanies2 = state.companies.filter((_, i) => i > 0)
      const targetCompany2 = targetCompanyId
        ? state.companies.find((c) => c.id === targetCompanyId)
        : rng.pick(aiCompanies2)
      if (!targetCompany2) return state
      const strategyId = state.aiStrategies[targetCompany2.id] ?? 'conservative' as StrategyId
      const allStrategies: StrategyId[] = ['conservative', 'aggressive', 'domination', 'opportunist']
      result = {
        type: 'strategy',
        companyId: targetCompany2.id,
        companyName: targetCompany2.name,
        strategyId: isAccurate ? strategyId : rng.pick(allStrategies),
      }
      break
    }
    case 'share': {
      const targetSector = sector ?? rng.pick(ALL_SECTORS)
      const actualShares = calculateSectorShares(state.companies, targetSector)

      const shares = isAccurate
        ? actualShares
        : actualShares.map((s) => ({
            ...s,
            share: Math.max(0, Math.min(1, s.share + (rng.random() - 0.5) * accuracyPenalty)),
          }))

      result = {
        type: 'share',
        sector: targetSector,
        shares,
      }
      break
    }
    case 'government': {
      const govEligible = GOVERNMENT_EVENTS.filter((e) =>
        !e.conditions || checkEventConditions(e.conditions, state, player),
      )

      let totalInflationDelta = 0
      for (const e of govEligible) {
        if (e.effect?.inflationDelta) {
          totalInflationDelta += e.effect.inflationDelta
        }
        if (e.choices) {
          for (const c of e.choices) {
            if (c.effect.inflationDelta) {
              totalInflationDelta += c.effect.inflationDelta * 0.5
            }
          }
        }
      }

      let inflationTrend: 'rising' | 'stable' | 'falling'
      if (totalInflationDelta > 0.005) {
        inflationTrend = 'rising'
      } else if (totalInflationDelta < -0.005) {
        inflationTrend = 'falling'
      } else {
        inflationTrend = 'stable'
      }

      let likelyPolicy: { title: string; description: string } | null = null
      if (govEligible.length > 0) {
        const topEvent = govEligible.reduce((best, e) => {
          const bestDelta = Math.abs(best.effect?.inflationDelta ?? 0)
          const eDelta = Math.abs(e.effect?.inflationDelta ?? 0)
          return eDelta > bestDelta ? e : best
        }, govEligible[0])
        likelyPolicy = { title: topEvent.title, description: topEvent.description }
      }

      const affectedSectorsSet = new Set<Sector>()
      for (const e of govEligible) {
        if (e.effect?.sectorShift) {
          affectedSectorsSet.add(e.effect.sectorShift.sector)
        }
        if (e.choices) {
          for (const c of e.choices) {
            if (c.effect.sectorShift) {
              affectedSectorsSet.add(c.effect.sectorShift.sector)
            }
          }
        }
      }
      const affectedSectors = Array.from(affectedSectorsSet)

      result = {
        type: 'government',
        currentInflation: state.inflation,
        inflationTrend,
        likelyPolicy,
        affectedSectors,
      }
      break
    }
  }

  const updatedPlayer: Company = {
    ...player,
    researchResult: result!,
    researchHistory: [...player.researchHistory, { turn: state.turn, result: result! }],
    actionsThisTurn: [...player.actionsThisTurn, { type: 'research', target, sector }],
  }

  return {
    ...withPlayer(state, updatedPlayer),
    rngState: rng.getState(),
  }
}
