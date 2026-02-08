import type { GameState, EventEffect } from './types'
import { INVESTMENTS, BASE_REVENUE, BASE_EXPENSES, SCORE_MONEY_WEIGHT, SCORE_REPUTATION_WEIGHT, SCORE_TURN_BONUS } from './constants'

/** 투자 수익 계산 */
export function calculateInvestmentIncome(state: GameState): number {
  let income = 0
  for (const owned of state.investments) {
    const investment = INVESTMENTS.find((i) => i.id === owned.investmentId)
    if (!investment) continue
    const marketMult = investment.marketMultiplier[state.market.condition]
    income += owned.amount * investment.baseReturn * marketMult
  }
  return income
}

/** 활성 효과들을 합산 */
function mergeEffects(effects: EventEffect[]): EventEffect {
  const merged: EventEffect = {
    money: 0,
    revenueMultiplier: 1,
    expenseMultiplier: 1,
    reputation: 0,
  }
  for (const effect of effects) {
    merged.money! += effect.money ?? 0
    merged.revenueMultiplier! *= effect.revenueMultiplier ?? 1
    merged.expenseMultiplier! *= effect.expenseMultiplier ?? 1
    merged.reputation! += effect.reputation ?? 0
  }
  return merged
}

/** 턴 수익 계산 */
export function calculateNetIncome(state: GameState): { revenue: number; expenses: number; net: number } {
  const effects = mergeEffects(state.activeEffects)

  // 기본 수익 + 투자 수익
  const investmentIncome = calculateInvestmentIncome(state)
  const revenue = Math.floor((BASE_REVENUE + investmentIncome) * effects.revenueMultiplier!)
  const expenses = Math.floor(BASE_EXPENSES * effects.expenseMultiplier!)
  const directMoney = effects.money ?? 0

  return {
    revenue,
    expenses,
    net: revenue - expenses + directMoney,
  }
}

/** 최종 점수 계산 */
export function calculateScore(state: GameState): number {
  const moneyScore = Math.max(0, state.money) * SCORE_MONEY_WEIGHT
  const reputationScore = state.reputation * SCORE_REPUTATION_WEIGHT
  const turnBonus = state.turn * SCORE_TURN_BONUS
  return Math.floor(moneyScore + reputationScore + turnBonus)
}
