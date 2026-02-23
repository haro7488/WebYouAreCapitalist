import { useState, useMemo } from 'react'
import { X, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { GLOSSARY, GLOSSARY_CATEGORIES, type GlossaryCategory } from '@game/glossary'

interface HelpModalProps {
  onClose: () => void
}

const CATEGORY_ORDER: GlossaryCategory[] = ['basic', 'economy', 'asset', 'competition', 'info', 'meta']

export function HelpModal({ onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<GlossaryCategory>('basic')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return GLOSSARY.filter((e) => e.category === activeTab)
    const q = search.trim().toLowerCase()
    return GLOSSARY.filter(
      (e) => e.term.toLowerCase().includes(q) || e.description.toLowerCase().includes(q),
    )
  }, [search, activeTab])

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id))

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-lg w-[calc(100vw-2rem)] max-w-3xl h-[calc(100vh-4rem)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-slate-100">도움말</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 검색바 */}
        <div className="px-4 pt-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="용어 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 탭 (검색 중엔 숨김) */}
        {!search.trim() && (
          <div className="flex gap-1 px-4 pt-3 overflow-x-auto scrollbar-hide">
            {CATEGORY_ORDER.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveTab(cat); setExpandedId(null) }}
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

        {/* 용어 목록 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {filtered.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">검색 결과가 없습니다.</p>
          )}
          {filtered.map((entry) => {
            const isOpen = expandedId === entry.id
            return (
              <div key={entry.id} className="rounded bg-slate-750">
                <button
                  onClick={() => toggle(entry.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-700/50 rounded transition-colors"
                >
                  {isOpen ? (
                    <ChevronDown size={14} className="text-blue-400 shrink-0" />
                  ) : (
                    <ChevronRight size={14} className="text-slate-500 shrink-0" />
                  )}
                  <span className="text-sm font-medium text-slate-200">{entry.term}</span>
                  {search.trim() && (
                    <span className="ml-auto text-[10px] text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">
                      {GLOSSARY_CATEGORIES[entry.category]}
                    </span>
                  )}
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 pl-9 space-y-2">
                    <p className="text-sm text-slate-400 leading-relaxed">{entry.description}</p>
                    {entry.formula && (
                      <div className="bg-slate-900/60 rounded px-3 py-2">
                        <p className="text-xs text-blue-400 font-mono">{entry.formula}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
