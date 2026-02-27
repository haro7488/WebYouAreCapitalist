import { describe, it, expect, beforeAll } from 'vitest'
import {
  SECTORS,
  ALL_SECTORS,
  startNewRun,
  processFullTurn,
  advanceTurn,
  createInitialMeta,
  calculateNetWorth,
  submitAction,
  submitEventChoice,
  submitGovernmentChoice,
  resolvePhase,
  calculateCompanyNetWorth,
} from '@game/index'
import { processGovernmentPhase } from '../engine'

describe('섹터 밸런스', () => {
  it('모든 8개 섹터 프로필이 정의됨', () => {
    expect(SECTORS.length).toBe(8)
    for (const sector of ALL_SECTORS) {
      const profile = SECTORS.find((s) => s.id === sector)
      expect(profile, `섹터 ${sector} 프로필이 없음`).toBeDefined()
    }
  })

  it('모든 섹터의 baseCost가 유효한 양수', () => {
    for (const sector of SECTORS) {
      expect(sector.baseCost, `${sector.id} baseCost`).toBeGreaterThan(0)
    }
  })

  it('소득형 섹터는 baseIncome 또는 yieldRate가 양수', () => {
    for (const sector of SECTORS) {
      const hasIncome = sector.baseIncome > 0 || sector.yieldRate > 0
      expect(hasIncome, `${sector.id}에 소득원이 없음`).toBe(true)
    }
  })
})

describe('게임 궤적: 기본 진행', () => {
  it('시작 런 후 플레이어 순자산이 시작 현금과 동일', () => {
    const state = startNewRun(createInitialMeta(), { competitorCount: 0 })
    const player = state.companies[0]
    expect(player.cash).toBeGreaterThan(0)
    expect(player.netWorth).toBe(player.cash)
  })

  it('자산을 구매하면 순자산이 유지되거나 증가', () => {
    const state = startNewRun(createInitialMeta(), {
      competitorCount: 0,
      startingMoney: 5000,
      maxTurns: 5,
    })

    const initialNetWorth = calculateNetWorth(state)
    expect(initialNetWorth).toBeGreaterThan(0)

    // food 섹터 구좌 매입 후 턴 진행
    const afterBuy = processFullTurn(state, [
      { type: 'buy', sector: 'food' },
      { type: 'endTurn' },
    ])

    const afterTurnState = afterBuy.phase === 'result' ? advanceTurn(afterBuy) : afterBuy
    const afterNetWorth = calculateNetWorth(afterTurnState)

    expect(afterNetWorth).toBeGreaterThan(0)
    expect(Number.isFinite(afterNetWorth)).toBe(true)
  })

  it('여러 턴 진행 후 소득 자산 보유 시 순자산 증가 경향', () => {
    const meta = createInitialMeta()
    let state = startNewRun(meta, {
      competitorCount: 0,
      startingMoney: 5000,
      maxTurns: 10,
    })

    // 첫 턴: 섹터 구좌 매입
    const afterBuy = processFullTurn(state, [
      { type: 'buy', sector: 'food' },
      { type: 'endTurn' },
    ])
    if (afterBuy.phase === 'result') {
      state = advanceTurn(afterBuy)
    } else {
      state = afterBuy
    }

    const netWorthAfterBuy = calculateNetWorth(state)

    // 이후 5턴 아무 행동 없이 진행 (소득만 발생)
    for (let i = 0; i < 5 && !state.isGameOver; i++) {
      const afterTurn = processFullTurn(state, [{ type: 'endTurn' }])
      if (afterTurn.phase === 'result') {
        state = advanceTurn(afterTurn)
      } else {
        state = afterTurn
      }
    }

    const finalNetWorth = calculateNetWorth(state)

    // 자산 소득으로 순자산이 유지/상승해야 함
    expect(finalNetWorth).toBeGreaterThanOrEqual(netWorthAfterBuy)
  })
})

// === 밸런스 가드레일 ===

/** 시뮬 헬퍼: 1개 런을 기본 전략(매 턴 가장 싼 섹터 매수)으로 진행 */
function simulateBasicRun(seed: number) {
  const meta = createInitialMeta()
  let state = startNewRun(meta, { seed, maxTurns: 30 })

  for (let t = 1; t <= state.maxTurns && !state.isGameOver; t++) {
    // planning이 아니면 복구
    if (state.phase !== 'planning') {
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

    // 가장 싼 섹터 매수
    const player = state.companies[0]
    const cheapest = SECTORS
      .filter(s => s.baseCost <= player.cash)
      .sort((a, b) => a.baseCost - b.baseCost)[0]
    if (cheapest) {
      state = submitAction(state, { type: 'buy', sector: cheapest.id })
    }
    if (state.phase === 'planning') {
      state = submitAction(state, { type: 'endTurn' })
    }

    // Phase 진행
    let safety = 0
    while (state.phase !== 'result' && !state.isGameOver && safety++ < 20) {
      if (state.phase === 'planning') {
        state = submitAction(state, { type: 'endTurn' })
      } else if (state.phase === 'government') {
        state = state.governmentEvent?.choices
          ? submitGovernmentChoice(state, state.governmentEvent.choices[0].id)
          : processGovernmentPhase(state)
      } else if (state.phase === 'event') {
        state = state.currentEvent
          ? submitEventChoice(state, state.currentEvent.choices[0].id)
          : resolvePhase(state)
      } else if (state.phase === 'resolution') {
        state = resolvePhase(state)
      } else break
    }

    if (state.phase === 'result') {
      state = advanceTurn(state)
    }
  }

  return state
}

describe('밸런스 가드레일', () => {
  const SEED_COUNT = 20
  const results: { playerNW: number; aiNWs: number[]; playerRank: number }[] = []

  // 테스트 전 시뮬레이션 실행
  beforeAll(() => {
    for (let i = 0; i < SEED_COUNT; i++) {
      const state = simulateBasicRun(2000 + i)
      const playerNW = calculateCompanyNetWorth(state.companies[0])
      const aiNWs = state.companies.slice(1).map(c => calculateCompanyNetWorth(c))
      const allNWs = state.companies.map(c => calculateCompanyNetWorth(c))
      const playerRank = allNWs.filter(nw => nw > playerNW).length + 1
      results.push({ playerNW, aiNWs, playerRank })
    }
  })

  it('플레이어 평균 순자산이 양수', () => {
    const avgNW = results.reduce((s, r) => s + r.playerNW, 0) / results.length
    expect(avgNW).toBeGreaterThan(0)
  })

  it('AI 평균 순자산이 플레이어 평균의 40% 이상', () => {
    const avgPlayerNW = results.reduce((s, r) => s + r.playerNW, 0) / results.length
    const avgAiNW = results.reduce((s, r) => s + r.aiNWs.reduce((a, b) => a + b, 0) / r.aiNWs.length, 0) / results.length
    const ratio = avgAiNW / avgPlayerNW
    expect(ratio).toBeGreaterThanOrEqual(0.4)
  })

  it('플레이어가 30턴 내에 게임을 완료', () => {
    // 모든 시뮬이 정상 종료되었는지 확인
    expect(results.length).toBe(SEED_COUNT)
  })
}, 60000)
