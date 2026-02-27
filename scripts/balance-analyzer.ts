/**
 * 게임 밸런스 종합 분석기
 * 실행: npx tsx scripts/balance-analyzer.ts
 *
 * 다수 시드 × 다수 전략으로 시뮬레이션 후 밸런스 지표를 측정한다.
 */

import { startNewRun } from '../src/game/run'
import { createInitialMeta } from '../src/game/meta'
import { submitAction, submitEventChoice, submitGovernmentChoice, processGovernmentPhase, resolvePhase, advanceTurn } from '../src/game/engine'
import { calculateCompanyNetWorth, calculateCompanyNetIncome, calculateDominance, calculateScore, calculateCompanySectorIncome } from '../src/game/economy'
import { SECTORS, DEFAULT_GAME_CONFIG, ALL_SECTORS } from '../src/game/constants'
import { getAIActions, getAIEventChoice } from '../src/game/competitor/ai'
import type { GameState, Sector, DominanceInfo, MetaState, StrategyId } from '../src/game/types'

// === 설정 ===
const SEED_COUNT = 200
const SEED_START = 1000 // 시작 시드

// === 전략 정의 ===

type SimStrategy = {
  name: string
  /** planning 페이즈에서 액션 결정 */
  act: (state: GameState) => GameState
  /** 이벤트 선택 */
  chooseEvent: (state: GameState) => string
}

/** 플레이어(companies[0])에게 AI 전략을 적용하는 래퍼 */
function makeAIStrategy(strategyId: StrategyId, label: string): SimStrategy {
  return {
    name: `AI:${label}`,
    act: (state) => {
      // AI 전략을 플레이어에게 적용
      const modifiedState = {
        ...state,
        aiStrategies: { ...state.aiStrategies, [state.companies[0].id]: strategyId },
      }
      const actions = getAIActions(modifiedState, modifiedState.companies[0])
      let s = state
      for (const action of actions) {
        if (s.phase !== 'planning') break
        s = submitAction(s, action)
      }
      if (s.phase === 'planning') {
        s = submitAction(s, { type: 'endTurn' })
      }
      return s
    },
    chooseEvent: (state) => {
      if (!state.currentEvent) return ''
      const modifiedState = {
        ...state,
        aiStrategies: { ...state.aiStrategies, [state.companies[0].id]: strategyId },
      }
      return getAIEventChoice(modifiedState, modifiedState.companies[0], state.currentEvent)
    },
  }
}

/** 기본 플레이어 전략: 가장 싼 것부터 매수 */
function makeBuyStrategy(
  name: string,
  filter: (sector: typeof SECTORS[number], state: GameState) => boolean,
  maxBuys: number = 99,
): SimStrategy {
  return {
    name,
    act: (state) => {
      let s = state
      let bought = 0
      const player = s.companies[0]
      let cash = player.cash

      // 조건에 맞는 섹터 매수
      const affordable = SECTORS
        .filter(sec => filter(sec, s) && sec.baseCost <= cash * 1.2) // 대략적 필터
        .sort((a, b) => a.baseCost - b.baseCost)

      for (const sec of affordable) {
        if (bought >= maxBuys || s.phase !== 'planning') break
        const action = { type: 'buy' as const, sector: sec.id as Sector }
        const next = submitAction(s, action)
        if (next !== s) {
          cash = next.companies[0].cash
          s = next
          bought++
        }
      }

      // 연구 포인트 사용: 가장 많이 보유한 섹터 업그레이드
      if (s.phase === 'planning' && s.companies[0].researchPoints > 0) {
        const counts: Partial<Record<Sector, number>> = {}
        for (const a of s.companies[0].assets) {
          counts[a.assetId] = (counts[a.assetId] ?? 0) + 1
        }
        const bestSector = ALL_SECTORS
          .filter(sec => (counts[sec] ?? 0) > 0)
          .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))[0]
        if (bestSector) {
          const next = submitAction(s, { type: 'sectorUpgrade', sector: bestSector })
          if (next !== s) s = next
        }
      }

      if (s.phase === 'planning') {
        s = submitAction(s, { type: 'endTurn' })
      }
      return s
    },
    chooseEvent: (state) => {
      if (!state.currentEvent) return ''
      // 가장 돈이 많은 선택지
      const sorted = [...state.currentEvent.choices].sort(
        (a, b) => (b.effect.money ?? 0) - (a.effect.money ?? 0),
      )
      return sorted[0].id
    },
  }
}

