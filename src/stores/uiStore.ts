import { create } from 'zustand'

// === 화면/모달 타입 ===

export type Screen = 'mainMenu' | 'game' | 'runResult' | 'metaShop'

export type ModalType =
  | { type: 'confirm'; title: string; message: string; onConfirm: () => void }
  | { type: 'info'; title: string; message: string }
  | null

// === 스토어 타입 ===

interface UIStoreState {
  /** 현재 화면 */
  currentScreen: Screen
  /** 이전 화면 (뒤로가기용) */
  previousScreen: Screen | null
  /** 모달 상태 */
  modal: ModalType
  /** 턴 결과 애니메이션 진행 중 여부 */
  isAnimating: boolean
  /** 사이드바 열림 상태 (모바일) */
  isSidebarOpen: boolean
  /** 도움말 모달 열림 + 이동할 용어 ID */
  helpOpen: boolean
  helpTermId: string | null
}

interface UIStoreActions {
  /** 화면 전환 */
  navigateTo: (screen: Screen) => void
  /** 이전 화면으로 복귀 */
  goBack: () => void
  /** 모달 표시 */
  showModal: (modal: NonNullable<ModalType>) => void
  /** 모달 닫기 */
  closeModal: () => void
  /** 애니메이션 상태 설정 */
  setAnimating: (isAnimating: boolean) => void
  /** 사이드바 토글 */
  toggleSidebar: () => void
  /** 사이드바 닫기 */
  closeSidebar: () => void
  /** 도움말 열기 (특정 용어로 이동) */
  openHelp: (termId?: string) => void
  /** 도움말 닫기 */
  closeHelp: () => void
  /** UI 초기화 */
  reset: () => void
}

export type UIStore = UIStoreState & UIStoreActions

// === 초기 상태 ===

const initialState: UIStoreState = {
  currentScreen: 'mainMenu',
  previousScreen: null,
  modal: null,
  isAnimating: false,
  isSidebarOpen: false,
  helpOpen: false,
  helpTermId: null,
}

// === 스토어 생성 ===

export const useUIStore = create<UIStore>()((set, get) => ({
  ...initialState,

  navigateTo: (screen: Screen) => {
    const current = get().currentScreen
    if (current === screen) return
    set({
      currentScreen: screen,
      previousScreen: current,
      isSidebarOpen: false,
    })
  },

  goBack: () => {
    const { previousScreen } = get()
    if (previousScreen) {
      set({
        currentScreen: previousScreen,
        previousScreen: null,
        isSidebarOpen: false,
      })
    }
  },

  showModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),
  setAnimating: (isAnimating) => set({ isAnimating }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),
  openHelp: (termId?: string) => set({ helpOpen: true, helpTermId: termId ?? null }),
  closeHelp: () => set({ helpOpen: false, helpTermId: null }),
  reset: () => set(initialState),
}))
