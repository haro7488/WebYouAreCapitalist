import { useId } from 'react'

export interface MiniLineChartProps {
  data: number[]
  color: string                     // 선/영역 색상
  formatY?: (v: number) => string   // Y축 포맷
  showAreaFill?: boolean            // 그라디언트 영역 (기본: true)
  trendColor?: boolean              // 자동 추세 색상 (기본: false)
  height?: number                   // 높이 (기본: 56)
}

const TREND_COLORS = { up: '#34d399', down: '#f87171', flat: '#94a3b8' }

function getTrend(data: number[]): 'up' | 'down' | 'flat' {
  if (data.length < 2) return 'flat'
  const last = data[data.length - 1]
  const first = data[0]
  if (last > first) return 'up'
  if (last < first) return 'down'
  return 'flat'
}

/** 통합 미니 라인차트 — 영역 채움 + Y축 라벨 */
export function MiniLineChart({
  data,
  color,
  formatY = (v) => v.toFixed(2),
  showAreaFill = true,
  trendColor = false,
  height = 56,
}: MiniLineChartProps) {
  const uid = useId()
  const gradId = `area-grad-${uid}`

  if (data.length < 1) return null

  const W = 280
  const H = height
  const LABEL_W = 32
  const PAD_TOP = 6
  const PAD_BOTTOM = 6
  const PAD_RIGHT = 8

  const chartX0 = LABEL_W
  const chartX1 = W - PAD_RIGHT
  const chartY0 = PAD_TOP
  const chartY1 = H - PAD_BOTTOM
  const chartH = chartY1 - chartY0

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const strokeColor = trendColor ? TREND_COLORS[getTrend(data)] : color

  const xScale = (i: number) => chartX0 + (data.length > 1 ? (i / (data.length - 1)) * (chartX1 - chartX0) : (chartX1 - chartX0) / 2)
  const yScale = (v: number) => chartY0 + (1 - (v - min) / range) * chartH

  // 데이터 1개: 점만 표시
  if (data.length === 1) {
    const cx = xScale(0)
    const cy = H / 2
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
        <circle cx={cx} cy={cy} r="3" fill={strokeColor} />
        <text x={LABEL_W - 2} y={cy + 3} fill="#64748b" fontSize={7} textAnchor="end">{formatY(data[0])}</text>
      </svg>
    )
  }

  // 좌표 계산
  const pts = data.map((v, i) => ({ x: xScale(i), y: yScale(v) }))
  const polyPoints = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // 영역 채움 경로
  const areaPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    + ` L ${pts[pts.length - 1].x.toFixed(1)},${chartY1} L ${pts[0].x.toFixed(1)},${chartY1} Z`

  const last = pts[pts.length - 1]
  const lastVal = data[data.length - 1]

  // Y축 그리드 값: min / mid / max
  const gridValues = [min, (min + max) / 2, max]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y축 그리드 + 라벨 */}
      {gridValues.map((val, i) => (
        <g key={i}>
          <line x1={chartX0} y1={yScale(val)} x2={chartX1} y2={yScale(val)} stroke="#334155" strokeWidth={0.5} />
          <text x={LABEL_W - 2} y={yScale(val) + 3} fill="#64748b" fontSize={7} textAnchor="end">{formatY(val)}</text>
        </g>
      ))}

      {/* 영역 채움 */}
      {showAreaFill && (
        <path d={areaPath} fill={`url(#${gradId})`} />
      )}

      {/* 데이터 선 */}
      <polyline
        points={polyPoints}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 마지막 점 */}
      <circle cx={last.x} cy={last.y} r="3" fill={strokeColor} />

      {/* 마지막 값 텍스트 (차트 우측에 여유 있으면 오른쪽, 없으면 왼쪽) */}
      <text
        x={last.x + 5}
        y={last.y + 3}
        fill={strokeColor}
        fontSize={7}
        fontWeight="bold"
        textAnchor="start"
      >
        {formatY(lastVal)}
      </text>
    </svg>
  )
}
