import { useState, useMemo, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import { GLOSSARY, GLOSSARY_CATEGORIES, type GlossaryCategory } from '@game/glossary'
import { useGlossaryText } from '@components/glossary'

interface HelpModalProps {
  onClose: () => void
  initialTermId?: string
}

const CATEGORY_ORDER: GlossaryCategory[] = ['basic', 'economy', 'asset', 'competition', 'info', 'meta']

function DescriptionWithLinks({ text, excludeId }: { text: string; excludeId: string }) {
  const parts = useGlossaryText(text, excludeId)
  return <>{parts}</>
}

export function HelpModal({ onClose, initialTermId }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<GlossaryCategory>('basic')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // initialTermId가 있으면 해당 용어로 이동
  useEffect(() => {
    if (initialTermId) {
      const entry = GLOSSARY.find((e) => e.id === initialTermId)
      if (entry) {
        setActiveTab(entry.category)
        setSelectedId(entry.id)
        setSearch('')
      }
    }
  }, [initialTermId])

  const filtered = useMemo(() => {
    if (!search.trim()) return GLOSSARY.filter((e) => e.category === activeTab)
    const q = search.trim().toLowerCase()
    return GLOSSARY.filter(
      (e) => e.term.toLowerCase().includes(q) || e.description.toLowerCase().includes(q),
    )
  }, [search, activeTab])

  const selected = useMemo(() => {
    if (selectedId) {
      const found = GLOSSARY.find((e) => e.id === selectedId)
      if (found) return found
    }
    return filtered[0] ?? null
  }, [selectedId, filtered])

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
                  <DescriptionWithLinks text={selected.description} excludeId={selected.id} />
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
