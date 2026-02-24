import type { BreakdownItem } from '@game/types'

export interface BreakdownChartProps {
  history?: number[]
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

export function BreakdownChart({ history, maxValue, items, final }: BreakdownChartProps) {
  const hasLine = (history?.length ?? 0) >= 2
  const hasStack = items.length > 1

  if (!hasLine && !hasStack) return null

  return (
    <div className="space-y-1">
      {hasLine && (
        <LineChart history={history!} maxValue={maxValue ?? 0} />
      )}
      {hasStack && (
        <StackBar items={items} final={final} maxValue={maxValue} />
      )}
    </div>
  )
}
