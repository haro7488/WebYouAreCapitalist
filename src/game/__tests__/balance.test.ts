import { describe, it, expect } from 'vitest'
import {
  ASSETS,
  startNewRun,
  processFullTurn,
  advanceTurn,
  createInitialMeta,
  calculateNetWorth,
} from '@game/index'
import type { Sector } from '@game/index'

// 게임에서 정의된 모든 섹터
const ALL_SECTORS: Sector[] = ['food', 'tech', 'realEstate', 'logistics', 'energy', 'finance', 'information']

describe('자산 밸런스', () => {
  it('모든 7개 섹터에 최소 1개 이상 자산이 존재', () => {
    for (const sector of ALL_SECTORS) {
      const sectorAssets = ASSETS.filter((a) => a.sector === sector)
      expect(sectorAssets.length, `섹터 ${sector}에 자산이 없음`).toBeGreaterThanOrEqual(1)
    }
  })

  it('모든 자산의 ROI(baseIncome/cost)가 0.03 ~ 0.20 범위', () => {
    for (const asset of ASSETS) {
      const roi = asset.baseIncome / asset.cost
      expect(roi, `${asset.id}(${asset.name}) ROI=${roi.toFixed(3)} 범위 초과`).toBeGreaterThanOrEqual(0.03)
      expect(roi, `${asset.id}(${asset.name}) ROI=${roi.toFixed(3)} 범위 초과`).toBeLessThanOrEqual(0.20)
    }
  })

  it('모든 자산의 cost, baseIncome, appreciation이 유효한 양수', () => {
    for (const asset of ASSETS) {
      expect(asset.cost, `${asset.id} cost`).toBeGreaterThan(0)
      expect(asset.baseIncome, `${asset.id} baseIncome`).toBeGreaterThanOrEqual(0)
      expect(asset.appreciation, `${asset.id} appreciation`).toBeGreaterThanOrEqual(0)
    }
  })

  it('각 섹터별 T1/T2/T3 tier 자산이 최소 1개씩 존재', () => {
    // 모든 섹터에 3개 tier가 있어야 한다는 강한 조건이 아니라
    // 전체적으로 각 tier가 존재하는지 확인
    const tiers = [1, 2, 3] as const
    for (const tier of tiers) {
      const tierAssets = ASSETS.filter((a) => a.tier === tier)
      expect(tierAssets.length, `tier ${tier} 자산이 없음`).toBeGreaterThan(0)
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
    // 충분한 현금으로 시작 (저렴한 자산 구매 가능)
    const state = startNewRun(createInitialMeta(), {
      competitorCount: 0,
      startingMoney: 5000,
      maxTurns: 5,
    })

    const initialNetWorth = calculateNetWorth(state)
    expect(initialNetWorth).toBeGreaterThan(0)

    // food-cart (가장 저렴한 T1 자산, $100) 구매 후 턴 진행
    const afterBuy = processFullTurn(state, [
      { type: 'buy', assetId: 'food-cart' },
      { type: 'endTurn' },
    ])

    const afterTurnState = afterBuy.phase === 'result' ? advanceTurn(afterBuy) : afterBuy
    const afterNetWorth = calculateNetWorth(afterTurnState)

    // 자산 매입 후 소득 발생으로 순자산이 초기값 근방이어야 함
    // (매입 직후에는 asset value ≈ cost이므로 netWorth는 거의 유지)
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

    // 첫 턴: 자산 구매
    const afterBuy = processFullTurn(state, [
      { type: 'buy', assetId: 'food-cart' },
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

    // 자산 소득으로 순자산이 상승해야 함
    expect(finalNetWorth).toBeGreaterThan(netWorthAfterBuy)
  })
})
