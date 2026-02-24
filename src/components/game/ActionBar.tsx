import { Button } from '@components/common'
import { GlossaryText } from '@components/glossary'
import { LayoutDashboard, Briefcase, Store, Search, SkipForward } from 'lucide-react'
import { useGameStore } from '@stores/gameStore'
import { ASSETS } from '@game/constants'
import type { OwnedAsset } from '@game/types'

interface ActionBarProps {
  onMarket: () => void
  onPortfolio: () => void
  onSummary: () => void
  onResearch: () => void
  onEndTurn: () => void
}

/** 하단 고정 액션 바: 현황 / 포트폴리오 / 시장 / 조사 / 다음턴 */
export function ActionBar({ onSummary, onPortfolio, onMarket, onResearch, onEndTurn }: ActionBarProps) {
  const gameState = useGameStore((s) => s.gameState)

  // 정보 자산 개수 계산
  const infoAssetCount = gameState?.companies[0].assets.filter(
    (ownedAsset: OwnedAsset) => {
      const assetData = ASSETS.find(a => a.id === ownedAsset.assetId)
      return assetData?.sector === 'information'
    }
  ).length ?? 0

  // 이번 턴 조사 횟수
  const researchCount = gameState?.companies[0].actionsThisTurn.filter(
    (action) => action.type === 'research'
  ).length ?? 0

  // 남은 조사 횟수
  const remainingResearch = Math.max(0, infoAssetCount - researchCount)
  const hasInfoAssets = infoAssetCount > 0

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-3">
      <div className="flex gap-2">
        <Button variant="primary" className="flex-1" onClick={onSummary}>
          <LayoutDashboard size={16} />
          <GlossaryText>현황</GlossaryText>
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onPortfolio}>
          <Briefcase size={16} />
          <GlossaryText>포트폴리오</GlossaryText>
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onMarket}>
          <Store size={16} />
          <GlossaryText>시장</GlossaryText>
        </Button>
        <Button variant="secondary" className="flex-1 relative" onClick={onResearch}>
          <Search size={16} />
          <GlossaryText>조사</GlossaryText>
          {hasInfoAssets && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-blue-500 text-white rounded-full px-1">
              {remainingResearch}
            </span>
          )}
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onEndTurn}>
          <SkipForward size={16} />
          <GlossaryText>다음턴</GlossaryText>
        </Button>
      </div>
    </div>
  )
}
