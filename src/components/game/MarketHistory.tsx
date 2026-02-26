import type { GameState, MarketCondition } from '@game/types'
import { GlossaryText } from '@components/glossary'
import { MiniLineChart } from '@components/common'

// 경기 색상
const CONDITION_COLORS: Record<MarketCondition, string> = {
  boom: '#34d399',    // emerald
  stable: '#94a3b8',  // slate
  recession: '#f87171', // red
}
const CONDITION_LABELS: Record<MarketCondition, string> = {
  boom: '호황',
  stable: '보합',
  recession: '불황',
}

/** 경기 타임라인 (턴별 색상 블록) */
function ConditionTimeline({ history, currentTurn }: { history: MarketCondition[]; currentTurn: number }) {
  if (history.length === 0) return <p className="text-xs text-slate-500">기록 없음</p>

  return (
    <div className="flex gap-0.5">
      {history.map((cond, i) => (
        <div
          key={i}
          className="flex-1 h-5 rounded-sm relative group"
          style={{ backgroundColor: CONDITION_COLORS[cond], minWidth: 6 }}
          title={`턴 ${i + 1}: ${CONDITION_LABELS[cond]}`}
        >
          {/* 호버 시 턴 번호 */}
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {i + 1}
          </span>
        </div>
      ))}
      {/* 현재 턴 표시 (아직 기록에 안 들어간 현재 턴) */}
      <div
        className="flex-1 h-5 rounded-sm border border-dashed border-slate-500"
        style={{ minWidth: 6 }}
        title={`턴 ${currentTurn} (현재)`}
      />
    </div>
  )
}

interface MarketHistoryProps {
  gameState: GameState
}

/** 시장 기록 패널 — 경기 변동, 인플레이션, 변동성 추이 */
export function MarketHistory({ gameState }: MarketHistoryProps) {
  const { inflationHistory, marketConditionHistory, volatilityHistory, turn } = gameState

  return (
    <div className="space-y-3 mt-3 pt-3 border-t border-slate-700">
      {/* 경기 변동 타임라인 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400 font-medium"><GlossaryText>경기 변동</GlossaryText></span>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: CONDITION_COLORS.boom }} />
              <GlossaryText>호황</GlossaryText>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: CONDITION_COLORS.stable }} />
              <GlossaryText>보합</GlossaryText>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: CONDITION_COLORS.recession }} />
              <GlossaryText>불황</GlossaryText>
            </span>
          </div>
        </div>
        <ConditionTimeline history={marketConditionHistory ?? []} currentTurn={turn} />
      </div>

      {/* 누적 인플레이션 추이 */}
      <div>
        <span className="text-xs text-slate-400 font-medium"><GlossaryText>누적 인플레이션</GlossaryText></span>
        <MiniLineChart
          data={inflationHistory ?? []}
          color="#fb923c"
          formatY={(v) => `x${v.toFixed(2)}`}
          showAreaFill
        />
      </div>

      {/* 변동성 추이 */}
      <div>
        <span className="text-xs text-slate-400 font-medium"><GlossaryText>변동성</GlossaryText></span>
        <MiniLineChart
          data={volatilityHistory ?? []}
          color="#60a5fa"
          formatY={(v) => `${(v * 100).toFixed(0)}%`}
          showAreaFill
        />
      </div>
    </div>
  )
}
