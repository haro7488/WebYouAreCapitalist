import { useGameStore } from '@stores/gameStore'
import { findSector, calculateResearchSuccessRate, RND_SECTOR, SECTOR_MAX_UPGRADE_LEVEL, RESEARCH_POINT_COST } from '@game/index'
import type { Sector } from '@game/index'
import { Card, Button, Badge } from '@components/common'
import { GlossaryText } from '@components/glossary'
import { SECTOR_NAMES } from '@/constants/sectors'

// 연구 가능 섹터 순서 (R&D 자체도 강화 가능)
const RESEARCH_SECTORS: Sector[] = ['food', 'tech', 'realEstate', 'logistics', 'energy', 'finance', 'information', 'rnd']

interface ResearchLabProps {
  /** 외부에서 선택한 섹터 (포트폴리오에서 이동 시) */
  selectedSector?: Sector
  onSectorSelect?: (sector: Sector) => void
}

/** 연구 탭 — 연구포인트로 섹터 강화 */
export function ResearchLab({ selectedSector, onSectorSelect }: ResearchLabProps) {
  const gameState = useGameStore((s) => s.gameState)
  const submitAction = useGameStore((s) => s.submitAction)

  if (!gameState) return null

  const player = gameState.companies[0]
  const { researchPoints, sectorUpgrades, researchPity, assets } = player
  const lastResult = gameState.lastResearchResult

  // R&D 구좌 수
  const rndAssets = assets.filter(a => a.assetId === RND_SECTOR).length

  return (
    <div className="space-y-4">
      {/* 연구 현황 요약 */}
      <Card header={<GlossaryText>연구 현황</GlossaryText>}>
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-slate-400">연구포인트</span>
          <span className="text-lg font-bold text-purple-400">🔬 {researchPoints}</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-slate-400">R&D 구좌</span>
          <span className="text-sm text-slate-300">{rndAssets}개 ({rndAssets}포인트/턴)</span>
        </div>
        {(sectorUpgrades[RND_SECTOR] ?? 0) > 0 && (
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-slate-400">R&D 강화 보너스</span>
            <span className="text-sm text-purple-300">
              +{((sectorUpgrades[RND_SECTOR] ?? 0) * 2)}% 성공률
            </span>
          </div>
        )}
      </Card>

      {/* 연구 결과 피드백 */}
      {lastResult && (
        <div className={`px-4 py-3 rounded-lg border ${
          lastResult.success
            ? 'bg-emerald-900/30 border-emerald-700 text-emerald-300'
            : 'bg-red-900/30 border-red-700 text-red-300'
        }`}>
          <span className="font-medium">
            {lastResult.success
              ? `✅ ${SECTOR_NAMES[lastResult.sector]} Lv.${lastResult.newLevel} 강화 성공!`
              : `❌ ${SECTOR_NAMES[lastResult.sector]} 강화 실패 — 다음 시도 확률 상승`
            }
          </span>
        </div>
      )}

      {/* 섹터별 연구 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {RESEARCH_SECTORS.map((sector) => {
          const profile = findSector(sector)
          if (!profile) return null

          const currentLevel = sectorUpgrades[sector] ?? 0
          const isMaxLevel = currentLevel >= SECTOR_MAX_UPGRADE_LEVEL
          const hasUnits = assets.some(a => a.assetId === sector)
          const successRate = calculateResearchSuccessRate(player, sector)
          const pity = researchPity[sector] ?? 0
          const canResearch = researchPoints >= RESEARCH_POINT_COST && hasUnits && !isMaxLevel
          const isSelected = selectedSector === sector
          const isRnd = sector === RND_SECTOR

          return (
            <div
              key={sector}
              className={`rounded-lg border overflow-hidden transition-colors ${
                isSelected
                  ? 'border-purple-500 bg-purple-900/20'
                  : 'border-slate-700/50 bg-slate-800/40'
              }`}
              onClick={() => onSectorSelect?.(sector)}
            >
              {/* 헤더 */}
              <div className="px-3 py-2 flex items-center gap-2 bg-slate-800/60">
                <span className="text-sm font-semibold text-slate-200">
                  {profile.icon} <GlossaryText>{SECTOR_NAMES[sector]}</GlossaryText>
                </span>
                <span className="text-xs text-amber-400 font-medium">
                  Lv.{currentLevel}/{SECTOR_MAX_UPGRADE_LEVEL}
                </span>
                {isRnd && (
                  <Badge variant="info" label="글로벌 보너스" />
                )}
                {!hasUnits && (
                  <span className="text-[10px] text-slate-500 ml-auto">구좌 없음</span>
                )}
              </div>

              {/* 본문 */}
              <div className="px-3 py-2 space-y-2">
                {/* 레벨 바 */}
                <div className="flex gap-0.5">
                  {Array.from({ length: SECTOR_MAX_UPGRADE_LEVEL }, (_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1.5 rounded-full ${
                        i < currentLevel ? 'bg-purple-500' : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                {isMaxLevel ? (
                  <p className="text-xs text-amber-400 font-medium text-center py-1">최대 레벨 달성</p>
                ) : (
                  <>
                    {/* 성공 확률 */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">성공 확률</span>
                      <span className={`font-medium ${successRate >= 0.5 ? 'text-emerald-400' : successRate >= 0.3 ? 'text-amber-400' : 'text-red-400'}`}>
                        {Math.round(successRate * 100)}%
                      </span>
                    </div>

                    {/* 실패 횟수 (pity) */}
                    {pity > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">연속 실패</span>
                        <span className="text-orange-400">{pity}회 (+{pity * 15}%)</span>
                      </div>
                    )}

                    {/* 소득 연구 설명 */}
                    <p className="text-[10px] text-slate-500">
                      {isRnd
                        ? '강화 시 전체 섹터 연구 성공률 +2%'
                        : `강화 시 소득 x1.08 (현재 x${Math.pow(1.08, currentLevel).toFixed(2)})`
                      }
                    </p>

                    {/* 연구 시도 버튼 */}
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      disabled={!canResearch}
                      onClick={(e) => {
                        e.stopPropagation()
                        submitAction({ type: 'sectorUpgrade', sector })
                      }}
                    >
                      {!hasUnits
                        ? '구좌 필요'
                        : researchPoints < RESEARCH_POINT_COST
                          ? '포인트 부족'
                          : `연구 시도 (${RESEARCH_POINT_COST}포인트)`
                      }
                    </Button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
