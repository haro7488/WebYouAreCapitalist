import { useState, useEffect } from 'react'
import { useGameStore } from '@stores/gameStore'
import { useUIStore } from '@stores/uiStore'
import {
  GameHeader,
  ActionBar,
  AssetMarket,
  Portfolio,
  EventCard,
  TurnResult,
} from '@components/game'

// 플래닝 탭 타입
type PlanningTab = 'default' | 'buy' | 'sell'

/** 기본 요약 뷰: 자금·영향력·AP 표시 */
function PlanningOverview({
  money,
  influence,
  actionPoints,
  maxActionPoints,
}: {
  money: number
  influence: number
  actionPoints: number
  maxActionPoints: number
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-100">턴 요약</h2>

      {/* 보유 자금 */}
      <div className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
        <span className="text-slate-400">보유 자금</span>
        <span className="text-xl font-bold text-emerald-400">
          ${money.toLocaleString()}
        </span>
      </div>

      {/* 영향력 */}
      <div className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
        <span className="text-slate-400">영향력</span>
        <span className="text-xl font-bold text-amber-400">
          {Math.floor(influence)}
        </span>
      </div>

      {/* 행동력 (AP) */}
      <div className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
        <span className="text-slate-400">행동력 (AP)</span>
        <span className="text-xl font-bold text-sky-400">
          {actionPoints} / {maxActionPoints}
        </span>
      </div>
    </div>
  )
}

/** 메인 게임 플레이 화면 — 페이즈별로 다른 콘텐츠 렌더링 */
export function GameScreen() {
  const gameState = useGameStore((s) => s.gameState)
  const submitAction = useGameStore((s) => s.submitAction)
  const resolvePhase = useGameStore((s) => s.resolvePhase)
  const advanceTurn = useGameStore((s) => s.advanceTurn)
  const isRunActive = useGameStore((s) => s.isRunActive)
  const navigateTo = useUIStore((s) => s.navigateTo)

  // 플래닝 탭 상태
  const [tab, setTab] = useState<PlanningTab>('default')

  // 게임 오버 감지: 런이 비활성화되면 결과 화면으로 이동
  useEffect(() => {
    if (!isRunActive && gameState === null) {
      navigateTo('runResult')
    }
  }, [isRunActive, gameState, navigateTo])

  // Resolution 페이즈 자동 처리: 경제 계산 후 턴 진행
  useEffect(() => {
    if (gameState?.phase === 'resolution') {
      resolvePhase()
      advanceTurn()
    }
  }, [gameState?.phase, resolvePhase, advanceTurn])

  // 페이즈가 바뀌면 탭 초기화
  useEffect(() => {
    setTab('default')
  }, [gameState?.phase])

  // 게임 상태가 없으면 렌더링하지 않음
  if (!gameState) return null

  const { phase, actionPoints, maxActionPoints, money, influence } = gameState

  // === 액션 제출 후 AP가 0이면 자동 턴 종료 ===
  const handleSubmitAction = (action: Parameters<typeof submitAction>[0]) => {
    submitAction(action)

    // submitAction 이후 AP 감소를 예측 (endTurn은 AP 소모 없음)
    if (action.type !== 'endTurn' && actionPoints <= 1) {
      submitAction({ type: 'endTurn' })
    }
  }

  // === Planning 페이즈 렌더링 ===
  if (phase === 'planning') {
    return (
      <div className="min-h-screen bg-slate-950 pb-20">
        <GameHeader />
        <div className="max-w-2xl mx-auto px-4 py-4">
          {tab === 'default' && (
            <PlanningOverview
              money={money}
              influence={influence}
              actionPoints={actionPoints}
              maxActionPoints={maxActionPoints}
            />
          )}
          {tab === 'buy' && <AssetMarket />}
          {tab === 'sell' && <Portfolio />}
        </div>
        <ActionBar
          onBuy={() => setTab('buy')}
          onSell={() => setTab('sell')}
          onUpgrade={() => setTab('sell')}
          onResearch={() => handleSubmitAction({ type: 'research', target: 'market' })}
          onEndTurn={() => handleSubmitAction({ type: 'endTurn' })}
          actionPoints={actionPoints}
        />
      </div>
    )
  }

  // === Event 페이즈 렌더링 ===
  if (phase === 'event') {
    return (
      <div className="min-h-screen bg-slate-950">
        <GameHeader />
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-center min-h-[60vh]">
          <EventCard />
        </div>
      </div>
    )
  }

  // === Resolution 페이즈: 자동 처리 중 메시지 ===
  if (phase === 'resolution') {
    return (
      <div className="min-h-screen bg-slate-950">
        <GameHeader />
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-center min-h-[60vh]">
          <p className="text-slate-400 text-lg animate-pulse">처리 중...</p>
        </div>
      </div>
    )
  }

  // === Result 페이즈 렌더링 ===
  if (phase === 'result') {
    return (
      <div className="min-h-screen bg-slate-950">
        <GameHeader />
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-center min-h-[60vh]">
          <TurnResult />
        </div>
      </div>
    )
  }

  return null
}
