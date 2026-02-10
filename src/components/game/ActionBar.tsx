import { Button } from '@components/common'
import { LayoutDashboard, Briefcase, Store, Search, SkipForward } from 'lucide-react'

interface ActionBarProps {
  onMarket: () => void
  onPortfolio: () => void
  onSummary: () => void
  onResearch: () => void
  onEndTurn: () => void
  actionPoints: number
  isFreeResearch?: boolean
}

/** 하단 고정 액션 바: 현황 / 포트폴리오 / 시장 / 조사 / 다음턴 */
export function ActionBar({ onSummary, onPortfolio, onMarket, onResearch, onEndTurn, actionPoints, isFreeResearch = false }: ActionBarProps) {
  const hasAP = actionPoints > 0
  const canResearch = hasAP || isFreeResearch

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-3">
      <div className="flex gap-2">
        <Button variant="primary" className="flex-1" onClick={onSummary}>
          <LayoutDashboard size={16} />
          <span>현황</span>
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onPortfolio}>
          <Briefcase size={16} />
          <span>포트폴리오</span>
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onMarket}>
          <Store size={16} />
          <span>시장</span>
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onResearch} disabled={!canResearch}>
          <Search size={16} />
          <span>{isFreeResearch && !hasAP ? '무료' : '조사'}</span>
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onEndTurn}>
          <SkipForward size={16} />
          <span>다음턴</span>
        </Button>
      </div>
    </div>
  )
}
