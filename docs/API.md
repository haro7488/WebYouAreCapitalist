# 게임 엔진 API 레퍼런스

> `src/game/` 모듈의 공개 API 문서. 모든 export는 barrel file(`src/game/index.ts`)을 통해 제공된다.

## Import

```typescript
import { submitAction, calculateNetWorth, ASSETS } from '@game'
import type { GameState, TurnAction, Asset } from '@game'
```

`@game`은 `src/game/index.ts`의 path alias다. 게임 엔진의 개별 모듈을 직접 import하지 않는다.

---

## 타입 (types.ts)

### 턴 & 시장

| 타입 | 종류 | 설명 |
|------|------|------|
| `TurnPhase` | union | `'planning' \| 'event' \| 'resolution' \| 'result'` |
| `MarketCondition` | union | `'boom' \| 'stable' \| 'recession'` |
| `MarketState` | interface | `{ condition, turnsRemaining, volatility }` |

### 섹터 & 자산

| 타입 | 종류 | 설명 |
|------|------|------|
| `Sector` | union | `'food' \| 'tech' \| 'realEstate' \| 'retail' \| 'finance'` |
| `AssetTier` | union | `1 \| 2 \| 3` |
| `SectorTrend` | union | `'hot' \| 'neutral' \| 'cold'` |
| `SectorState` | interface | `{ trend: SectorTrend, turnsRemaining: number }` |
| `RiskLevel` | union | `'low' \| 'medium' \| 'high'` |
| `Asset` | interface | 자산 정의 — id, name, sector, tier, cost, baseIncome, appreciation, riskLevel, marketMultiplier, maxUpgradeLevel |
| `OwnedAsset` | interface | 보유 자산 — assetId, purchaseTurn, purchasePrice, upgradeLevel, currentValue |

### 지배력

| 타입 | 종류 | 설명 |
|------|------|------|
| `DominanceLevel` | union | `'entrant' \| 'competitor' \| 'dominant'` |
| `DominanceInfo` | interface | `{ level, count, incomeBonus }` |

### 이벤트

| 타입 | 종류 | 설명 |
|------|------|------|
| `EventEffect` | interface | 이벤트 효과 — money, revenueMultiplier, expenseMultiplier, influence, marketShift, sectorShift, freeAsset, nextPurchaseDiscount |
| `EventChoice` | interface | `{ id, text, effect: EventEffect }` |
| `GameEvent` | interface | 이벤트 정의 — id, title, description, choices(2개), minTurn, weight, condition?, dominanceChoice? |
| `ResearchResult` | union | 조사 결과 — market/sector/event 3가지 타입 |

### 액션

| 타입 | 종류 | 설명 |
|------|------|------|
| `TurnAction` | union | `buy \| sell \| upgrade \| research \| endTurn` |

```typescript
type TurnAction =
  | { type: 'buy'; assetId: string }
  | { type: 'sell'; ownedIndex: number }
  | { type: 'upgrade'; ownedIndex: number }
  | { type: 'research'; target: 'market' | 'sector' | 'event'; sector?: Sector }
  | { type: 'endTurn' }
```

### 게임 상태

| 타입 | 종류 | 설명 |
|------|------|------|
| `GameState` | interface | 핵심 게임 상태 전체 (아래 참조) |

`GameState` 주요 필드:

