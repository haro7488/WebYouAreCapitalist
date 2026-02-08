# WebYouAreCapitalist

턴제 경영 로그라이트 웹게임. 모바일/PC 반응형.

## Tech Stack

React 19 · Vite 6 · TypeScript 5 (strict) · Zustand 5 · Tailwind CSS 3

## Commands

- `npm run dev` — 개발 서버
- `npm run build` — 타입체크 + 프로덕션 빌드 (작업 완료 후 반드시 실행)
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
- 게임 엔진은 `@game` import로만 접근 (barrel export: `src/game/index.ts`)
- 한국어 주석 사용
- 작업 워크플로우: [agent_docs/workflow.md](./agent_docs/workflow.md)
- ⚠️ CLAUDE.md 수정 전: [agent_docs/claude-md-rules.md](./agent_docs/claude-md-rules.md) 필독

## File Ownership (팀 작업 시)

| 영역 | 경로 | 독립성 |
|------|------|--------|
| 게임 로직 | `src/game/` | 독립 — React 의존성 없음 |
| 상태 관리 | `src/stores/` | game/ 의존 — types.ts 인터페이스 사용 |
| UI | `src/components/`, `src/screens/` | stores/ 의존 |
| 공유 타입 | `src/game/types.ts` | ⚠️ 수정 시 전체 영향 |

동일 파일을 여러 팀원이 편집하지 않는다. 공유 인터페이스 변경이 필요하면 팀 리더와 먼저 조율한다.

## Git Commit Rules

- 커밋 메시지는 한국어로 작성
- Co-Authored-By 트레일러 사용 금지

## Game Engine (src/game/)

턴 처리: planning → event → resolution → result
핵심 모듈: types, constants, utils, economy, engine, events, market, meta, run
→ 상세: `src/game/index.ts`의 barrel export 참조

## Current Status

→ [PROGRESS.md](./PROGRESS.md) 참조
