import type { GameEvent, GameState } from './types'
import type { Rng } from './utils'
import { EVENT_BASE_PROBABILITY, VOLATILITY_EVENT_BONUS } from './constants'

/** 이벤트 레지스트리 */
export const EVENT_REGISTRY: GameEvent[] = [
  {
    id: 'health-inspection',
    title: '위생 점검',
    description: '갑작스러운 위생 점검이 예정되었습니다.',
    minTurn: 2,
    weight: 10,
    choices: [
      { id: 'bribe', text: '급하게 청소에 투자한다 (-$80)', effect: { money: -80, reputation: 5 } },
      { id: 'gamble', text: '그냥 검사를 받는다', effect: { reputation: -10 } },
    ],
  },
  {
    id: 'food-critic',
    title: '유명 평론가 방문',
    description: '유명 음식 평론가가 당신의 레스토랑을 방문할 예정입니다.',
    minTurn: 3,
    weight: 8,
    choices: [
      { id: 'premium', text: '특별 메뉴를 준비한다 (-$120)', effect: { money: -120, reputation: 15 } },
      { id: 'normal', text: '평소대로 운영한다', effect: { reputation: -5 } },
    ],
  },
  {
    id: 'supply-shortage',
    title: '원재료 부족',
    description: '주요 식재료의 공급이 불안정합니다.',
    minTurn: 1,
    weight: 12,
    choices: [
      { id: 'stockpile', text: '비싼 값에 재고를 확보한다 (-$100)', effect: { money: -100 } },
      { id: 'substitute', text: '대체 재료를 사용한다', effect: { reputation: -8, expenseMultiplier: 0.8 } },
    ],
  },
  {
    id: 'viral-review',
    title: 'SNS 바이럴',
    description: '누군가 당신의 가게를 SNS에 올렸습니다!',
    minTurn: 4,
    weight: 7,
    choices: [
      { id: 'promote', text: '광고비를 투자해 더 확산시킨다 (-$150)', effect: { money: -150, revenueMultiplier: 1.5, reputation: 10 } },
      { id: 'ignore', text: '자연스럽게 둔다', effect: { revenueMultiplier: 1.2 } },
    ],
  },
  {
    id: 'staff-complaint',
    title: '직원 불만',
    description: '주방 직원들이 급여 인상을 요구합니다.',
    minTurn: 5,
    weight: 9,
    choices: [
      { id: 'raise', text: '급여를 인상한다 (-$60)', effect: { money: -60, expenseMultiplier: 1.1, reputation: 5 } },
      { id: 'refuse', text: '현재 조건을 유지한다', effect: { reputation: -12, revenueMultiplier: 0.9 } },
    ],
  },
  {
    id: 'local-festival',
    title: '지역 축제',
    description: '근처에서 큰 축제가 열립니다. 참여 기회가 있습니다.',
    minTurn: 3,
    weight: 8,
    choices: [
      { id: 'participate', text: '부스를 운영한다 (-$200)', effect: { money: -200, revenueMultiplier: 1.8, reputation: 8 } },
      { id: 'skip', text: '가게에서 평소대로 영업한다', effect: { revenueMultiplier: 1.1 } },
    ],
  },
  {
    id: 'equipment-failure',
    title: '장비 고장',
    description: '주방의 핵심 장비가 고장났습니다.',
    minTurn: 2,
    weight: 10,
    choices: [
      { id: 'repair', text: '즉시 수리한다 (-$150)', effect: { money: -150 } },
      { id: 'makeshift', text: '임시로 때운다', effect: { revenueMultiplier: 0.7, reputation: -5 } },
    ],
  },
  {
    id: 'tax-audit',
    title: '세무 조사',
    description: '세무서에서 조사 통보가 왔습니다.',
    minTurn: 8,
    weight: 6,
    choices: [
      { id: 'accountant', text: '회계사를 고용한다 (-$100)', effect: { money: -100 } },
      { id: 'self', text: '직접 대응한다', effect: { money: -200 } },
    ],
  },
  {
    id: 'competitor-opens',
    title: '경쟁자 등장',
    description: '바로 옆에 새로운 레스토랑이 오픈했습니다.',
    minTurn: 6,
    weight: 8,
    choices: [
      { id: 'marketing', text: '마케팅으로 대응한다 (-$180)', effect: { money: -180, reputation: 10 } },
      { id: 'quality', text: '음식 품질에 집중한다', effect: { reputation: 3, expenseMultiplier: 1.15 } },
    ],
  },
  {
    id: 'lucky-customer',
    title: '행운의 손님',
    description: '부유한 단골손님이 대규모 파티를 예약합니다.',
    minTurn: 1,
    weight: 7,
    choices: [
      { id: 'vip', text: 'VIP 서비스를 제공한다 (-$50)', effect: { money: -50, revenueMultiplier: 1.6, reputation: 5 } },
      { id: 'standard', text: '일반 서비스로 진행한다', effect: { revenueMultiplier: 1.3 } },
    ],
  },
  {
    id: 'market-crash',
    title: '시장 폭락',
    description: '경제 위기의 조짐이 보입니다.',
    minTurn: 10,
    weight: 5,
    condition: (state) => state.market.condition !== 'recession',
    choices: [
      { id: 'hedge', text: '안전 자산으로 대피한다 (-$100)', effect: { money: -100, marketShift: 'recession' } },
      { id: 'hold', text: '현재 포지션을 유지한다', effect: { marketShift: 'recession' } },
    ],
  },
  {
    id: 'economic-boom',
    title: '경기 호황',
    description: '경제 성장 신호가 감지됩니다!',
    minTurn: 8,
    weight: 5,
    condition: (state) => state.market.condition !== 'boom',
    choices: [
      { id: 'expand', text: '공격적으로 투자한다', effect: { revenueMultiplier: 1.4, marketShift: 'boom' } },
      { id: 'cautious', text: '조심스럽게 접근한다', effect: { revenueMultiplier: 1.1, marketShift: 'boom' } },
    ],
  },
]

/** 이벤트 발생 여부 판정 + 이벤트 선택 */
export function rollForEvent(state: GameState, rng: Rng): GameEvent | null {
  const probability = EVENT_BASE_PROBABILITY + state.market.volatility * VOLATILITY_EVENT_BONUS
  if (rng.random() > probability) return null

  // 조건을 충족하는 이벤트만 필터
  const eligible = EVENT_REGISTRY.filter((e) => {
    if (state.turn < e.minTurn) return false
    if (e.condition && !e.condition(state)) return false
    // 같은 이벤트가 최근 5턴 내에 발생했으면 제외
    const recentEvents = state.eventHistory.slice(-5)
    if (recentEvents.includes(e.id)) return false
    return true
  })

  if (eligible.length === 0) return null

  // 가중치 기반 선택
  const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0)
  let roll = rng.random() * totalWeight
  for (const event of eligible) {
    roll -= event.weight
    if (roll <= 0) return event
  }

  return eligible[eligible.length - 1]
}
