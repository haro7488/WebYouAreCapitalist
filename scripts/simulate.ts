/**
 * 게임 엔진 시뮬레이션 — 밸런스 테스트용
 * 실행: npx tsx scripts/simulate.ts
 */

import { startNewRun } from '../src/game/run'
import { createInitialMeta } from '../src/game/meta'
import { submitAction, submitEventChoice, submitGovernmentChoice, processGovernmentPhase, resolvePhase, advanceTurn } from '../src/game/engine'
import { calculateCompanyNetWorth, calculateCompanyTotalIncome, calculateCompanyNetIncome } from '../src/game/economy'
import { SECTORS, DEFAULT_GAME_CONFIG } from '../src/game/constants'
import type { GameState, SectorProfile } from '../src/game/types'

// === 전략 정의 ===

type Strategy = {
  name: string
  pickSectorProfile: (state: GameState, affordable: SectorProfile[]) => SectorProfile | null
  shouldUpgrade: (state: GameState) => boolean
}

const strategies: Strategy[] = [
  {
    name: 'T1 러시 (싼 거 많이)',
    pickSectorProfile: (_state, affordable) => {
      const t1 = affordable.filter(a => a.tier === 1).sort((a, b) => a.cost - b.cost)
      return t1[0] ?? null
    },
    shouldUpgrade: () => false,
  },
  {
    name: 'T2 집중 (중간 자산)',
    pickSectorProfile: (state, affordable) => {
      const player = state.companies[0]
      const t2 = affordable.filter(a => a.tier === 2).sort((a, b) => a.cost - b.cost)
      const t1 = affordable.filter(a => a.tier === 1).sort((a, b) => a.cost - b.cost)
      // T2 살 수 있으면 T2, 아니면 T1
      if (t2.length > 0 && player.cash >= t2[0].cost) return t2[0]
      return t1[0] ?? null
    },
    shouldUpgrade: (state) => state.companies[0].assets.length >= 3,
  },
  {
    name: '분산 투자 (섹터별 1개씩)',
    pickSectorProfile: (state, affordable) => {
      const player = state.companies[0]
      const ownedSectors = new Set(player.assets.map(a => {
        const asset = SECTORS.find(x => x.id === a.assetId)
        return asset?.sector
      }))
      // 아직 없는 섹터의 자산 우선
      const newSector = affordable.filter(a => !ownedSectors.has(a.sector)).sort((a, b) => a.cost - b.cost)
      if (newSector.length > 0) return newSector[0]
      return affordable.sort((a, b) => a.cost - b.cost)[0] ?? null
    },
    shouldUpgrade: () => false,
  },
  {
    name: 'T3 저축 (모아서 큰 거)',
    pickSectorProfile: (state, affordable) => {
      const player = state.companies[0]
      const t3 = affordable.filter(a => a.tier === 3).sort((a, b) => a.cost - b.cost)
      if (t3.length > 0 && player.cash >= t3[0].cost) return t3[0]
      // T3 못 사면 T1 하나만
      if (player.assets.length === 0) {
        const t1 = affordable.filter(a => a.tier === 1).sort((a, b) => b.baseIncome - a.baseIncome)
        return t1[0] ?? null
      }
      return null // 저축
    },
    shouldUpgrade: () => false,
  },
  {
    name: '업그레이드 집중 (소수 자산 강화)',
    pickSectorProfile: (state, affordable) => {
      const player = state.companies[0]
      if (player.assets.length >= 2) return null // 2개 이후 매입 중단
      const t2 = affordable.filter(a => a.tier === 2).sort((a, b) => b.baseIncome - a.baseIncome)
      const t1 = affordable.filter(a => a.tier === 1).sort((a, b) => b.baseIncome - a.baseIncome)
      return t2[0] ?? t1[0] ?? null
    },
    shouldUpgrade: () => true,
  },
]

// === 시뮬레이션 실행 ===

