// 한국형 기업명 풀 → data/names.json + schema/names.schema.ts
export { COMPANY_NAMES } from '../schema/names.schema'
import { COMPANY_NAMES } from '../schema/names.schema'

/** 시드 RNG로 이름 풀에서 중복 없이 count개 배정 (Fisher-Yates 셔플) */
export function assignCompanyNames(
  count: number,
  rng: () => number,
): string[] {
  const pool = [...COMPANY_NAMES]

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return pool.slice(0, count)
}
