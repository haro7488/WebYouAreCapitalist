import type { MarketCondition } from '@game/index'

/** 시장 상태 한국어 라벨 */
export const MARKET_LABELS: Record<MarketCondition, string> = {
  boom: '호황',
  stable: '보합',
  recession: '불황',
}

/** 시장 상태 아이콘+라벨 */
export const MARKET_LABELS_WITH_ICON: Record<MarketCondition, string> = {
  boom: '📈 호황',
  stable: '➖ 보합',
  recession: '📉 불황',
}

/** 시장 상태 Tailwind 텍스트 색상 */
export const MARKET_COLORS: Record<MarketCondition, string> = {
  boom: 'text-emerald-400',
  stable: 'text-slate-300',
  recession: 'text-red-400',
}

/** 시장 상태 hex 색상 (차트용) */
export const MARKET_HEX_COLORS: Record<MarketCondition, string> = {
  boom: '#34d399',
  stable: '#94a3b8',
  recession: '#f87171',
}
