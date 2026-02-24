// 특성(Trait) 시스템

export type TraitType = 'positive' | 'negative'

/** 특성이 게임 로직에 미치는 선언형 효과 */
export interface TraitEffect {
  purchaseDiscount?: number       // 매입 할인율 (0.1 = 10%)
  sellPenalty?: number            // 매각 패널티 (0.15 = 15% 감소)
  expenseMultiplier?: number      // 지출 배율 (0.7 = 30% 감소, 1.25 = 25% 증가)
  influenceGainMultiplier?: number // 영향력 획득 배율
  opportunityWeightBonus?: number // 긍정 이벤트 가중치 보너스
  pressureWeightBonus?: number    // 부정 이벤트 가중치 보너스
  trendForesight?: number         // 트렌드 선행 확인 턴 수
  investigateAccuracyPenalty?: number // 조사 정확도 패널티
  lockRandomChoice?: boolean      // 이벤트 선택지 잠금
}

export interface Trait {
  id: string
  name: string
  type: TraitType
  icon: string  // emoji 아이콘 (이후 이미지로 교체 가능)
  description: string
  effects?: TraitEffect
}

// 특성 데이터 → data/traits.json + schema/traits.schema.ts
export { TRAIT_REGISTRY } from './schema/traits.schema'
import { TRAIT_REGISTRY } from './schema/traits.schema'

export function findTrait(id: string): Trait | undefined {
  return TRAIT_REGISTRY.find((t) => t.id === id)
}
