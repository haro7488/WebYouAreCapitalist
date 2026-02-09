import { useGameStore } from '@stores/gameStore'
import { Card, Button, MoneyDisplay } from '@components/common'

/** 이벤트 선택지 효과 미리보기 */
function EffectPreview({ effect }: { effect: { money?: number; reputation?: number } }) {
  return (
    <div className="flex gap-3 text-xs text-slate-400 mt-1">
      {effect.money != null && effect.money !== 0 && (
        <MoneyDisplay amount={effect.money} size="sm" showSign />
      )}
      {effect.reputation != null && effect.reputation !== 0 && (
        <span className={effect.reputation > 0 ? 'text-money-400' : 'text-danger-400'}>
          평판 {effect.reputation > 0 ? '+' : ''}{effect.reputation}
        </span>
      )}
    </div>
  )
}

/** 게임 이벤트 카드: 제목, 설명, 2개 선택지 표시 */
export function EventCard() {
  const currentEvent = useGameStore((s) => s.gameState?.currentEvent ?? null)
  const submitEventChoice = useGameStore((s) => s.submitEventChoice)

  if (!currentEvent) return null

  return (
    <Card header={`\u26A1 ${currentEvent.title}`}>
      {/* 이벤트 설명 */}
      <p className="text-sm text-slate-300 mb-4">{currentEvent.description}</p>

      {/* 선택지 */}
      <div className="flex flex-col gap-3">
        {currentEvent.choices.map((choice) => (
          <Button
            key={choice.id}
            variant="secondary"
            fullWidth
            onClick={() => submitEventChoice(choice.id)}
          >
            <div className="text-left w-full">
              <span className="text-sm">{choice.text}</span>
              <EffectPreview effect={choice.effect} />
            </div>
          </Button>
        ))}
      </div>
    </Card>
  )
}
