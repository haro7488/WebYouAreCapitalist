import { useState, useRef, useCallback } from 'react'
import { formatMoney } from '@game/index'
import type { MoneyBreakdown } from '@game/types'
import { BreakdownPopover } from './BreakdownPopover'

interface MoneyDisplayProps {
  amount: number
  size?: 'sm' | 'md' | 'lg'
  showSign?: boolean
  getBreakdown?: () => MoneyBreakdown
}

// 크기별 텍스트 스타일
const sizeStyles = {
  sm: 'text-sm font-semibold',
  md: 'text-base font-semibold',
  lg: 'text-lg font-semibold',
} as const

// 금액 표시 (양수=초록, 음수=빨강)
export function MoneyDisplay({
  amount,
  size = 'md',
  showSign = false,
  getBreakdown,
}: MoneyDisplayProps) {
  const colorClass = amount >= 0 ? 'text-money-400' : 'text-danger-400'
  const sign = showSign && amount > 0 ? '+' : ''
  const [breakdown, setBreakdown] = useState<MoneyBreakdown | null>(null)
  const ref = useRef<HTMLSpanElement>(null)

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!getBreakdown) return
      e.stopPropagation()
      setBreakdown((prev) => (prev ? null : getBreakdown()))
    },
    [getBreakdown],
  )

  return (
    <>
      <span
        ref={ref}
        className={`${sizeStyles[size]} ${colorClass}${getBreakdown ? ' cursor-pointer border-b border-dashed border-current/30' : ''}`}
        onClick={handleClick}
      >
        {sign}{formatMoney(amount)}
      </span>
      {breakdown && (
        <BreakdownPopover
          breakdown={breakdown}
          anchorEl={ref.current}
          onClose={() => setBreakdown(null)}
        />
      )}
    </>
  )
}
