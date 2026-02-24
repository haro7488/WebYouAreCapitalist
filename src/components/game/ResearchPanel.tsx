import { useState } from 'react'
import { Card, Badge } from '@components/common'
import { GlossaryText } from '@components/glossary'
import { TrendingUp, BarChart3, AlertCircle, AlertTriangle, ClipboardList, Landmark } from 'lucide-react'
import { useGameStore } from '@stores/gameStore'
import { ASSETS } from '@game/constants'
import type { ResearchResult, Sector, SectorTrend, OwnedAsset } from '@game/index'
import type { ResearchRecord } from '@game/types'

// 섹터 한국어 이름
const SECTOR_NAMES: Record<Sector, string> = {
  food: '외식',
  tech: '기술',
  realEstate: '부동산',
  logistics: '물류',
  energy: '에너지',
  information: '정보',
  finance: '금융',
}

// 섹터 트렌드 → Badge variant 매핑
const TREND_BADGE_VARIANT: Record<SectorTrend, 'boom' | 'stable' | 'recession'> = {
  hot: 'boom',
  neutral: 'stable',
  cold: 'recession',
}

// 섹터 트렌드 한국어 표시
const TREND_LABELS: Record<SectorTrend, string> = {
  hot: '호황',
  neutral: '보통',
  cold: '침체',
}

interface ResearchPanelProps {
  onResearch: (target: 'market' | 'sector' | 'event' | 'government', sector?: Sector) => void
}

