# 이벤트 시스템 상세 기획

> Phase 2 리워크 기준. 일반 이벤트 + 정부 이벤트, 조건 태그, 특성 부여/제거, JSON 선언형 데이터.

---

## 디자인 철학

### 매 턴 일어나는 사건

이벤트는 게임의 **핵심 드라마 장치**다. 매 턴 **반드시 1개 발생**(보장) + 추가 확률 판정으로 최대 2개까지 발생한다. "아무 일도 없는 턴"은 존재하지 않는다.

이벤트가 만드는 플레이어 경험:
1. **분류별 긴장감** — 기회형(50%), 선택형(30%), 압박형(20%)으로 체감이 다름
2. **특성 누적** — 선택에 따라 영구 특성이 부여/제거되어 플레이어 고유 빌드 형성
3. **조사 인센티브** — 정보 기업을 통해 다음 턴 이벤트를 미리 파악 가능
4. **정부의 개입** — 정부 이벤트가 매 턴 별도로 1개 발생하여 거시 환경이 변화

### 선택지 설계 원칙

- **모든 이벤트에 최소 2개 선택지** — "강제 1택" 없음
- **특성(trait) 연계** — 특정 특성 보유 시 숨겨진 선택지 해금 (`requireTrait`)
- **JSON 선언형** — 효과는 데이터로, 로직은 엔진에서 분리

---

## 이벤트 분류

### 일반 이벤트 (매 턴 보장 1개 + 추가 확률)

| 분류 | 비율 | 성격 | 예시 |
|------|------|------|------|
| **기회형** (opportunity) | 50% | 선택하면 이득, 안 하면 손해 없음 | 파트너십 제안, 경기 부양책 |
| **선택형** (choice) | 30% | 양쪽 다 트레이드오프 | 기술 혁신, 소비 트렌드 변화 |
| **압박형** (pressure) | 20% | 어떤 선택이든 비용 발생 | 세무 조사, 금융 위기 |

- 기회형이 50%로 가장 많아 플레이어가 "이벤트 = 귀찮음"이 아닌 **기대감**을 느끼게 설계
- 압박형은 20%로 드물지만 등장 시 임팩트가 큼

### 정부 이벤트 (매 턴 별도 보장 1개)

일반 이벤트와 **별도 풀**에서 매 턴 1개 자동 발생. 정부 탭에서 확인.

| 분류 | 성격 | 예시 |
|------|------|------|
| 금리 조정 | 인플레이션/디플레이션 영향 | 기준금리 인상/인하 |
| 규제 | 특정 섹터 압박/완화 | 부동산 규제 강화, 기술 규제 완화 |
| 재정 정책 | 세금/보조금 | 법인세 인상, 스타트업 지원금 |
| 무역 정책 | 글로벌 시장 영향 | 무역 협정, 관세 부과 |

---

## 발생 메커니즘

### 턴 구조에서의 위치

```
자유 행동 → 정부 이벤트 → 일반 이벤트 → 정산 → 결과
              (보장 1개)     (보장 1개 + 추가 확률)
```

### 일반 이벤트 발생

1. **보장 이벤트 (1개)**: 조건 충족하는 이벤트 풀에서 가중치 기반 선택
2. **추가 이벤트 판정**: 아래 확률로 2번째 이벤트 발생 여부 결정

```
추가 이벤트 확률 = EVENT_BASE_PROBABILITY + volatility × VOLATILITY_EVENT_BONUS
                = 0.4 + 변동성 × 0.3
```

| 시장 상태 | 변동성 범위 | 추가 이벤트 확률 |
|----------|-----------|---------------|
| boom | 0.2~0.5 | 46~55% |
| stable | 0.3~0.7 | 49~61% |
| recession | 0.5~0.9 | 55~67% |

30턴 게임에서 일반 이벤트 평균 약 **46~50회** (보장 30 + 추가 16~20).

### 정부 이벤트 발생

