# Progress

## Phase 1: MVP

### 완료
- [x] 프로젝트 스캐폴딩 (Vite + React + TS + Tailwind)
- [x] 코어 게임 엔진 (src/game/) — **자본가 컨셉으로 전면 리디자인**
  - types: 5섹터, Asset/OwnedAsset, AP 시스템, 영향력, 지배력 타입
  - constants: 15개 자산(5섹터x3티어), 섹터 트렌드, 지배력 보너스, 7개 메타 업그레이드
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
  - game/ 9개: MarketIndicator, GameHeader, AssetCard, AssetMarket, OwnedInvestmentRow, Portfolio, EventCard, TurnResult, ActionBar

- [x] 화면 구현 (MainMenu, Game, RunResult, MetaShop)
  - MainMenuScreen: 타이틀 + 통계 카드 + 새 게임/메타 상점 버튼
  - GameScreen: Phase별 렌더링 (planning→event→resolution→result), ActionBar 연결
  - RunResultScreen: 최종 결과 + 포트폴리오 + 재시작/메인 버튼
  - MetaShopScreen: 7개 업그레이드 카드 그리드, 구매 로직
  - App.tsx: UIStore currentScreen 기반 화면 라우팅 + Modal
- [x] 게임 루프 통합
  - GameScreen useEffect: resolution 자동 전환, 게임 오버 감지, phase별 뷰 초기화

- [x] 프로젝트 문서화 (README.md, docs/API.md)
  - README.md: 개발자 온보딩 + 프로젝트 개요 + 아키텍처 + 개발 가이드
  - docs/API.md: 게임 엔진 공개 API 레퍼런스 (타입/상수/함수 전체)
- [x] 게임 요소 상세 기획 (GDD 수정 + docs/design/ 5개 문서)
  - GDD.md: 코드 기준 10개 불일치 수정 (영향력 티어, 업그레이드 배율, 이벤트 효과, 메타 수치 등)
  - docs/design/assets.md: 자산 시스템 상세 (섹터 정체성, 15개 자산 프로필, ROI, 업그레이드/매각)
  - docs/design/market.md: 시장 시스템 상세 (이중 변동, 글로벌 사이클, 섹터 트렌드)
  - docs/design/events.md: 이벤트 시스템 상세 (12개 이벤트 카드, 발생 메커니즘, 전략)
  - docs/design/progression.md: 진행 시스템 상세 (영향력, 지배력, 점수, 메타)
  - docs/design/balance.md: 밸런스 분석 (ROI 비교, 손익분기, 궤적 시뮬레이션, 5개 이슈)

### 진행 중
(없음)

### 대기
- [ ] 반응형 레이아웃 최적화

---

## Phase 2: AI 경쟁사 + 경제 리워크

> 핵심 원칙: 동일 엔티티(Company), 화폐 보존 법칙, 정보 비대칭
> 상세 설계: [docs/design/competitors.md](./docs/design/competitors.md)

### Proto-1: 엔진 기반 (Company + 시장 풀)
- [ ] Company 타입 통합 (Player → Company)
- [ ] 시장 풀 기반 경제 모델 (화폐 보존)
- [ ] 섹터별 점유율 수익 분배
- [ ] 화폐 보존 assert 검증
- [ ] 기존 테스트: 1인 플레이가 동일하게 동작하는지 확인

### Proto-2: AI 경쟁사
- [ ] CompetitorStrategy 인터페이스 + 4개 전략 구현
- [ ] AI 의사결정 엔진 (ai.ts)
- [ ] 한국형 기업명 풀 + 시드 기반 배정
- [ ] 경쟁사 수 조절 상수 (기본 3)
- [ ] 턴 처리에 경쟁사 행동 통합 (시드 셔플 순서)

### Proto-3: 상호작용
- [ ] 섹터 수요 효과 (경쟁사 투자 → 가격 변동)
- [ ] 지배력 경쟁 (섹터당 1명 지배자)
- [ ] 이벤트 파급 (경쟁사 선택 → 시장 영향)
- [ ] 순위 효과 (1위 보너스, 꼴찌 역전 기회)

### Proto-4: 정보 비대칭
- [ ] 공개 정보 / 비밀 정보 구분
- [ ] 시장조사 확장 (경쟁사 포트폴리오, 전략, 점유율 조사)
- [ ] 영향력 40+ 무료 조사 확장

### Proto-5: UI
- [ ] Leaderboard 컴포넌트 (포트폴리오 좌측)
- [ ] 경쟁사 상세 모달 (CompanyDetail)
- [ ] GameScreen 레이아웃 변경 (현황판 + 포트폴리오)
- [ ] Result 화면에 순위 변동 표시
- [ ] 경쟁사 행동 알림

### 대기
- [ ] 반응형 레이아웃 최적화 (Phase 1 잔여)
- [ ] 밸런스 테스트 및 수치 조정
- [ ] GDD 업데이트 (경쟁사 시스템 반영)

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
