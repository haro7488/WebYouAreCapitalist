import { useUIStore } from '@stores/uiStore'
import { Button } from './Button'

// 모달 (confirm/info 타입 지원)
export function Modal() {
  const modal = useUIStore((s) => s.modal)
  const closeModal = useUIStore((s) => s.closeModal)

  if (!modal) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-slate-800 rounded-lg p-6 max-w-sm w-full mx-4">
        <h2 className="text-lg font-bold text-slate-100 mb-2">{modal.title}</h2>
        <p className="text-slate-300 mb-6">{modal.message}</p>
        <div className="flex justify-end gap-3">
          {modal.type === 'confirm' ? (
            <>
              <Button variant="secondary" onClick={closeModal}>
                취소
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  modal.onConfirm()
                  closeModal()
                }}
              >
                확인
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={closeModal}>
              닫기
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
