import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { GameState, GameConfig, Company, TurnAction, RunResult } from '@game/types'
import {
  startNewRun,
  endRun,
  submitAction as engineSubmitAction,
  submitEventChoice as engineSubmitEventChoice,
  resolvePhase as engineResolvePhase,
  advanceTurn as engineAdvanceTurn,
  findEventById,
} from '@game/index'
import { useMetaStore } from './metaStore'

// === persist 키 ===

const PERSIST_KEY = 'capitalist-run-save'

// === 스토어 타입 ===

interface GameStoreState {
  /** 현재 런의 게임 상태 (런 밖이면 null) */
  gameState: GameState | null
  /** 마지막 런 결과 (결과 화면에서 사용) */
  lastRunResult: RunResult | null
  /** 런 진행 중 여부 */
  isRunActive: boolean
}

interface GameStoreActions {
  /** 새 런 시작 — MetaStore에서 메타 상태를 읽어 엔진에 전달 */
  startRun: (config?: Partial<GameConfig>) => void
  /** 런 종료 — 결과 계산 후 MetaStore 업데이트 */
  endCurrentRun: () => RunResult | null
  /** Planning Phase: 플레이어 액션 제출 */
  submitAction: (action: TurnAction) => void
  /** Event Phase: 이벤트 선택지 제출 */
  submitEventChoice: (choiceId: string) => void
  /** Resolution Phase: 경제 계산 실행 */
  resolvePhase: () => void
  /** Result Phase: 다음 턴으로 진행 */
  advanceTurn: () => void
  /** 스토어 초기화 */
  reset: () => void
}

export type GameStore = GameStoreState & GameStoreActions

/** 내 기업(companies[0]) 반환 헬퍼 */
export function getMyCompany(state: GameState): Company {
  return state.companies[0]
}

// === 초기 상태 ===

const initialState: GameStoreState = {
  gameState: null,
  lastRunResult: null,
  isRunActive: false,
}

// === 스토어 생성 ===

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      startRun: (config?: Partial<GameConfig>) => {
        const meta = useMetaStore.getState().metaState
        const gameState = startNewRun(meta, config)
        set({ gameState, isRunActive: true, lastRunResult: null })
      },

      endCurrentRun: () => {
        const { gameState } = get()
        if (!gameState) return null

        const metaStore = useMetaStore.getState()
        const { result, updatedMeta } = endRun(gameState, metaStore.metaState)

        // 메타 스토어 업데이트
        metaStore.applyRunResult(updatedMeta)

        set({ gameState: null, isRunActive: false, lastRunResult: result })

        // persist 저장 데이터 삭제 (런 종료 시 세이브 불필요)
        localStorage.removeItem(PERSIST_KEY)

        return result
      },

      submitAction: (action: TurnAction) => {
        const { gameState } = get()
        if (!gameState) return
        set({ gameState: engineSubmitAction(gameState, action) })
      },

      submitEventChoice: (choiceId: string) => {
        const { gameState } = get()
        if (!gameState) return
        set({ gameState: engineSubmitEventChoice(gameState, choiceId) })
      },

      resolvePhase: () => {
        const { gameState } = get()
        if (!gameState) return
        set({ gameState: engineResolvePhase(gameState) })
      },

      advanceTurn: () => {
        const { gameState } = get()
        if (!gameState) return
        const newState = engineAdvanceTurn(gameState)
        set({ gameState: newState })

        // 게임 오버 시 자동으로 런 종료
        if (newState.isGameOver) {
          get().endCurrentRun()
        }
      },

      reset: () => {
        set(initialState)
        localStorage.removeItem(PERSIST_KEY)
      },
    }),
    {
      name: PERSIST_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // gameState와 isRunActive만 저장 (lastRunResult 제외)
      partialize: (state) => ({
        gameState: state.gameState,
        isRunActive: state.isRunActive,
      }),
      // 복원 후 currentEvent를 EVENT_REGISTRY에서 재구성 (id로 레지스트리 재조회)
      onRehydrateStorage: () => (state) => {
        if (!state?.gameState) return
        const eventId = state.gameState.currentEvent?.id ?? null
        state.gameState = {
          ...state.gameState,
          currentEvent: eventId ? findEventById(eventId) : null,
        }
      },
    },
  ),
)