| 필드 | 타입 | 설명 |
|------|------|------|
| `runId` | `string` | 런 고유 ID |
| `seed` | `number` | RNG 시드 |
| `turn` / `maxTurns` | `number` | 현재 턴 / 최대 턴 |
| `phase` | `TurnPhase` | 현재 턴 페이즈 |
| `money` | `number` | 현금 |
| `revenue` / `expenses` | `number` | 이번 턴 수익/지출 |
| `influence` | `number` | 영향력 (0~100) |
| `market` | `MarketState` | 글로벌 시장 상태 |
| `sectorStates` | `Record<Sector, SectorState>` | 섹터별 트렌드 |
| `ownedAssets` | `OwnedAsset[]` | 보유 자산 목록 |
| `actionPoints` / `maxActionPoints` | `number` | 남은/최대 AP |
| `actionsThisTurn` | `TurnAction[]` | 이번 턴 수행 액션 |
| `researchResult` | `ResearchResult \| null` | 조사 결과 |
| `activeEffects` | `EventEffect[]` | 턴 임시 효과 |
| `currentEvent` | `GameEvent \| null` | 현재 이벤트 |
| `eventHistory` | `string[]` | 발생한 이벤트 ID 기록 |
| `rngState` | `number` | RNG 내부 상태 |
| `isGameOver` | `boolean` | 게임 종료 여부 |
| `gameOverReason` | `'bankrupt' \| 'completed' \| null` | 종료 사유 |

### 메타 진행

| 타입 | 종류 | 설명 |
|------|------|------|
| `MetaEffect` | interface | 메타 업그레이드 합산 효과 — startingMoneyBonus, extraTurns, incomeMultiplier, purchaseCostDiscount, eventRerollChance, extraActionPoints, startingInfluence |
| `MetaUpgrade` | interface | 업그레이드 정의 — id, name, description, cost, maxLevel, effect(level) |
| `MetaState` | interface | `{ currency, totalRunsPlayed, bestScore, upgrades }` |
| `RunResult` | interface | 런 결과 — finalMoney, netWorth, totalTurns, score, metaCurrencyEarned, ownedAssets, dominatedSectors, maxInfluence |

---

## 상수 (constants.ts)

### 경제 상수

| 상수 | 값 | 설명 |
|------|---|------|
| `STARTING_MONEY` | 1,000 | 시작 자금 ($) |
| `MAX_TURNS` | 30 | 기본 최대 턴 |
| `BASE_EXPENSES` | 15 | 턴당 기본 지출 |
| `STARTING_INFLUENCE` | 0 | 시작 영향력 |
| `BASE_ACTION_POINTS` | 2 | 턴당 기본 AP |

### 자산 관련

| 상수 | 값 | 설명 |
|------|---|------|
| `ASSET_UPGRADE_COST_RATIO` | 0.3 | 업그레이드 비용 = 원가 × 비율 × (레벨+1) |
| `ASSET_UPGRADE_INCOME_MULTIPLIER` | 1.25 | 업그레이드당 소득 배율 |
| `ASSET_MAX_UPGRADE_LEVEL` | 3 | 최대 업그레이드 레벨 |
| `SELL_BASE_RATIO` | 0.85 | 기본 매각 비율 |
| `SELL_MARKET_RATIO` | 0.15 | 시장 영향 매각 비율 |

### 점수 & 메타

| 상수 | 값 | 설명 |
|------|---|------|
| `SCORE_NETWORTH_WEIGHT` | 1 | 순자산 점수 가중치 |
| `SCORE_INFLUENCE_WEIGHT` | 20 | 영향력 점수 가중치 |
| `SCORE_TURN_BONUS` | 5 | 턴당 보너스 |
| `SCORE_DOMINANCE_BONUS` | 500 | 지배 섹터당 보너스 |
| `META_CURRENCY_RATE` | 0.008 | 점수 → 메타 화폐 전환율 |

### 영향력

| 상수 | 설명 |
|------|------|
| `INFLUENCE_DECAY_PER_TURN` | 턴당 영향력 감소 (1) |
| `INFLUENCE_PER_PURCHASE` | 티어별 매입 시 영향력 증가 `{ 1: 2, 2: 3, 3: 5 }` |
| `INFLUENCE_DOMINANCE_BONUS` | 지배력 보너스 영향력 (10) |
| `INFLUENCE_TIERS` | 5단계 영향력 티어 (무명→주목→영향력→큰손→자본가) |

### 시장 & 섹터

