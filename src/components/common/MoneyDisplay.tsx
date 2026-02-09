import { formatMoney } from '@game/index'

interface MoneyDisplayProps {
  amount: number
  size?: 'sm' | 'md' | 'lg'
  showSign?: boolean
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
}: MoneyDisplayProps) {
  const colorClass = amount >= 0 ? 'text-money-400' : 'text-danger-400'
  const sign = showSign && amount > 0 ? '+' : ''

  return (
    <span className={`${sizeStyles[size]} ${colorClass}`}>
      {sign}{formatMoney(amount)}
    </span>
  )
}
