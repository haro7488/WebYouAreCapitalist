import { useState } from 'react'
import { useGameStore } from '@stores/gameStore'
import { Card, MoneyDisplay } from '@components/common'
import { CompanyDetail } from './CompanyDetail'
import { calculateCompanyTotalIncome } from '@game/index'
import type { Company, Sector, GameState } from '@game/types'
import { formatMoney } from '@game/index'

// 전략 아이콘 매핑
const STRATEGY_ICONS: Record<string, string> = {
  conservative: '🏦',
  aggressive: '🚀',
  domination: '🎯',
  opportunist: '🎲',
}

// 섹터 아이콘 매핑
const SECTOR_ICONS: Record<Sector, string> = {
  food: '🍔',
  tech: '💻',
  realEstate: '🏢',
  logistics: '🚛',
  energy: '⚡',
  information: '🔍',
  finance: '💰',
}

// 기업별 색상
const COMPANY_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899']

// 순위 변동 표시
function RankChange({ prev, current }: { prev: number; current: number }) {
  const diff = prev - current // 양수 = 순위 상승
  if (diff > 0) return <span className="text-money-400 text-xs ml-1">▲{diff}</span>
  if (diff < 0) return <span className="text-danger-400 text-xs ml-1">▼{Math.abs(diff)}</span>
  return <span className="text-slate-500 text-xs ml-1">─</span>
}

