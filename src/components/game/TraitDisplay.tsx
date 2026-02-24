import { useState } from 'react'
import { GlossaryText } from '@components/glossary'
import type { Trait } from '@game/traits'

// TraitIcon: 개별 특성 아이콘 + 툴팁
export function TraitIcon({ trait }: { trait: Trait }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const borderColor = trait.type === 'positive' ? 'border-emerald-500' : 'border-red-500'
  const bgColor = trait.type === 'positive' ? 'bg-emerald-500/10' : 'bg-red-500/10'

  return (
    <div className="relative">
      <button
        onClick={() => setShowTooltip((v) => !v)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`w-8 h-8 flex items-center justify-center rounded border-2 ${borderColor} ${bgColor} text-sm cursor-pointer hover:scale-110 transition-transform`}
        title={trait.name}
      >
        {trait.icon}
      </button>
      {showTooltip && (
        <div className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 w-48 bg-slate-900 border border-slate-600 rounded-lg shadow-xl px-3 py-2 pointer-events-none">
          <p className={`text-xs font-bold ${trait.type === 'positive' ? 'text-emerald-400' : 'text-red-400'}`}>
            <GlossaryText>{trait.name}</GlossaryText>
          </p>
          <p className="text-[11px] text-slate-300 mt-0.5">
            <GlossaryText>{trait.description}</GlossaryText>
          </p>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0">
            <div className="w-2 h-2 bg-slate-900 border-l border-t border-slate-600 rotate-45 translate-y-1" />
          </div>
        </div>
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
