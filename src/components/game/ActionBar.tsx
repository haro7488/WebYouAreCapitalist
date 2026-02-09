import { Button } from '@components/common'
import { PlusCircle, MinusCircle, ArrowUpCircle, Search, SkipForward } from 'lucide-react'

interface ActionBarProps {
  onBuy: () => void
  onSell: () => void
  onUpgrade: () => void
  onResearch: () => void
  onEndTurn: () => void
  actionPoints: number
}

/** 하단 고정 액션 바: 매입 / 매각 / 업그레이드 / 시장조사 / 턴종료 */
export function ActionBar({ onBuy, onSell, onUpgrade, onResearch, onEndTurn, actionPoints }: ActionBarProps) {
  const hasAP = actionPoints > 0

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-3">
      <div className="flex gap-2">
        <Button variant="primary" className="flex-1" onClick={onBuy} disabled={!hasAP}>
          <PlusCircle size={16} />
          <span>매입</span>
        </Button>
        <Button variant="danger" className="flex-1" onClick={onSell} disabled={!hasAP}>
          <MinusCircle size={16} />
          <span>매각</span>
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onUpgrade} disabled={!hasAP}>
          <ArrowUpCircle size={16} />
          <span>강화</span>
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onResearch} disabled={!hasAP}>
          <Search size={16} />
          <span>조사</span>
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onEndTurn}>
          <SkipForward size={16} />
          <span>종료</span>
        </Button>
      </div>
    </div>
  )
}
