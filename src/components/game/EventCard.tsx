import { useGameStore } from '@stores/gameStore'
import { Card, Button, Badge, MoneyDisplay } from '@components/common'
import { GlossaryText } from '@components/glossary'
import { calculateDominance } from '@game/index'

// 섹터 한국어 매핑
const SECTOR_LABEL: Record<string, string> = {
  food: '외식',
  tech: '기술',
  realEstate: '부동산',
  logistics: '물류',
  energy: '에너지',
  information: '정보',
  finance: '금융',
}

/** 이벤트 선택지 효과 미리보기 */
function EffectPreview({ effect }: { effect: { money?: number; influence?: number } }) {
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
    </div>
  )
}

/** 게임 이벤트 카드: 제목, 설명, 선택지 표시 (지배자 제3선택지 포함) */
export function EventCard() {
  const gameState = useGameStore((s) => s.gameState)
  const submitEventChoice = useGameStore((s) => s.submitEventChoice)

  if (!gameState?.currentEvent) return null

  const { currentEvent } = gameState
  const ownedAssets = gameState.companies[0].assets

  // 기본 선택지
  const allChoices = [...currentEvent.choices]

  // 지배자 제3선택지: 해당 섹터에서 dominant 등급일 때만 표시
  let dominanceSector: string | null = null
  if (currentEvent.dominanceChoice) {
    const dc = currentEvent.dominanceChoice
    const dominance = calculateDominance(ownedAssets)
    if (dominance[dc.sector].level === 'dominant') {
      allChoices.push(dc.choice)
      dominanceSector = dc.sector
    }
  }

  return (
    <Card header={`\u26A1 ${currentEvent.title}`}>
      {/* 이벤트 설명 */}
      <p className="text-sm text-slate-300 mb-4">
        <GlossaryText>{currentEvent.description}</GlossaryText>
      </p>

      {/* 선택지 */}
      <div className="flex flex-col gap-3">
        {allChoices.map((choice, idx) => {
          const isDominanceChoice = dominanceSector && idx === allChoices.length - 1
          return (
            <Button
              key={choice.id}
              variant={isDominanceChoice ? 'primary' : 'secondary'}
              fullWidth
              onClick={() => submitEventChoice(choice.id)}
            >
              <div className="text-left w-full">
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    <GlossaryText>{choice.text}</GlossaryText>
                  </span>
                  {isDominanceChoice && (
                    <Badge variant="info" label={`${SECTOR_LABEL[dominanceSector!]} 지배`} />
                  )}
                </div>
                <EffectPreview effect={choice.effect} />
              </div>
            </Button>
          )
        })}
      </div>
    </Card>
  )
}
