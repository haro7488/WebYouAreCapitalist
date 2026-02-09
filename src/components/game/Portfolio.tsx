import { useGameStore } from '@stores/gameStore'
import { INVESTMENTS } from '@game/index'
import { Card } from '@components/common'
import { OwnedInvestmentRow } from './OwnedInvestmentRow'

/** 보유 투자 포트폴리오 카드 */
export function Portfolio() {
  const gameState = useGameStore((s) => s.gameState)
  const submitAction = useGameStore((s) => s.submitAction)

  if (!gameState) return null

  const { investments, market } = gameState

  // 투자 ID → 정의 매핑
  const investmentMap = new Map(INVESTMENTS.map((inv) => [inv.id, inv]))

  return (
    <Card header={`내 포트폴리오 (${investments.length}개)`}>
      {investments.length === 0 ? (
        <p className="text-slate-500 text-center py-8">투자 항목이 없습니다</p>
      ) : (
        investments.map((owned, index) => {
          const def = investmentMap.get(owned.investmentId)
          if (!def) return null
          return (
            <OwnedInvestmentRow
              key={`${owned.investmentId}-${index}`}
              owned={owned}
              investment={def}
              index={index}
              marketCondition={market.condition}
              onSell={(idx) => submitAction({ type: 'sell', ownedIndex: idx })}
            />
          )
        })
      )}
    </Card>
  )
}