| 상수 | 설명 |
|------|------|
| `MARKET_TRANSITION` | 시장 상태 전환 확률 매트릭스 |
| `SECTOR_TREND_MULTIPLIER` | 트렌드별 소득 배율 `{ hot: 1.3, neutral: 1.0, cold: 0.7 }` |
| `SECTOR_TREND_TRANSITION` | 섹터 트렌드 전환 확률 매트릭스 |
| `DOMINANCE_THRESHOLDS` | 지배력 등급 임계값 (1/2/3개) |

### 데이터

| 상수 | 설명 |
|------|------|
| `ASSETS` | 15개 자산 배열 (5섹터 × 3티어) — `Asset[]` |
| `META_UPGRADES` | 7개 메타 업그레이드 배열 — `MetaUpgrade[]` |

---

## 유틸 (utils.ts)

### `createRng(seed: number): Rng`

시드 기반 결정적 PRNG (Mulberry32) 생성. 반환 객체:

| 메서드 | 반환 | 설명 |
|--------|------|------|
| `random()` | `number` | 0~1 float |
| `int(min, max)` | `number` | min(포함) ~ max(미포함) 정수 |
| `pick(arr)` | `T` | 배열에서 랜덤 요소 |
| `getState()` | `number` | 현재 RNG 내부 상태 (저장/복원용) |

### `generateRunId(): string`

고유 런 ID 생성. `run_` 접두사 + 타임스탬프 + 랜덤 문자열.

### `generateSeed(): number`

`0 ~ 2,147,483,646` 범위의 랜덤 시드 생성.

### `formatMoney(amount: number): string`

숫자를 통화 형식으로 포맷. `1234` → `"$1,234"`.

### `clamp(value: number, min: number, max: number): number`

값을 min~max 범위로 제한.

### `Rng` (type)

`createRng` 반환 타입. `ReturnType<typeof createRng>`.

---

## 엔진 (engine.ts)

턴 페이즈에 따라 게임 상태를 전이시키는 핵심 함수들.

### `submitAction(state: GameState, action: TurnAction): GameState`

**Planning 페이즈**에서 플레이어 액션을 처리한다.

- `phase !== 'planning'` 또는 `isGameOver`이면 상태 변경 없이 반환
- AP가 부족하면 액션 무시 (단, 무료 조사는 예외)
- 액션 적용 후:
  - **AP 남음** → `planning` 유지 (다음 액션 대기)
  - **AP 소진 또는 endTurn** → 이벤트 판정 → `event` 또는 `resolution`으로 전환

### `submitEventChoice(state: GameState, choiceId: string): GameState`

**Event 페이즈**에서 이벤트 선택지를 처리한다.

- `phase !== 'event'` 또는 `currentEvent`가 없으면 무시
- 기본 2개 선택지 + dominanceChoice(지배자 등급 시 제3 선택지) 중 매칭
- 선택지 효과 적용 후 `resolution`으로 전환

### `resolvePhase(state: GameState): GameState`

**Resolution 페이즈**를 실행한다.

- 경제 계산: 순수익, 자산 가치 갱신
- 시장/섹터 트렌드 업데이트
- 영향력 자연 감소
- 턴 임시 효과(`activeEffects`) 초기화
- `result`로 전환

### `advanceTurn(state: GameState): GameState`

**Result 페이즈**에서 다음 턴으로 진행한다.

- 게임 오버 판정 (파산 또는 최대 턴 도달)
- 게임 오버가 아니면: `turn + 1`, AP 초기화, `planning`으로 전환

### `processFullTurn(state: GameState, actions: TurnAction[], eventChoiceId?: string): GameState`

편의 함수. 한 턴을 한번에 처리한다.

1. 모든 액션 순차 실행 (`submitAction`)
2. planning이 남으면 자동 endTurn
3. 이벤트 발생 시 `eventChoiceId`로 선택
4. resolution 실행

주로 테스트나 AI 시뮬레이션에 유용.

---

## 경제 (economy.ts)

### `calculateNetIncome(state: GameState): { revenue, expenses, net }`