function simulate(strategy: Strategy): { turnLog: TurnLog[], finalState: GameState } {
  const config = { ...DEFAULT_GAME_CONFIG, baseAP: 3 }
  const meta = createInitialMeta()
  let state = startNewRun(meta, config)
  const turnLog: TurnLog[] = []

  for (let t = 1; t <= config.maxTurns && !state.isGameOver; t++) {
    if (state.phase !== 'planning') {
      // 이전 턴이 제대로 안 끝남 — 강제 복구
      let recovery = 0
      while (state.phase !== 'planning' && !state.isGameOver && recovery++ < 20) {
        if (state.phase === 'government') {
          state = state.governmentEvent?.choices
            ? submitGovernmentChoice(state, state.governmentEvent.choices[0].id)
            : processGovernmentPhase(state)
        } else if (state.phase === 'event') {
          state = state.currentEvent
            ? submitEventChoice(state, state.currentEvent.choices[0].id)
            : resolvePhase(state)
        } else if (state.phase === 'resolution') {
          state = resolvePhase(state)
        } else if (state.phase === 'result') {
          state = advanceTurn(state)
        } else break
      }
      if (state.phase !== 'planning') break
    }
    // === Planning: 액션 수집 후 한번에 ===
    const actions: any[] = []
    let simCash = state.companies[0].cash
    let simAP = state.companies[0].ap
    const ownedIds = new Set(state.companies[0].assets.map(a => a.assetId))

    while (simAP > 0) {
      let acted = false

      // 업그레이드
      if (strategy.shouldUpgrade(state) && state.companies[0].assets.length > 0) {
        const upgradeable = state.companies[0].assets.filter(a => a.upgradeLevel < 3)
        if (upgradeable.length > 0) {
          const target = upgradeable[0]
          const asset = SECTORS.find(a => a.id === target.assetId)
          if (asset) {
            const cost = Math.floor(asset.cost * 0.3 * (target.upgradeLevel + 1))
            if (simCash >= cost) {
              actions.push({ type: 'upgrade', assetIndex: state.companies[0].assets.indexOf(target) })
              simCash -= cost
              simAP--
              acted = true
              continue
            }
          }
        }
      }

      // 매입
      if (!acted) {
        const affordable = SECTORS.filter(a => !ownedIds.has(a.id) && simCash >= a.cost)
        const pick = strategy.pickSectorProfile(state, affordable)
        if (pick) {
          actions.push({ type: 'buy', assetId: pick.id })
          ownedIds.add(pick.id)
          simCash -= pick.cost
          simAP--
          acted = true
        }
      }

      if (!acted) break
    }

    // 액션 실행
    for (const action of actions) {
      if (state.phase !== 'planning') break
      state = submitAction(state, action)
    }

    // endTurn
    if (state.phase === 'planning') {
      state = submitAction(state, { type: 'endTurn' })
    }

    // Phase 순차 진행: planning → government → event → resolution → result
    let safety = 0
    while (state.phase !== 'result' && !state.isGameOver && safety++ < 10) {
      if (state.phase === 'planning') {
        state = submitAction(state, { type: 'endTurn' })
      } else if (state.phase === 'government') {
        if (state.governmentEvent?.choices) {
          state = submitGovernmentChoice(state, state.governmentEvent.choices[0].id)
        } else {
          state = processGovernmentPhase(state)
        }
      } else if (state.phase === 'event') {
        if (state.currentEvent) {
          state = submitEventChoice(state, state.currentEvent.choices[0].id)
        } else {
          state = resolvePhase(state)
        }
      } else if (state.phase === 'resolution') {
        state = resolvePhase(state)
      } else break
    }

    if (state.phase === 'result') {
      const postPlayer = state.companies[0]
      const income = calculateCompanyNetIncome(postPlayer, state)

      turnLog.push({
        turn: t,
        cash: Math.floor(postPlayer.cash),
        netWorth: Math.floor(calculateCompanyNetWorth(postPlayer)),
        assets: postPlayer.assets.length,
        revenue: Math.floor(income.revenue),
        expenses: Math.floor(income.expenses),
        netIncome: Math.floor(income.net),
        expectedIncome: Math.floor(calculateCompanyTotalIncome(postPlayer, state)),
        marketPool: Math.floor(state.marketPool),
      })

      state = advanceTurn(state)
    }
  }

  return { turnLog, finalState: state }
}

interface TurnLog {
  turn: number
  cash: number
  netWorth: number
  assets: number
  revenue: number
  expenses: number
  netIncome: number
  expectedIncome: number
  marketPool: number
}

// === 출력 ===

console.log('='.repeat(80))
console.log('WebYouAreCapitalist 밸런스 시뮬레이션 (AP 3, 30턴)')
console.log('='.repeat(80))

for (const strategy of strategies) {
  console.log(`\n${'─'.repeat(70)}`)
  console.log(`전략: ${strategy.name}`)
  console.log(`${'─'.repeat(70)}`)
  console.log(
    '턴'.padStart(3),
    '현금'.padStart(8),
    '순자산'.padStart(8),
    '자산수'.padStart(4),
    '수익'.padStart(6),
    '지출'.padStart(6),
    '순수익'.padStart(7),
    '시장풀'.padStart(10),
  )

  const { turnLog, finalState } = simulate(strategy)

  for (const log of turnLog) {
    // 5턴 간격 + 첫턴 + 마지막 턴
    if (log.turn === 1 || log.turn % 5 === 0 || log.turn === 30) {
      console.log(
        String(log.turn).padStart(3),
        `$${log.cash}`.padStart(8),
        `$${log.netWorth}`.padStart(8),
        String(log.assets).padStart(4),
        `+$${log.revenue}`.padStart(6),
        `-$${log.expenses}`.padStart(6),
        `${log.netIncome >= 0 ? '+' : ''}$${log.netIncome}`.padStart(7),
        `$${log.marketPool}`.padStart(10),
      )
    }
  }

  const final = finalState.companies[0]
  const finalNW = calculateCompanyNetWorth(final)
  console.log(`\n  최종: 현금 $${Math.floor(final.cash)} | 순자산 $${Math.floor(finalNW)} | 자산 ${final.assets.length}개 | 영향력 ${final.influence}`)

  // AI 경쟁사 결과
  for (let i = 1; i < finalState.companies.length; i++) {
    const ai = finalState.companies[i]
    const aiNW = calculateCompanyNetWorth(ai)
    console.log(`  AI ${ai.name}: 순자산 $${Math.floor(aiNW)} | 자산 ${ai.assets.length}개`)
  }
}
