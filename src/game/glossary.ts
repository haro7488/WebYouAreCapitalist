// 게임 용어/요소 백과사전 데이터

export type GlossaryCategory = 'basic' | 'economy' | 'asset' | 'competition' | 'info' | 'meta'

export interface GlossaryEntry {
  id: string
  term: string
  category: GlossaryCategory
  description: string
  formula?: string
}

export const GLOSSARY_CATEGORIES: Record<GlossaryCategory, string> = {
  basic: '기본 개념',
  economy: '경제',
  asset: '자산',
  competition: '경쟁',
  info: '정보',
  meta: '메타',
}

export const GLOSSARY: GlossaryEntry[] = [
  // ── 기본 개념 ──
  {
    id: 'ap',
    term: 'AP (행동력)',
    category: 'basic',
    description:
      '턴마다 사용할 수 있는 행동 포인트. 자산 구매, 매각, 업그레이드, 시장조사 등 행동에 1 AP씩 소모된다. 기본 2 AP이며, 메타 업그레이드 "멀티태스킹"으로 +1 가능.',
  },
  {
    id: 'turn',
    term: '턴',
    category: 'basic',
    description:
      '게임의 기본 시간 단위. 기본 30턴이며, 메타 업그레이드 "시간 관리"로 최대 +6턴(레벨당 +2) 늘릴 수 있다. 모든 턴 종료 후 최종 점수가 산출된다.',
  },
  {
    id: 'phase-planning',
    term: '계획 페이즈 (Planning)',
    category: 'basic',
    description:
      '턴의 첫 번째 단계. 플레이어가 AP를 사용해 자산 구매·매각·업그레이드·시장조사 등의 행동을 실행한다.',
  },
  {
    id: 'phase-event',
    term: '이벤트 페이즈 (Event)',
    category: 'basic',
    description:
      '턴의 두 번째 단계. 랜덤 이벤트가 발생할 수 있다(기본 40% 확률, 변동성에 따라 증가). 이벤트 발생 시 선택지 중 하나를 골라야 한다.',
  },
  {
    id: 'phase-resolution',
    term: '정산 페이즈 (Resolution)',
    category: 'basic',
    description:
      '턴의 세 번째 단계. 자산 가격 변동, 수입 계산, 섹터 트렌드 변화, 시장 상태 전환 등이 자동으로 처리된다.',
  },
  {
    id: 'phase-result',
    term: '결과 페이즈 (Result)',
    category: 'basic',
    description:
      '턴의 마지막 단계. 이번 턴의 수입/지출 결과와 순위 변동이 표시되고, 다음 턴으로 넘어간다.',
  },
  {
    id: 'net-worth',
    term: '순자산',
    category: 'basic',
    description:
      '현금 + 보유 자산의 현재 가치 합계. 최종 점수 계산에 1배 가중치로 반영된다.',
    formula: '순자산 = 현금 + Σ(보유 자산 현재가치)',
  },
  {
    id: 'cash',
    term: '현금',
    category: 'basic',
    description:
      '즉시 사용 가능한 자금. 자산 구매·업그레이드·이벤트 선택 등에 소모된다. 초기 자금은 1,000 (메타 업그레이드 "시드 캐피탈"로 레벨당 +400).',
  },

  // ── 경제 ──
  {
    id: 'market-pool',
    term: '시장 풀',
    category: 'economy',
    description:
      '모든 기업이 공유하는 수입 재원. 초기 20,000이며, 전체 수요가 풀을 초과하면 수입이 비례 축소된다. 매 턴 섹터별 유입률(0.2~0.25%)만큼 회복된다.',
    formula: '축소 계수 = min(1, 시장풀 / 전체수요)',
  },
  {
    id: 'market-condition',
    term: '시장 상태',
    category: 'economy',
    description:
      '호황(Boom), 보합(Stable), 불황(Recession) 3가지. 4~8턴마다 확률적으로 전환된다. 시장 상태에 따라 각 섹터의 수입 배율이 달라진다.',
  },
  {
    id: 'market-boom',
    term: '호황 (Boom)',
    category: 'economy',
    description:
      '시장이 활발한 상태. 대부분의 섹터에서 수입 배율이 높아진다. 특히 금융(×1.8)과 테크(×1.7) 섹터가 크게 수혜. 변동성이 낮아 이벤트 발생이 적다.',
  },
  {
    id: 'market-stable',
    term: '보합 (Stable)',
    category: 'economy',
    description:
      '시장이 안정적인 상태. 식품·소매 섹터는 ×1.0, 부동산은 ×1.05로 안정적. 테크·금융은 ×0.9로 약간 저조.',
  },
  {
    id: 'market-recession',
    term: '불황 (Recession)',
    category: 'economy',
    description:
      '시장이 침체된 상태. 모든 섹터 수입이 감소하며, 특히 금융(×0.2)과 테크(×0.4) 피해가 크다. 부동산(×0.9)은 상대적으로 방어적. 변동성이 높아 이벤트가 자주 발생.',
  },
  {
    id: 'sector-trend',
    term: '섹터 트렌드',
    category: 'economy',
    description:
      '각 섹터별로 뜨거움(Hot), 중립(Neutral), 침체(Cold) 3가지 상태. 2~6턴마다 전환된다. 수입 배율과 자산 가치 변동에 영향.',
  },
  {
    id: 'trend-hot',
    term: '뜨거움 (Hot)',
    category: 'economy',
    description:
      '해당 섹터가 활황인 상태. 수입 ×1.3 배율 적용. 자산 가치도 매 턴 +2% 추가 상승.',
  },
  {
    id: 'trend-neutral',
    term: '중립 (Neutral)',
    category: 'economy',
    description:
      '해당 섹터가 평상시인 상태. 수입 ×1.0 배율. 자산 가치는 기본 감사율(appreciation)만 적용.',
  },
  {
    id: 'trend-cold',
    term: '침체 (Cold)',
    category: 'economy',
    description:
      '해당 섹터가 불황인 상태. 수입 ×0.7 배율 적용. 자산 가치가 매 턴 -1% 하락.',
  },
  {
    id: 'base-expenses',
    term: '기본 지출',
    category: 'economy',
    description:
      '매 턴 자동으로 차감되는 고정 비용. 15원. 이벤트에 의해 지출 배율이 변동될 수 있다.',
    formula: '실제 지출 = ⌊기본지출(15) × 지출배율⌋',
  },

  // ── 자산 ──
  {
    id: 'asset-tier',
    term: '자산 티어',
    category: 'asset',
    description:
      '자산은 1·2·3 티어로 나뉜다. 티어가 높을수록 비용과 수입이 높고, 구매 시 영향력도 더 많이 얻는다(티어1: +2, 티어2: +3, 티어3: +5).',
  },
  {
    id: 'sector',
    term: '섹터 (산업)',
    category: 'asset',
    description:
      '식품(Food), 테크(Tech), 부동산(Real Estate), 소매(Retail), 금융(Finance) 5개 섹터. 각 섹터에 3개 자산(티어 1/2/3)이 있어 총 15종.',
  },
  {
    id: 'base-income',
    term: '기본 수입 (baseIncome)',
    category: 'asset',
    description:
      '자산의 기초 수입. 시장 배율, 트렌드 배율, 업그레이드 배율, 지배력 보너스가 곱해져 최종 수입이 결정된다.',
    formula: '수입 = baseIncome × 시장배율 × 트렌드배율 × 1.25^업그레이드 × 지배력보너스',
  },
  {
    id: 'upgrade',
    term: '업그레이드',
    category: 'asset',
    description:
      '보유 자산의 수입을 강화. 최대 3레벨. 레벨당 수입 ×1.25. 비용은 자산 원가의 30% × (현재레벨 + 1).',
    formula: '업그레이드 비용 = 자산원가 × 0.3 × (레벨 + 1)',
  },
  {
    id: 'sell',
    term: '매각',
    category: 'asset',
    description:
      '보유 자산을 현금화. 매각가는 현재 가치의 85%에 시장 상태에 따른 보정이 추가된다.',
    formula: '매각가 = 현재가치 × (0.85 + 0.15 × 시장배율)',
  },
  {
    id: 'appreciation',
    term: '감사 (Appreciation)',
    category: 'asset',
    description:
      '자산의 가치가 매 턴 자동으로 변동하는 비율. 자산별 기본 감사율(1~5%)에 섹터 트렌드 보정(뜨거움 +2%, 침체 -1%)이 더해진다.',
    formula: '새 가치 = 현재가치 × (1 + 기본감사율 + 트렌드보정)',
  },
  {
    id: 'risk-level',
    term: '리스크 레벨',
    category: 'asset',
    description:
      '자산의 수입 변동성. 낮음(Low): 안정적, 시장 배율 범위 좁음. 보통(Medium): 중간 변동성. 높음(High): 호황에 크게 벌고 불황에 크게 잃음. 금융·테크 섹터가 주로 높음, 부동산·식품이 낮음.',
  },
  {
    id: 'sector-demand',
    term: '섹터 수요 프리미엄',
    category: 'asset',
    description:
      '같은 섹터에 경쟁자가 많으면 자산 구매 비용이 올라간다. 0명: +0%, 1명: +10%, 2명: +15%, 3명+: +20%.',
  },

  // ── 경쟁 ──
  {
    id: 'dominance',
    term: '지배력',
    category: 'competition',
    description:
      '한 섹터에 보유한 자산 수에 따라 결정. 진입자(1개), 경쟁자(2개), 지배자(3개+). 지배자는 수입 ×1.25 보너스와 이벤트 특별 선택지를 얻는다.',
  },
  {
    id: 'dominance-entrant',
    term: '진입자 (Entrant)',
    category: 'competition',
    description:
      '해당 섹터에 자산 1개 보유. 수입 보너스 없음(×1.0).',
  },
  {
    id: 'dominance-competitor',
    term: '경쟁자 (Competitor)',
    category: 'competition',
    description:
      '해당 섹터에 자산 2개 보유. 수입 ×1.1 보너스.',
  },
  {
    id: 'dominance-dominant',
    term: '지배자 (Dominant)',
    category: 'competition',
    description:
      '해당 섹터에 자산 3개+ 보유. 수입 ×1.25 보너스. 해당 섹터 관련 이벤트에서 강력한 특별 선택지가 나타난다. 지배 달성 시 영향력 +10.',
  },
  {
    id: 'influence',
    term: '영향력',
    category: 'competition',
    description:
      '시장에서의 존재감. 최대 100. 매 턴 1씩 자연 감소. 자산 구매, 이벤트 선택, 순위 1위(+2/턴) 등으로 획득. 높을수록 할인·이벤트 보너스 등 혜택.',
  },
  {
    id: 'influence-tier-0',
    term: '무명 투자자 (영향력 0~19)',
    category: 'competition',
    description:
      '영향력 최하위 단계. 특별한 혜택 없음.',
  },
  {
    id: 'influence-tier-1',
    term: '주목받는 투자자 (영향력 20~39)',
    category: 'competition',
    description:
      '이벤트 보너스 +5%.',
  },
  {
    id: 'influence-tier-2',
    term: '영향력 있는 투자자 (영향력 40~59)',
    category: 'competition',
    description:
      '구매 할인 5%, 이벤트 보너스 +10%, 무료 시장조사 가능.',
  },
  {
    id: 'influence-tier-3',
    term: '시장의 큰 손 (영향력 60~79)',
    category: 'competition',
    description:
      '구매 할인 10%, 이벤트 보너스 +15%, 무료 시장조사 가능.',
  },
  {
    id: 'influence-tier-4',
    term: '자본가 (영향력 80~100)',
    category: 'competition',
    description:
      '구매 할인 15%, 이벤트 보너스 +20%, 무료 시장조사 가능. 최고 등급.',
  },
  {
    id: 'ranking',
    term: '순위',
    category: 'competition',
    description:
      '매 턴 순자산 기준으로 갱신. 1위는 매 턴 영향력 +2 보너스를 받는다.',
  },

  // ── 정보 ──
  {
    id: 'market-research',
    term: '시장조사',
    category: 'info',
    description:
      '1 AP를 소모하여 섹터의 숨겨진 정보를 열람. 영향력 40 이상(영향력 있는 투자자)부터는 무료로 가능.',
  },
  {
    id: 'public-info',
    term: '공개 정보',
    category: 'info',
    description:
      '누구나 볼 수 있는 정보. 시장 상태, 섹터 트렌드, 자산 기본 스펙, 현재 순위 등.',
  },
  {
    id: 'secret-info',
    term: '비밀 정보',
    category: 'info',
    description:
      '시장조사를 통해서만 볼 수 있는 정보. 섹터 트렌드 전환 확률, 경쟁사 동향 등 심층 데이터.',
  },

  // ── 메타 ──
  {
    id: 'meta-currency',
    term: '메타 화폐',
    category: 'meta',
    description:
      '런 종료 시 최종 점수의 0.8%만큼 획득. 다음 런에서 메타 업그레이드를 구매하는 데 사용.',
    formula: '메타 화폐 = ⌊최종점수 × 0.008⌋',
  },
  {
    id: 'final-score',
    term: '최종 점수',
    category: 'meta',
    description:
      '런 종료 시 산출. 순자산, 영향력, 턴 수, 지배 섹터 수를 종합하여 계산.',
    formula: '점수 = 순자산×1 + 영향력×20 + 턴수×5 + 지배섹터×500',
  },
  {
    id: 'meta-seed-capital',
    term: '시드 캐피탈',
    category: 'meta',
    description:
      '메타 업그레이드. 초기 자금 +400/레벨. 최대 5레벨. 비용: 5 × (현재레벨+1).',
  },
  {
    id: 'meta-time-management',
    term: '시간 관리',
    category: 'meta',
    description:
      '메타 업그레이드. 최대 턴 수 +2/레벨. 최대 3레벨. 비용: 8 × (현재레벨+1).',
  },
  {
    id: 'meta-investment-eye',
    term: '투자 안목',
    category: 'meta',
    description:
      '메타 업그레이드. 수입 배율 +8%/레벨. 최대 5레벨. 비용: 10 × (현재레벨+1).',
    formula: '수입 × (1 + 0.08 × 레벨)',
  },
  {
    id: 'meta-negotiation',
    term: '협상력',
    category: 'meta',
    description:
      '메타 업그레이드. 구매 비용 -8%/레벨. 최대 3레벨. 비용: 7 × (현재레벨+1).',
  },
  {
    id: 'meta-crisis-sense',
    term: '위기 감각',
    category: 'meta',
    description:
      '메타 업그레이드. 나쁜 이벤트 리롤 확률 +15%/레벨. 최대 2레벨. 비용: 12 × (현재레벨+1).',
  },
  {
    id: 'meta-multitasking',
    term: '멀티태스킹',
    category: 'meta',
    description:
      '메타 업그레이드. 턴당 AP +1. 최대 1레벨. 비용: 20.',
  },
  {
    id: 'meta-connections',
    term: '인맥',
    category: 'meta',
    description:
      '메타 업그레이드. 초기 영향력 +15/레벨. 최대 3레벨. 비용: 8 × (현재레벨+1).',
  },
]
