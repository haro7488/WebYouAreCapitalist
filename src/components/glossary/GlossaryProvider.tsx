import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { GLOSSARY, GLOSSARY_CATEGORIES } from '@game/glossary'
import { GlossaryText } from './GlossaryText'

// === Context ===

interface StackItem {
  termId: string
  anchorRect: DOMRect
}

interface GlossaryState {
  openTerm: (termId: string, rect: DOMRect, popoverIndex?: number | null) => void
  dismiss: () => void
  close: () => void
  openHelp: (termId: string) => void
}

const GlossaryContext = createContext<GlossaryState | null>(null)

// popover 내부에서 자신의 stackIndex를 알 수 있게 하는 context
export const PopoverStackIndexContext = createContext<number | null>(null)

export function useGlossary() {
  const ctx = useContext(GlossaryContext)
  if (!ctx) throw new Error('useGlossary must be inside GlossaryProvider')
  return ctx
}

// === Provider ===

interface Props {
  children: ReactNode
  onOpenHelp?: (termId: string) => void
}

export function GlossaryProvider({ children, onOpenHelp }: Props) {
  const [stack, setStack] = useState<StackItem[]>([])

  // 외부 클릭 시 전체 닫기
  useEffect(() => {
    if (stack.length === 0) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-glossary-popover]')) return
      if (target.closest('[data-glossary-term]')) return
      setStack([]) // 전체 닫기
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [stack.length])

  const openTerm = useCallback((id: string, rect: DOMRect, popoverIndex?: number | null) => {
    if (popoverIndex != null) {
      // popover 내부에서 클릭 → 해당 popover 이후 항목 잘라내고 push
      setStack((prev) => {
        // 이미 스택에 있는 termId는 무시 (무한루프 방지)
        if (prev.some((item) => item.termId === id)) return prev
        // 최대 5개 제한
        const base = prev.slice(0, popoverIndex + 1)
        if (base.length >= 5) return prev
        return [...base, { termId: id, anchorRect: rect }]
      })
    } else {
      // 루트에서 클릭 → 스택 리셋 + 새 항목
      setStack([{ termId: id, anchorRect: rect }])
    }
  }, [])

  const dismiss = useCallback(() => {
    setStack((prev) => prev.slice(0, -1))
  }, [])

  const close = useCallback(() => {
    setStack([])
  }, [])

  const openHelp = useCallback((id: string) => {
    onOpenHelp?.(id)
    close()
  }, [onOpenHelp, close])

  return (
    <GlossaryContext.Provider value={{ openTerm, dismiss, close, openHelp }}>
      {children}
      {stack.map((item, i) => (
        <GlossaryPopover
          key={`${item.termId}-${i}`}
          termId={item.termId}
          anchorRect={item.anchorRect}
          zIndex={100 + i}
          stackIndex={i}
          onNavigate={() => openHelp(item.termId)}
        />
      ))}
    </GlossaryContext.Provider>
  )
}

// === Popover (Portal) ===

interface GlossaryPopoverProps {
  termId: string
  anchorRect: DOMRect
  zIndex: number
  stackIndex: number
  onNavigate: () => void
}

function GlossaryPopover({
  termId,
  anchorRect,
  zIndex,
  stackIndex,
  onNavigate,
}: GlossaryPopoverProps) {
  const entry = GLOSSARY.find((e) => e.id === termId)
  if (!entry) return null

  // 위치 계산: 기본 아래, 공간 부족하면 위
  const popoverHeight = 180
  const popoverWidth = 300
  const gap = 8

  const spaceBelow = window.innerHeight - anchorRect.bottom
  const showAbove = spaceBelow < popoverHeight + gap

  let top: number
  if (showAbove) {
    top = anchorRect.top - popoverHeight - gap + window.scrollY
  } else {
    top = anchorRect.bottom + gap + window.scrollY
  }

  let left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2 + window.scrollX
  // 좌우 경계 보정
  left = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8))

  return createPortal(
    <PopoverStackIndexContext.Provider value={stackIndex}>
      <div
        data-glossary-popover
        className="fixed animate-in fade-in duration-150"
        style={{ top: top - window.scrollY, left, width: popoverWidth, zIndex }}
      >
        <div className="bg-slate-900 border border-slate-600 rounded-lg shadow-2xl overflow-hidden">
          {/* 카테고리 + 용어명 */}
          <div className="px-3 pt-3 pb-2">
            <span className="text-[10px] text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
              {GLOSSARY_CATEGORIES[entry.category]}
            </span>
            <p className="text-sm font-bold text-slate-100 mt-1">{entry.term}</p>
          </div>

          {/* 설명 */}
          <div className="px-3 pb-2 text-xs text-slate-300 leading-relaxed">
            <GlossaryText decorated>{entry.description}</GlossaryText>
          </div>

          {/* 공식 */}
          {entry.formula && (
            <div className="px-3 pb-2">
              <p className="text-[10px] text-blue-400/70 font-mono bg-slate-800/50 rounded px-2 py-1 truncate">
                {entry.formula}
              </p>
            </div>
          )}

          {/* 자세히 보기 */}
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate() }}
            className="w-full text-center text-xs text-blue-400 hover:text-blue-300 py-2 border-t border-slate-700 transition-colors"
          >
            자세히 보기 →
          </button>
        </div>

        {/* 화살표 */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={showAbove ? { bottom: -5 } : { top: -5 }}
        >
          <div
            className={`w-2.5 h-2.5 bg-slate-900 border-slate-600 rotate-45 ${
              showAbove ? 'border-r border-b' : 'border-l border-t'
            }`}
          />
        </div>
      </div>
    </PopoverStackIndexContext.Provider>,
    document.body,
  )
}