- 매 턴 **보장 1개**, 추가 판정 없음
- 30턴 = 정부 이벤트 정확히 **30회**
- 일반 이벤트와 별도 풀, 중복 불가

### 이벤트 선택 과정

1. 풀 필터링: `minTurn` 충족 + `condition` 태그 통과
2. 중복 방지: 최근 5턴 내 발생한 이벤트 ID 제외
3. 분류 결정: 기회(50%) / 선택(30%) / 압박(20%) 비율로 카테고리 먼저 선택
4. 가중치 선택: 해당 카테고리 내에서 weight 기반 랜덤

---

## 조건 태그 시스템

이벤트 발생 조건은 JSON으로 선언한다. 엔진은 조건 태그를 읽어 판정만 수행.

### 조건 태그 종류

| 태그 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `minTurn` | `number` | 최소 턴 | `"minTurn": 10` |
| `maxTurn` | `number` | 최대 턴 (이후 미발생) | `"maxTurn": 25` |
| `minCash` | `number` | 최소 보유 현금 | `"minCash": 300` |
| `maxCash` | `number` | 최대 보유 현금 (가난할 때만) | `"maxCash": 200` |
| `minInfluence` | `number` | 최소 영향력 | `"minInfluence": 40` |
| `minAssets` | `number` | 최소 보유 자산 수 | `"minAssets": 3` |
| `marketCondition` | `MarketCondition` | 특정 시장 상태일 때만 | `"marketCondition": "boom"` |
| `notMarketCondition` | `MarketCondition` | 특정 시장 상태가 아닐 때 | `"notMarketCondition": "recession"` |
| `hasSector` | `Sector` | 해당 섹터 자산 1개 이상 보유 | `"hasSector": "tech"` |
| `dominatesSector` | `Sector` | 해당 섹터 지배 중 | `"dominatesSector": "finance"` |
| `requireTrait` | `string` | 특정 특성 보유 시에만 발생 | `"requireTrait": "lucky"` |
| `forbidTrait` | `string` | 특정 특성 미보유 시에만 발생 | `"forbidTrait": "notorious"` |
| `minRank` | `number` | 최소 순위 (꼴찌 지원) | `"minRank": 3` |

### 조건 태그 JSON 예시

```json
{
  "id": "financial-crisis",
  "conditions": {
    "minTurn": 10,
    "notMarketCondition": "recession",
    "minAssets": 2
  }
}
```

```json
{
  "id": "lucky-investment",
  "conditions": {
    "minTurn": 6,
    "requireTrait": "lucky"
  }
}
```

조건 태그는 **AND 결합** — 모든 조건을 동시에 충족해야 이벤트 풀에 진입.

---

## 특성 (Trait) 시스템

### 개요

특성은 **이벤트 선택의 결과**로만 부여/제거되는 영구 태그. 플레이어의 선택이 누적되어 고유한 빌드를 형성한다.

| 규칙 | 설명 |
|------|------|
| 획득 경로 | 이벤트 선택지의 `traitGrant` 효과로만 부여 |
| 제거 경로 | 이벤트 선택지의 `traitRemove` 효과로만 제거 |
| 지속 시간 | **영구** (런 종료까지) |
| 중복 | 같은 특성 중복 부여 불가 |
| 선택권 | 특성 부여/제거는 항상 **선택지 안에** 포함 — 강제 부여 없음 |

### 특성 목록

#### 긍정 특성

| ID | 이름 | 효과 | 구현 (JSON 선언) |
|----|------|------|-----------------|
| `sharp-eye` | 투자 안목 | 자산 매입 시 10% 할인 | `{ "purchaseDiscount": 0.1 }` |
| `networker` | 인맥왕 | 영향력 획득량 +20% | `{ "influenceGainMultiplier": 1.2 }` |
| `efficient` | 효율 경영 | 기본 지출 -30% | `{ "expenseMultiplier": 0.7 }` |
| `lucky` | 행운아 | 기회형 이벤트 확률 증가 | `{ "opportunityWeightBonus": 0.15 }` |
| `visionary` | 선구안 | 섹터 트렌드 1턴 미리 확인 | `{ "trendForesight": 1 }` |

