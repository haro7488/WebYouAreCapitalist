# Task Completion Checklist

After completing any coding task, always:

1. **Run build**: `npm run build` — Verifies TypeScript types + Vite build
2. **Run lint**: `npm run lint` — Check for ESLint violations
3. **Verify no regressions**: Ensure existing functionality is not broken
4. **Check imports**: 
   - `src/game/` must NOT import from React/DOM
   - Use path aliases (`@game/`, `@stores/`, etc.)
5. **Korean comments**: Any new comments should be in Korean
6. **Immutable state**: All state updates use spread operator / immutable patterns
