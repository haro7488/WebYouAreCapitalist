import { Button } from '@components/common'
import { LayoutDashboard, Briefcase, Store, Search, FlaskConical, SkipForward } from 'lucide-react'
import { useGameStore } from '@stores/gameStore'
import { INFORMATION_SECTOR, RND_SECTOR } from '@game/index'

type ViewType = 'summary' | 'market' | 'portfolio' | 'research' | 'lab'

interface ActionBarProps {
  activeView?: ViewType
  onMarket: () => void
  onPortfolio: () => void
  onSummary: () => void
  onResearch: () => void
  onLab: () => void
  onEndTurn: () => void
}

/** 하단 고정 액션 바: 현황 / 포트폴리오 / 시장 / 조사 / 연구 / 다음턴 */
export function ActionBar({ activeView = 'summary', onSummary, onPortfolio, onMarket, onResearch, onLab, onEndTurn }: ActionBarProps) {
  const gameState = useGameStore((s) => s.gameState)

  // 정보 자산 개수 계산 (assetId가 곧 Sector)
  const infoAssetCount = gameState?.companies[0].assets.filter(
    (ownedAsset) => ownedAsset.assetId === INFORMATION_SECTOR
  ).length ?? 0

  // 이번 턴 조사 횟수
  const researchCount = gameState?.companies[0].actionsThisTurn.filter(
    (action) => action.type === 'research'
  ).length ?? 0

  // 남은 조사 횟수
  const remainingResearch = Math.max(0, infoAssetCount - researchCount)
  const hasInfoAssets = infoAssetCount > 0

  // 연구포인트
  const researchPoints = gameState?.companies[0].researchPoints ?? 0
  const hasRndAssets = (gameState?.companies[0].assets.filter(
    (a) => a.assetId === RND_SECTOR
  ).length ?? 0) > 0

  return (
    // safe-area 하단 여백 대응 + 모바일 패딩 축소
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-2 sm:p-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:pb-3">
      <div className="flex gap-2">
        {/* 좌측: 탭 5개 */}
        <div className="flex gap-2 flex-1">
          <Button variant={activeView === 'summary' ? 'primary' : 'secondary'} className="flex-1" onClick={onSummary}>
            <LayoutDashboard size={16} />
            {/* 모바일에서 아이콘만, sm 이상에서 텍스트 노출 */}
            <span className="hidden sm:inline">현황</span>
          </Button>
          <Button variant={activeView === 'portfolio' ? 'primary' : 'secondary'} className="flex-1" onClick={onPortfolio}>
            <Briefcase size={16} />
            <span className="hidden sm:inline">포트폴리오</span>
          </Button>
          <Button variant={activeView === 'market' ? 'primary' : 'secondary'} className="flex-1" onClick={onMarket}>
            <Store size={16} />
            <span className="hidden sm:inline">시장</span>
          </Button>
          <Button variant={activeView === 'research' ? 'primary' : 'secondary'} className="flex-1 relative" onClick={onResearch}>
            <Search size={16} />
            <span className="hidden sm:inline">조사</span>
            {hasInfoAssets && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-blue-500 text-white rounded-full px-1">
                {remainingResearch}
              </span>
            )}
          </Button>
          <Button variant={activeView === 'lab' ? 'primary' : 'secondary'} className="flex-1 relative" onClick={onLab}>
            <FlaskConical size={16} />
            <span className="hidden sm:inline">연구</span>
            {hasRndAssets && researchPoints > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-purple-500 text-white rounded-full px-1">
                {researchPoints}
              </span>
            )}
          </Button>
        </div>

        {/* 구분선 */}
        <div className="w-px bg-slate-700 self-stretch" />

        {/* 우측: 다음 턴 액션 */}
        <Button variant="secondary" className="px-4" onClick={onEndTurn}>
          <SkipForward size={16} />
          <span className="hidden sm:inline">다음 턴</span>
        </Button>
      </div>
    </div>
  )
}