#### 부정 특성

| ID | 이름 | 효과 | 구현 (JSON 선언) |
|----|------|------|-----------------|
| `reckless` | 무모함 | 매각 시 가치 -15% | `{ "sellPenalty": 0.15 }` |
| `notorious` | 악명 | 압박형 이벤트 확률 증가 | `{ "pressureWeightBonus": 0.15 }` |
| `wasteful` | 낭비벽 | 기본 지출 +25% | `{ "expenseMultiplier": 1.25 }` |
| `paranoid` | 의심병 | 조사 비용 2배 | `{ "investigateCostMultiplier": 2.0 }` |
| `slow` | 우유부단 | 이벤트 선택지 하나 잠금 | `{ "lockRandomChoice": true }` |

### 특성 효과 구현

특성 효과는 **JSON 선언형**으로 정의하고, 엔진이 해석한다.

```typescript
// schema 레이어가 JSON → 런타임 효과 매핑
interface TraitEffect {
  purchaseDiscount?: number        // 매입 할인율
  sellPenalty?: number             // 매각 패널티
  expenseMultiplier?: number       // 지출 배율
  influenceGainMultiplier?: number // 영향력 획득 배율
  opportunityWeightBonus?: number  // 기회형 가중치 보너스
  pressureWeightBonus?: number     // 압박형 가중치 보너스
  trendForesight?: number          // 트렌드 사전 확인 턴 수
  investigateCostMultiplier?: number // 조사 비용 배율
  lockRandomChoice?: boolean       // 선택지 잠금
}
```

---

## 이벤트 데이터 구조 (JSON Schema)

### 데이터/로직 분리 원칙

| 레이어 | 역할 | 파일 |
|--------|------|------|
| **데이터** | 이벤트 정의 (JSON) | `data/events/*.json` |
| **스키마** | JSON → TypeScript 타입 변환, 검증 | `src/game/schema/` |
| **로직** | 이벤트 선택·적용·특성 처리 | `src/game/events.ts`, `engine.ts` |

### 이벤트 JSON 구조

```json
{
  "id": "tech-innovation",
  "title": "기술 혁신",
  "description": "새로운 기술 혁신이 IT 산업을 뒤흔들고 있습니다.",
  "category": "choice",
  "weight": 9,
  "conditions": {
    "minTurn": 4
  },
  "choices": [
    {
      "id": "invest",
      "text": "신기술에 투자한다",
      "effect": {
        "money": -150,
        "influence": 5,
        "sectorShift": { "sector": "tech", "trend": "hot" },
        "traitGrant": "visionary"
      }
    },
    {
      "id": "observe",
      "text": "시장을 관망한다",
      "effect": {
        "sectorShift": { "sector": "tech", "trend": "hot" }
      }
    },
    {
      "id": "dominate",
      "text": "기술 지배력을 활용한다",
      "effect": {
        "money": 200,
        "influence": 12,
        "sectorShift": { "sector": "tech", "trend": "hot" }
      },
      "requireTrait": null,
      "requireDominance": "tech"
    }
  ]
}
```

### 선택지 조건 필드

| 필드 | 설명 |
|------|------|
| `requireDominance` | 해당 섹터 지배 시에만 해금 |
| `requireTrait` | 특정 특성 보유 시에만 해금 |
| `requireMinCash` | 최소 현금 보유 시에만 선택 가능 |

---

## 일반 이벤트 예시

### 1. 금리 인상 (interest-rate-hike) — 압박형

> 중앙은행이 기준금리를 인상했습니다. 대출 비용이 증가합니다.

