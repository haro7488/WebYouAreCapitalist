# Progress

## Phase 1: MVP

### 완료
- [x] 프로젝트 스캐폴딩 (Vite + React + TS + Tailwind)
- [x] 코어 게임 엔진 (src/game/) — **자본가 컨셉으로 전면 리디자인**
  - types: 7섹터, Asset/OwnedAsset, AP 시스템, 영향력, 지배력 타입
  - constants: 19개 자산(7섹터x3티어 + 정보1), 섹터 트렌드, 지배력 보너스, 7개 메타 업그레이드
  - economy: 자산 소득/가치/순자산/지배력/영향력 계산
  - market: 글로벌 시장 + 섹터별 트렌드(hot/neutral/cold)
  - engine: AP 기반 복수 행동, buy/sell/upgrade/research 액션
  - events: 12개 투자/비즈니스 테마 이벤트 (지배력 제3선택지)
  - meta: 7개 영구 업그레이드 (멀티태스킹, 인맥 추가)
  - run: 섹터 상태 초기화, 순자산 기반 점수
  - utils: 시드 RNG (변경 없음)
- [x] CLAUDE.md 프로젝트 문서
- [x] GDD 문서 전면 재작성 (docs/GDD.md) — 자본가 컨셉
- [x] Zustand 스토어 (useGameStore, useMetaStore, useUIStore)
- [x] UI 컴포넌트 (common/, game/)
  - common/ 7개: Button, Card, Badge, ProgressBar, MoneyDisplay, StatRow, Modal
  - game/ 18개: MarketIndicator, GameHeader, AssetCard, AssetMarket, OwnedAssetRow, Portfolio, EventCard, TurnResult, ActionBar, Leaderboard, CompanyDetail, ResearchPanel, GoalSelectionModal, DevPanel, HelpModal, RankingChart, TraitDisplay, GovernmentCard

- [x] 화면 구현 (MainMenu, Game, RunResult, MetaShop)
  - MainMenuScreen: 타이틀 + 통계 카드 + 새 게임/메타 상점 버튼
  - GameScreen: Phase별 렌더링 (planning→event→resolution→result), ActionBar 연결
  - RunResultScreen: 최종 결과 + 순위 변동 차트 + 포트폴리오 + 재시작/메인 버튼
  - MetaShopScreen: 7개 업그레이드 카드 그리드, 구매 로직
  - App.tsx: UIStore currentScreen 기반 화면 라우팅 + Modal
- [x] 게임 루프 통합
  - GameScreen useEffect: resolution 자동 전환, 게임 오버 감지, phase별 뷰 초기화

- [x] 프로젝트 문서화 (README.md, docs/API.md)
  - README.md: 개발자 온보딩 + 프로젝트 개요 + 아키텍처 + 개발 가이드
  - docs/API.md: 게임 엔진 공개 API 레퍼런스 (타입/상수/함수 전체)
- [x] 게임 요소 상세 기획 (GDD 수정 + docs/design/ 5개 문서)
  - GDD.md: 코드 기준 10개 불일치 수정 (영향력 티어, 업그레이드 배율, 이벤트 효과, 메타 수치 등)
  - docs/design/assets.md: 자산 시스템 상세 (섹터 정체성, 19개 자산 프로필, ROI, 업그레이드/매각)
  - docs/design/market.md: 시장 시스템 상세 (이중 변동, 글로벌 사이클, 섹터 트렌드)
  - docs/design/events.md: 이벤트 시스템 상세 (12개 이벤트 카드, 발생 메커니즘, 전략)
  - docs/design/progression.md: 진행 시스템 상세 (영향력, 지배력, 점수, 메타)
  - docs/design/balance.md: 밸런스 분석 (ROI 비교, 손익분기, 궤적 시뮬레이션, 5개 이슈)
- [x] 반응형 레이아웃 최적화
  - 모바일 메타 태그 (theme-color, apple-mobile-web-app)
  - 터치 최적화 (tap-highlight, overscroll-behavior, safe-area)
  - Button flex 레이아웃, ActionBar 아이콘 전용 모바일 모드
  - GameScreen Leaderboard 순서 변경, 패딩 축소
  - GameHeader 보조 지표 모바일 숨김, OwnedAssetRow 2줄 래핑
  - HelpModal 모바일 단일 컬럼 토글
  - GoalSelectionModal 스크롤 대응
- [x] UI 정보 강화 + 버그 수정
  - 금액 분해 툴팁 (MoneyDisplay → BreakdownPopover)
  - 포트폴리오 소득 실제 계산값 표시 (기본소득→배율 반영)
  - 강화 시 소득 증가분 절대값 표시
  - 자산 다중 선그래프 (가치/소득/매입가)
  - 툴팁 모바일 스크롤 시 자동 닫기 + 배치 로직 통일

### 진행 중
(없음)

### 대기
(없음)

---

## Phase 2: AI 경쟁사 + 경제 리워크 ✅

