import { useState, useMemo, useCallback } from 'react'
import { X, Search } from 'lucide-react'
import { GLOSSARY, GLOSSARY_CATEGORIES, type GlossaryCategory, type GlossaryEntry } from '@game/glossary'

interface HelpModalProps {
  onClose: () => void
}

const CATEGORY_ORDER: GlossaryCategory[] = ['basic', 'economy', 'asset', 'competition', 'info', 'meta']

// === 용어 링크 + 툴팁 ===

/** 용어 매칭용 정렬 (긴 용어 우선 — "시장 상태"가 "시장"보다 먼저 매칭되도록) */
const SORTED_TERMS = [...GLOSSARY].sort((a, b) => b.term.length - a.term.length)

/** 짧은 별칭 매핑 (설명에서 자주 쓰이는 축약어) */
const TERM_ALIASES: Record<string, string> = {}
for (const entry of GLOSSARY) {
  // "AP (행동력)" → "AP"도 매칭
  const match = entry.term.match(/^(.+?)\s*\(/)
  if (match) TERM_ALIASES[match[1]] = entry.id
  // 한국어 이름만도 매칭: "호황 (Boom)" → "호황"
  const kr = entry.term.match(/^(.+?)\s*\(/)
  if (kr && kr[1].length >= 2) TERM_ALIASES[kr[1]] = entry.id
}

function LinkedDescription({
  text,
  currentId,
  onTermClick,
}: {
  text: string
  currentId: string
  onTermClick: (id: string) => void
}) {
  const parts = useMemo(() => {
    const result: { type: 'text' | 'link'; value: string; entry?: GlossaryEntry }[] = []
    let remaining = text

    while (remaining.length > 0) {
      let earliest = -1
      let matchedEntry: GlossaryEntry | null = null
      let matchedText = ''

      // 용어 + 별칭 중 가장 먼저 나타나는 것 찾기
      for (const entry of SORTED_TERMS) {
        if (entry.id === currentId) continue

        // 정확한 term 매칭
        const idx = remaining.indexOf(entry.term)
        if (idx !== -1 && (earliest === -1 || idx < earliest)) {
          earliest = idx
          matchedEntry = entry
          matchedText = entry.term
        }

        // 별칭 매칭
        const alias = Object.entries(TERM_ALIASES).find(([, id]) => id === entry.id)
        if (alias) {
          const aliasIdx = remaining.indexOf(alias[0])
          if (aliasIdx !== -1 && (earliest === -1 || aliasIdx < earliest)) {
            earliest = aliasIdx
            matchedEntry = entry
            matchedText = alias[0]
          }
        }
      }

      if (earliest === -1 || !matchedEntry) {
        result.push({ type: 'text', value: remaining })
        break
      }

      if (earliest > 0) {
        result.push({ type: 'text', value: remaining.slice(0, earliest) })
      }
      result.push({ type: 'link', value: matchedText, entry: matchedEntry })
      remaining = remaining.slice(earliest + matchedText.length)
    }

    return result
  }, [text, currentId])

  return (
    <>
      {parts.map((part, i) =>
        part.type === 'text' ? (
          <span key={i}>{part.value}</span>
        ) : (
          <TermLink key={i} entry={part.entry!} label={part.value} onClick={onTermClick} />
        ),
      )}
    </>
  )
}

function TermLink({
  entry,
  label,
  onClick,
}: {
  entry: GlossaryEntry
  label: string
  onClick: (id: string) => void
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <span className="relative inline-block">
      <button
        className="text-blue-400 underline decoration-dotted underline-offset-2 hover:text-blue-300 transition-colors"
        onClick={(e) => { e.stopPropagation(); onClick(entry.id) }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {label}
      </button>
      {showTooltip && (
        <div className="absolute z-60 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-slate-600 rounded-lg shadow-xl px-3 py-2 pointer-events-none">
          <p className="text-xs font-medium text-blue-400 mb-1">{entry.term}</p>
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">{entry.description}</p>
          {entry.formula && (
            <p className="text-[10px] text-blue-400/70 font-mono mt-1 truncate">{entry.formula}</p>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-2 h-2 bg-slate-900 border-r border-b border-slate-600 rotate-45" />
          </div>
        </div>
      )}
    </span>
  )
}

// === 메인 모달 ===

export function HelpModal({ onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<GlossaryCategory>('basic')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return GLOSSARY.filter((e) => e.category === activeTab)
    const q = search.trim().toLowerCase()
    return GLOSSARY.filter(
      (e) => e.term.toLowerCase().includes(q) || e.description.toLowerCase().includes(q),
    )
  }, [search, activeTab])

  const selected = useMemo(() => {
    if (!selectedId) return filtered[0] ?? null
    return GLOSSARY.find((e) => e.id === selectedId) ?? filtered[0] ?? null
  }, [selectedId, filtered])

  const handleTermClick = useCallback((id: string) => {
    const entry = GLOSSARY.find((e) => e.id === id)
    if (entry) {
      setActiveTab(entry.category)
      setSelectedId(id)
      setSearch('')
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-lg w-[calc(100vw-2rem)] max-w-4xl h-[calc(100vh-4rem)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-lg font-bold text-slate-100">📖 도움말</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 검색 + 탭 */}
        <div className="px-4 py-2 border-b border-slate-700 space-y-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="용어 검색..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedId(null) }}
              className="w-full pl-9 pr-3 py-2 bg-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {!search.trim() && (
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {CATEGORY_ORDER.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setActiveTab(cat); setSelectedId(null) }}
                  className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {GLOSSARY_CATEGORIES[cat]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 좌우 분할 */}
        <div className="flex-1 flex min-h-0">
          {/* 좌측: 목록 */}
          <div className="w-1/3 border-r border-slate-700 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">검색 결과 없음</p>
            )}
            {filtered.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setSelectedId(entry.id)}
                className={`w-full text-left px-4 py-3 text-sm border-b border-slate-700/50 transition-colors ${
                  selected?.id === entry.id
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700/40'
                }`}
              >
                <span className="font-medium">{entry.term}</span>
                {search.trim() && (
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    {GLOSSARY_CATEGORIES[entry.category]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 우측: 설명 */}
          <div className="w-2/3 overflow-y-auto p-5">
            {selected ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                    {GLOSSARY_CATEGORIES[selected.category]}
                  </span>
                  <h3 className="text-xl font-bold text-slate-100 mt-2">{selected.term}</h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  <LinkedDescription
                    text={selected.description}
                    currentId={selected.id}
                    onTermClick={handleTermClick}
                  />
                </p>
                {selected.formula && (
                  <div className="bg-slate-900/60 rounded-lg px-4 py-3 border border-slate-700">
                    <p className="text-[10px] text-slate-500 mb-1">공식</p>
                    <p className="text-sm text-blue-400 font-mono">{selected.formula}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-12">좌측에서 용어를 선택하세요</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
