import { useEffect } from 'react'
import { useGameStore } from '@stores/gameStore'
import { useUIStore } from '@stores/uiStore'
import { Card, StatRow, MoneyDisplay, Button } from '@components/common'
import { ASSETS, formatMoney } from '@game/index'
import type { OwnedAsset } from '@game/index'
import { Trophy, Wallet, TrendingUp, Clock, Coins, Star } from 'lucide-react'

// 섹터 한국어 라벨
const SECTOR_LABEL: Record<string, string> = {
  food: '외식',
  tech: '기술',
  realEstate: '부동산',
  retail: '유통',
  finance: '금융',
}

/** 자산 ID로 자산 이름을 조회 */
function getAssetName(assetId: string): string {
  return ASSETS.find((a) => a.id === assetId)?.name ?? assetId
}

/** 런 결과 화면 — 게임 종료 후 최종 성적 표시 */
export function RunResult() {
  const lastRunResult = useGameStore((s) => s.lastRunResult)
  const gameState = useGameStore((s) => s.gameState)
  const startRun = useGameStore((s) => s.startRun)
  const navigateTo = useUIStore((s) => s.navigateTo)

  // 결과가 없으면 메인 메뉴로 리다이렉트
  useEffect(() => {
    if (!lastRunResult) {
      navigateTo('mainMenu')
    }
  }, [lastRunResult, navigateTo])

  if (!lastRunResult) return null

  // 종료 사유 판별: gameState에서 직접 읽거나 결과에서 추론
  const reason =
    gameState?.gameOverReason === 'bankrupt'
      ? '파산'
      : lastRunResult.totalTurns >= 30
        ? '30턴 완주'
        : '게임 종료'

  // 다시 하기: 새 런 시작 후 게임 화면으로 이동
  const handleRestart = () => {
    startRun()
    navigateTo('game')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4">
      <div className="flex w-full max-w-md flex-col gap-4">
        {/* 헤더 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-100">게임 종료!</h1>
          <p className="mt-1 text-lg text-slate-400">{reason}</p>
        </div>

        {/* 최종 성적 카드 */}
        <Card header="최종 성적">
          <div className="flex flex-col gap-1">
            <StatRow
              label="최종 자금"
              value={<MoneyDisplay amount={lastRunResult.finalMoney} />}
              icon={Wallet}
            />
            <StatRow
              label="순자산"
              value={<MoneyDisplay amount={lastRunResult.netWorth} />}
              icon={TrendingUp}
            />
            <StatRow
              label="총 턴"
              value={<span className="text-slate-100">{lastRunResult.totalTurns}턴</span>}
              icon={Clock}
            />
            <StatRow
              label="최종 점수"
              value={<span className="font-semibold text-yellow-400">{formatMoney(lastRunResult.score)}</span>}
              icon={Trophy}
            />
            <StatRow
              label="획득 메타 화폐"
              value={<span className="font-semibold text-purple-400">{lastRunResult.metaCurrencyEarned}</span>}
              icon={Coins}
            />
            {/* 지배 섹터 (있을 때만 표시) */}
            {lastRunResult.dominatedSectors.length > 0 && (
              <StatRow
                label="지배 섹터"
                value={
                  <span className="text-amber-400">
                    {lastRunResult.dominatedSectors.map((s) => SECTOR_LABEL[s] ?? s).join(', ')}
                  </span>
                }
                icon={Star}
              />
            )}
          </div>
        </Card>

        {/* 최종 포트폴리오 */}
        {lastRunResult.ownedAssets.length > 0 && (
          <Card header="최종 포트폴리오">
            <ul className="flex flex-col gap-2">
              {lastRunResult.ownedAssets.map((asset: OwnedAsset, idx: number) => (
                <li
                  key={`${asset.assetId}-${idx}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-200">
                    {getAssetName(asset.assetId)}
                    {asset.upgradeLevel > 0 && (
                      <span className="ml-1 text-xs text-slate-400">Lv.{asset.upgradeLevel}</span>
                    )}
                  </span>
                  <MoneyDisplay amount={asset.currentValue} size="sm" />
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* 버튼 영역 */}
        <div className="flex flex-col gap-2 pt-2">
          <Button variant="primary" size="lg" fullWidth onClick={handleRestart}>
            다시 하기
          </Button>
          <Button variant="secondary" size="lg" fullWidth onClick={() => navigateTo('mainMenu')}>
            메인으로
          </Button>
        </div>
      </div>
    </div>
  )
}