```json
{
  "id": "interest-rate-hike",
  "category": "pressure",
  "weight": 10,
  "conditions": { "minTurn": 3 },
  "choices": [
    {
      "id": "rebalance",
      "text": "포트폴리오 재조정 (-$100)",
      "effect": { "money": -100, "influence": 5 }
    },
    {
      "id": "hold",
      "text": "현 포지션 유지",
      "effect": { "expenseMultiplier": 1.3 }
    },
    {
      "id": "exploit",
      "text": "금융 지배력으로 수익 창출",
      "effect": { "money": 150, "influence": 8 },
      "requireDominance": "finance"
    }
  ]
}
```

| 선택지 | 효과 | 전략 |
|--------|------|------|
| A: 포트폴리오 재조정 | -$100, 영향력 +5 | 현금 여유 있을 때. 영향력 확보 |
| B: 현 포지션 유지 | 지출 ×1.3 (이번 턴) | 현금 부족 시 소극적 대응 |
| C: 금융 지배력 활용 | +$150, 영향력 +8 | 금융 지배 시 위기를 수익으로 전환 |

---

### 2. 파트너십 제안 (partnership-offer) — 기회형

> 유력 투자자가 파트너십을 제안합니다.

```json
{
  "id": "partnership-offer",
  "category": "opportunity",
  "weight": 7,
  "conditions": { "minTurn": 6, "minInfluence": 20 },
  "choices": [
    {
      "id": "accept",
      "text": "파트너십을 수락한다",
      "effect": {
        "revenueMultiplier": 1.3,
        "influence": 10,
        "traitGrant": "networker"
      }
    },
    {
      "id": "decline",
      "text": "정중히 거절한다",
      "effect": { "influence": -3 }
    }
  ]
}
```

| 선택지 | 효과 | 전략 |
|--------|------|------|
| A: 수락 | 수익 ×1.3, 영향력 +10, **'인맥왕' 특성 부여** | 자산 많을수록 극대화. 이후 영향력 획득량 +20% |
| B: 거절 | 영향력 -3 | 자산 0이면 수익 배율 무의미 |

**특성 연계**: A 선택 시 `networker` 특성 영구 부여 → 이후 영향력 획득에 +20% 적용.

---

### 3. 금융 위기 (financial-crisis) — 압박형

> 글로벌 금융 시장에 위기 조짐이 보입니다.

```json
{
  "id": "financial-crisis",
  "category": "pressure",
  "weight": 5,
  "conditions": {
    "minTurn": 10,
    "notMarketCondition": "recession",
    "minAssets": 2
  },
  "choices": [
    {
      "id": "hedge",
      "text": "안전 자산으로 대피 (-$200)",
      "effect": {
        "money": -200,
        "marketShift": "recession",
        "traitGrant": "sharp-eye"
      }
    },
    {
      "id": "hold",
      "text": "포지션 유지",
      "effect": {
        "marketShift": "recession",
        "influence": -10,
        "traitGrant": "reckless"
      }
    },
    {
      "id": "short",
      "text": "공매도로 수익 창출",
      "effect": {
        "money": 500,
        "marketShift": "recession",
        "influence": 15
      },
      "requireDominance": "finance"
    }
  ]
}
```

| 선택지 | 효과 | 전략 |
|--------|------|------|
| A: 안전 대피 | -$200, recession, **'투자 안목' 부여** | 현금 소모하지만 이후 매입 10% 할인 |
| B: 포지션 유지 | recession, 영향력 -10, **'무모함' 부여** | 현금 보존하지만 이후 매각 -15% 패널티 |
| C: 공매도 | +$500, recession, 영향력 +15 | 금융 지배 시. 최고 보상 |

**특성 분기**: A는 긍정 특성, B는 부정 특성 부여 → 같은 이벤트에서도 선택에 따라 빌드가 갈림.

---

### 4. 행운의 투자 (lucky-investment) — 기회형, requireTrait

> 우연히 저평가된 자산을 발견했습니다!

