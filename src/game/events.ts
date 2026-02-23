import type { GameEvent, GameState } from './types'
import type { Rng } from './utils'
import { VOLATILITY_EVENT_BONUS } from './constants'

/** 이벤트 레지스트리 (12개: 경제 4, 섹터 3, 개인 3, 기회 2) */
export const EVENT_REGISTRY: GameEvent[] = [
  // === 경제 이벤트 (4개) ===
  {
    id: 'interest-rate-hike',
    title: '금리 인상',
    description: '중앙은행이 기준금리를 인상했습니다. 대출 비용이 증가합니다.',
    minTurn: 3,
    weight: 10,
    choices: [
      { id: 'restructure', text: '포트폴리오를 재조정한다', effect: { money: -100, influence: 5 } },
      { id: 'endure', text: '현재 포지션을 유지한다', effect: { expenseMultiplier: 1.3 } },
    ],
    dominanceChoice: {
      sector: 'finance',
      choice: { id: 'leverage', text: '금융 지배력으로 유리한 금리 확보', effect: { money: 150, influence: 8 } },
    },
  },
  {
    id: 'economic-stimulus',
    title: '경기 부양책',
    description: '정부가 대규모 경기 부양책을 발표했습니다!',
    minTurn: 5,
    weight: 8,
    choices: [
      { id: 'expand', text: '공격적으로 투자를 늘린다', effect: { nextPurchaseDiscount: 0.2, influence: 3 } },
      { id: 'save', text: '현금을 비축한다', effect: { money: 200 } },
    ],
  },
  {
    id: 'financial-crisis',
    title: '금융 위기',
    description: '글로벌 금융 시장에 위기 조짐이 보입니다.',
    minTurn: 10,
    weight: 5,
    condition: (state) => state.market.condition !== 'recession',
    choices: [
      { id: 'hedge', text: '안전 자산으로 대피한다 (-$200)', effect: { money: -200, marketShift: 'recession' } },
      { id: 'hold', text: '현재 포지션을 유지한다', effect: { marketShift: 'recession', influence: -10 } },
    ],
    dominanceChoice: {
      sector: 'finance',
      choice: { id: 'short-sell', text: '공매도로 위기를 기회로', effect: { money: 500, marketShift: 'recession', influence: 15 } },
    },
  },
  {
    id: 'trade-boom',
    title: '무역 호황',
    description: '국제 무역이 활발해지면서 시장이 활기를 띱니다.',
    minTurn: 6,
    weight: 7,
    condition: (state) => state.market.condition !== 'boom',
    choices: [
      { id: 'invest-abroad', text: '해외 시장에 투자한다', effect: { revenueMultiplier: 1.4, marketShift: 'boom', influence: 5 } },
      { id: 'domestic', text: '국내 시장에 집중한다', effect: { revenueMultiplier: 1.2, influence: 2 } },
    ],
    dominanceChoice: {
      sector: 'retail',
      choice: { id: 'trade-network', text: '유통 네트워크로 무역 이익 극대화', effect: { money: 300, revenueMultiplier: 1.3, marketShift: 'boom', influence: 10 } },
    },
  },

  // === 섹터 이벤트 (3개) ===
  {
    id: 'tech-innovation',
    title: '기술 혁신',
    description: '새로운 기술 혁신이 IT 산업을 뒤흔들고 있습니다.',
    minTurn: 4,
    weight: 9,
    choices: [
      { id: 'adopt', text: '신기술에 투자한다 (-$150)', effect: { money: -150, sectorShift: { sector: 'tech', trend: 'hot' }, influence: 5 } },
      { id: 'wait', text: '시장 반응을 지켜본다', effect: { sectorShift: { sector: 'tech', trend: 'hot' } } },
    ],
    dominanceChoice: {
      sector: 'tech',
      choice: { id: 'lead-innovation', text: '기술 지배력으로 혁신을 주도', effect: { money: 200, sectorShift: { sector: 'tech', trend: 'hot' }, influence: 12 } },
    },
  },
  {
    id: 'real-estate-regulation',
    title: '부동산 규제',
    description: '정부가 부동산 시장에 강력한 규제를 도입합니다.',
    minTurn: 5,
    weight: 8,
    choices: [
      { id: 'comply', text: '규제에 맞춰 조정한다', effect: { money: -100, sectorShift: { sector: 'realEstate', trend: 'cold' }, influence: 3 } },
      { id: 'lobby', text: '로비를 통해 완화를 시도한다 (-$250)', effect: { money: -250, influence: 8 } },
    ],
    dominanceChoice: {
      sector: 'realEstate',
      choice: { id: 'market-power', text: '부동산 지배력으로 규제 영향 최소화', effect: { influence: 10 } },
    },
  },
  {
    id: 'consumer-trend',
    title: '소비 트렌드 변화',
    description: '소비자들의 소비 패턴이 크게 변화하고 있습니다.',
    minTurn: 3,
    weight: 9,
    choices: [
      { id: 'adapt', text: '트렌드에 빠르게 적응한다 (-$120)', effect: { money: -120, sectorShift: { sector: 'retail', trend: 'hot' }, influence: 5 } },
      { id: 'steady', text: '기존 전략을 고수한다', effect: { sectorShift: { sector: 'food', trend: 'cold' } } },
    ],
  },

  // === 개인 이벤트 (3개) ===
  {
    id: 'tax-audit',
    title: '세무 조사',
    description: '국세청에서 세무 조사 통보가 왔습니다.',
    minTurn: 8,
    weight: 6,
    choices: [
      { id: 'accountant', text: '전문 회계사를 고용한다 (-$150)', effect: { money: -150, influence: 2 } },
      { id: 'self', text: '직접 대응한다', effect: { money: -300, influence: -5 } },
    ],
  },
  {
    id: 'partnership-offer',
    title: '파트너십 제안',
    description: '유력 투자자가 파트너십을 제안합니다.',
    minTurn: 6,
    weight: 7,
    choices: [
      { id: 'accept', text: '파트너십을 수락한다', effect: { revenueMultiplier: 1.3, influence: 10 } },
      { id: 'decline', text: '독립 경영을 유지한다', effect: { influence: -3 } },
    ],
  },
  {
    id: 'media-scandal',
    title: '미디어 스캔들',
    description: '언론에서 당신의 투자에 대한 부정적 기사가 나왔습니다.',
    minTurn: 7,
    weight: 7,
    choices: [
      { id: 'pr-campaign', text: 'PR 캠페인으로 대응한다 (-$200)', effect: { money: -200, influence: 5 } },
      { id: 'silence', text: '침묵으로 일관한다', effect: { influence: -15 } },
    ],
  },

  // === 기회 이벤트 (2개) ===
  {
    id: 'acquisition-opportunity',
    title: '인수 기회',
    description: '경쟁사를 인수할 수 있는 기회가 왔습니다!',
    minTurn: 12,
    weight: 4,
    condition: (state) => state.companies[0].assets.length >= 3,
    choices: [
      { id: 'acquire', text: '인수를 진행한다 (-$300)', effect: { money: -300, freeAsset: 'restaurant', influence: 15 } },
      { id: 'pass', text: '이번 기회는 넘긴다', effect: { influence: -2 } },
    ],
  },
  {
    id: 'ipo-participation',
    title: 'IPO 참여',
    description: '유망 기업의 IPO에 참여할 기회입니다!',
    minTurn: 10,
    weight: 4,
    condition: (state) => state.companies[0].influence >= 40,
    choices: [
      { id: 'invest-ipo', text: 'IPO에 투자한다 (-$400)', effect: { money: -400, freeAsset: 'app-startup', influence: 20 } },
      { id: 'skip-ipo', text: '이번 IPO는 건너뛴다', effect: { influence: -5 } },
    ],
  },
]

/** 이벤트 발생 여부 판정 + 이벤트 선택 */
export function rollForEvent(state: GameState, rng: Rng): GameEvent | null {
  const probability = state.config.eventProbability + state.market.volatility * VOLATILITY_EVENT_BONUS
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

/** ID로 이벤트 레지스트리에서 이벤트 조회 */
export function findEventById(id: string): GameEvent | null {
  return EVENT_REGISTRY.find((e) => e.id === id) ?? null
}
