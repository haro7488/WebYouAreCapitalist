import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface StatRowProps {
  label: ReactNode
  value: ReactNode
  icon?: LucideIcon
}

// 라벨-값 한 줄 표시 (아이콘 선택)
export function StatRow({ label, value, icon: Icon }: StatRowProps) {
  return (
    <div className="flex justify-between items-center py-1">
      <div className="flex items-center gap-2 text-slate-400">
        {Icon && <Icon size={16} />}
        <span>{label}</span>
      </div>
      <div>{value}</div>
    </div>
  )
}