턴 순수익 계산. 자산 소득 합산 × 이벤트 수익 배율 - 기본 지출 × 지출 배율 + 직접 자금 변화.

**기본 수익은 없다.** 자산 소득만이 유일한 수입원.

### `calculateAssetIncome(owned: OwnedAsset, state: GameState, dominance: Record<Sector, DominanceInfo>): number`

개별 자산의 턴 소득. 다음 배율이 곱해진다:
- 시장 배율 (`asset.marketMultiplier[시장상태]`)
- 섹터 트렌드 배율 (`hot: 1.3, neutral: 1.0, cold: 0.7`)
- 업그레이드 배율 (`1.25^upgradeLevel`)
- 지배력 배율 (`entrant: 1.0, competitor: 1.1, dominant: 1.25`)

### `calculateTotalAssetIncome(state: GameState): number`

모든 보유 자산의 턴 소득 합산.

### `calculateAssetValue(owned: OwnedAsset, state: GameState): number`

자산의 현재 가치 갱신. `currentValue × (1 + appreciation + trendAppreciation)`.
- hot 섹터: +2%/턴 추가
- cold 섹터: -1%/턴 감소

### `calculateNetWorth(state: GameState): number`

순자산 = 현금 + 모든 보유 자산 현재 가치 합산.

### `calculateDominance(ownedAssets: OwnedAsset[]): Record<Sector, DominanceInfo>`

섹터별 보유 자산 수 → 지배력 등급 판정.
- 1개: entrant (보너스 없음)
- 2개: competitor (+10% 소득)
- 3개+: dominant (+25% 소득 + 이벤트 제3선택지)

### `calculateScore(state: GameState): number`

최종 점수 = 순자산 × 1 + 영향력 × 20 + 턴 × 5 + 지배섹터 × 500.

### `getInfluenceTier(influence: number): InfluenceTier`

현재 영향력에 해당하는 티어 반환. 5단계:

| 영향력 | 타이틀 | 매입 할인 | 이벤트 보너스 | 무료 조사 |
|--------|--------|----------|-------------|----------|
| 0+ | 무명 투자자 | 0% | 0% | X |
| 20+ | 주목받는 투자자 | 0% | 5% | X |
| 40+ | 영향력 있는 투자자 | 5% | 10% | O |
| 60+ | 시장의 큰 손 | 10% | 15% | O |
| 80+ | 자본가 | 15% | 20% | O |

---

## 시장 (market.ts)

### `createInitialMarket(rng: Rng): MarketState`

초기 시장 상태 생성. 랜덤 condition, 랜덤 turnsRemaining(4~8), 랜덤 volatility(0.3~0.7).

### `updateMarket(market: MarketState, rng: Rng): MarketState`

매 턴 시장 업데이트.
- `turnsRemaining > 0`이면 카운트다운만
- 0이 되면 전환 확률 매트릭스로 새 condition 결정

### `createInitialSectorStates(rng: Rng): Record<Sector, SectorState>`

5개 섹터 초기 트렌드 상태 생성. 각각 랜덤 trend + turnsRemaining(2~6).

### `updateSectorTrends(sectorStates, marketCondition, rng): Record<Sector, SectorState>`

매 턴 섹터 트렌드 업데이트.
- 카운트다운 후 전환 시 글로벌 시장이 확률에 영향:
  - boom → hot 확률 +10%
  - recession → cold 확률 +10%

---

## 이벤트 (events.ts)

### `EVENT_REGISTRY: GameEvent[]`

12개 이벤트 레지스트리. 카테고리:

| 카테고리 | 수 | 예시 |
|---------|---|------|
| 경제 | 4 | 금리 인상, 경기 부양책, 금융 위기, 무역 호황 |
| 섹터 | 3 | 기술 혁신, 부동산 규제, 소비 트렌드 변화 |
| 개인 | 3 | 세무 조사, 파트너십 제안, 미디어 스캔들 |
| 기회 | 2 | 인수 기회, IPO 참여 |

