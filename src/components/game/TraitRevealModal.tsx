import type { Trait } from '@game/traits'

interface TraitRevealModalProps {
  traits: Trait[]
  onConfirm: () => void
}

export function TraitRevealModal({ traits, onConfirm }: TraitRevealModalProps) {
  const positive = traits.filter(t => t.type === 'positive')
  const negative = traits.filter(t => t.type === 'negative')

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">🎭 경영자 특성</h2>
          <p className="text-slate-400 text-sm">
            이번 런에서 당신에게 부여된 특성입니다.
          </p>
        </div>

        <div className="space-y-3">
          {positive.map(t => (
            <div
              key={t.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
            >
              <span className="text-2xl flex-shrink-0">{t.icon}</span>
              <div className="min-w-0">
                <p className="font-bold text-emerald-400">{t.name}</p>
                <p className="text-xs text-slate-300">{t.description}</p>
              </div>
            </div>
          ))}

          {negative.map(t => (
            <div
              key={t.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30"
            >
              <span className="text-2xl flex-shrink-0">{t.icon}</span>
              <div className="min-w-0">
                <p className="font-bold text-red-400">{t.name}</p>
                <p className="text-xs text-slate-300">{t.description}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onConfirm}
          className="w-full mt-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors"
        >
          확인
        </button>
      </div>
    </div>
  )
}