// 전략 목록
const strategies: SimStrategy[] = [
  // 플레이어 전략 5가지
  makeBuyStrategy('T1 러시 (싼 거 많이)', (sec) => sec.baseCost <= 800),
  makeBuyStrategy('T2 집중 (중간 자산)', (sec) => sec.baseCost >= 800 && sec.baseCost <= 1200),
  makeBuyStrategy('분산 투자', () => true, 1), // 턴당 1개씩
  makeBuyStrategy('T3 저축 (큰 거)', (sec) => sec.baseCost >= 1200),
  makeBuyStrategy('업그레이드 집중', (sec) => sec.baseCost <= 1000, 2),
  // AI 전략 4가지
  makeAIStrategy('conservative', '보수형'),
  makeAIStrategy('aggressive', '공격형'),
  makeAIStrategy('domination', '지배형'),
  makeAIStrategy('opportunist', '기회형'),
]

// === 지표 수집 ===

interface RunMetrics {
  finalNetWorth: number
  finalScore: number
  finalRank: number // 1=1위
  bankruptTurns: number
  finalAssetCount: number
  finalInfluence: number
  dominatedSectorCount: number
  // 섹터별 투자/수입 추적
  sectorInvestment: Record<Sector, number>
  sectorIncome: Record<Sector, number>
  sectorBuyCount: Record<Sector, number>
  // AI 성과
  aiNetWorths: number[]
  // 시장 분포
  marketTurns: { boom: number; stable: number; recession: number }
}

interface StrategyReport {
  name: string
  runs: number
  avgNetWorth: number
  medNetWorth: number
  minNetWorth: number
  maxNetWorth: number
  avgScore: number
  avgRank: number
  winRate: number // 1위 비율
  avgBankruptTurns: number
  avgAssets: number
  avgInfluence: number
  avgDominatedSectors: number
  // 섹터 ROI
  sectorROI: Record<Sector, { avgROI: number; buyRate: number }>
  // AI 비교
  avgAiNetWorth: number
  aiWinRate: number // AI 중 하나라도 플레이어보다 높은 비율
}

function initSectorRecord(): Record<Sector, number> {
  const r = {} as Record<Sector, number>
  for (const s of ALL_SECTORS) r[s] = 0
  return r
}

// === 시뮬레이션 코어 ===