> 핵심 원칙: 동일 엔티티(Company), 화폐 보존 법칙, 정보 비대칭
> 상세 설계: [docs/design/competitors.md](./docs/design/competitors.md)

### Proto-1: 엔진 기반 (Company + 시장 풀) ✅
- [x] Company 타입 통합 (Player → Company)
- [x] 시장 풀 기반 경제 모델 (화폐 보존)
- [x] 섹터별 점유율 수익 분배
- [x] 화폐 보존 assert 검증
- [x] 기존 1인 플레이 호환

### Proto-2: AI 경쟁사 ✅
- [x] CompetitorStrategy 인터페이스 + 4개 전략 구현
- [x] AI 의사결정 엔진 (ai.ts)
- [x] 한국형 기업명 12개 + 시드 기반 배정
- [x] 경쟁사 수 조절 상수 (기본 3)
- [x] 턴 처리에 경쟁사 행동 통합

### Proto-3: 상호작용 ✅
- [x] 섹터 수요 효과 (경쟁사 투자 → 가격 프리미엄)
- [x] 지배력 경쟁 (섹터당 1명 지배자)
- [x] 이벤트 파급 (경쟁사 선택 → 시장/섹터 영향)
- [x] 순위 효과 (1위 영향력 보너스, 꼴찌 역전 기회)

### Proto-4: 정보 비대칭 ✅
- [x] 공개 정보 / 비밀 정보 구분
- [x] 시장조사 확장 (competitor/strategy/share/government 타입)
- [x] 영향력 40+ 무료 조사 확장
- [x] 정부 정책 조사 구현 (인플레 트렌드, 예상 정책, 영향 섹터)

### Proto-5: UI ✅
- [x] Leaderboard 컴포넌트 (포트폴리오 좌측)
- [x] 경쟁사 상세 모달 (CompanyDetail) + 조사 결과 연동
- [x] GameScreen 레이아웃 변경 (현황판 + 포트폴리오)
- [x] Result 화면에 순위 변동 차트 (RankingChart 공유 컴포넌트)
- [x] 경쟁사 행동 알림 (buy/sell/upgrade 전체 + 아이콘/색상)
- [x] 특성(Trait) UI 표시 (TraitDisplay 공유 컴포넌트 + CompanyDetail 연동)
- [x] 에너지 섹터 자산 3개 추가 (주유소/발전소/에너지대기업)

### 테스트 인프라 ✅
- [x] Vitest 설정 + path alias
- [x] 경제 불변식 테스트 (화폐 보존, NaN/Infinity 검증)
- [x] 밸런스 테스트 (섹터 자산 검증, ROI 범위, 게임 궤적)

### 문서 + 밸런스 ✅
- [x] GDD 업데이트 (경쟁사 시스템 + 에너지 섹터 + 자산 가격/소득 동기화)
- [x] 밸런스 수치 튜닝 (금융 recession 완화, 에너지 티어 차별화, 영향력 점수 가중치 상향)

## 변경 이력
| 날짜 | 내용 |
|------|------|
| 2026-02-08 | 프로젝트 초기 설정 + 게임 엔진 구현 |
| 2026-02-09 | Zustand 스토어 구현 (gameStore, metaStore, uiStore) |
| 2026-02-09 | UI 컴포넌트 구현 (common/ 7개, game/ 9개) |
| 2026-02-09 | 자본가 컨셉 리디자인: 게임 엔진 전면 재작성 + GDD + 스토어/컴포넌트 업데이트 |
| 2026-02-10 | 화면 구현 (4개 스크린 + App.tsx 라우팅 + 게임 루프 통합) |
| 2026-02-11 | 프로젝트 문서화 보완 (README.md + docs/API.md) |
| 2026-02-11 | 게임 요소 상세 기획: GDD 코드 기준 수정 + docs/design/ 5개 문서 작성 |
| 2026-02-23 | Phase 2 기획: AI 경쟁사 시스템 + 화폐 보존 + 정보 비대칭 (docs/design/competitors.md) |
| 2026-02-23 | Proto-1~5 구현: Company 통합, 시장 풀, AI 4전략, 상호작용, 정보 비대칭, 현황판 UI |
| 2026-02-25 | 미완료 항목 전체 처리: 에너지 자산, 정부 조사, 경쟁사 알림, 순위 차트, 조사 연동, 특성 UI, 반응형 레이아웃, HelpModal 모바일, 테스트 인프라, 코드 정리 |
| 2026-02-25 | GDD 코드 동기화 + 밸런스 튜닝 (금융 recession 완화, 에너지 차별화, 영향력 점수 가중치 50) |
| 2026-02-25 | 밸런스 튜닝 + UI 정보 강화 (금액 분해 툴팁, 턴별 히스토리 차트, GDD 동기화) |
| 2026-02-25 | 포트폴리오 소득 버그 수정 + 강화 정보 개선 + 자산 다중 선그래프 + 툴팁 모바일 스크롤 수정 |