일부 이벤트는 조건부(`condition`)이며, 금융/기술/부동산/유통 섹터 지배 시 제3 선택지(`dominanceChoice`) 활성화.

### `rollForEvent(state: GameState, rng: Rng): GameEvent | null`

이벤트 발생 판정.
1. 기본 확률(40%) + 변동성 보너스로 발생 여부 결정
2. 조건 충족 + 최근 5턴 미등장 이벤트 필터
3. 가중치 기반 랜덤 선택

### `findEventById(id: string): GameEvent | null`

ID로 이벤트 레지스트리 조회.

---

## 런 (run.ts)

### `startNewRun(meta: MetaState): GameState`

새 런 시작. 메타 효과를 반영한 초기 GameState 생성:
- 시드 생성 → RNG 초기화
- 메타 효과 적용 (시작 자금, 추가 턴, 추가 AP, 시작 영향력)
- 시장/섹터 초기화
- turn 1, phase 'planning'

### `endRun(finalState: GameState, meta: MetaState): { result: RunResult, updatedMeta: MetaState }`

런 종료 처리.
- 최종 점수/순자산/지배 섹터 계산
- 메타 화폐 획득 (`score × 0.008`, 최소 1)
- MetaState 갱신 (화폐, 런 횟수, 최고 점수)

---

## 메타 (meta.ts)

### `createInitialMeta(): MetaState`

초기 메타 상태. `{ currency: 0, totalRunsPlayed: 0, bestScore: 0, upgrades: {} }`.

### `getMetaEffects(meta: MetaState): MetaEffect`

모든 보유 업그레이드의 효과를 합산. 가산 효과는 덧셈, 배율 효과(`incomeMultiplier`)는 곱셈.

### `purchaseUpgrade(meta: MetaState, upgradeId: string): MetaState | null`

메타 업그레이드 구매.
- 업그레이드 미존재/최대 레벨/화폐 부족 시 `null` 반환
- 비용 = `cost × (currentLevel + 1)` (레벨이 오를수록 비용 증가)

7개 메타 업그레이드:

| ID | 이름 | 효과 | 최대 레벨 | 기본 비용 |
|----|------|------|----------|----------|
| `seed-capital` | 시드 캐피탈 | 시작 자금 +$400/레벨 | 5 | 5 |
| `time-management` | 시간 관리 | 최대 턴 +2/레벨 | 3 | 8 |
| `investment-eye` | 투자 안목 | 소득 배율 +8%/레벨 | 5 | 10 |
| `negotiation` | 협상력 | 매입 할인 +8%/레벨 | 3 | 7 |
| `crisis-sense` | 위기 감각 | 이벤트 리롤 +15%/레벨 | 2 | 12 |
| `multitasking` | 멀티태스킹 | AP +1 | 1 | 20 |
| `connections` | 인맥 | 시작 영향력 +15/레벨 | 3 | 8 |

---

## 사용 예시

### Zustand 스토어에서 사용

```typescript
import { submitAction, startNewRun, endRun } from '@game'
import type { GameState, TurnAction } from '@game'
import { useMetaStore } from '@stores/metaStore'

// 새 런 시작
const meta = useMetaStore.getState()
const initialState = startNewRun(meta)

// 액션 처리
const action: TurnAction = { type: 'buy', assetId: 'food-cart' }
const newState = submitAction(initialState, action)
```

### 순수 엔진 사용 (테스트)

```typescript
import { startNewRun, processFullTurn, endRun } from '@game'
import { createInitialMeta } from '@game'

const meta = createInitialMeta()
let state = startNewRun(meta)

// 턴 실행
state = processFullTurn(state, [
  { type: 'buy', assetId: 'food-cart' },
  { type: 'buy', assetId: 'app-startup' },
])

// 결과 확인
const { result, updatedMeta } = endRun(state, meta)
console.log(`점수: ${result.score}, 순자산: ${result.netWorth}`)
```