function simulateRun(strategy: SimStrategy, seed: number, meta: MetaState): RunMetrics {
  const config = { ...DEFAULT_GAME_CONFIG, seed }
  let state = startNewRun(meta, config)

  const metrics: RunMetrics = {
    finalNetWorth: 0,
    finalScore: 0,
    finalRank: 1,
    bankruptTurns: 0,
    finalAssetCount: 0,
    finalInfluence: 0,
    dominatedSectorCount: 0,
    sectorInvestment: initSectorRecord(),
    sectorIncome: initSectorRecord(),
    sectorBuyCount: initSectorRecord(),
    aiNetWorths: [],
    marketTurns: { boom: 0, stable: 0, recession: 0 },
  }

  // 이전 턴 자산 기록 (투자 추적용)
  let prevAssetIds: Set<string> = new Set()

  for (let t = 1; t <= state.maxTurns && !state.isGameOver; t++) {
    // planning이 아니면 복구
    if (state.phase !== 'planning') {
      let recovery = 0
      while (state.phase !== 'planning' && !state.isGameOver && recovery++ < 20) {
        if (state.phase === 'government') {
          state = state.governmentEvent?.choices
            ? submitGovernmentChoice(state, state.governmentEvent.choices[0].id)
            : processGovernmentPhase(state)
        } else if (state.phase === 'event') {
          state = state.currentEvent
            ? submitEventChoice(state, state.currentEvent.choices[0].id)
            : resolvePhase(state)
        } else if (state.phase === 'resolution') {
          state = resolvePhase(state)
        } else if (state.phase === 'result') {
          state = advanceTurn(state)
        } else break
      }
      if (state.phase !== 'planning') break
    }

    // 시장 상태 기록
    metrics.marketTurns[state.market.condition]++

    // 전략 실행
    const prevCash = state.companies[0].cash
    state = strategy.act(state)

    // 새로 매수한 자산 추적
    const currentAssetIds = new Set(state.companies[0].assets.map((_, i) => `${i}`))
    for (const owned of state.companies[0].assets) {
      const key = `${owned.assetId}-${owned.purchaseTurn ?? t}`
      if (!prevAssetIds.has(key)) {
        metrics.sectorInvestment[owned.assetId] += owned.currentValue // 대략적 매입가
        metrics.sectorBuyCount[owned.assetId]++
      }
    }
    prevAssetIds = new Set(state.companies[0].assets.map(a => `${a.assetId}-${a.purchaseTurn ?? t}`))

    // 파산 추적
    if (state.companies[0].cash < 0) {
      metrics.bankruptTurns++
    }

    // Phase 진행: planning → government → event → resolution → result
    let safety = 0
    while (state.phase !== 'result' && !state.isGameOver && safety++ < 20) {
      if (state.phase === 'planning') {
        state = submitAction(state, { type: 'endTurn' })
      } else if (state.phase === 'government') {
        if (state.governmentEvent?.choices) {
          state = submitGovernmentChoice(state, state.governmentEvent.choices[0].id)
        } else {
          state = processGovernmentPhase(state)
        }
      } else if (state.phase === 'event') {
        if (state.currentEvent) {
          const choiceId = strategy.chooseEvent(state)
          state = submitEventChoice(state, choiceId || state.currentEvent.choices[0].id)
        } else {
          state = resolvePhase(state)
        }
      } else if (state.phase === 'resolution') {
        state = resolvePhase(state)
      } else break
    }

    // result 페이즈에서 섹터 수입 기록
    if (state.phase === 'result') {
      const player = state.companies[0]
      for (const sector of ALL_SECTORS) {
        const income = calculateCompanySectorIncome(player, sector, state)
        metrics.sectorIncome[sector] += income
      }
      state = advanceTurn(state)
    }
  }

  // 최종 결과 수집
  const player = state.companies[0]
  metrics.finalNetWorth = Math.floor(calculateCompanyNetWorth(player))
  metrics.finalScore = calculateScore(state)
  metrics.finalAssetCount = player.assets.length
  metrics.finalInfluence = player.influence

  const dominance = calculateDominance(player.assets)
  metrics.dominatedSectorCount = (Object.values(dominance) as DominanceInfo[])
    .filter(d => d.level === 'dominant').length

  // AI 순자산
  for (let i = 1; i < state.companies.length; i++) {
    metrics.aiNetWorths.push(Math.floor(calculateCompanyNetWorth(state.companies[i])))
  }

  // 순위 계산
  const allNW = state.companies.map(c => calculateCompanyNetWorth(c))
  const playerNW = allNW[0]
  metrics.finalRank = allNW.filter(nw => nw > playerNW).length + 1

  return metrics
}

// === 통계 계산 ===

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function analyzeStrategy(name: string, allMetrics: RunMetrics[]): StrategyReport {
  const n = allMetrics.length
  const netWorths = allMetrics.map(m => m.finalNetWorth)
  const scores = allMetrics.map(m => m.finalScore)
  const ranks = allMetrics.map(m => m.finalRank)

  // 섹터 ROI 계산
  const sectorROI = {} as Record<Sector, { avgROI: number; buyRate: number }>
  for (const sector of ALL_SECTORS) {
    const totalInvestment = allMetrics.reduce((s, m) => s + m.sectorInvestment[sector], 0)
    const totalIncome = allMetrics.reduce((s, m) => s + m.sectorIncome[sector], 0)
    const buyCount = allMetrics.reduce((s, m) => s + m.sectorBuyCount[sector], 0)
    sectorROI[sector] = {
      avgROI: totalInvestment > 0 ? totalIncome / totalInvestment : 0,
      buyRate: buyCount / n,
    }
  }

  // AI 비교
  const avgAiNW = allMetrics.reduce((s, m) =>
    s + m.aiNetWorths.reduce((a, b) => a + b, 0) / Math.max(1, m.aiNetWorths.length), 0) / n
  const aiWinRate = allMetrics.filter(m =>
    m.aiNetWorths.some(aiNW => aiNW > m.finalNetWorth)).length / n

  return {
    name,
    runs: n,
    avgNetWorth: Math.floor(netWorths.reduce((a, b) => a + b, 0) / n),
    medNetWorth: Math.floor(median(netWorths)),
    minNetWorth: Math.min(...netWorths),
    maxNetWorth: Math.max(...netWorths),
    avgScore: Math.floor(scores.reduce((a, b) => a + b, 0) / n),
    avgRank: +(ranks.reduce((a, b) => a + b, 0) / n).toFixed(2),
    winRate: +(allMetrics.filter(m => m.finalRank === 1).length / n * 100).toFixed(1),
    avgBankruptTurns: +(allMetrics.reduce((s, m) => s + m.bankruptTurns, 0) / n).toFixed(1),
    avgAssets: +(allMetrics.reduce((s, m) => s + m.finalAssetCount, 0) / n).toFixed(1),
    avgInfluence: +(allMetrics.reduce((s, m) => s + m.finalInfluence, 0) / n).toFixed(1),
    avgDominatedSectors: +(allMetrics.reduce((s, m) => s + m.dominatedSectorCount, 0) / n).toFixed(1),
    sectorROI,
    avgAiNetWorth: Math.floor(avgAiNW),
    aiWinRate: +(aiWinRate * 100).toFixed(1),
  }
}

