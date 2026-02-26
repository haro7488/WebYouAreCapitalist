import type { BreakdownItem } from '@game/types'
import { MiniLineChart } from './MiniLineChart'

export interface BreakdownChartProps {
  history?: number[]
  maxValue?: number
  items: BreakdownItem[]
  final: number
  formatY?: (v: number) => string
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

export function BreakdownChart({ history, maxValue, items, final, formatY }: BreakdownChartProps) {
  const hasLine = (history?.length ?? 0) >= 1
  const hasStack = items.length > 1

  if (!hasLine && !hasStack) return null

  return (
    <div className="space-y-1">
      {hasLine && (
        <MiniLineChart
          data={history!}
          color="#94a3b8"
          trendColor
          showAreaFill
          formatY={formatY}
        />
      )}
      {hasStack && (
        <StackBar items={items} final={final} maxValue={maxValue} />
      )}
    </div>
  )
}
