import { Button, Card, StatRow, MoneyDisplay } from '@components/common'
import { useGameStore } from '@stores/gameStore'
import { useMetaStore } from '@stores/metaStore'
import { useUIStore } from '@stores/uiStore'

// 메인 메뉴 화면
export function MainMenuScreen() {
  const startRun = useGameStore((s) => s.startRun)
  const { currency, totalRunsPlayed, bestScore } = useMetaStore((s) => s.metaState)
  const navigateTo = useUIStore((s) => s.navigateTo)

  const handleNewGame = () => {
    startRun()
    navigateTo('game')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full px-4 flex flex-col gap-6 items-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-money-400">You Are Capitalist</h1>
          <p className="text-slate-400 mt-2">턴제 경영 로그라이트</p>
        </div>

        {/* 통계 카드 — 플레이 기록이 있을 때만 표시 */}
        {totalRunsPlayed > 0 && (
          <Card className="w-full">
            <StatRow label="최고 점수" value={bestScore.toLocaleString()} />
            <StatRow label="플레이 횟수" value={totalRunsPlayed} />
            <StatRow label="보유 화폐" value={<MoneyDisplay amount={currency} />} />
          </Card>
        )}

        <div className="w-full flex flex-col gap-3">
          <Button variant="primary" size="lg" fullWidth onClick={handleNewGame}>
            새 게임 시작
          </Button>
          <Button variant="secondary" size="lg" fullWidth onClick={() => navigateTo('metaShop')}>
            메타 상점
          </Button>
        </div>
      </div>
    </div>
  )
}
