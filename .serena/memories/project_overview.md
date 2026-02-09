# WebYouAreCapitalist - Project Overview

## Purpose
Turn-based business management roguelite web game. Mobile/PC responsive.
Korean language project (comments, commit messages in Korean).

## Tech Stack
- **Frontend**: React 19 + TypeScript 5 (strict mode)
- **Build**: Vite 6 (base: `/WebYouAreCapitalist/`)
- **State**: Zustand 5
- **Styling**: Tailwind CSS 3
- **Icons**: lucide-react
- **Deployment**: GitHub Pages via GitHub Actions

## Project Structure
```
src/
├── game/          # Pure TS game engine (NO React/DOM imports)
│   ├── types.ts       # All interfaces (GameState, TurnAction, MetaState, etc.)
│   ├── constants.ts   # Balance values, investments, meta upgrades
│   ├── utils.ts       # Seeded RNG (Mulberry32), formatMoney, clamp
│   ├── economy.ts     # calculateNetIncome, calculateScore
│   ├── engine.ts      # Turn phases: planning → event → resolution → result
│   ├── events.ts      # 12 events, rollForEvent
│   ├── market.ts      # Market states (boom/stable/recession)
│   ├── meta.ts        # Meta upgrades, purchaseUpgrade
│   ├── run.ts         # startNewRun, endRun
│   └── index.ts       # Barrel exports
├── stores/        # Zustand stores (gameStore, metaStore, uiStore)
├── components/    # React components (common/, game/) — pending
├── screens/       # Screen components — pending
└── hooks/         # Custom hooks — pending
```

## Path Aliases
- `@/` → src/
- `@game/` → src/game/
- `@stores/` → src/stores/
- `@components/` → src/components/
- `@screens/` → src/screens/

## Current Status (Phase 1 MVP)
- ✅ Project scaffolding, core game engine, Zustand stores
- ⏳ UI components, screens, game loop integration, responsive layout
