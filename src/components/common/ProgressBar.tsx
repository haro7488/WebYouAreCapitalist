interface ProgressBarProps {
  value: number
  max: number
  color?: 'money' | 'danger' | 'default'
  showLabel?: boolean
}

// 프로그레스 바 색상
const colorStyles = {
  money: 'bg-money-500',
  danger: 'bg-danger-500',
  default: 'bg-slate-400',
} as const

// 진행률 표시 바
export function ProgressBar({
  value,
  max,
  color = 'default',
  showLabel = false,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0

  return (
    <div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorStyles[color]} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-slate-400 mt-1">
          {value}/{max}
        </p>
      )}
    </div>
  )
}