/** 기업 비교 막대그래프 */
function NetWorthBarChart({ sorted }: { sorted: { company: Company; isPlayer: boolean }[] }) {
  const maxNetWorth = Math.max(...sorted.map(s => s.company.netWorth), 1)

  return (
    <div className="mt-3 pt-3 border-t border-slate-700 space-y-1.5">
      <div className="text-xs text-slate-400 mb-2">📊 순자산 비교</div>
      {sorted.map(({ company, isPlayer }) => {
        const ratio = Math.max(0, company.netWorth / maxNetWorth)
        return (
          <div key={company.id} className="flex items-center gap-2">
            <span className={`text-xs w-16 truncate shrink-0 ${isPlayer ? 'text-blue-300 font-semibold' : 'text-slate-400'}`}>
              {company.name}
            </span>
            <div className="flex-1 h-4 bg-slate-700/50 rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all duration-500 ${isPlayer ? 'bg-blue-500' : 'bg-slate-500'}`}
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
            <span className={`text-xs w-16 text-right shrink-0 ${isPlayer ? 'text-blue-300' : 'text-slate-400'}`}>
              {formatMoney(company.netWorth)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** 순위 변동 SVG 선그래프 */
function RankingLineChart({ gameState }: { gameState: GameState }) {
  const { rankingHistory, companies } = gameState
  if (!rankingHistory || rankingHistory.length < 2) return null

  const totalTurns = rankingHistory.length
  const companyCount = companies.length

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
  const yScale = (rank: number) => padTop + ((rank - 1) / (companyCount - 1)) * chartH

  // 각 기업의 경로 생성
  const paths = companies.map((company, companyIdx) => {
    const points = rankingHistory
      .map((ranks, turnIdx) => `${xScale(turnIdx).toFixed(1)},${yScale(ranks[companyIdx]).toFixed(1)}`)
      .join(' ')
    const isPlayer = companyIdx === 0
    const color = COMPANY_COLORS[companyIdx % COMPANY_COLORS.length]

    return (
      <polyline
        key={company.id}
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
    <div className="mt-3 pt-3 border-t border-slate-700">
      <div className="text-xs text-slate-400 mb-2">📈 순위 변동</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 120 }}>
        {/* Y축 그리드 + 라벨 */}
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

        {/* X축 라벨 */}
        {xLabels.map(idx => (
          <text key={idx} x={xScale(idx)} y={height - 4} fill="#64748b" fontSize={8} textAnchor="middle">
            {idx + 1}
          </text>
        ))}

        {/* 선 그래프 */}
        {paths}
      </svg>

      {/* 범례 */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
        {companies.map((company, idx) => (
          <div key={company.id} className="flex items-center gap-1">
            <div
              className="w-2.5 h-1 rounded-full"
              style={{ backgroundColor: COMPANY_COLORS[idx % COMPANY_COLORS.length] }}
            />
            <span className={`text-[10px] ${idx === 0 ? 'text-blue-300 font-semibold' : 'text-slate-500'}`}>
              {company.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 기업 순위 현황판 */
export function Leaderboard() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)

  const gameState = useGameStore((s) => s.gameState)
  if (!gameState) return null

  const { companies, aiStrategies, turn } = gameState

  // 순자산 기준 정렬 (내림차순)
  const sorted = [...companies]
    .map((c, originalIdx) => ({ company: c, isPlayer: originalIdx === 0 }))
    .sort((a, b) => b.company.netWorth - a.company.netWorth)

  // 이전 턴 순위 추정: 현재 순위를 기반으로 변동 계산
  // revenue - expenses가 양수면 상승 중, 음수면 하락 중으로 근사
  const getRankTrend = (c: Company, currentRank: number): number => {
    if (turn <= 1) return currentRank // 첫 턴은 변동 없음
    const netChange = c.revenue - c.expenses
    if (netChange > 0) return currentRank + 1 // 이전 순위가 더 낮았을 것
    if (netChange < 0) return currentRank - 1
    return currentRank
  }

  return (
    <>
      <Card
        header={
          <div className="flex justify-between items-center">
            <span>📊 기업 순위</span>
            <span className="text-xs text-slate-400 font-normal">턴 {turn}/{gameState.maxTurns}</span>
          </div>
        }
        className="w-full"
      >
        <div className="space-y-1">
          {sorted.map(({ company, isPlayer }, idx) => {
            const rank = idx + 1
            const prevRank = getRankTrend(company, rank)
            const strategyId = aiStrategies[company.id]
            const strategyIcon = strategyId ? STRATEGY_ICONS[strategyId] : null
            const expectedIncome = calculateCompanyTotalIncome(company, gameState)

            return (
              <button
                key={company.id}
                onClick={() => setSelectedCompany(company)}
                className="w-full py-2 px-2 rounded hover:bg-slate-700/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  {/* 순위 */}
                  <span className="text-slate-500 text-sm w-5 text-right shrink-0">{rank}.</span>

                  {/* 전략 아이콘 또는 플레이어 표시 */}
                  <span className="w-5 text-center shrink-0">
                    {isPlayer ? '⭐' : (strategyIcon ?? '🏢')}
                  </span>

                  {/* 이름 + 지배 섹터 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className={`text-sm truncate ${isPlayer ? 'text-money-300 font-semibold' : 'text-slate-200'}`}>
                        {company.name}
                      </span>
                      {company.dominatedSectors.length > 0 && (
                        <span className="text-xs shrink-0">
                          {company.dominatedSectors.map(s => SECTOR_ICONS[s]).join('')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 순자산 + 변동 */}
                  <div className="flex items-center shrink-0">
                    <MoneyDisplay amount={company.netWorth} size="sm" />
                    <RankChange prev={prevRank} current={rank} />
                  </div>
                </div>

                {/* 예상 수익 */}
                <div className="ml-12 mt-0.5">
                  <span className="text-xs text-slate-500">
                    예상 수익: <span className={expectedIncome >= 0 ? 'text-money-400' : 'text-danger-400'}>+{formatMoney(Math.floor(expectedIncome))}/턴</span>
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* 시장 풀 */}
        <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between text-xs text-slate-400">
          <span>시장 풀</span>
          <MoneyDisplay amount={gameState.marketPool} size="sm" />
        </div>

        {/* 기업 비교 막대그래프 */}
        <NetWorthBarChart sorted={sorted} />

        {/* 순위 변동 선그래프 */}
        <RankingLineChart gameState={gameState} />
      </Card>

      {/* 경쟁사 상세 모달 */}
      {selectedCompany && (
        <CompanyDetail
          company={selectedCompany}
          isPlayer={selectedCompany.id === companies[0].id}
          rank={sorted.findIndex(s => s.company.id === selectedCompany.id) + 1}
          strategyId={aiStrategies[selectedCompany.id] ?? null}
          onClose={() => setSelectedCompany(null)}
        />
      )}
    </>
  )
}
