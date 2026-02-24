import { useState, useEffect } from 'react'
import { useGameStore } from '@stores/gameStore'
import { useUIStore } from '@stores/uiStore'
import { Card, StatRow, MoneyDisplay } from '@components/common'
import { GameHeader, AssetMarket, Portfolio, EventCard, GovernmentCard, TurnResult, ActionBar, ResearchPanel, Leaderboard, GoalSelectionModal } from '@components/game'
import { calculateDominance, calculateCompanyNetIncome } from '@game/index'
import { formatMoney } from '@game/utils'
import type { Sector, SectorTrend, DominanceLevel } from '@game/index'
import GOALS_DATA from '@game/data/goals.json'

// 섹터 한국어 이름
const SECTOR_NAMES: Record<Sector, string> = {
  food: '외식',
  tech: '기술',
  realEstate: '부동산',
  logistics: '물류',
  energy: '에너지',
  information: '정보',
  finance: '금융',
}

// 지배력 레벨 한국어 표시
const DOMINANCE_LABELS: Record<DominanceLevel, string> = {
  entrant: '진입',
  competitor: '경쟁자',
  dominant: '지배',
}

// 지배력 레벨별 색상
const DOMINANCE_COLORS: Record<DominanceLevel, string> = {
  entrant: 'text-slate-400',
  competitor: 'text-amber-400',
  dominant: 'text-money-400',
}

// 섹터 트렌드
const TREND_LABELS: Record<SectorTrend, string> = {
  hot: '🔥 뜨거움',
  neutral: '➖ 중립',
  cold: '❄️ 침체',
}
const TREND_COLORS: Record<SectorTrend, string> = {
  hot: 'text-red-400',
  neutral: 'text-slate-400',
  cold: 'text-blue-400',
}

// 시장 상태
const MARKET_LABELS = { boom: '📈 호황', stable: '➖ 보합', recession: '📉 불황' }
const MARKET_COLORS = { boom: 'text-emerald-400', stable: 'text-slate-300', recession: 'text-red-400' }

type PlanningView = 'summary' | 'market' | 'portfolio'

