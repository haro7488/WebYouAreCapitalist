import { Card, MoneyDisplay, StatRow, Badge, Button } from '@components/common'
import { GlossaryText } from '@components/glossary'
import { TraitBar } from './TraitDisplay'
import { useGameStore } from '@stores/gameStore'
import { ASSETS, getNetWorthBreakdown } from '@game/index'
import type { Company, Sector, ResearchResult } from '@game/types'
import { TRAIT_REGISTRY, type Trait } from '@game/traits'

// 전략 정보 매핑
const STRATEGY_INFO: Record<string, { name: string; hint: string }> = {
  conservative: { name: '보수형', hint: '안정적인 분산 투자 행보' },
  aggressive: { name: '공격형', hint: '공격적인 고수익 추구 행보' },
  domination: { name: '지배형', hint: '특정 섹터 집중 투자 행보' },
  opportunist: { name: '기회형', hint: '트렌드 추종 매매 행보' },
}

// 조사로 드러나는 전략 표시명
const STRATEGY_DISPLAY_NAMES: Record<string, string> = {
  conservative: '안정 추구형',
  aggressive: '공격 투자형',
  domination: '섹터 지배형',
  opportunist: '기회주의형',
}

// 섹터 한국어 이름
const SECTOR_NAMES: Record<Sector, string> = {
  food: '🍔 식품',
  tech: '💻 테크',
  realEstate: '🏢 부동산',
  logistics: '🚛 물류',
  energy: '⚡ 에너지',
  information: '🔍 정보',
  finance: '💰 금융',
}

// 업그레이드 레벨 표시용 헬퍼
const UPGRADE_LABELS = ['기본', '레벨1', '레벨2', '레벨3']

interface CompanyDetailProps {
  company: Company
  isPlayer: boolean
  rank: number
  strategyId: string | null
  onClose: () => void
}