```json
{
  "id": "lucky-investment",
  "category": "opportunity",
  "weight": 4,
  "conditions": {
    "minTurn": 6,
    "requireTrait": "lucky"
  },
  "choices": [
    {
      "id": "invest",
      "text": "즉시 투자한다",
      "effect": {
        "money": 300,
        "influence": 5
      }
    },
    {
      "id": "share",
      "text": "정보를 공유하고 인맥을 쌓는다",
      "effect": {
        "influence": 15,
        "traitGrant": "networker"
      }
    }
  ]
}
```

| 선택지 | 효과 | 전략 |
|--------|------|------|
| A: 즉시 투자 | +$300, 영향력 +5 | 현금이 필요한 상황 |
| B: 정보 공유 | 영향력 +15, **'인맥왕' 부여** | 영향력 빌드 강화 |

**특성 게이트**: `requireTrait: "lucky"` — '행운아' 특성이 없으면 이벤트 풀에 포함되지 않음. 이전 이벤트에서 '행운아'를 획득한 플레이어만 접근 가능.

---

### 5. 독점 조사 (monopoly-investigation) — 압박형, requireTrait 제거

> 공정거래위원회가 독점 조사에 착수했습니다.

```json
{
  "id": "monopoly-investigation",
  "category": "pressure",
  "weight": 5,
  "conditions": {
    "minTurn": 12,
    "minAssets": 3
  },
  "choices": [
    {
      "id": "cooperate",
      "text": "조사에 협조한다 (-$300)",
      "effect": {
        "money": -300,
        "influence": 5,
        "traitRemove": "notorious"
      }
    },
    {
      "id": "resist",
      "text": "법적 대응한다 (-$500)",
      "effect": {
        "money": -500,
        "influence": -5,
        "traitGrant": "notorious"
      }
    }
  ]
}
```

| 선택지 | 효과 | 전략 |
|--------|------|------|
| A: 조사 협조 | -$300, 영향력 +5, **'악명' 제거** | 비용 적고 악명 해소 기회 |
| B: 법적 대응 | -$500, 영향력 -5, **'악명' 부여** | 비용 크고 부정 특성 추가 |

**특성 제거**: A 선택 시 `traitRemove: "notorious"` — 이전에 획득한 '악명' 특성을 제거할 수 있는 유일한 기회.

---

### 6. 내부자 정보 (insider-info) — 기회형

> 신뢰할 수 있는 소스에서 내부 정보가 흘러왔습니다.

```json
{
  "id": "insider-info",
  "category": "opportunity",
  "weight": 6,
  "conditions": {
    "minTurn": 8,
    "minInfluence": 60
  },
  "choices": [
    {
      "id": "use",
      "text": "정보를 활용한다",
      "effect": {
        "money": 400,
        "influence": -10,
        "traitGrant": "notorious"
      }
    },
    {
      "id": "ignore",
      "text": "정보를 무시한다",
      "effect": {
        "influence": 5,
        "traitGrant": "efficient"
      }
    }
  ]
}
```

| 선택지 | 효과 | 전략 |
|--------|------|------|
| A: 정보 활용 | +$400, 영향력 -10, **'악명' 부여** | 단기 이익 vs 장기 리스크 (압박형 이벤트 확률 증가) |
| B: 정보 무시 | 영향력 +5, **'효율 경영' 부여** | 도덕적 선택 → 지출 -30% 보상 |

**트레이드오프**: 단기 현금($400) vs 장기 효율(-30% 지출). 두 특성의 가치가 런 진행도에 따라 달라짐.

---

## 정부 이벤트

### 개요

정부 이벤트는 일반 이벤트와 **별도 시스템**이다.

| 항목 | 일반 이벤트 | 정부 이벤트 |
|------|-----------|-----------|
| 발생 빈도 | 보장 1 + 추가 확률 | 보장 1 (정확히 매 턴) |
| 표시 위치 | 이벤트 페이즈 | 정부 페이즈 (이벤트 전) |
| 선택지 | 2~3개 (플레이어 선택) | 0~2개 (일부는 자동 적용) |
| 주요 효과 | 플레이어 자원, 특성 | 인플레이션, 시장 상태, 섹터 규제 |
| 특성 부여 | 가능 | 불가 |

