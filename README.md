# WebYouAreCapitalist

> 소액 투자자에서 자본가로 — 30턴 안에 부를 쌓는 턴제 투자 로그라이트 웹게임

| 항목 | 내용 |
|------|------|
| 장르 | 턴제 투자 로그라이트 |
| 플랫폼 | 웹 (모바일/PC 반응형) |
| 1회 플레이 | 30턴, 약 10~15분 |
| 기술 스택 | React 19 · Vite 6 · TypeScript 5 · Zustand 5 · Tailwind CSS 3 |

$1,000로 시작해 5개 섹터(외식·기술·부동산·유통·금융)에 투자하고, 시장 변동과 이벤트에 대응하며 포트폴리오를 키워라. 자산만이 유일한 수입원 — 투자하지 않으면 수입은 0이다.

---

## 빠른 시작

### 필수 환경

- **Node.js** 20.11.0 이상
- **npm** 10 이상

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 타입 체크 + 프로덕션 빌드
npm run build

# 린트
npm run lint

# 빌드 결과 미리보기
npm run preview
```

---

## 프로젝트 구조

```
src/
├── game/            # 순수 TS 게임 엔진 (React import 금지)
│   ├── types.ts     # 타입/인터페이스 정의
│   ├── constants.ts # 게임 상수 및 자산/메타 데이터
│   ├── utils.ts     # 시드 RNG, 포맷, 유틸
│   ├── engine.ts    # 턴 처리 (액션, 이벤트, 해결)
│   ├── economy.ts   # 경제 계산 (소득, 가치, 점수)
│   ├── market.ts    # 시장/섹터 트렌드 관리
│   ├── events.ts    # 12개 이벤트 레지스트리
│   ├── meta.ts      # 메타 진행 (영구 업그레이드)
│   ├── run.ts       # 런 시작/종료
│   └── index.ts     # Barrel export
├── stores/          # Zustand 스토어
│   ├── gameStore.ts # 게임 상태 관리
│   ├── metaStore.ts # 메타 진행 관리
│   └── uiStore.ts   # UI 상태 (화면 전환, 모달)
├── components/
│   ├── common/      # 범용 UI (Button, Card, Badge, Modal 등 7개)
│   └── game/        # 게임 UI (AssetCard, Portfolio, EventCard 등 9개)
├── screens/         # 화면 단위 (MainMenu, Game, RunResult, MetaShop)
└── hooks/           # 커스텀 훅
```

---

## 아키텍처

```
┌─────────────────────────────────────────┐
│              screens/                    │  UI 계층
│              components/                 │  (React + Tailwind)
├─────────────────────────────────────────┤
│              stores/                     │  상태 관리
│              (Zustand)                   │  (game → stores 의존)
├─────────────────────────────────────────┤
│              game/                       │  게임 엔진
│              (순수 TypeScript)            │  (React 의존성 없음)
└─────────────────────────────────────────┘
```

### 핵심 규칙

1. **`src/game/`은 순수 TypeScript** — React/DOM import 절대 금지
2. **불변 상태 업데이트** — 모든 상태 변경은 spread operator로 새 객체 생성
3. **시드 기반 결정적 RNG** — `createRng(seed)` 사용, 동일 시드 → 동일 결과
4. **게임 엔진 접근은 barrel export** — `import { ... } from '@game'`

### Path Aliases

| Alias | 경로 |
|-------|------|
| `@/` | `src/` |
| `@game/` | `src/game/` |
| `@stores/` | `src/stores/` |
| `@components/` | `src/components/` |
| `@screens/` | `src/screens/` |

---

## 게임 시스템 개요

### 턴 페이즈 (4단계)

```
Planning → Event → Resolution → Result → 다음 턴
```

| 페이즈 | 설명 |
|--------|------|
| **Planning** | AP(액션 포인트) 소모하여 매입/매각/업그레이드/조사 수행 |
| **Event** | 랜덤 이벤트 발생 시 2~3개 선택지 중 하나 선택 |
| **Resolution** | 경제 계산 — 소득, 자산 가치, 시장/섹터 트렌드 갱신 |
| **Result** | 턴 결과 표시 후 다음 턴 진행 (또는 게임 오버) |

### 핵심 메커니즘

- **AP 시스템**: 턴당 2 AP (메타 업그레이드로 3), 액션 1개 = 1 AP
- **5개 섹터 × 3티어 = 15개 자산**: 외식·기술·부동산·유통·금융
- **지배력**: 같은 섹터 1개=신규, 2개=경쟁자(+10%), 3개=지배자(+25% + 이벤트 제3선택지)
- **영향력** (0~100): 매입 시 증가, 매턴 -1 감소. 티어별 할인/이벤트 보너스
- **시장 사이클**: boom/stable/recession 순환, 섹터별 hot/neutral/cold 독립 트렌드
- **메타 진행**: 런 점수 → 메타 화폐 → 7개 영구 업그레이드

> 상세 기획은 [docs/GDD.md](./docs/GDD.md) 참조

---

## 개발 가이드

### 새 기능 추가 흐름

1. 게임 로직 변경 → `src/game/` 모듈 수정
2. 상태 연동 필요 시 → `src/stores/` 스토어 업데이트
3. UI 반영 → `src/components/` 또는 `src/screens/` 수정
4. `npm run build`로 타입 체크 + 빌드 검증

### 코딩 규칙

- 한국어 주석 사용
- TypeScript strict 모드
- 게임 엔진은 `@game` alias로만 import
- 불변 상태 업데이트 (spread operator)
- 시드 RNG — `Math.random()` 직접 사용 금지 (게임 로직 내)

### Git 규칙

- 커밋 메시지는 한국어로 작성
- 작업 완료 후 반드시 `npm run build` 실행

---

## 테스트 전략

> Phase 2+ 계획

- **단위 테스트**: Vitest — `src/game/` 순수 함수 (economy, engine, market)
- **E2E 테스트**: Playwright — 주요 게임 플로우 (런 시작 → 턴 진행 → 결과)
- **수동 테스트**: 개발 서버에서 플레이 테스트

---

## 배포

```bash
npm run build    # dist/ 디렉토리에 빌드 결과 생성
```

정적 사이트이므로 Vercel, Netlify, GitHub Pages 등에 배포 가능. `dist/` 디렉토리를 서빙하면 된다.

---

## 참고 문서

| 문서 | 설명 |
|------|------|
| [docs/GDD.md](./docs/GDD.md) | 게임 디자인 문서 (상세 기획) |
| [docs/SCREENS.md](./docs/SCREENS.md) | 화면 설계서 (와이어프레임, 동작 명세) |
| [docs/API.md](./docs/API.md) | 게임 엔진 API 레퍼런스 |
| [PROGRESS.md](./PROGRESS.md) | 개발 진행 상황 |
