import type { ReactNode } from 'react'

type BadgeVariant = 'boom' | 'stable' | 'recession' | 'low' | 'medium' | 'high' | 'info'

interface BadgeProps {
  variant: BadgeVariant
  label: ReactNode
}

// 변형별 배지 색상
const variantStyles: Record<BadgeVariant, string> = {
  boom: 'bg-money-900 text-money-300',
  stable: 'bg-amber-900 text-amber-300',
  recession: 'bg-danger-900 text-danger-300',
  low: 'bg-money-900 text-money-300',
  medium: 'bg-amber-900 text-amber-300',
  high: 'bg-danger-900 text-danger-300',
  info: 'bg-slate-700 text-slate-300',
}

// 상태 표시용 배지 (시장 상태, 위험도 등)
export function Badge({ variant, label }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]}`}
    >
      {label}
    </span>
  )
}