// === 실행 ===

console.log('='.repeat(80))
console.log(`밸런스 분석기 — ${SEED_COUNT}시드 × ${strategies.length}전략`)
console.log('='.repeat(80))

const meta = createInitialMeta()
const reports: StrategyReport[] = []

for (const strategy of strategies) {
  const allMetrics: RunMetrics[] = []
  process.stdout.write(`\n${strategy.name} 시뮬레이션 중...`)

  for (let i = 0; i < SEED_COUNT; i++) {
    const seed = SEED_START + i
    try {
      const metrics = simulateRun(strategy, seed, meta)
      allMetrics.push(metrics)
    } catch {
      // 에러 시드 스킵
    }
    if ((i + 1) % 50 === 0) process.stdout.write(` ${i + 1}`)
  }
  console.log(` 완료 (${allMetrics.length}/${SEED_COUNT})`)

  const report = analyzeStrategy(strategy.name, allMetrics)
  reports.push(report)
}

// === 결과 출력 ===

console.log('\n' + '='.repeat(80))
console.log('📊 전략 성과 비교')
console.log('='.repeat(80))
console.log(
  '전략'.padEnd(22),
  '평균NW'.padStart(8),
  '중위NW'.padStart(8),
  '최소NW'.padStart(8),
  '최대NW'.padStart(8),
  '평균점수'.padStart(8),
  '평균순위'.padStart(6),
  '1위%'.padStart(6),
  'AI승%'.padStart(6),
)
console.log('─'.repeat(90))
for (const r of reports) {
  console.log(
    r.name.padEnd(22),
    `$${r.avgNetWorth}`.padStart(8),
    `$${r.medNetWorth}`.padStart(8),
    `$${r.minNetWorth}`.padStart(8),
    `$${r.maxNetWorth}`.padStart(8),
    String(r.avgScore).padStart(8),
    String(r.avgRank).padStart(6),
    `${r.winRate}%`.padStart(6),
    `${r.aiWinRate}%`.padStart(6),
  )
}

// 시장 분포 (첫 번째 전략 기준 — 모든 전략 동일 시드)
console.log('\n' + '='.repeat(80))
console.log('📈 추가 지표')
console.log('='.repeat(80))
for (const r of reports) {
  console.log(`${r.name}: 자산 ${r.avgAssets}개 | 영향력 ${r.avgInfluence} | 지배 ${r.avgDominatedSectors}섹터 | 파산턴 ${r.avgBankruptTurns}`)
}

// 섹터 ROI (전략 평균)
console.log('\n' + '='.repeat(80))
console.log('🏭 섹터별 실현 ROI (전략 평균)')
console.log('='.repeat(80))
console.log(
  '섹터'.padEnd(14),
  '평균ROI'.padStart(8),
  '평균구매'.padStart(8),
)
console.log('─'.repeat(32))

