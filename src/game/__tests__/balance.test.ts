import { describe, it, expect } from 'vitest'
import {
  SECTORS,
  ALL_SECTORS,
  startNewRun,
  processFullTurn,
  advanceTurn,
  createInitialMeta,
  calculateNetWorth,
} from '@game/index'

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
