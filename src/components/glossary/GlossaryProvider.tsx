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
  openTerm: (termId: string, rect: DOMRect) => void
  dismiss: () => void
  close: () => void
  openHelp: (termId: string) => void
}

const GlossaryContext = createContext<GlossaryState | null>(null)

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

  const openTerm = useCallback((id: string, rect: DOMRect) => {
    setStack((prev) => [...prev, { termId: id, anchorRect: rect }])
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

  // 다른 곳 클릭 시 마지막 팝오버 하나 닫기
  useEffect(() => {
    if (stack.length === 0) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-glossary-popover]')) return
      if (target.closest('[data-glossary-term]')) return
      dismiss()
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [stack.length, dismiss])

  return (
    <GlossaryContext.Provider value={{ openTerm, dismiss, close, openHelp }}>
      {children}
      {stack.map((item, i) => (
        <GlossaryPopover
          key={`${item.termId}-${i}`}
          termId={item.termId}
          anchorRect={item.anchorRect}
          zIndex={100 + i}
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
  onNavigate: () => void
}

function GlossaryPopover({
  termId,
  anchorRect,
  zIndex,
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
          <GlossaryText>{entry.description}</GlossaryText>
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
    </div>,
    document.body,
  )
}
