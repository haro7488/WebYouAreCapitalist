import { useGameStore } from '@stores/gameStore'
import { Card, Button, MoneyDisplay } from '@components/common'
import { GlossaryText } from '@components/glossary'

/** 정부 이벤트 효과 미리보기 */
function EffectPreview({ effect }: { effect: { money?: number; influence?: number; inflationDelta?: number } }) {
  return (
    <div className="flex gap-3 text-xs text-slate-400 mt-1">
      {effect.money != null && effect.money !== 0 && (
        <MoneyDisplay amount={effect.money} size="sm" showSign />
      )}
      {effect.influence != null && effect.influence !== 0 && (
        <span className={effect.influence > 0 ? 'text-money-400' : 'text-danger-400'}>
          영향력 {effect.influence > 0 ? '+' : ''}{effect.influence}
        </span>
      )}
      {effect.inflationDelta != null && effect.inflationDelta !== 0 && (
        <span className={effect.inflationDelta > 0 ? 'text-red-400' : 'text-emerald-400'}>
          인플레이션 {effect.inflationDelta > 0 ? '+' : ''}{(effect.inflationDelta * 100).toFixed(1)}%
        </span>
      )}
    </div>
  )
}

/** 정부 이벤트 카드: 정책 공지, 선택지 또는 자동 적용 */
export function GovernmentCard() {
  const gameState = useGameStore((s) => s.gameState)
  const submitGovernmentChoice = useGameStore((s) => s.submitGovernmentChoice)
  const confirmGovernmentEvent = useGameStore((s) => s.confirmGovernmentEvent)

  if (!gameState?.governmentEvent) return null

  const { governmentEvent } = gameState
  const isAutoApply = governmentEvent.autoApply

  return (
    <div className="space-y-4">
      {/* 인플레이션 현황 카드 */}
      <Card header="📊 경제 지표">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-400">현재 인플레이션</div>
            <div className={`text-lg font-bold ${gameState.inflation > 0.1 ? 'text-red-400' : 'text-slate-300'}`}>
              {(gameState.inflation * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">누적 인플레이션</div>
            <div className={`text-lg font-bold ${gameState.cumulativeInflation > 1.2 ? 'text-red-400' : 'text-slate-300'}`}>
              x{gameState.cumulativeInflation.toFixed(2)}
            </div>
          </div>
        </div>
      </Card>

      {/* 정부 정책 카드 */}
      <Card header={`🏛️ ${governmentEvent.title}`}>
        {/* 정책 설명 */}
        <p className="text-sm text-slate-300 mb-4">
          <GlossaryText>{governmentEvent.description}</GlossaryText>
        </p>

        {/* 자동 적용 이벤트: 결과만 표시 + 확인 버튼 */}
        {isAutoApply && (
          <>
            {governmentEvent.effect && (
              <div className="mb-4 p-3 bg-slate-800 rounded border border-slate-700">
                <div className="text-xs text-slate-400 mb-1">정책 효과</div>
                <EffectPreview effect={governmentEvent.effect} />
              </div>
            )}
            <Button variant="primary" fullWidth onClick={() => confirmGovernmentEvent()}>
              확인
            </Button>
          </>
        )}

        {/* 선택지가 있는 이벤트: 선택 버튼 표시 */}
        {!isAutoApply && governmentEvent.choices && (
          <div className="flex flex-col gap-3">
            {governmentEvent.choices.map((choice) => (
              <Button
                key={choice.id}
                variant="secondary"
                fullWidth
                onClick={() => submitGovernmentChoice(choice.id)}
              >
                <div className="text-left w-full">
                  <span className="text-sm">{choice.text}</span>
                  <EffectPreview effect={choice.effect} />
                </div>
              </Button>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
