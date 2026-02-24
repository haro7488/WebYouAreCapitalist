import { useGameStore } from '@stores/gameStore'
import { Card, Button, Badge, MoneyDisplay } from '@components/common'
import { GlossaryText } from '@components/glossary'
import { calculateDominance } from '@game/index'
import { findTrait } from '@game/traits'
import type { EventEffect } from '@game/types'
import ASSETS_JSON from '@game/data/assets.json'

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

// 시장 상태 한국어 매핑
const MARKET_LABEL: Record<string, string> = {
  boom: '호황',
  stable: '안정',
  recession: '불황',
}

// 섹터 트렌드 한국어 매핑
const TREND_LABEL: Record<string, string> = {
  hot: '상승',
  neutral: '중립',
  cold: '하락',
}

// 자산 ID → 이름 맵
const ASSET_NAME_MAP: Record<string, string> = Object.fromEntries(
  (ASSETS_JSON as Array<{ id: string; name: string }>).map((a) => [a.id, a.name])
)

/** 이벤트 선택지 효과 미리보기 */
function EffectPreview({ effect }: { effect: EventEffect }) {
  const items: { key: string; node: React.ReactNode }[] = []

  // 자금
  if (effect.money != null && effect.money !== 0) {
    items.push({
      key: 'money',
      node: <MoneyDisplay amount={effect.money} size="sm" showSign />,
    })
  }

  // 영향력
  if (effect.influence != null && effect.influence !== 0) {
    items.push({
      key: 'influence',
      node: (
        <span className={effect.influence > 0 ? 'text-money-400' : 'text-danger-400'}>
          영향력 {effect.influence > 0 ? '+' : ''}{effect.influence}
        </span>
      ),
    })
  }

  // 특성 부여
  if (effect.traitGrant) {
    const trait = findTrait(effect.traitGrant)
    const label = trait ? `${trait.icon} ${trait.name} 획득` : `✨ ${effect.traitGrant} 획득`
    const color = trait?.type === 'negative' ? 'text-danger-400' : 'text-emerald-400'
    items.push({
      key: 'traitGrant',
      node: <span className={color}>{label}</span>,
    })
  }

  // 특성 제거
  if (effect.traitRemove) {
    const trait = findTrait(effect.traitRemove)
    const label = trait ? `❌ ${trait.name} 제거` : `❌ ${effect.traitRemove} 제거`
    items.push({
      key: 'traitRemove',
      node: <span className="text-slate-400">{label}</span>,
    })
  }

  // 무료 자산
  if (effect.freeAsset) {
    const assetName = ASSET_NAME_MAP[effect.freeAsset] ?? effect.freeAsset
    items.push({
      key: 'freeAsset',
      node: <span className="text-emerald-400">🎁 {assetName} 획득</span>,
    })
  }

  // 다음 매입 할인
  if (effect.nextPurchaseDiscount != null && effect.nextPurchaseDiscount !== 0) {
    const pct = Math.round(effect.nextPurchaseDiscount * 100)
    items.push({
      key: 'nextPurchaseDiscount',
      node: <span className="text-money-400">🏷️ 다음 매입 {pct}% 할인</span>,
    })
  }

  // 수익 배율
  if (effect.revenueMultiplier != null) {
    items.push({
      key: 'revenueMultiplier',
      node: (
        <span className={effect.revenueMultiplier >= 1 ? 'text-money-400' : 'text-danger-400'}>
          📈 수익 ×{effect.revenueMultiplier}
        </span>
      ),
    })
  }

  // 지출 배율
  if (effect.expenseMultiplier != null) {
    items.push({
      key: 'expenseMultiplier',
      node: (
        <span className={effect.expenseMultiplier <= 1 ? 'text-money-400' : 'text-danger-400'}>
          💸 지출 ×{effect.expenseMultiplier}
        </span>
      ),
    })
  }

  // 시장 전환
  if (effect.marketShift) {
    const label = MARKET_LABEL[effect.marketShift] ?? effect.marketShift
    items.push({
      key: 'marketShift',
      node: <span className="text-slate-300">🌐 시장→{label}</span>,
    })
  }

  // 섹터 트렌드 전환
  if (effect.sectorShift) {
    const sectorLabel = SECTOR_LABEL[effect.sectorShift.sector] ?? effect.sectorShift.sector
    const trendLabel = TREND_LABEL[effect.sectorShift.trend] ?? effect.sectorShift.trend
    items.push({
      key: 'sectorShift',
      node: <span className="text-slate-300">📊 {sectorLabel}→{trendLabel}</span>,
    })
  }

  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-3 text-xs text-slate-400 mt-1">
      {items.map(({ key, node }) => (
        <span key={key}>{node}</span>
      ))}
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
