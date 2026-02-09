import { useGameStore } from '@stores/gameStore'
import { useMetaStore } from '@stores/metaStore'
import { useUIStore } from '@stores/uiStore'
import { Button, MoneyDisplay } from '@components/common'
import { formatMoney } from '@game/index'

/** 메인 메뉴 화면 — 새 게임 시작, 메타 상점 진입, 누적 통계 표시 */
export function MainMenu() {
  const startRun = useGameStore((s) => s.startRun)
  const navigateTo = useUIStore((s) => s.navigateTo)
  const { bestScore, totalRunsPlayed, currency } = useMetaStore(
    (s) => s.metaState,
  )

  // 새 게임 시작: 런 초기화 후 게임 화면으로 이동
  const handleNewGame = () => {
    startRun()
    navigateTo('game')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        {/* 타이틀 */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-100">
            WebYouAreCapitalist
          </h1>
          <p className="mt-2 text-lg text-slate-400">턴제 경영 로그라이트</p>
        </div>

        {/* 메뉴 버튼 */}
        <div className="flex w-full flex-col gap-3">
          <Button variant="primary" size="lg" fullWidth onClick={handleNewGame}>
            새 게임 시작
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => navigateTo('metaShop')}
          >
            메타 상점
          </Button>
        </div>

        {/* 누적 통계 */}
        <div className="flex w-full flex-col gap-2 rounded-lg bg-slate-800 p-4 text-sm text-slate-300">
          <div className="flex justify-between">
            <span>최고 기록</span>
            <span className="text-slate-100">{formatMoney(bestScore)}</span>
          </div>
          <div className="flex justify-between">
            <span>총 플레이</span>
            <span className="text-slate-100">{totalRunsPlayed}회</span>
          </div>
          <div className="flex justify-between">
            <span>메타 화폐</span>
            <MoneyDisplay amount={currency} size="sm" />
          </div>
        </div>
      </div>
    </div>
  )
}
