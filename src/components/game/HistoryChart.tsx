// 범용 턴별 히스토리 선그래프 (순자산·수익 등)
// RankingChart와 동일한 순수 SVG 패턴, COMPANY_COLORS 재사용
import { COMPANY_COLORS } from './RankingChart'

interface HistoryChartProps {
  /** histories[companyIdx][turnIdx] = 값 */
  histories: number[][]
  /** 기업명 배열 (histories 인덱스에 대응) */
  companyNames: string[]
  /** 플레이어 기업 인덱스 (기본값 0) */
  playerIndex?: number
  /** Y축 값 포맷 함수 */
  formatValue?: (v: number) => string
}

/** 금액 축약 포맷 ($1k, $10k, $1.5M) */
function abbr(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`
  return `${sign}$${abs.toFixed(0)}`
}

/** 턴별 히스토리 SVG 선그래프 */
export function HistoryChart({ histories, companyNames, playerIndex = 0, formatValue = abbr }: HistoryChartProps) {
  // 데이터가 없으면 렌더링 안 함
  if (!histories || histories.length === 0 || (histories[0]?.length ?? 0) < 1) return null

  const totalTurns = histories[0].length

  // Y축 범위 계산
  const allValues = histories.flat()
  const minVal = Math.min(...allValues)
  const maxVal = Math.max(...allValues)
  const range = maxVal - minVal || 1

  // SVG 치수 (RankingChart와 동일)
  const width = 280
  const height = 120
  const padLeft = 36  // Y축 라벨 공간 확보
  const padRight = 8
  const padTop = 8
  const padBottom = 20
  const chartW = width - padLeft - padRight
  const chartH = height - padTop - padBottom

  // X축: 턴 인덱스 → 좌표, Y축: 값 높을수록 위
  const xScale = (turnIdx: number) => padLeft + (turnIdx / Math.max(totalTurns - 1, 1)) * chartW
  const yScale = (value: number) => padTop + (1 - (value - minVal) / range) * chartH

  // 기업별 폴리라인/점 생성
  const paths = companyNames.map((name, companyIdx) => {
    const hist = histories[companyIdx]
    if (!hist || hist.length < 1) return null
    const isPlayer = companyIdx === playerIndex
    const color = COMPANY_COLORS[companyIdx % COMPANY_COLORS.length]

    // 데이터 1개: 점으로 표시
    if (hist.length === 1) {
      return (
        <circle
          key={name}
          cx={xScale(0)}
          cy={yScale(hist[0])}
          r={isPlayer ? 3 : 2}
          fill={color}
          opacity={isPlayer ? 1 : 0.6}
        />
      )
    }

    const points = hist
      .map((v, turnIdx) => `${xScale(turnIdx).toFixed(1)},${yScale(v).toFixed(1)}`)
      .join(' ')

    return (
      <polyline
        key={name}
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={isPlayer ? 2.5 : 1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={isPlayer ? 1 : 0.6}
      />
    )
  })

  // X축 라벨 (최대 5개 표시)
  const xLabels: number[] = []
  const step = Math.max(1, Math.floor((totalTurns - 1) / 4))
  for (let i = 0; i < totalTurns; i += step) xLabels.push(i)
  if (xLabels[xLabels.length - 1] !== totalTurns - 1) xLabels.push(totalTurns - 1)

  // Y축 그리드: min / mid / max 3단계
  const yGridValues = [minVal, (minVal + maxVal) / 2, maxVal]

  return (
    <>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 120 }}>
        {/* Y축 그리드 + 라벨 */}
        {yGridValues.map((val, i) => (
          <g key={i}>
            <line
              x1={padLeft} y1={yScale(val)}
              x2={width - padRight} y2={yScale(val)}
              stroke="#334155" strokeWidth={0.5}
            />
            <text x={padLeft - 4} y={yScale(val) + 3} fill="#64748b" fontSize={7} textAnchor="end">
              {formatValue(val)}
            </text>
          </g>
        ))}

        {/* X축 턴 번호 라벨 */}
        {xLabels.map(idx => (
          <text key={idx} x={xScale(idx)} y={height - 4} fill="#64748b" fontSize={8} textAnchor="middle">
            {idx + 1}
          </text>
        ))}

        {/* 기업별 히스토리 선 */}
        {paths}
      </svg>

      {/* 범례 */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
        {companyNames.map((name, idx) => (
          <div key={name} className="flex items-center gap-1">
            <div
              className="w-2.5 h-1 rounded-full"
              style={{ backgroundColor: COMPANY_COLORS[idx % COMPANY_COLORS.length] }}
            />
            <span className={`text-[10px] ${idx === playerIndex ? 'text-blue-300 font-semibold' : 'text-slate-500'}`}>
              {name}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
