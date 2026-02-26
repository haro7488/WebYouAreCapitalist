import { useState, useEffect } from 'react'
import { useGameStore } from '@stores/gameStore'
import { useUIStore } from '@stores/uiStore'
import { Card, StatRow, MoneyDisplay } from '@components/common'
import { GlossaryText } from '@components/glossary'
import { GameHeader, AssetMarket, Portfolio, EventCard, GovernmentCard, TurnResult, ActionBar, ResearchPanel, ResearchLab, Leaderboard, GoalSelectionModal, TraitRevealModal, MarketHistory } from '@components/game'
import { findTrait, calculateDominance, calculateCompanyNetIncome, SECTOR_MARKET_MULTIPLIER, getRevenueBreakdown, getExpenseBreakdown, getNetWorthBreakdown, getCashBreakdown, getAssetValueBreakdown, getNetIncomeBreakdown } from '@game/index'
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
  rnd: '연구개발',
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
  hot: '🔥 과열',
  neutral: '➖ 보통',
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

type PlanningView = 'summary' | 'market' | 'portfolio' | 'research' | 'lab'

/** 메인 게임 화면 — 페이즈에 따라 다른 콘텐츠 렌더링 */
export function GameScreen() {
  const [planningView, setPlanningView] = useState<PlanningView>('summary')
  const [traitsAcknowledged, setTraitsAcknowledged] = useState(false)
  const [showMarketHistory, setShowMarketHistory] = useState(false)
  const [labSector, setLabSector] = useState<Sector | undefined>(undefined)

  // 개별 셀렉터로 성능 최적화
  const gameState = useGameStore((s) => s.gameState)
  const isRunActive = useGameStore((s) => s.isRunActive)
  const lastRunResult = useGameStore((s) => s.lastRunResult)
  const submitAction = useGameStore((s) => s.submitAction)
  const resolvePhase = useGameStore((s) => s.resolvePhase)
  const processGovernmentPhase = useGameStore((s) => s.processGovernmentPhase)
  const selectGoal = useGameStore((s) => s.selectGoal)
  const navigateTo = useUIStore((s) => s.navigateTo)

  // 특성 공개 모달: turn 1 + planning + 특성 있음 + 아직 미확인
  const playerTraits = gameState
    ? gameState.companies[0].traits.map(id => findTrait(id)).filter((t): t is NonNullable<typeof t> => !!t)
    : []
  const showTraitReveal = gameState && gameState.turn === 1 && gameState.phase === 'planning'
    && !traitsAcknowledged && playerTraits.length > 0

  // 목표 선택 모달: 특성 확인 후에만 표시
  const showGoalSelection = gameState && !gameState.selectedGoal && gameState.turn === 1 && gameState.phase === 'planning'
    && (traitsAcknowledged || playerTraits.length === 0)

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

  // 페이즈 변경 시 planningView 초기화
  useEffect(() => {
    if (gameState?.phase !== 'planning') {
      setPlanningView('summary')
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
      {/* 모바일 p-3, 데스크탑 p-4 */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-4 pb-24">
        {/* Planning 페이즈 */}
        {phase === 'planning' && (
          <div className="flex gap-3 lg:gap-4 flex-col lg:flex-row">
            {/* 좌측: 기업 순위 현황판 (현황 탭에서만) — 모바일에서 메인 콘텐츠 아래 */}
            {planningView === 'summary' && (
              <div className="w-full lg:w-72 shrink-0 order-2 lg:order-1">
                <Leaderboard />
              </div>
            )}

            {/* 우측: 기존 콘텐츠 — 모바일에서 위로 */}
            <div className="flex-1 min-w-0 order-1 lg:order-2">
              {planningView === 'summary' && (
                <div className="space-y-4">
                  {/* 시장 상세 */}
                  <Card header={
                    <div className="flex items-center justify-between w-full">
                      <GlossaryText>시장 상황</GlossaryText>
                      <button
                        onClick={() => setShowMarketHistory(v => !v)}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                      >
                        {showMarketHistory ? '기록 접기' : '기록 보기'}
                      </button>
                    </div>
                  }>
                    <StatRow
                      label={<GlossaryText>경기</GlossaryText>}
                      value={<span className={MARKET_COLORS[gameState.market.condition]}><GlossaryText>{MARKET_LABELS[gameState.market.condition]}</GlossaryText></span>}
                    />
                    <StatRow label={<GlossaryText>남은 턴</GlossaryText>} value={`${gameState.market.turnsRemaining}턴`} />
                    <StatRow label={<GlossaryText>변동성</GlossaryText>} value={`${Math.round(gameState.market.volatility * 100)}%`} />
                    {showMarketHistory && <MarketHistory gameState={gameState} />}
                  </Card>

                  {/* 정부 정책 — 항시 표시 */}
                  <Card header={<GlossaryText>정부 정책</GlossaryText>}>
                    {gameState.governmentEvent ? (
                      <>
                        <StatRow label="현행 정책" value={<span className="text-amber-300">{gameState.governmentEvent.title}</span>} />
                        <p className="text-xs text-slate-400 mt-1 px-1">{gameState.governmentEvent.description}</p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-500 py-1">정책 없음 (다음 턴 발표)</p>
                    )}
                    <div className="mt-2 pt-2 border-t border-slate-700">
                      <StatRow
                        label={<GlossaryText>인플레이션</GlossaryText>}
                        value={<span className={gameState.inflation > 0.05 ? 'text-red-400' : 'text-slate-300'}>
                          {(gameState.inflation * 100).toFixed(1)}% (x{gameState.cumulativeInflation.toFixed(2)})
                        </span>}
                      />
                    </div>
                  </Card>

                  {/* 수익/지출 */}
                  {(() => {
                    const income = calculateCompanyNetIncome(player, gameState)
                    return (
                      <Card header={<GlossaryText>수익 구조</GlossaryText>}>
                        <StatRow label={<GlossaryText>총 수익</GlossaryText>} value={<MoneyDisplay amount={income.revenue} size="sm" showSign getBreakdown={() => getRevenueBreakdown(player, gameState)} />} />
                        <StatRow label={<GlossaryText>기본 지출</GlossaryText>} value={<MoneyDisplay amount={-income.expenses} size="sm" showSign getBreakdown={() => getExpenseBreakdown(player, gameState)} />} />
                        <StatRow label={<GlossaryText>순수익</GlossaryText>} value={<MoneyDisplay amount={income.net} size="sm" showSign getBreakdown={() => getNetIncomeBreakdown(player, gameState)} />} />
                      </Card>
                    )
                  })()}

                  {/* 자산 현황 */}
                  <Card header={<GlossaryText>자산 현황</GlossaryText>}>
                    <StatRow label={<GlossaryText>현금</GlossaryText>} value={<MoneyDisplay amount={money} getBreakdown={() => getCashBreakdown(player)} />} />
                    <StatRow label={<GlossaryText>보유 자산</GlossaryText>} value={`${ownedAssets.length}개`} />
                    <StatRow label={<GlossaryText>자산 가치</GlossaryText>} value={<MoneyDisplay amount={totalAssetValue} getBreakdown={() => getAssetValueBreakdown(player, ownedAssets)} />} />
                    <StatRow label={<GlossaryText>순자산</GlossaryText>} value={<MoneyDisplay amount={money + totalAssetValue} getBreakdown={() => getNetWorthBreakdown(player, gameState)} />} />
                  </Card>

                  {/* 섹터 트렌드 + 지배력 통합 */}
                  <Card header={<GlossaryText>섹터 현황</GlossaryText>}>
                    {(Object.keys(SECTOR_NAMES) as Sector[]).map((sector) => {
                      const info = dominanceMap[sector]
                      const isActive = info.count > 0
                      const sectorState = gameState.sectorStates[sector]
                      return (
                        <div key={sector} className="flex items-center justify-between py-1.5">
                          <span className="text-slate-300 font-medium text-sm"><GlossaryText>{SECTOR_NAMES[sector]}</GlossaryText></span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className={TREND_COLORS[sectorState.trend]}>
                              <GlossaryText>{TREND_LABELS[sectorState.trend]}</GlossaryText>
                              <span className="text-slate-500 ml-1">({sectorState.turnsRemaining}턴)</span>
                            </span>
                            <span className="flex items-center gap-1 text-xs">
                              <span className="text-emerald-400"><GlossaryText>호황</GlossaryText>x{SECTOR_MARKET_MULTIPLIER[sector].boom}</span>
                              <span className={
                                SECTOR_MARKET_MULTIPLIER[sector].recession < 0.5
                                  ? 'text-red-400'
                                  : SECTOR_MARKET_MULTIPLIER[sector].recession >= 0.8
                                    ? 'text-emerald-400'
                                    : 'text-orange-400'
                              }><GlossaryText>불황</GlossaryText>x{SECTOR_MARKET_MULTIPLIER[sector].recession}</span>
                            </span>
                            <span className={`min-w-[3rem] text-right ${isActive ? DOMINANCE_COLORS[info.level] : 'text-slate-600'}`}>
                              <GlossaryText>{isActive ? DOMINANCE_LABELS[info.level] : '미진출'}</GlossaryText>
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </Card>

                  {/* 활성 효과 */}
                  {activeEffects.length > 0 && (
                    <Card header={<GlossaryText>활성 효과</GlossaryText>}>
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
              {planningView === 'portfolio' && (
                <Portfolio onResearchNavigate={(sector) => {
                  setLabSector(sector)
                  setPlanningView('lab')
                }} />
              )}
              {planningView === 'research' && (
                <ResearchPanel
                  onResearch={(target, sector) => submitAction({ type: 'research', target, sector })}
                />
              )}
              {planningView === 'lab' && (
                <ResearchLab
                  selectedSector={labSector}
                  onSectorSelect={setLabSector}
                />
              )}
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
            activeView={planningView}
            onMarket={() => setPlanningView('market')}
            onPortfolio={() => setPlanningView('portfolio')}
            onSummary={() => setPlanningView('summary')}
            onResearch={() => setPlanningView('research')}
            onLab={() => { setLabSector(undefined); setPlanningView('lab') }}
            onEndTurn={() => submitAction({ type: 'endTurn' })}
          />
        </>
      )}

      {/* 특성 공개 모달 */}
      {showTraitReveal && (
        <TraitRevealModal
          traits={playerTraits}
          onConfirm={() => setTraitsAcknowledged(true)}
        />
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
