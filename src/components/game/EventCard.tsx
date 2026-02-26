import { useGameStore } from '@stores/gameStore'
import { Card, Button, Badge, MoneyDisplay } from '@components/common'
import { GlossaryText } from '@components/glossary'
import { calculateDominance, findSector, findTrait } from '@game/index'
import { getCompanyTraitEffects } from '@game/logic/traitEngine'
import type { EventEffect } from '@game/types'

// 섹터 한국어 매핑
const SECTOR_LABEL: Record<string, string> = {
  food: '외식',
  tech: '기술',
  realEstate: '부동산',
  logistics: '물류',
  energy: '에너지',
  information: '정보',
  finance: '금융',
  rnd: '연구개발',
}

// 시장 상태 한국어 매핑
const MARKET_LABEL: Record<string, string> = {
  boom: '호황',
  stable: '보합',
  recession: '불황',
}

// 트렌드 한국어 매핑
const TREND_LABEL: Record<string, string> = {
  hot: '과열',
  neutral: '보통',
  cold: '침체',
}

/** 이벤트 선택지 효과 미리보기 */
function EffectPreview({ effect }: { effect: EventEffect }) {
  const items: React.ReactNode[] = []

  if (effect.money != null && effect.money !== 0) {
    items.push(
      <MoneyDisplay key="money" amount={effect.money} size="sm" showSign />
    )
  }

  if (effect.influence != null && effect.influence !== 0) {
    items.push(
      <span key="influence" className={effect.influence > 0 ? 'text-money-400' : 'text-danger-400'}>
        영향력 {effect.influence > 0 ? '+' : ''}{effect.influence}
      </span>
    )
  }

  if (effect.traitGrant) {
    const trait = findTrait(effect.traitGrant)
    if (trait) {
      const isPositive = trait.type === 'positive'
      items.push(
        <span key="traitGrant" className={isPositive ? 'text-emerald-400' : 'text-danger-400'}>
          {trait.icon} {trait.name} 획득
        </span>
      )
    }
  }

  if (effect.traitRemove) {
    const trait = findTrait(effect.traitRemove)
    const name = trait ? trait.name : effect.traitRemove
    items.push(
      <span key="traitRemove" className="text-slate-400">
        ❌ {name} 제거
      </span>
    )
  }

  if (effect.freeAsset) {
    const sectorProfile = findSector(effect.freeAsset)
    const assetName = sectorProfile ? sectorProfile.name : effect.freeAsset
    items.push(
      <span key="freeAsset" className="text-emerald-400">
        🎁 {assetName} 획득
      </span>
    )
  }

  if (effect.nextPurchaseDiscount != null && effect.nextPurchaseDiscount !== 0) {
    const pct = Math.round(effect.nextPurchaseDiscount * 100)
    items.push(
      <span key="discount" className="text-sky-400">
        🏷️ 다음 매입 {pct}% 할인
      </span>
    )
  }

  if (effect.revenueMultiplier != null) {
    items.push(
      <span key="revMul" className="text-money-400">
        📈 수익 ×{effect.revenueMultiplier}
      </span>
    )
  }

  if (effect.expenseMultiplier != null) {
    items.push(
      <span key="expMul" className="text-danger-400">
        💸 지출 ×{effect.expenseMultiplier}
      </span>
    )
  }

  if (effect.marketShift) {
    const label = MARKET_LABEL[effect.marketShift] ?? effect.marketShift
    items.push(
      <span key="marketShift" className="text-slate-300">
        🌐 시장→{label}
      </span>
    )
  }

  if (effect.sectorShift) {
    const sectorLabel = SECTOR_LABEL[effect.sectorShift.sector] ?? effect.sectorShift.sector
    const trendLabel = TREND_LABEL[effect.sectorShift.trend] ?? effect.sectorShift.trend
    items.push(
      <span key="sectorShift" className="text-slate-300">
        📊 {sectorLabel}→{trendLabel}
      </span>
    )
  }

  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-3 text-xs text-slate-400 mt-1">
      {items}
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

  // lockRandomChoice 처리: 선택지가 2개 초과일 때만 잠금 적용
  let lockedChoiceIdx: number | null = null
  const effects = getCompanyTraitEffects(gameState.companies[0])
  if (effects.lockRandomChoice && allChoices.length > 2) {
    // 지배자 선택지(마지막)는 잠금 대상에서 제외
    const dominanceIdx = dominanceSector ? allChoices.length - 1 : -1
    const lockableCandidates = allChoices
      .map((_, i) => i)
      .filter((i) => i !== dominanceIdx)

    if (lockableCandidates.length > 0) {
      // 시드 기반 결정적 랜덤으로 잠금 선택지 결정 (턴마다 일관성 보장)
      const seedVal = Math.abs(gameState.seed * 1234567 + gameState.turn * 7654321)
      const pickedIdx = seedVal % lockableCandidates.length
      lockedChoiceIdx = lockableCandidates[pickedIdx]
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
          const isLocked = lockedChoiceIdx === idx

          return (
            <div
              key={choice.id}
              className={isLocked ? 'relative' : undefined}
              title={isLocked ? '우유부단: 선택 불가' : undefined}
            >
              <Button
                variant={isDominanceChoice ? 'primary' : 'secondary'}
                fullWidth
                disabled={isLocked}
                onClick={() => submitEventChoice(choice.id)}
              >
                <div className="text-left w-full">
                  <div className="flex items-center gap-2">
                    {isLocked && <span className="text-sm">🔒</span>}
                    <span className="text-sm">
                      <GlossaryText>{choice.text}</GlossaryText>
                    </span>
                    {isDominanceChoice && (
                      <Badge variant="info" label={<GlossaryText>{`${SECTOR_LABEL[dominanceSector!]} 지배`}</GlossaryText>} />
                    )}
                    {isLocked && (
                      <span className="text-xs text-slate-500 ml-auto">우유부단: 선택 불가</span>
                    )}
                  </div>
                  <EffectPreview effect={choice.effect} />
                </div>
              </Button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