### 정부 이벤트 예시

#### 기준금리 인상 (gov-rate-hike) — 자동 적용

> 중앙은행이 기준금리를 0.5%p 인상했습니다.

```json
{
  "id": "gov-rate-hike",
  "title": "기준금리 인상",
  "description": "중앙은행이 기준금리를 0.5%p 인상했습니다.",
  "type": "government",
  "autoApply": true,
  "conditions": { "minTurn": 3 },
  "effect": {
    "inflationDelta": -0.005,
    "expenseMultiplier": 1.05
  }
}
```

- 인플레이션 감소 → 물가 상승 둔화
- 지출 비용 소폭 증가
- 플레이어 선택지 없음 (자동 적용)

#### 스타트업 지원금 (gov-startup-subsidy) — 선택 가능

> 정부가 기술 스타트업 지원 정책을 발표했습니다.

```json
{
  "id": "gov-startup-subsidy",
  "title": "스타트업 지원금",
  "description": "정부가 기술 스타트업 지원 정책을 발표했습니다.",
  "type": "government",
  "autoApply": false,
  "conditions": { "minTurn": 5 },
  "choices": [
    {
      "id": "apply",
      "text": "지원금을 신청한다",
      "effect": {
        "money": 200,
        "sectorShift": { "sector": "tech", "trend": "hot" }
      },
      "requireMinCash": 0
    },
    {
      "id": "skip",
      "text": "이번은 넘긴다",
      "effect": {}
    }
  ]
}
```

#### 부동산 규제 강화 (gov-realestate-crackdown) — 자동 적용

> 정부가 부동산 투기 억제를 위한 강력한 규제를 도입합니다.

```json
{
  "id": "gov-realestate-crackdown",
  "title": "부동산 규제 강화",
  "description": "정부가 부동산 투기 억제를 위한 강력한 규제를 도입합니다.",
  "type": "government",
  "autoApply": true,
  "conditions": { "minTurn": 8 },
  "effect": {
    "sectorShift": { "sector": "realEstate", "trend": "cold" },
    "inflationDelta": -0.003
  }
}
```

### 인플레이션 연계

정부 이벤트의 `inflationDelta`는 글로벌 인플레이션율에 누적 반영된다.

```
인플레이션율 += inflationDelta (매 턴 정부 이벤트에서 조정)

가격 영향 = 자산 가격 × (1 + 인플레이션율)^경과턴
소득 영향 = 자산 소득 × (1 + 인플레이션율)^경과턴
```

인플레이션은 **가격과 소득 모두에 복리**로 적용 — 인플레이션이 높으면 자산 가격도 오르지만 소득도 증가.

---

## 조사와 이벤트 예측

### 정보 섹터

6번째 섹터인 **정보(information)** 섹터의 기업을 통해 이벤트를 예측할 수 있다.

| Tier | 기업 | 가격 | 조사 능력 |
|------|------|------|----------|
| 1 | 데이터 분석 스타트업 | $160 | 다음 턴 일반 이벤트 카테고리 공개 |
| 2 | 리서치 펌 | $480 | 다음 턴 일반 이벤트 제목 + 카테고리 공개 |
| 3 | 정보 네트워크 | $1,400 | 다음 턴 일반 이벤트 전체 공개 (선택지 포함) |

### 조사 메커니즘

| 규칙 | 설명 |
|------|------|
| 기업 종류 | 정보 섹터 기업만 가능 |
| 횟수 제한 | 기업 1개당 **1회/턴** |
| 대상 선택 | 조사 대상(일반 이벤트 / 정부 이벤트)을 선택 |
| 비용 | 현금 소모 (AP 없음, 현금 = 행동력) |
| 특성 영향 | `visionary` 특성: 조사 없이도 섹터 트렌드 1턴 먼저 확인 |
| 특성 영향 | `paranoid` 특성: 조사 비용 2배 |