/** 메인 게임 화면 — 페이즈에 따라 다른 콘텐츠 렌더링 */
export function GameScreen() {
  const [planningView, setPlanningView] = useState<PlanningView>('summary')
  const [showResearchPanel, setShowResearchPanel] = useState(false)

  // 개별 셀렉터로 성능 최적화
  const gameState = useGameStore((s) => s.gameState)
  const isRunActive = useGameStore((s) => s.isRunActive)
  const lastRunResult = useGameStore((s) => s.lastRunResult)
  const submitAction = useGameStore((s) => s.submitAction)
  const resolvePhase = useGameStore((s) => s.resolvePhase)
  const processGovernmentPhase = useGameStore((s) => s.processGovernmentPhase)
  const selectGoal = useGameStore((s) => s.selectGoal)
  const navigateTo = useUIStore((s) => s.navigateTo)

  // 목표 선택 모달 표시 여부
  const showGoalSelection = gameState && !gameState.selectedGoal && gameState.turn === 1 && gameState.phase === 'planning'

  // Resolution 페이즈 자동 전환
  useEffect(() => {
    if (gameState?.phase === 'resolution') {
      const timer = setTimeout(() => resolvePhase(), 300)
      return () => clearTimeout(timer)
    }
  }, [gameState?.phase, resolvePhase])

  // Government 페이즈 자동 전환
  useEffect(() => {
    if (gameState?.phase === 'government' && !gameState.governmentEvent) {
      const timer = setTimeout(() => processGovernmentPhase(), 300)
      return () => clearTimeout(timer)
    }
  }, [gameState?.phase, gameState?.governmentEvent, processGovernmentPhase])

  // 게임 오버 감지 → 결과 화면 전환
  useEffect(() => {
    if (!isRunActive && lastRunResult) {
      navigateTo('runResult')
    }
  }, [isRunActive, lastRunResult, navigateTo])

  // 페이즈 변경 시 planningView, researchPanel 초기화
  useEffect(() => {
    if (gameState?.phase !== 'planning') {
      setPlanningView('summary')
      setShowResearchPanel(false)
    }
  }, [gameState?.phase])

  if (!gameState) return null

  const { phase } = gameState
  const player = gameState.companies[0]
  const { assets: ownedAssets, cash: money, activeEffects } = player

  // planning 페이즈: 요약 대시보드용 계산
  const totalAssetValue = ownedAssets.reduce((sum, a) => sum + a.currentValue, 0)
  const dominanceMap = calculateDominance(ownedAssets)

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      {/* 상단 헤더 (sticky) */}
      <GameHeader onHome={() => navigateTo('mainMenu')} />

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {/* Planning 페이즈 */}
        {phase === 'planning' && (
          <div className="flex gap-4 flex-col lg:flex-row">
            {/* 좌측: 기업 순위 현황판 (현황 탭에서만) */}
            {planningView === 'summary' && (
              <div className="w-full lg:w-72 shrink-0">
                <Leaderboard />
              </div>
            )}

            {/* 우측: 기존 콘텐츠 */}
            <div className="flex-1 min-w-0">
              {planningView === 'summary' && (
                <div className="space-y-4">
                  {/* 시장 상세 */}
                  <Card header="시장 상황">
                    <StatRow
                      label="경기"
                      value={<span className={MARKET_COLORS[gameState.market.condition]}>{MARKET_LABELS[gameState.market.condition]}</span>}
                    />
                    <StatRow label="남은 턴" value={`${gameState.market.turnsRemaining}턴`} />
                    <StatRow label="변동성" value={`${Math.round(gameState.market.volatility * 100)}%`} />
                  </Card>

                  {/* 수익/지출 */}
                  {(() => {
                    const income = calculateCompanyNetIncome(player, gameState)
                    return (
                      <Card header="수익 구조">
                        <StatRow label="총 수익" value={<span className="text-emerald-400">+{formatMoney(income.revenue)}</span>} />
                        <StatRow label="기본 지출" value={<span className="text-red-400">-{formatMoney(income.expenses)}</span>} />
                        <StatRow label="순수익" value={
                          <span className={income.net >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {income.net >= 0 ? '+' : ''}{formatMoney(income.net)}/턴
                          </span>
                        } />
                      </Card>
                    )
                  })()}

                  {/* 자산 현황 */}
                  <Card header="자산 현황">
                    <StatRow label="현금" value={<MoneyDisplay amount={money} />} />
                    <StatRow label="보유 자산" value={`${ownedAssets.length}개`} />
                    <StatRow label="자산 가치" value={<MoneyDisplay amount={totalAssetValue} />} />
                    <StatRow label="순자산" value={<MoneyDisplay amount={money + totalAssetValue} />} />
                  </Card>

                  {/* 섹터 트렌드 + 지배력 통합 */}
                  <Card header="섹터 현황">
                    {(Object.keys(SECTOR_NAMES) as Sector[]).map((sector) => {
                      const info = dominanceMap[sector]
                      const isActive = info.count > 0
                      const sectorState = gameState.sectorStates[sector]
                      return (
                        <div key={sector} className="flex items-center justify-between py-1.5">
                          <span className="text-slate-300 font-medium text-sm">{SECTOR_NAMES[sector]}</span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className={TREND_COLORS[sectorState.trend]}>
                              {TREND_LABELS[sectorState.trend]}
                              <span className="text-slate-500 ml-1">({sectorState.turnsRemaining}턴)</span>
                            </span>
                            <span className={`min-w-[3rem] text-right ${isActive ? DOMINANCE_COLORS[info.level] : 'text-slate-600'}`}>
                              {isActive ? DOMINANCE_LABELS[info.level] : '미진출'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </Card>

                  {/* 활성 효과 */}
                  {activeEffects.length > 0 && (
                    <Card header="활성 효과">
                      {activeEffects.map((effect, i) => (
                        <div key={i} className="py-1 text-sm text-slate-300">
                          {effect.money != null && effect.money !== 0 && (
                            <span>금액 효과: {effect.money > 0 ? '+' : ''}{effect.money}</span>
                          )}
                          {effect.revenueMultiplier != null && effect.revenueMultiplier !== 1 && (
                            <span>수익 배율: x{effect.revenueMultiplier}</span>
                          )}
                          {effect.expenseMultiplier != null && effect.expenseMultiplier !== 1 && (
                            <span>지출 배율: x{effect.expenseMultiplier}</span>
                          )}
                          {effect.influence != null && effect.influence !== 0 && (
                            <span>영향력: {effect.influence > 0 ? '+' : ''}{effect.influence}</span>
                          )}
                        </div>
                      ))}
                    </Card>
                  )}
                </div>
              )}

              {planningView === 'market' && <AssetMarket />}
              {planningView === 'portfolio' && <Portfolio />}
            </div>
          </div>
        )}

        {/* Government 페이즈 */}
        {phase === 'government' && <GovernmentCard />}

        {/* Event 페이즈 */}
        {phase === 'event' && <EventCard />}

        {/* Resolution 페이즈 */}
        {phase === 'resolution' && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-8 h-8 border-2 border-slate-500 border-t-slate-200 rounded-full animate-spin" />
            <span className="text-slate-400">처리 중...</span>
          </div>
        )}

        {/* Result 페이즈 */}
        {phase === 'result' && (
          <div className="flex gap-4 flex-col lg:flex-row">
            <div className="w-full lg:w-72 shrink-0 order-2 lg:order-1">
              <Leaderboard />
            </div>
            <div className="flex-1 min-w-0 order-1 lg:order-2">
              <TurnResult />
            </div>
          </div>
        )}
      </main>

      {/* Planning 페이즈에서만 액션바 표시 */}
      {phase === 'planning' && (
        <>
          <ActionBar
            onMarket={() => setPlanningView('market')}
            onPortfolio={() => setPlanningView('portfolio')}
            onSummary={() => setPlanningView('summary')}
            onResearch={() => setShowResearchPanel(true)}
            onEndTurn={() => submitAction({ type: 'endTurn' })}
          />

          {showResearchPanel && (
            <ResearchPanel
              researchResult={player.researchResult}
              onResearch={(target, sector) => submitAction({ type: 'research', target, sector })}
              onClose={() => setShowResearchPanel(false)}
            />
          )}
        </>
      )}

      {/* 목표 선택 모달 */}
      {showGoalSelection && (
        <GoalSelectionModal
          goals={GOALS_DATA}
          onSelect={selectGoal}
        />
      )}
    </div>
  )
}
