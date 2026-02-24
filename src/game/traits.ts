// 특성(Trait) 시스템

export type TraitType = 'positive' | 'negative'

export interface Trait {
  id: string
  name: string
  type: TraitType
  icon: string  // emoji 아이콘 (이후 이미지로 교체 가능)
  description: string
}

// 특성 데이터 → data/traits.json + schema/traits.schema.ts
export { TRAIT_REGISTRY } from './schema/traits.schema'
import { TRAIT_REGISTRY } from './schema/traits.schema'

export function findTrait(id: string): Trait | undefined {
  return TRAIT_REGISTRY.find((t) => t.id === id)
}