### 예측 활용 전략

```
조사 결과: "다음 턴 압박형 이벤트 — 금융 위기"
→ 대비 가능:
  1. 현금 확보 (A 선택지 비용 대비)
  2. 금융 섹터 지배 달성 (C 선택지 해금)
  3. 자산 매각으로 리스크 축소
```

---

## 이벤트 효과 타입 요약

| 효과 필드 | 타입 | 지속 | 설명 |
|----------|------|------|------|
| `money` | `number` | 즉시 | 직접 현금 증감 |
| `influence` | `number` | 즉시 | 영향력 증감 (0~100 클램핑) |
| `revenueMultiplier` | `number` | 1턴 | 소득에 배율 적용 |
| `expenseMultiplier` | `number` | 1턴 | 지출에 배율 적용 |
| `marketShift` | `MarketCondition` | 영구 | 글로벌 시장 상태 강제 전환 |
| `sectorShift` | `{ sector, trend }` | 영구 | 섹터 트렌드 강제 전환 |
| `freeAsset` | `string` | 즉시 | 무료 자산 획득 (자산 ID) |
| `nextPurchaseDiscount` | `number` | 1회 | 다음 매입 할인율 (0~1) |
| `traitGrant` | `string` | 영구 | 특성 부여 (trait ID) |
| `traitRemove` | `string` | 영구 | 특성 제거 (trait ID) |
| `inflationDelta` | `number` | 영구 | 인플레이션율 변화 (정부 이벤트 전용) |

---

## 가중치 분포 (일반 이벤트)

```
기회형 (opportunity, 50%):
  경기 부양책(8) + 파트너십 제안(7) + 행운의 투자(4)
  + 내부자 정보(6) + 인수 기회(4) + IPO 참여(4)     = 33

선택형 (choice, 30%):
  기술 혁신(9) + 소비 트렌드(9) + 무역 호황(7)
  + 시장 붕괴 경고(5)                               = 30

압박형 (pressure, 20%):
  금리 인상(10) + 부동산 규제(8) + 세무 조사(6)
  + 미디어 스캔들(7) + 금융 위기(5) + 독점 조사(5)
  + 정부 보조금(7)                                   = 48
```

카테고리가 먼저 결정(50/30/20)되고, 카테고리 내에서 가중치 기반 선택.

---

## TypeScript 인터페이스 참조

```typescript
// src/game/types.ts
interface GameEvent {
  id: string
  title: string
  description: string
  category: 'opportunity' | 'choice' | 'pressure'
  choices: EventChoice[]
  minTurn: number
  weight: number
  conditions: EventConditions
  dominanceChoice?: { sector: Sector; choice: EventChoice }
}

interface EventConditions {
  minTurn?: number
  maxTurn?: number
  minCash?: number
  maxCash?: number
  minInfluence?: number
  minAssets?: number
  marketCondition?: MarketCondition
  notMarketCondition?: MarketCondition
  hasSector?: Sector
  dominatesSector?: Sector
  requireTrait?: string
  forbidTrait?: string
  minRank?: number
}

interface EventEffect {
  money?: number
  revenueMultiplier?: number
  expenseMultiplier?: number
  influence?: number
  marketShift?: MarketCondition
  sectorShift?: { sector: Sector; trend: SectorTrend }
  freeAsset?: string
  nextPurchaseDiscount?: number
  traitGrant?: string
  traitRemove?: string
  inflationDelta?: number
}

interface GovernmentEvent {
  id: string
  title: string
  description: string
  type: 'government'
  autoApply: boolean
  conditions: EventConditions
  effect?: EventEffect           // autoApply: true일 때
  choices?: EventChoice[]        // autoApply: false일 때
}
```

> 시스템 개요: [GDD.md](../GDD.md#8-이벤트-시스템) · 밸런스: [balance.md](./balance.md)
