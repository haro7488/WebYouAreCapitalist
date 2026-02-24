import type { BreakdownItem, HistorySeries } from '@game/types'
import { formatMoney } from '@game/utils'

export interface BreakdownChartProps {
  history?: number[]
  histories?: HistorySeries[]
  maxValue?: number
  items: BreakdownItem[]
  final: number
}

function getTrend(history: number[]): 'up' | 'down' | 'flat' {
  if (history.length < 2) return 'flat'
  const first = history[0]
  const last = history[history.length - 1]
  if (last > first) return 'up'
  if (last < first) return 'down'
  return 'flat'
}

function LineChart({ history, maxValue }: { history: number[]; maxValue: number }) {
  const W = 260
  const H = 48
  const PAD = 4

  const trend = getTrend(history)
  const strokeColor =
    trend === 'up' ? '#34d399' : trend === 'down' ? '#f87171' : '#94a3b8'

  const max = maxValue > 0 ? maxValue : Math.max(...history, 1)
  const min = Math.min(...history, 0)
  const range = max - min || 1

  const points = history.map((v, i) => {
    const x = PAD + (i / (history.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((v - min) / range) * (H - PAD * 2)
    return `${x},${y}`
  })

  const lastX = PAD + ((history.length - 1) / (history.length - 1)) * (W - PAD * 2)
  const lastV = history[history.length - 1]
  const lastY = H - PAD - ((lastV - min) / range) * (H - PAD * 2)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 48 }}
      preserveAspectRatio="none"
    >
      {/* 그리드 라인 25%, 50%, 75% */}
      {[0.25, 0.5, 0.75].map((pct) => {
        const y = H - PAD - pct * (H - PAD * 2)
        return (
          <line
            key={pct}
            x1={PAD}
            y1={y}
            x2={W - PAD}
            y2={y}
            stroke="#334155"
            strokeWidth="0.5"
          />
        )
      })}

      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* 마지막 점 */}
      <circle cx={lastX} cy={lastY} r="3" fill={strokeColor} />
    </svg>
  )
}

/** 다중 시리즈 선그래프 (자산 가치/소득/매입가 등) */
function MultiLineChart({ series }: { series: HistorySeries[] }) {
  const W = 260
  const H = 72
  const padLeft = 4
  const padRight = 4
  const padTop = 4
  const padBottom = 14 // 범례 공간

  const chartW = W - padLeft - padRight
  const chartH = H - padTop - padBottom

  // 모든 시리즈에서 전체 min/max 계산
  const allValues = series.flatMap((s) => s.data)
  const globalMax = Math.max(...allValues, 1)
  const globalMin = Math.min(...allValues, 0)
  const range = globalMax - globalMin || 1

  const xScale = (i: number, total: number) =>
    padLeft + (i / Math.max(total - 1, 1)) * chartW
  const yScale = (v: number) =>
    padTop + chartH - ((v - globalMin) / range) * chartH

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 72 }}>
        {/* 그리드 라인 */}
        {[0.25, 0.5, 0.75].map((pct) => {
          const y = padTop + chartH - pct * chartH
          return (
            <line
              key={pct}
              x1={padLeft} y1={y}
              x2={W - padRight} y2={y}
              stroke="#334155" strokeWidth="0.5"
            />
          )
        })}

        {/* 각 시리즈 렌더링 */}
        {series.map((s) => {
          if (s.data.length < 2) return null
          const points = s.data
            .map((v, i) => `${xScale(i, s.data.length).toFixed(1)},${yScale(v).toFixed(1)}`)
            .join(' ')
          const lastIdx = s.data.length - 1
          const lastX = xScale(lastIdx, s.data.length)
          const lastY = yScale(s.data[lastIdx])

          return (
            <g key={s.label}>
              <polyline
                points={points}
                fill="none"
                stroke={s.color}
                strokeWidth={s.dashed ? 1 : 1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={s.dashed ? '4 3' : undefined}
              />
              {!s.dashed && (
                <circle cx={lastX} cy={lastY} r="2.5" fill={s.color} />
              )}
            </g>
          )
        })}
      </svg>

      {/* 범례 + 현재 값 */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
        {series.map((s) => {
          const lastVal = s.data[s.data.length - 1]
          return (
            <div key={s.label} className="flex items-center gap-1">
              <div
                className="w-2.5 h-0.5 rounded-full"
                style={{
                  backgroundColor: s.color,
                  ...(s.dashed ? { backgroundImage: `repeating-linear-gradient(90deg, ${s.color} 0 3px, transparent 3px 6px)`, backgroundColor: 'transparent' } : {}),
                }}
              />
              <span className="text-[10px] text-slate-400">
                {s.label} <span style={{ color: s.color }}>{formatMoney(lastVal ?? 0)}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StackBar({ items, final, maxValue }: { items: BreakdownItem[]; final: number; maxValue?: number }) {
  const refMax = maxValue && maxValue > 0 ? maxValue : Math.abs(final) || 1

  // base 항목의 합
  const baseSum = items.filter((it) => it.type === 'base').reduce((s, it) => s + it.value, 0)

  type Segment = { color: string; width: number; key: string }
  const segments: Segment[] = []

  // base 회색
  if (baseSum > 0) {
    segments.push({ color: '#64748b', width: (baseSum / refMax) * 100, key: 'base' })
  }

  items.forEach((item, i) => {
    if (item.type === 'add') {
      const pct = (Math.abs(item.value) / refMax) * 100
      segments.push({
        color: item.value >= 0 ? '#34d399' : '#f87171',
        width: pct,
        key: `add-${i}`,
      })
    } else if (item.type === 'multiply') {
      // (value - 1) * 100 을 시각적 비율로: 전체 대비 5%씩 표시
      const pct = Math.min(Math.abs((item.value - 1) * 100) * 0.4, 20)
      segments.push({
        color: item.value >= 1 ? '#60a5fa' : '#fb923c',
        width: pct,
        key: `mul-${i}`,
      })
    }
  })

  const totalWidth = segments.reduce((s, seg) => s + seg.width, 0)
  const scale = totalWidth > 100 ? 100 / totalWidth : 1

  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-700">
      {segments.map((seg) => (
        <div
          key={seg.key}
          style={{ width: `${seg.width * scale}%`, backgroundColor: seg.color }}
        />
      ))}
    </div>
  )
}

export function BreakdownChart({ history, histories, maxValue, items, final }: BreakdownChartProps) {
  const hasMultiLine = (histories?.length ?? 0) > 0
  const hasLine = !hasMultiLine && (history?.length ?? 0) >= 2
  const hasStack = items.length > 1

  if (!hasMultiLine && !hasLine && !hasStack) return null

  return (
    <div className="space-y-1">
      {hasMultiLine && (
        <MultiLineChart series={histories!} />
      )}
      {hasLine && (
        <LineChart history={history!} maxValue={maxValue ?? 0} />
      )}
      {hasStack && (
        <StackBar items={items} final={final} maxValue={maxValue} />
      )}
    </div>
  )
}
