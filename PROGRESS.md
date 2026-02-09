# Progress

## Phase 1: MVP

### 완료
- [x] 프로젝트 스캐폴딩 (Vite + React + TS + Tailwind)
- [x] 코어 게임 엔진 (src/game/)
  - types, constants, utils, economy, engine, events, market, meta, run
- [x] CLAUDE.md 프로젝트 문서
- [x] Zustand 스토어 (useGameStore, useMetaStore, useUIStore)
- [x] UI 컴포넌트 (common/, game/)
  - common/ 7개: Button, Card, Badge, ProgressBar, MoneyDisplay, StatRow, Modal
  - game/ 9개: MarketIndicator, GameHeader, InvestmentCard, InvestmentList, OwnedInvestmentRow, Portfolio, EventCard, TurnResult, ActionBar

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
