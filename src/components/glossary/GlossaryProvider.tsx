import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { GLOSSARY, GLOSSARY_CATEGORIES } from '@game/glossary'

// === Context ===

interface GlossaryState {
  termId: string | null
  anchorRect: DOMRect | null
  clickCount: number
  openTerm: (termId: string, rect: DOMRect) => void
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
  const [termId, setTermId] = useState<string | null>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const [clickCount, setClickCount] = useState(0)

  const close = useCallback(() => {
    setTermId(null)
    setAnchorRect(null)
    setClickCount(0)
  }, [])

  const openTerm = useCallback((id: string, rect: DOMRect) => {
    if (termId === id && clickCount >= 1) {
      // 같은 용어 재클릭 → 도움말로 이동
      onOpenHelp?.(id)
      close()
      return
    }
    setTermId(id)
    setAnchorRect(rect)
    setClickCount(1)
  }, [termId, clickCount, onOpenHelp, close])

  const openHelp = useCallback((id: string) => {
    onOpenHelp?.(id)
    close()
  }, [onOpenHelp, close])

  // 다른 곳 클릭 시 닫기 (mousedown + capture로 확실하게)
  useEffect(() => {
    if (!termId) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-glossary-popover]')) return
      // 다른 GlossaryTerm 클릭은 openTerm에서 처리하므로 여기서 닫기
      if (target.closest('[data-glossary-term]')) return
      close()
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [termId, close])

  return (
    <GlossaryContext.Provider value={{ termId, anchorRect, clickCount, openTerm, close, openHelp }}>
      {children}
      {termId && anchorRect && <GlossaryPopover termId={termId} anchorRect={anchorRect} onNavigate={() => openHelp(termId)} />}
    </GlossaryContext.Provider>
  )
}

// === Popover (Portal) ===

function GlossaryPopover({
  termId,
  anchorRect,
  onNavigate,
}: {
  termId: string
  anchorRect: DOMRect
  onNavigate: () => void
}) {
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
      className="fixed z-[100] animate-in fade-in duration-150"
      style={{ top: top - window.scrollY, left, width: popoverWidth }}
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
        <div className="px-3 pb-2">
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">{entry.description}</p>
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
