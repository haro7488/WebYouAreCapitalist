import { useState } from 'react'
import { Card, Button, Badge } from '@components/common'
import { TrendingUp, BarChart3, AlertCircle, X } from 'lucide-react'
import type { ResearchResult, Sector, SectorTrend } from '@game/index'

// 섹터 한국어 이름
const SECTOR_NAMES: Record<Sector, string> = {
  food: '식품',
  tech: '테크',
  realEstate: '부동산',
  retail: '유통',
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

type ResearchStep = 'select' | 'sector' | 'result'

interface ResearchPanelProps {
  researchResult: ResearchResult | null
  onResearch: (target: 'market' | 'sector' | 'event', sector?: Sector) => void
  onClose: () => void
  actionPoints: number
  isFreeResearch: boolean
}

/** 조사 오버레이 패널: 3단계 (종류 선택 → 섹터 선택 → 결과 표시) */
export function ResearchPanel({ researchResult, onResearch, onClose, actionPoints, isFreeResearch }: ResearchPanelProps) {
  // researchResult가 있으면 result 단계부터 시작
  const [step, setStep] = useState<ResearchStep>(researchResult ? 'result' : 'select')
  const [result, setResult] = useState<ResearchResult | null>(researchResult)

  const canAfford = actionPoints > 0 || isFreeResearch
  const costLabel = isFreeResearch ? '무료' : '1 AP'

  // 조사 종류 선택
  const handleSelectTarget = (target: 'market' | 'sector' | 'event') => {
    if (!canAfford) return
    if (target === 'sector') {
      setStep('sector')
    } else {
      onResearch(target)
      setStep('result')
    }
  }

  // 섹터 선택 후 조사 실행
  const handleSelectSector = (sector: Sector) => {
    onResearch('sector', sector)
    setStep('result')
  }

  // 다른 조사 하기
  const handleRetry = () => {
    setResult(null)
    setStep('select')
  }

  // 실제 표시할 결과 (props 우선, 없으면 로컬 state)
  const displayResult = researchResult ?? result

  return (
    // backdrop
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      {/* 반투명 배경 */}
      <div className="absolute inset-0 bg-black/60" />

      {/* 패널: 모바일 하단 시트 / PC 중앙 모달 */}
      <div
        className="relative w-full sm:max-w-md bg-slate-800 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-5 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 transition-colors"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        {/* Step 1: 조사 종류 선택 */}
        {step === 'select' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">시장 조사</h2>
            <p className="text-sm text-slate-400">
              비용: <span className={isFreeResearch ? 'text-money-400' : 'text-slate-200'}>{costLabel}</span>
            </p>

            <div className="space-y-3">
              <button
                className="w-full text-left p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canAfford}
                onClick={() => handleSelectTarget('market')}
              >
                <div className="flex items-center gap-3">
                  <TrendingUp size={20} className="text-money-400 shrink-0" />
                  <div>
                    <div className="font-medium text-slate-100">시장 동향</div>
                    <div className="text-sm text-slate-400">글로벌 시장 변화 예측</div>
                  </div>
                </div>
              </button>

              <button
                className="w-full text-left p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canAfford}
                onClick={() => handleSelectTarget('sector')}
              >
                <div className="flex items-center gap-3">
                  <BarChart3 size={20} className="text-amber-400 shrink-0" />
                  <div>
                    <div className="font-medium text-slate-100">섹터 분석</div>
                    <div className="text-sm text-slate-400">특정 섹터의 트렌드 예측</div>
                  </div>
                </div>
              </button>

              <button
                className="w-full text-left p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canAfford}
                onClick={() => handleSelectTarget('event')}
              >
                <div className="flex items-center gap-3">
                  <AlertCircle size={20} className="text-sky-400 shrink-0" />
                  <div>
                    <div className="font-medium text-slate-100">이벤트 예측</div>
                    <div className="text-sm text-slate-400">다가올 이벤트 힌트</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: 섹터 선택 */}
        {step === 'sector' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">섹터 선택</h2>
            <p className="text-sm text-slate-400">분석할 섹터를 선택하세요</p>

            <div className="space-y-2">
              {(Object.keys(SECTOR_NAMES) as Sector[]).map((sector) => (
                <button
                  key={sector}
                  className="w-full text-left p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
                  onClick={() => handleSelectSector(sector)}
                >
                  <span className="font-medium text-slate-100">{SECTOR_NAMES[sector]}</span>
                </button>
              ))}
            </div>

            <Button variant="secondary" fullWidth onClick={() => setStep('select')}>
              뒤로
            </Button>
          </div>
        )}

        {/* Step 3: 결과 표시 */}
        {step === 'result' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">조사 결과</h2>

            {displayResult ? (
              <Card>
                {displayResult.type === 'market' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={18} className="text-money-400" />
                      <span className="font-medium text-slate-200">시장 동향</span>
                    </div>
                    <p className="text-sm text-slate-300">
                      시장 전환까지 약 <span className="text-slate-100 font-medium">{displayResult.turnsToChange}턴</span> 남았으며,
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">예상 다음 상태:</span>
                      <Badge
                        variant={displayResult.likelyNext}
                        label={displayResult.likelyNext === 'boom' ? '호황' : displayResult.likelyNext === 'stable' ? '안정' : '불황'}
                      />
                    </div>
                  </div>
                )}

                {displayResult.type === 'sector' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={18} className="text-amber-400" />
                      <span className="font-medium text-slate-200">섹터 분석</span>
                    </div>
                    <p className="text-sm text-slate-300">
                      <span className="text-slate-100 font-medium">{SECTOR_NAMES[displayResult.sector]}</span> 섹터의 다음 트렌드:
                    </p>
                    <Badge
                      variant={TREND_BADGE_VARIANT[displayResult.nextTrend]}
                      label={TREND_LABELS[displayResult.nextTrend]}
                    />
                  </div>
                )}

                {displayResult.type === 'event' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={18} className="text-sky-400" />
                      <span className="font-medium text-slate-200">이벤트 예측</span>
                    </div>
                    <p className="text-sm text-slate-300">{displayResult.hint}</p>
                  </div>
                )}
              </Card>
            ) : (
              <div className="text-center text-slate-400 py-4">조사 결과를 불러오는 중...</div>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={handleRetry} disabled={!canAfford}>
                다른 조사
              </Button>
              <Button variant="primary" className="flex-1" onClick={onClose}>
                확인
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
