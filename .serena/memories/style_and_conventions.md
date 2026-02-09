# Code Style & Conventions

## TypeScript
- Strict mode enabled (`strict: true`)
- `noUnusedLocals`, `noUnusedParameters` enforced
- Target: ES2020
- Module: ESNext with bundler resolution
- `verbatimModuleSyntax: true` — use `import type` for type-only imports

## Architecture Rules
- `src/game/` is **pure TypeScript** — NO React or DOM imports allowed
- State updates use immutable patterns (spread operator)
- Seeded deterministic RNG via Mulberry32 (`createRng(seed)`)
- Game engine accessed only via `@game` barrel export (`src/game/index.ts`)
- Comments in **Korean**

## Naming
- TypeScript interfaces/types: PascalCase (e.g., `GameState`, `TurnAction`)
- Functions/variables: camelCase
- File names: camelCase for modules (e.g., `gameStore.ts`)
- Constants: UPPER_SNAKE_CASE for top-level constants

## File Organization
- Game logic: `src/game/` (independent, no React)
- State management: `src/stores/` (depends on game/ types)
- UI: `src/components/`, `src/screens/` (depends on stores/)
- Shared types in `src/game/types.ts` — changes affect entire project

## Git
- Commit messages in **Korean**
- No `Co-Authored-By` trailer
- Team work: do not edit same file as another teammate simultaneously

## ESLint
- Based on `@eslint/js` recommended + `typescript-eslint` recommended
- React hooks plugin enforced
- React refresh plugin (warn for non-component exports)
