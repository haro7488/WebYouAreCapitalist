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

### 진행 중
(없음)

### 대기
- [ ] 화면 구현 (MainMenu, Game, RunResult, MetaShop)
- [ ] 게임 루프 통합
- [ ] 반응형 레이아웃

## 변경 이력
| 날짜 | 내용 |
|------|------|
| 2026-02-08 | 프로젝트 초기 설정 + 게임 엔진 구현 |
| 2026-02-09 | Zustand 스토어 구현 (gameStore, metaStore, uiStore) |
| 2026-02-09 | UI 컴포넌트 구현 (common/ 7개, game/ 9개) |
| 2026-02-09 | 자본가 컨셉 리디자인: 게임 엔진 전면 재작성 + GDD + 스토어/컴포넌트 업데이트 |
