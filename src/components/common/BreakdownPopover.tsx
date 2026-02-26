import { useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { MoneyBreakdown, BreakdownItem } from '@game/types'
import { formatMoney } from '@game/utils'
import { BreakdownChart } from './BreakdownChart'

function formatItemValue(item: BreakdownItem): string {
  switch (item.type) {
    case 'base': return formatMoney(item.value)
    case 'add': return `${item.value >= 0 ? '+' : ''}${formatMoney(item.value)}`
    case 'multiply': return `×${item.value.toFixed(2)}`
  }
}

function itemColor(item: BreakdownItem): string {
  if (item.type === 'base') return 'text-slate-200'
  if (item.type === 'multiply') return item.value >= 1 ? 'text-blue-400' : 'text-orange-400'
  return item.value >= 0 ? 'text-emerald-400' : 'text-red-400'
}

interface BreakdownPopoverProps {
  breakdown: MoneyBreakdown
  anchorEl: HTMLElement | null
  onClose: () => void
  /** 합계 값 커스텀 포맷 (기본: formatMoney) */
  formatFinal?: (v: number) => string
}

export function BreakdownPopover({ breakdown, anchorEl, onClose, formatFinal }: BreakdownPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  // 위치 계산 (fixed 포지셔닝 — viewport 기준 좌표 사용)
  const popoverWidth = 280
  const popoverHeight = 200 // 예상 높이
  const gap = 8

  let top = 0
  let left = 0
  let showAbove = false

  if (anchorEl) {
    const rect = anchorEl.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    showAbove = spaceBelow < popoverHeight + gap && rect.top > popoverHeight + gap

    left = rect.left + rect.width / 2 - popoverWidth / 2
    // 화면 밖으로 나가지 않도록 클램프
    left = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8))

    if (showAbove) {
      top = rect.top - gap
    } else {
      top = rect.bottom + gap
    }
  }

  // 바깥 클릭 + 스크롤 시 닫기
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        e.target !== anchorEl
      ) {
        onClose()
      }
    }
    function handleScroll() {
      onClose()
    }
    document.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [anchorEl, onClose])

  const content = (
    <div
      ref={popoverRef}
      className="fixed z-[200] rounded-lg border border-slate-600 bg-slate-800 shadow-xl animate-in fade-in duration-150"
      style={{ top, left, width: popoverWidth, transform: showAbove ? 'translateY(-100%)' : undefined }}
    >
      {/* 화살표 */}
      {showAbove ? (
        <div
          className="absolute left-1/2 bottom-[-6px] -translate-x-1/2 w-3 h-3 rotate-45 bg-slate-800 border-r border-b border-slate-600"
        />
      ) : (
        <div
          className="absolute left-1/2 top-[-6px] -translate-x-1/2 w-3 h-3 rotate-45 bg-slate-800 border-l border-t border-slate-600"
        />
      )}

      <div className="p-3">
        {breakdown.title && (
          <div className="mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
            {breakdown.title}
          </div>
        )}

        {/* 히스토리가 있으면 라인차트 + 스택바 */}
        {(breakdown.history?.length ?? 0) >= 1 && (
          <>
            <div className="mb-2">
              <BreakdownChart
                history={breakdown.history}
                maxValue={breakdown.maxValue}
                items={breakdown.items}
                final={breakdown.final}
                formatY={breakdown.formatY}
              />
            </div>
            <div className="border-b border-slate-700 mb-2" />
          </>
        )}

        {/* 히스토리 없어도 아이템 2개 이상이면 스택바만 */}
        {breakdown.items.length > 1 && (breakdown.history?.length ?? 0) < 1 && (
          <>
            <div className="mb-2">
              <BreakdownChart
                items={breakdown.items}
                final={breakdown.final}
                maxValue={breakdown.maxValue}
              />
            </div>
            <div className="border-b border-slate-700 mb-2" />
          </>
        )}

        <div className="space-y-1">
          {breakdown.items.map((item, i) => (
            <div key={i} className="flex justify-between items-center text-sm">
              <span className="text-slate-400">{item.label}</span>
              <span className={itemColor(item)}>{formatItemValue(item)}</span>
            </div>
          ))}
        </div>

        <div className="mt-2 pt-2 border-t border-slate-600 flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-200">합계</span>
          <span className="text-sm font-bold text-money-400">{(formatFinal ?? formatMoney)(breakdown.final)}</span>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
