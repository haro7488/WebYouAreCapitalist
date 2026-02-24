import { Card, MoneyDisplay, StatRow, Badge } from '@components/common'
import { GlossaryText } from '@components/glossary'
import type { Company, Sector } from '@game/types'

// 전략 정보 매핑
const STRATEGY_INFO: Record<string, { name: string; hint: string }> = {
  conservative: { name: '보수형', hint: '안정적인 분산 투자 행보' },
  aggressive: { name: '공격형', hint: '공격적인 고수익 추구 행보' },
  domination: { name: '지배형', hint: '특정 섹터 집중 투자 행보' },
  opportunist: { name: '기회형', hint: '트렌드 추종 매매 행보' },
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
            <StatRow label={<GlossaryText>순자산</GlossaryText>} value={<MoneyDisplay amount={company.netWorth} />} />
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

          {/* 전략 힌트 (AI 경쟁사만) */}
          {!isPlayer && (
            <Card header={<GlossaryText>기업 동향</GlossaryText>}>
              {strategyInfo ? (
                <p className="text-sm text-slate-300"><GlossaryText>{strategyInfo.hint}</GlossaryText></p>
              ) : (
                <p className="text-sm text-slate-500">정보 없음</p>
              )}
            </Card>
          )}

          {/* 비밀 정보 자리 (Proto-4 연동용) */}
          {!isPlayer && (
            <Card header={<GlossaryText>상세 정보</GlossaryText>}>
              <div className="flex items-center gap-2 py-2">
                <span className="text-slate-500">🔒</span>
                <div>
                  <p className="text-sm text-slate-400"><GlossaryText>조사 필요</GlossaryText></p>
                  <p className="text-xs text-slate-500"><GlossaryText>AP를 소모하여 경쟁사를 조사할 수 있습니다</GlossaryText></p>
                </div>
              </div>
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
