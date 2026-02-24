import { Target, TrendingUp, Crown } from 'lucide-react'
import type { Goal } from '@game/types'
import { GlossaryText } from '@components/glossary'

interface GoalSelectionModalProps {
  goals: Goal[]
  onSelect: (goal: Goal) => void
}

// 목표 타입별 아이콘
const GOAL_ICONS: Record<string, any> = {
  domination: Target,
  asset: TrendingUp,
  influence: Crown,
}

// 목표 타입별 색상
const GOAL_COLORS: Record<string, string> = {
  domination: 'text-amber-400',
  asset: 'text-emerald-400',
  influence: 'text-purple-400',
}

export function GoalSelectionModal({ goals, onSelect }: GoalSelectionModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      {/* 모바일 스크롤 + 패딩 대응 */}
      <div className="bg-slate-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">🎯 목표 선택</h2>
          <p className="text-slate-400 text-sm">
            <GlossaryText>이번 런에서 달성할 목표를 선택하세요. 달성 시 보너스를 받습니다.</GlossaryText>
          </p>
        </div>

        <div className="space-y-3">
          {goals.map((goal) => {
            const Icon = GOAL_ICONS[goal.type] || Target
            const iconColor = GOAL_COLORS[goal.type] || 'text-slate-400'

            return (
              <button
                key={goal.id}
                onClick={() => onSelect(goal)}
                className="w-full text-left p-4 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors border-2 border-transparent hover:border-blue-500/50"
              >
                <div className="flex items-start gap-4">
                  <div className={`mt-1 ${iconColor}`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-100 mb-1"><GlossaryText>{goal.name}</GlossaryText></h3>
                    <p className="text-sm text-slate-300 mb-2"><GlossaryText>{goal.description}</GlossaryText></p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">보너스:</span>
                      <span className="text-sm font-bold text-money-400">+${goal.bonus.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          선택 후 변경할 수 없습니다
        </div>
      </div>
    </div>
  )
}
