import { useState, useEffect } from 'react'
import { useGameStore } from '@stores/gameStore'
import { useUIStore } from '@stores/uiStore'
import { Card, StatRow, MoneyDisplay } from '@components/common'
import { GameHeader, AssetMarket, Portfolio, EventCard, TurnResult, ActionBar, ResearchPanel, Leaderboard } from '@components/game'
import { calculateDominance, getInfluenceTier } from '@game/index'
import type { Sector, DominanceLevel } from '@game/index'

// 섹터 한국어 이름
const SECTOR_NAMES: Record<Sector, string> = {
  food: '식품',
  tech: '테크',
  realEstate: '부동산',
  retail: '유통',
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
  const navigateTo = useUIStore((s) => s.navigateTo)

  // Resolution 페이즈 자동 전환
  useEffect(() => {
    if (gameState?.phase === 'resolution') {
      const timer = setTimeout(() => resolvePhase(), 300)
      return () => clearTimeout(timer)
    }
  }, [gameState?.phase, resolvePhase])

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
  const { assets: ownedAssets, cash: money, activeEffects, ap: actionPoints, influence } = player

  // planning 페이즈: 요약 대시보드용 계산
  const totalAssetValue = ownedAssets.reduce((sum, a) => sum + a.currentValue, 0)
  const dominanceMap = calculateDominance(ownedAssets)
  const isFreeResearch = getInfluenceTier(influence).freeResearch

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      {/* 상단 헤더 (sticky) */}
      <GameHeader onHome={() => navigateTo('mainMenu')} />

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {/* Planning 페이즈 */}
        {phase === 'planning' && (
          <div className="flex gap-4 flex-col lg:flex-row">
            {/* 좌측: 기업 순위 현황판 */}
            <div className="w-full lg:w-72 shrink-0">
              <Leaderboard />
            </div>

            {/* 우측: 기존 콘텐츠 */}
            <div className="flex-1 min-w-0">
              {planningView === 'summary' && (
                <div className="space-y-4">
                  {/* 자산 현황 */}
                  <Card header="자산 현황">
                    <StatRow label="보유 자산" value={`${ownedAssets.length}개`} />
                    <StatRow label="자산 가치" value={<MoneyDisplay amount={totalAssetValue} />} />
                    <StatRow label="순자산" value={<MoneyDisplay amount={money + totalAssetValue} />} />
                  </Card>

                  {/* 섹터 지배력 */}
                  <Card header="섹터 지배력">
                    {(Object.keys(SECTOR_NAMES) as Sector[]).map((sector) => {
                      const info = dominanceMap[sector]
                      const isActive = info.count > 0
                      return (
                        <div key={sector} className="flex justify-between items-center py-1">
                          <span className="text-slate-400">{SECTOR_NAMES[sector]}</span>
                          <span className={isActive ? DOMINANCE_COLORS[info.level] : 'text-slate-600'}>
                            {isActive ? DOMINANCE_LABELS[info.level] : '미진출'}
                          </span>
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
            <div className="w-full lg:w-72 shrink-0">
              <Leaderboard />
            </div>
            <div className="flex-1 min-w-0">
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
            actionPoints={actionPoints}
            isFreeResearch={isFreeResearch}
          />

          {showResearchPanel && (
            <ResearchPanel
              researchResult={player.researchResult}
              onResearch={(target, sector) => submitAction({ type: 'research', target, sector })}
              onClose={() => setShowResearchPanel(false)}
              actionPoints={actionPoints}
              isFreeResearch={isFreeResearch}
            />
          )}
        </>
      )}
    </div>
  )
}
