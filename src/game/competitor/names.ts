// 한국형 기업명 풀 (시드 RNG로 매 런 랜덤 배정)
export const COMPANY_NAMES: string[] = [
  '한강투자',
  '청담캐피탈',
  '밀레니엄파트너스',
  '남산홀딩스',
  '종로에셋',
  '강남벤처스',
  '을지파이낸스',
  '세종인베스트',
  '광화문자산운용',
  '판교테크캐피탈',
  '여의도증권',
  '해운대캐피탈',
]

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
