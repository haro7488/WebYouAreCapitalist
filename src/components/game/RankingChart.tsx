// 순위 변동 선그래프 (재사용 가능한 독립 컴포넌트)
// Leaderboard와 RunResultScreen에서 공용으로 사용

// 기업별 색상 (Leaderboard와 동일)
export const COMPANY_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899']

interface RankingChartProps {
  /** 턴별 기업 순위 배열 (각 요소 = 해당 턴의 전체 기업 순위) */
  rankingHistory: number[][]
  /** 기업명 배열 (rankingHistory 인덱스에 대응) */
  companyNames: string[]
  /** 플레이어 기업 인덱스 (기본값 0) */
  playerIndex?: number
}

/** 순위 변동 SVG 선그래프 */
export function RankingChart({ rankingHistory, companyNames, playerIndex = 0 }: RankingChartProps) {
  // 데이터가 2턴 미만이면 의미 없으므로 렌더링 안 함
  if (!rankingHistory || rankingHistory.length < 2) return null

  const totalTurns = rankingHistory.length
  const companyCount = companyNames.length

  // SVG 치수
  const width = 280
  const height = 120
  const padLeft = 24
  const padRight = 8
  const padTop = 16
  const padBottom = 20
  const chartW = width - padLeft - padRight
  const chartH = height - padTop - padBottom

  // X축: 턴 인덱스 → 좌표, Y축: 순위(1~N) → 좌표 (1위가 위)
  const xScale = (turnIdx: number) => padLeft + (turnIdx / (totalTurns - 1)) * chartW
  const yScale = (rank: number) => padTop + ((rank - 1) / Math.max(companyCount - 1, 1)) * chartH

  // 각 기업의 폴리라인 경로 생성
  const paths = companyNames.map((name, companyIdx) => {
    const points = rankingHistory
      .map((ranks, turnIdx) => `${xScale(turnIdx).toFixed(1)},${yScale(ranks[companyIdx]).toFixed(1)}`)
      .join(' ')
    const isPlayer = companyIdx === playerIndex
    const color = COMPANY_COLORS[companyIdx % COMPANY_COLORS.length]

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

  return (
    <>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 120 }}>
        {/* Y축 그리드 + 순위 라벨 */}
        {Array.from({ length: companyCount }, (_, i) => i + 1).map(rank => (
          <g key={rank}>
            <line
              x1={padLeft} y1={yScale(rank)}
              x2={width - padRight} y2={yScale(rank)}
              stroke="#334155" strokeWidth={0.5}
            />
            <text x={padLeft - 4} y={yScale(rank) + 3} fill="#64748b" fontSize={8} textAnchor="end">
              {rank}위
            </text>
          </g>
        ))}

        {/* X축 턴 번호 라벨 */}
        {xLabels.map(idx => (
          <text key={idx} x={xScale(idx)} y={height - 4} fill="#64748b" fontSize={8} textAnchor="middle">
            {idx + 1}
          </text>
        ))}

        {/* 기업별 순위 선 */}
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