/** 기업 상세 정보 모달 */
export function CompanyDetail({ company, isPlayer, rank, strategyId, onClose }: CompanyDetailProps) {
  const strategyInfo = strategyId ? STRATEGY_INFO[strategyId] : null

  // company.traits가 있으면 TRAIT_REGISTRY에서 Trait 객체 조회
  const activeTraits: Trait[] = (company.traits ?? [])
    .map((id) => TRAIT_REGISTRY.find((t) => t.id === id))
    .filter((t): t is Trait => t != null)

  // 플레이어 기업의 조사 이력에서 이 경쟁사에 해당하는 기록을 추출
  const gameState = useGameStore((s) => s.gameState)
  const submitAction = useGameStore((s) => s.submitAction)
  const playerHistory = gameState?.companies[0]?.researchHistory ?? []

  // 조사 가능 여부 계산
  const player = gameState?.companies[0]
  const infoAssetCount = player?.assets.filter(a => {
    const def = ASSETS.find(d => d.id === a.assetId)
    return def?.sector === 'information'
  }).length ?? 0
  const researchUsed = player?.actionsThisTurn.filter(a => a.type === 'research').length ?? 0
  const remainingResearch = Math.max(0, infoAssetCount - researchUsed)
  const canResearch = remainingResearch > 0 && gameState?.phase === 'planning'

  // 포트폴리오 조사 결과 중 이 기업 것만 필터, 가장 최근 것 사용
  const competitorRecords = playerHistory.filter(
    (r) => r.result.type === 'competitor' &&
      (r.result as Extract<ResearchResult, { type: 'competitor' }>).companyId === company.id
  )
  const latestCompetitorRecord = competitorRecords.length > 0 ? competitorRecords[competitorRecords.length - 1] : null
  const competitorResult = latestCompetitorRecord?.result.type === 'competitor'
    ? (latestCompetitorRecord.result as Extract<ResearchResult, { type: 'competitor' }>)
    : null

  // 전략 조사 결과 중 이 기업 것만 필터, 가장 최근 것 사용
  const strategyRecords = playerHistory.filter(
    (r) => r.result.type === 'strategy' &&
      (r.result as Extract<ResearchResult, { type: 'strategy' }>).companyId === company.id
  )
  const latestStrategyRecord = strategyRecords.length > 0 ? strategyRecords[strategyRecords.length - 1] : null
  const strategyResult = latestStrategyRecord?.result.type === 'strategy'
    ? (latestStrategyRecord.result as Extract<ResearchResult, { type: 'strategy' }>)
    : null

  // assetId → Asset 이름/섹터 조회를 위한 맵
  const assetMap = Object.fromEntries(ASSETS.map((a) => [a.id, a]))

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-lg max-w-sm w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{isPlayer ? '⭐' : '🏢'}</span>
              <div>
                <h2 className="text-lg font-bold text-slate-100">{company.name}</h2>
                <span className="text-xs text-slate-400">순위 {rank}위</span>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl">✕</button>
          </div>
        </div>

        {/* 공개 정보 */}
        <div className="p-4 space-y-4">
          {/* 재무 현황 */}
          <Card header={<GlossaryText>재무 현황</GlossaryText>}>
            <StatRow label={<GlossaryText>순자산</GlossaryText>} value={<MoneyDisplay amount={company.netWorth} getBreakdown={() => getNetWorthBreakdown(company, gameState!)} />} />
            <StatRow label={<GlossaryText>보유 현금</GlossaryText>} value={<MoneyDisplay amount={company.cash} />} />
            <StatRow label={<GlossaryText>보유 자산</GlossaryText>} value={`${company.assets.length}개`} />
          </Card>

          {/* 섹터 지배 */}
          <Card header={<GlossaryText>섹터 현황</GlossaryText>}>
            {company.dominatedSectors.length > 0 ? (
              <div className="space-y-1">
                {company.dominatedSectors.map(sector => (
                  <div key={sector} className="flex justify-between items-center py-1">
                    <span className="text-slate-300">{SECTOR_NAMES[sector]}</span>
                    <Badge variant="boom" label={<GlossaryText>지배</GlossaryText>} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500"><GlossaryText>지배 중인 섹터 없음</GlossaryText></p>
            )}
          </Card>

          {/* 보유 특성 (특성이 있을 때만 표시) */}
          {activeTraits.length > 0 && (
            <Card header={<GlossaryText>보유 특성</GlossaryText>}>
              <TraitBar traits={activeTraits} />
            </Card>
          )}

          {/* 전략 힌트 (AI 경쟁사만) */}
          {!isPlayer && (
            <Card header={<GlossaryText>기업 동향</GlossaryText>}>
              {/* 전략 조사 결과가 있으면 구체적 전략명 표시, 없으면 힌트 또는 정보 없음 */}
              {strategyResult ? (
                <div className="space-y-1">
                  <p className="text-sm text-amber-300 font-medium">
                    {STRATEGY_DISPLAY_NAMES[strategyResult.strategyId] ?? strategyResult.strategyId}
                  </p>
                  {strategyInfo && (
                    <p className="text-xs text-slate-400">{strategyInfo.hint}</p>
                  )}
                  <p className="text-xs text-slate-500">턴 {latestStrategyRecord!.turn}에 조사됨</p>
                </div>
              ) : strategyInfo ? (
                <p className="text-sm text-slate-300"><GlossaryText>{strategyInfo.hint}</GlossaryText></p>
              ) : (
                <p className="text-sm text-slate-500">정보 없음</p>
              )}
            </Card>
          )}

          {/* 상세 정보: 포트폴리오 조사 결과 또는 잠금 안내 */}
          {!isPlayer && (
            <Card header={<GlossaryText>상세 정보</GlossaryText>}>
              {competitorResult ? (
                <div className="space-y-2">
                  {/* 조사 시점 표시 */}
                  <p className="text-xs text-slate-500">턴 {latestCompetitorRecord!.turn}에 조사됨</p>
                  {competitorResult.assets.length === 0 ? (
                    <p className="text-sm text-slate-400">보유 자산 없음</p>
                  ) : (
                    <div className="space-y-1">
                      {competitorResult.assets.map((owned, idx) => {
                        const asset = assetMap[owned.assetId]
                        return (
                          <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-700 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-200 truncate">
                                {asset?.name ?? owned.assetId}
                              </p>
                              <p className="text-xs text-slate-500">
                                {asset ? SECTOR_NAMES[asset.sector] : ''}{' '}
                                {owned.upgradeLevel > 0 && (
                                  <span className="text-amber-500">{UPGRADE_LABELS[owned.upgradeLevel] ?? `Lv${owned.upgradeLevel}`}</span>
                                )}
                              </p>
                            </div>
                            <MoneyDisplay amount={owned.currentValue} size="sm" />
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {/* 재조사 버튼 */}
                  {gameState?.phase === 'planning' && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
                      <Button variant="secondary" size="sm" fullWidth disabled={!canResearch}
                        onClick={() => { submitAction({ type: 'research', target: 'competitor', targetCompanyId: company.id }); onClose() }}>
                        🔄 재조사 ({remainingResearch}회)
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                /* 조사 기록 없음 — 조사 버튼 */
                <div className="space-y-3">
                  <div className="flex items-center gap-2 py-2">
                    <span className="text-slate-500">🔒</span>
                    <div>
                      <p className="text-sm text-slate-400"><GlossaryText>조사 필요</GlossaryText></p>
                      <p className="text-xs text-slate-500">
                        남은 조사: {remainingResearch}/{infoAssetCount}회
                      </p>
                    </div>
                  </div>
                  {gameState?.phase === 'planning' && (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        disabled={!canResearch}
                        onClick={() => {
                          submitAction({ type: 'research', target: 'competitor', targetCompanyId: company.id })
                          onClose()
                        }}
                      >
                        📋 포트폴리오
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        disabled={!canResearch}
                        onClick={() => {
                          submitAction({ type: 'research', target: 'strategy', targetCompanyId: company.id })
                          onClose()
                        }}
                      >
                        🎯 전략
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* 닫기 버튼 */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 text-sm transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
