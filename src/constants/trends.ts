import type { SectorTrend } from '@game/index'

/** 트렌드 한국어 라벨 */
export const TREND_LABELS: Record<SectorTrend, string> = {
  hot: '과열',
  neutral: '보통',
  cold: '침체',
}

/** 트렌드 → Badge variant 매핑 */
export const TREND_BADGE_VARIANT: Record<SectorTrend, 'boom' | 'stable' | 'recession'> = {
  hot: 'boom',
  neutral: 'stable',
  cold: 'recession',
}

/** 트렌드 Badge (variant + text 결합) */
export const TREND_BADGE: Record<SectorTrend, { variant: 'boom' | 'stable' | 'recession'; text: string }> = {
  hot: { variant: 'boom', text: '과열' },
  neutral: { variant: 'stable', text: '보통' },
  cold: { variant: 'recession', text: '침체' },
}

/** 트렌드 색상 */
export const TREND_COLORS: Record<SectorTrend, string> = {
  hot: 'text-red-400',
  neutral: 'text-slate-400',
  cold: 'text-blue-400',
}
