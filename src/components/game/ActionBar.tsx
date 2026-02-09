import { Button } from '@components/common'
import { PlusCircle, MinusCircle, SkipForward } from 'lucide-react'

interface ActionBarProps {
  onInvest: () => void
  onSell: () => void
  onSkip: () => void
}

/** 하단 고정 액션 바: 투자 / 매각 / 스킵 */
export function ActionBar({ onInvest, onSell, onSkip }: ActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-3">
      <div className="flex gap-3">
        <Button variant="primary" className="flex-1" onClick={onInvest}>
          <PlusCircle size={16} />
          <span>투자</span>
        </Button>
        <Button variant="danger" className="flex-1" onClick={onSell}>
          <MinusCircle size={16} />
          <span>매각</span>
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onSkip}>
          <SkipForward size={16} />
          <span>스킵</span>
        </Button>
      </div>
    </div>
  )
}