for (const sector of ALL_SECTORS) {
  const sectorInfo = SECTORS.find(s => s.id === sector)
  const avgROI = reports.reduce((s, r) => s + r.sectorROI[sector].avgROI, 0) / reports.length
  const avgBuyRate = reports.reduce((s, r) => s + r.sectorROI[sector].buyRate, 0) / reports.length
  console.log(
    `${sectorInfo?.name ?? sector}(${sector})`.padEnd(14),
    `${(avgROI * 100).toFixed(1)}%`.padStart(8),
    `${avgBuyRate.toFixed(1)}회`.padStart(8),
  )
}

// AI 강도 분석
console.log('\n' + '='.repeat(80))
console.log('🤖 AI 강도 분석')
console.log('='.repeat(80))
const playerStrategies = reports.filter(r => !r.name.startsWith('AI:'))
const avgPlayerNW = playerStrategies.reduce((s, r) => s + r.avgNetWorth, 0) / playerStrategies.length
const avgAiNW = playerStrategies.reduce((s, r) => s + r.avgAiNetWorth, 0) / playerStrategies.length
console.log(`플레이어 평균 순자산: $${Math.floor(avgPlayerNW)}`)
console.log(`AI 평균 순자산: $${Math.floor(avgAiNW)}`)
console.log(`AI/플레이어 비율: ${(avgAiNW / avgPlayerNW * 100).toFixed(1)}%`)
console.log(`AI 승리율 (1회 이상): ${(playerStrategies.reduce((s, r) => s + r.aiWinRate, 0) / playerStrategies.length).toFixed(1)}%`)

// 밸런스 기준 체크
console.log('\n' + '='.repeat(80))
console.log('⚖️ 밸런스 기준 체크')
console.log('='.repeat(80))

const checks: { name: string; pass: boolean; detail: string }[] = []

// 1. 지배 전략 없음 (승률 60% 이하)
const maxWinRate = Math.max(...reports.map(r => r.winRate))
const maxWinStrategy = reports.find(r => r.winRate === maxWinRate)!
checks.push({
  name: '지배 전략 없음 (≤60%)',
  pass: maxWinRate <= 60,
  detail: `최고 승률: ${maxWinStrategy.name} ${maxWinRate}%`,
})

// 2. 최저 전략도 의미 있음 (승률 ≥ 10%)
const minWinRate = Math.min(...reports.map(r => r.winRate))
const minWinStrategy = reports.find(r => r.winRate === minWinRate)!
checks.push({
  name: '최저 전략 유효 (≥10%)',
  pass: minWinRate >= 10,
  detail: `최저 승률: ${minWinStrategy.name} ${minWinRate}%`,
})

// 3. AI 경쟁력
const aiRatio = avgAiNW / avgPlayerNW
checks.push({
  name: 'AI 경쟁력 (NW ≥ 플레이어 50%)',
  pass: aiRatio >= 0.5,
  detail: `AI/플레이어 비율: ${(aiRatio * 100).toFixed(1)}%`,
})

// 4. 섹터 다양성 (일반 섹터 ROI 격차 1.5배 이내)
const normalSectors: Sector[] = ['food', 'tech', 'realEstate', 'logistics', 'energy', 'finance']
const sectorROIs = normalSectors.map(s => {
  const avg = reports.reduce((sum, r) => sum + r.sectorROI[s].avgROI, 0) / reports.length
  return { sector: s, roi: avg }
}).filter(s => s.roi > 0)

if (sectorROIs.length >= 2) {
  const maxROI = Math.max(...sectorROIs.map(s => s.roi))
  const minROI = Math.min(...sectorROIs.map(s => s.roi))
  checks.push({
    name: '섹터 ROI 격차 (≤1.5배)',
    pass: maxROI / minROI <= 1.5,
    detail: `최고 ${(maxROI * 100).toFixed(1)}% / 최저 ${(minROI * 100).toFixed(1)}% = ${(maxROI / minROI).toFixed(2)}배`,
  })
}

for (const check of checks) {
  console.log(`${check.pass ? '✅' : '❌'} ${check.name}: ${check.detail}`)
}

// JSON 보고서 저장
import { mkdirSync, writeFileSync } from 'fs'
const outputDir = new URL('./output', import.meta.url).pathname
try { mkdirSync(outputDir, { recursive: true }) } catch { /* 이미 존재 */ }
const reportPath = `${outputDir}/balance-report.json`
writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), seedCount: SEED_COUNT, reports }, null, 2))
console.log(`\n📁 상세 보고서: ${reportPath}`)
