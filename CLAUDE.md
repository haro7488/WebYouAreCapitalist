# WebYouAreCapitalist

턴제 경영 로그라이트 웹게임. 모바일/PC 반응형.

## Tech Stack

React 19 · Vite 6 · TypeScript 5 (strict) · Zustand 5 · Tailwind CSS 3

## Commands

- `npm run dev` — 개발 서버
- `npm run build` — 타입체크 + 프로덕션 빌드
- `npm run lint` — ESLint

## Project Structure

```
src/
├── game/        # 순수 TS 게임 엔진 (React import 금지)
├── stores/      # Zustand 스토어
├── components/  # React 컴포넌트 (common/, game/)
├── screens/     # 화면 단위 컴포넌트
└── hooks/       # 커스텀 훅
```

## Path Aliases

`@/` → src/ · `@game/` → src/game/ · `@stores/` · `@components/` · `@screens/`

## Architecture Rules

- `src/game/`는 순수 TypeScript. React/DOM import 절대 금지
- 상태 업데이트는 불변 (spread operator)
- 시드 기반 결정적 RNG (Mulberry32) — `createRng(seed)` 사용
- 게임 엔진 public API는 `src/game/index.ts` barrel export로 노출
- 한국어 주석 사용

## Game Engine (src/game/)

- **engine.ts** — 턴 처리: planning → event → resolution → result
- **types.ts** — GameState, TurnAction, MetaState 등 모든 타입
- **constants.ts** — 밸런스 수치, 투자 6종, 메타 업그레이드 5종
- **economy.ts** — 수익/지출/점수 계산
- **events.ts** — 이벤트 12개 레지스트리, rollForEvent
- **market.ts** — 시장 상태 3종 (boom/stable/recession)
- **meta.ts** — 메타 업그레이드 구매/적용
- **run.ts** — startNewRun, endRun

## Current Status

- [x] 프로젝트 스캐폴딩
- [x] 게임 엔진 (src/game/)
- [ ] Zustand 스토어
- [ ] UI 컴포넌트/화면
- [ ] 게임 루프 통합
