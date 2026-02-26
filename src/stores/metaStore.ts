import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { MetaState, MetaUpgradeId } from '@game/types'
import {
  createInitialMeta,
  purchaseUpgrade as enginePurchaseUpgrade,
} from '@game/index'

// === 스토어 타입 ===

interface MetaStoreState {
  /** 메타 진행 상태 (영구 저장) */
  metaState: MetaState
}

interface MetaStoreActions {
  /** 메타 업그레이드 구매. 성공 시 true */
  purchaseUpgrade: (upgradeId: MetaUpgradeId) => boolean
  /** 런 결과 반영 (gameStore에서 호출) */
  applyRunResult: (updatedMeta: MetaState) => void
  /** 전체 초기화 */
  resetAll: () => void
}

export type MetaStore = MetaStoreState & MetaStoreActions

// === 스토어 생성 ===

export const useMetaStore = create<MetaStore>()(
  persist(
    (set, get) => ({
      metaState: createInitialMeta(),

      purchaseUpgrade: (upgradeId: MetaUpgradeId): boolean => {
        const result = enginePurchaseUpgrade(get().metaState, upgradeId)
        if (result === null) return false
        set({ metaState: result })
        return true
      },

      applyRunResult: (updatedMeta: MetaState) => {
        set({ metaState: updatedMeta })
      },

      resetAll: () => {
        set({ metaState: createInitialMeta() })
      },
    }),
    {
      name: 'capitalist-meta',
      version: 2, // v2: MetaEffect 필드 확장 (extraActionPoints, startingInfluence 추가)
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ metaState: state.metaState }),
    },
  ),
)
