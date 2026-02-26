import type { DominanceLevel } from '@game/index'

/** 지배력 레벨 한국어 라벨 */
export const DOMINANCE_LABELS: Record<DominanceLevel, string> = {
  entrant: '진입',
  competitor: '경쟁자',
  dominant: '지배',
}

/** 지배력 레벨 Tailwind 색상 */
export const DOMINANCE_COLORS: Record<DominanceLevel, string> = {
  entrant: 'text-slate-400',
  competitor: 'text-amber-400',
  dominant: 'text-money-400',
}

/** 지배력 표시 (텍스트 + 색상 결합) */
export const DOMINANCE_DISPLAY: Record<DominanceLevel, { text: string; color: string }> = {
  entrant: { text: '진입', color: 'text-slate-500' },
  competitor: { text: '경쟁자', color: 'text-amber-400' },
  dominant: { text: '지배', color: 'text-money-400' },
}
