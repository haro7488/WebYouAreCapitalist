/**
 * Mulberry32 - 시드 기반 결정적 PRNG
 * 동일한 시드 → 동일한 랜덤 시퀀스 (디버깅에 유용)
 */
export function createRng(seed: number) {
  let state = seed | 0

  function next(): number {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    /** 0-1 사이 float */
    random: () => next(),
    /** min(포함) ~ max(미포함) 사이 정수 */
    int: (min: number, max: number) => Math.floor(next() * (max - min)) + min,
    /** 배열에서 랜덤 요소 선택 */
    pick: <T>(arr: T[]): T => arr[Math.floor(next() * arr.length)],
    /** 현재 RNG 상태 (저장/복원용) */
    getState: () => state,
  }
}

export type Rng = ReturnType<typeof createRng>

/** 고유 런 ID 생성 */
export function generateRunId(): string {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

/** 랜덤 시드 생성 */
export function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647)
}

/** 숫자를 읽기 쉬운 형태로 포맷 (예: 1234 → "1,234") */
export function formatMoney(amount: number): string {
  return `$${Math.floor(amount).toLocaleString()}`
}

/** 값을 min~max 범위로 클램프 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
