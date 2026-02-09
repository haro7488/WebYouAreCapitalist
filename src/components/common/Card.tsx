import type { ReactNode } from 'react'

interface CardProps {
  header?: ReactNode
  children: ReactNode
  className?: string
}

// 범용 카드 컨테이너
export function Card({ header, children, className = '' }: CardProps) {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-lg ${className}`}>
      {header && (
        <div className="p-3 border-b border-slate-700 font-semibold text-slate-200">
          {header}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}
