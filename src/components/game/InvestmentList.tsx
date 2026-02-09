import { useGameStore } from '@stores/gameStore'
import { INVESTMENTS } from '@game/index'
import { InvestmentCard } from './InvestmentCard'

/** 구매 가능한 투자 상품 목록 그리드 */
export function InvestmentList() {
  const money = useGameStore((s) => s.gameState?.money ?? 0)
  const submitAction = useGameStore((s) => s.submitAction)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {INVESTMENTS.map((inv) => (
        <InvestmentCard
          key={inv.id}
          investment={inv}
          canAfford={money >= inv.cost}
          onBuy={() => submitAction({ type: 'invest', investmentId: inv.id, amount: inv.cost })}
        />
      ))}
    </div>
  )
}
