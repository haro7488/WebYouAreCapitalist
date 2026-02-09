import type { MarketCondition } from '@game/index'
import { TrendingUp, Minus, TrendingDown } from 'lucide-react'
import { Badge } from '@components/common'

// 시장 상태별 아이콘 및 라벨 매핑
const MARKET_CONFIG: Record<MarketCondition, { icon: typeof TrendingUp; label: string }> = {
  boom: { icon: TrendingUp, label: '호황' },
  stable: { icon: Minus, label: '보합' },
  recession: { icon: TrendingDown, label: '불황' },
}

interface MarketIndicatorProps {
  condition: MarketCondition
}

/** 현재 시장 상태를 아이콘 + 배지로 표시 */
export function MarketIndicator({ condition }: MarketIndicatorProps) {
  const { icon: Icon, label } = MARKET_CONFIG[condition]

  return (
    <div className="flex items-center gap-1.5">
      <Icon size={16} />
      <Badge variant={condition} label={label} />
    </div>
  )
}
