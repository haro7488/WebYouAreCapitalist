import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { GlossaryText } from '@components/glossary'
import type { Trait } from '@game/traits'

// TraitIcon: 개별 특성 아이콘 + Portal 툴팁 (overflow 잘림 방지)
export function TraitIcon({ trait }: { trait: Trait }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, above: false })
  const btnRef = useRef<HTMLButtonElement>(null)
  const borderColor = trait.type === 'positive' ? 'border-emerald-500' : 'border-red-500'
  const bgColor = trait.type === 'positive' ? 'bg-emerald-500/10' : 'bg-red-500/10'

  // 툴팁 위치 계산
  useEffect(() => {
    if (!showTooltip || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const tooltipW = 192 // w-48 = 12rem = 192px
    const tooltipH = 60 // 예상 높이
    const spaceBelow = window.innerHeight - rect.bottom
    const above = spaceBelow < tooltipH + 8

    // 중앙 정렬 기준 left, 화면 밖으로 나가지 않도록 클램프
    let left = rect.left + rect.width / 2
    const minLeft = tooltipW / 2 + 8
    const maxLeft = window.innerWidth - tooltipW / 2 - 8
    left = Math.max(minLeft, Math.min(left, maxLeft))

    setTooltipPos({
      top: above ? rect.top - 4 : rect.bottom + 4,
      left,
      above,
    })
  }, [showTooltip])

  return (
    <div>
      <button
        ref={btnRef}
        onClick={() => setShowTooltip((v) => !v)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`w-8 h-8 flex items-center justify-center rounded border-2 ${borderColor} ${bgColor} text-sm cursor-pointer hover:scale-110 transition-transform`}
        title={trait.name}
      >
        {trait.icon}
      </button>
      {showTooltip && createPortal(
        <div
          className="fixed z-[9999] w-48 bg-slate-900 border border-slate-600 rounded-lg shadow-xl px-3 py-2 pointer-events-none"
          style={{
            top: tooltipPos.above ? undefined : tooltipPos.top,
            bottom: tooltipPos.above ? window.innerHeight - tooltipPos.top : undefined,
            left: tooltipPos.left,
            transform: 'translateX(-50%)',
          }}
        >
          <p className={`text-xs font-bold ${trait.type === 'positive' ? 'text-emerald-400' : 'text-red-400'}`}>
            <GlossaryText>{trait.name}</GlossaryText>
          </p>
          <p className="text-[11px] text-slate-300 mt-0.5">
            <GlossaryText>{trait.description}</GlossaryText>
          </p>
          {/* 화살표 */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={tooltipPos.above
              ? { top: '100%', marginTop: '-1px' }
              : { bottom: '100%', marginBottom: '-1px' }
            }
          >
            <div
              className={`w-2 h-2 bg-slate-900 border-slate-600 rotate-45 ${
                tooltipPos.above
                  ? 'border-r border-b'
                  : 'border-l border-t'
              }`}
              style={tooltipPos.above
                ? { transform: 'rotate(45deg) translateY(-2px)' }
                : { transform: 'rotate(45deg) translateY(2px)' }
              }
            />
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

// TraitBar: 특성 목록 표시 바 (긍정/부정 구분)
export function TraitBar({ traits }: { traits: Trait[] }) {
  const positive = traits.filter((t) => t.type === 'positive')
  const negative = traits.filter((t) => t.type === 'negative')

  if (traits.length === 0) {
    return <div className="text-xs text-slate-600 italic">특성 없음</div>
  }

  return (
    <div className="flex items-center gap-1">
      {/* 긍정 특성 (왼쪽) */}
      {positive.map((t) => <TraitIcon key={t.id} trait={t} />)}
      {/* 구분선 (둘 다 있을 때) */}
      {positive.length > 0 && negative.length > 0 && (
        <div className="w-px h-6 bg-slate-600 mx-1" />
      )}
      {/* 부정 특성 (오른쪽) */}
      {negative.map((t) => <TraitIcon key={t.id} trait={t} />)}
    </div>
  )
}