/** 조사 탭 인라인 뷰 */
export function ResearchPanel({ onResearch }: ResearchPanelProps) {
  const gameState = useGameStore((s) => s.gameState)
  const [showSectorSelect, setShowSectorSelect] = useState(false)

  // 정보 자산 개수 및 남은 조사 횟수 계산
  const infoAssetCount = gameState?.companies[0].assets.filter(
    (ownedAsset: OwnedAsset) => {
      const assetData = ASSETS.find(a => a.id === ownedAsset.assetId)
      return assetData?.sector === 'information'
    }
  ).length ?? 0

  const researchCount = gameState?.companies[0].actionsThisTurn.filter(
    (action) => action.type === 'research'
  ).length ?? 0

  const remainingResearch = Math.max(0, infoAssetCount - researchCount)
  const hasInfoAssets = infoAssetCount > 0
  const canResearch = hasInfoAssets && remainingResearch > 0

  // gameStore에서 직접 가져옴
  const researchResult = gameState?.companies[0].researchResult ?? null
  const researchHistory: ResearchRecord[] = gameState?.companies[0].researchHistory ?? []
  // 최신순 정렬
  const sortedHistory = [...researchHistory].sort((a, b) => b.turn - a.turn)

  // 조사 버튼 핸들러
  const handleMarket = () => {
    if (!canResearch) return
    onResearch('market')
    setShowSectorSelect(false)
  }

  const handleSector = () => {
    if (!canResearch) return
    setShowSectorSelect((prev) => !prev)
  }

  const handleSelectSector = (sector: Sector) => {
    onResearch('sector', sector)
    setShowSectorSelect(false)
  }

  const handleEvent = () => {
    if (!canResearch) return
    onResearch('event')
    setShowSectorSelect(false)
  }

  const handleGovernment = () => {
    if (!canResearch) return
    onResearch('government')
    setShowSectorSelect(false)
  }

  // 조사 기록 요약 텍스트 생성
  const summarizeResult = (result: ResearchResult): string => {
    switch (result.type) {
      case 'market': {
        const nextLabel = result.likelyNext === 'boom' ? '호황' : result.likelyNext === 'stable' ? '보합' : '불황'
        return `시장 동향 — ${result.turnsToChange}턴 후 ${nextLabel} 전환 예상`
      }
      case 'sector':
        return `섹터 분석 — ${SECTOR_NAMES[result.sector]} → ${TREND_LABELS[result.nextTrend]}`
      case 'event':
        return `이벤트 예측 — ${result.hint.slice(0, 30)}${result.hint.length > 30 ? '...' : ''}`
      case 'competitor':
        return `경쟁사 분석 — ${result.companyName} 자산 ${result.assets.length}개`
      case 'strategy':
        return `전략 분석 — ${result.companyName} 전략 파악`
      case 'share':
        return `시장 점유율 — ${SECTOR_NAMES[result.sector]} 섹터`
      case 'government': {
        const trendLabel = result.inflationTrend === 'rising' ? '상승' : result.inflationTrend === 'falling' ? '하락' : '안정'
        return `정부 정책 — 인플레이션 ${(result.currentInflation * 100).toFixed(1)}% (${trendLabel})`
      }
      default:
        return '조사 결과'
    }
  }

  // 조사 기록 아이콘
  const historyIcon = (result: ResearchResult) => {
    switch (result.type) {
      case 'market':
        return <TrendingUp size={14} className="text-money-400 shrink-0" />
      case 'sector':
        return <BarChart3 size={14} className="text-amber-400 shrink-0" />
      case 'event':
        return <AlertCircle size={14} className="text-sky-400 shrink-0" />
      case 'government':
        return <Landmark size={14} className="text-violet-400 shrink-0" />
      default:
        return <ClipboardList size={14} className="text-slate-400 shrink-0" />
    }
  }

  return (
    <div className="space-y-4">
      {/* 제목 */}
      <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
        🔍 조사
      </h2>

      {/* 정보 요약 배너 */}
      <div className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 flex items-center justify-between text-sm">
        <span className="text-slate-400">
          정보자산: <span className="text-slate-200 font-medium">{infoAssetCount}개</span>
        </span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">
          남은 조사:{' '}
          <span className={remainingResearch > 0 ? 'text-blue-400 font-medium' : 'text-slate-500 font-medium'}>
            {remainingResearch}/{infoAssetCount}회
          </span>
        </span>
      </div>

      {/* 경고 배너 */}
      {!hasInfoAssets && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">정보 자산 필요</p>
            <p className="text-xs text-red-300/80 mt-0.5">
              시장 조사를 하려면 정보 섹터 자산을 보유해야 합니다
            </p>
          </div>
        </div>
      )}
      {hasInfoAssets && remainingResearch <= 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-400">조사 횟수 소진</p>
            <p className="text-xs text-amber-300/80 mt-0.5">
              이번 턴 조사 가능 횟수를 모두 사용했습니다
            </p>
          </div>
        </div>
      )}

      {/* 조사 버튼 4열 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* 시장 동향 */}
        <button
          className="text-left p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-slate-600"
          disabled={!canResearch}
          onClick={handleMarket}
        >
          <div className="flex flex-col items-center gap-1.5 text-center">
            <TrendingUp size={20} className="text-money-400" />
            <div className="font-medium text-slate-100 text-xs leading-tight">
              <GlossaryText>시장 동향</GlossaryText>
            </div>
            <div className="text-xs text-slate-400 leading-tight hidden sm:block">
              <GlossaryText>글로벌 변화 예측</GlossaryText>
            </div>
          </div>
        </button>

        {/* 섹터 분석 */}
        <button
          className={`text-left p-3 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed border ${
            showSectorSelect
              ? 'bg-amber-500/20 border-amber-500/50'
              : 'bg-slate-700/50 hover:bg-slate-700 border-slate-600'
          }`}
          disabled={!canResearch}
          onClick={handleSector}
        >
          <div className="flex flex-col items-center gap-1.5 text-center">
            <BarChart3 size={20} className="text-amber-400" />
            <div className="font-medium text-slate-100 text-xs leading-tight">
              <GlossaryText>섹터 분석</GlossaryText>
            </div>
            <div className="text-xs text-slate-400 leading-tight hidden sm:block">
              <GlossaryText>트렌드 예측</GlossaryText>
            </div>
          </div>
        </button>

        {/* 이벤트 예측 */}
        <button
          className="text-left p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-slate-600"
          disabled={!canResearch}
          onClick={handleEvent}
        >
          <div className="flex flex-col items-center gap-1.5 text-center">
            <AlertCircle size={20} className="text-sky-400" />
            <div className="font-medium text-slate-100 text-xs leading-tight">
              <GlossaryText>이벤트 예측</GlossaryText>
            </div>
            <div className="text-xs text-slate-400 leading-tight hidden sm:block">
              <GlossaryText>다가올 이벤트</GlossaryText>
            </div>
          </div>
        </button>

        {/* 정부 정책 */}
        <button
          className="text-left p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-slate-600"
          disabled={!canResearch}
          onClick={handleGovernment}
        >
          <div className="flex flex-col items-center gap-1.5 text-center">
            <Landmark size={20} className="text-violet-400" />
            <div className="font-medium text-slate-100 text-xs leading-tight">
              <GlossaryText>정부 정책</GlossaryText>
            </div>
            <div className="text-xs text-slate-400 leading-tight hidden sm:block">
              <GlossaryText>인플레이션 동향</GlossaryText>
            </div>
          </div>
        </button>
      </div>

      {/* 섹터 선택 인라인 그리드 (토글) */}
      {showSectorSelect && (
        <div className="bg-slate-800 border border-amber-500/30 rounded-lg p-3 space-y-2">
          <p className="text-xs text-amber-400 font-medium mb-2">분석할 섹터 선택</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {(Object.keys(SECTOR_NAMES) as Sector[]).map((sector) => (
              <button
                key={sector}
                className="py-2 px-1 rounded-md bg-slate-700 hover:bg-amber-500/20 hover:border-amber-500/50 border border-slate-600 transition-colors text-center text-xs text-slate-200 font-medium"
                onClick={() => handleSelectSector(sector)}
              >
                {SECTOR_NAMES[sector]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 이번 턴 조사 결과 */}
      {researchResult && (
        <Card>
          <div className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wide">이번 턴 결과</div>
          {researchResult.type === 'market' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-money-400" />
                <span className="font-medium text-slate-200 text-sm">
                  <GlossaryText>시장 동향</GlossaryText>
                </span>
              </div>
              <p className="text-sm text-slate-300">
                시장 전환까지 약 <span className="text-slate-100 font-medium">{researchResult.turnsToChange}턴</span> 남았습니다.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">
                  <GlossaryText>예상 다음 상태:</GlossaryText>
                </span>
                <Badge
                  variant={researchResult.likelyNext}
                  label={researchResult.likelyNext === 'boom' ? '호황' : researchResult.likelyNext === 'stable' ? '안정' : '불황'}
                />
              </div>
            </div>
          )}

          {researchResult.type === 'sector' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-amber-400" />
                <span className="font-medium text-slate-200 text-sm">
                  <GlossaryText>섹터 분석</GlossaryText>
                </span>
              </div>
              <p className="text-sm text-slate-300">
                <GlossaryText>
                  {`${SECTOR_NAMES[researchResult.sector]} 섹터의 다음 트렌드:`}
                </GlossaryText>
              </p>
              <Badge
                variant={TREND_BADGE_VARIANT[researchResult.nextTrend]}
                label={TREND_LABELS[researchResult.nextTrend]}
              />
            </div>
          )}

          {researchResult.type === 'event' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-sky-400" />
                <span className="font-medium text-slate-200 text-sm">
                  <GlossaryText>이벤트 예측</GlossaryText>
                </span>
              </div>
              <p className="text-sm text-slate-300">
                <GlossaryText>{researchResult.hint}</GlossaryText>
              </p>
            </div>
          )}

          {researchResult.type === 'government' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Landmark size={16} className="text-violet-400" />
                <span className="font-medium text-slate-200 text-sm">
                  <GlossaryText>정부 정책 동향</GlossaryText>
                </span>
              </div>
              {/* 인플레이션 현황 */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">현재 인플레이션</span>
                <span className="text-slate-100 font-medium">
                  {(researchResult.currentInflation * 100).toFixed(2)}%
                </span>
              </div>
              {/* 인플레이션 트렌드 */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">전망</span>
                <Badge
                  variant={
                    researchResult.inflationTrend === 'rising'
                      ? 'recession'
                      : researchResult.inflationTrend === 'falling'
                        ? 'boom'
                        : 'stable'
                  }
                  label={
                    researchResult.inflationTrend === 'rising'
                      ? '상승 예상'
                      : researchResult.inflationTrend === 'falling'
                        ? '하락 예상'
                        : '안정 예상'
                  }
                />
              </div>
              {/* 예상 정책 */}
              {researchResult.likelyPolicy && (
                <div className="bg-slate-800 rounded-md p-2 space-y-0.5">
                  <p className="text-xs font-medium text-violet-300">
                    예상 정책: {researchResult.likelyPolicy.title}
                  </p>
                  <p className="text-xs text-slate-400 leading-snug">
                    {researchResult.likelyPolicy.description}
                  </p>
                </div>
              )}
              {/* 영향 섹터 */}
              {researchResult.affectedSectors.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-slate-500">영향 섹터:</span>
                  {researchResult.affectedSectors.map((sector) => (
                    <span
                      key={sector}
                      className="text-xs bg-violet-500/15 text-violet-300 px-1.5 py-0.5 rounded"
                    >
                      {SECTOR_NAMES[sector]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* 조사 기록 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 py-1">
          <ClipboardList size={15} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-400">조사 기록</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        {sortedHistory.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">조사 기록이 없습니다</p>
        ) : (
          <div className="space-y-1.5">
            {sortedHistory.map((record, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50"
              >
                <span className="text-xs text-slate-500 font-mono shrink-0 mt-0.5 w-10">
                  턴 {record.turn}
                </span>
                {historyIcon(record.result)}
                <span className="text-xs text-slate-300 leading-tight">
                  {summarizeResult(record.result)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
