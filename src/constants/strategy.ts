import type { StrategyId } from '@game/types'

/** AI 전략 표시 정보 */
export const STRATEGY_DISPLAY: Record<StrategyId, { name: string; icon: string; hint: string }> = {
  conservative: { name: '보수형', icon: '🏦', hint: '안정적인 분산 투자 행보' },
  aggressive: { name: '공격형', icon: '🚀', hint: '공격적인 고수익 추구 행보' },
  domination: { name: '지배형', icon: '🎯', hint: '특정 섹터 집중 투자 행보' },
  opportunist: { name: '기회형', icon: '🎲', hint: '트렌드 추종 매매 행보' },
}

/** 조사 결과 전략 표시명 */
export const STRATEGY_RESEARCH_NAMES: Record<StrategyId, string> = {
  conservative: '안정 추구형',
  aggressive: '공격 투자형',
  domination: '섹터 지배형',
  opportunist: '기회주의형',
}
