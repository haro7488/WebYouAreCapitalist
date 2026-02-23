import { useState } from 'react'
import { useGameStore } from '@stores/gameStore'
import { Card, MoneyDisplay } from '@components/common'
import { CompanyDetail } from './CompanyDetail'
import type { Company, Sector } from '@game/types'

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
  retail: '🛒',
  finance: '💰',
}

// 순위 변동 표시
function RankChange({ prev, current }: { prev: number; current: number }) {
  const diff = prev - current // 양수 = 순위 상승
  if (diff > 0) return <span className="text-money-400 text-xs ml-1">▲{diff}</span>
  if (diff < 0) return <span className="text-danger-400 text-xs ml-1">▼{Math.abs(diff)}</span>
  return <span className="text-slate-500 text-xs ml-1">─</span>
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

            return (
              <button
                key={company.id}
                onClick={() => setSelectedCompany(company)}
                className="w-full flex items-center gap-2 py-2 px-2 rounded hover:bg-slate-700/50 transition-colors text-left"
              >
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
              </button>
            )
          })}
        </div>

        {/* 시장 풀 */}
        <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between text-xs text-slate-400">
          <span>시장 풀</span>
          <MoneyDisplay amount={gameState.marketPool} size="sm" />
        </div>
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
