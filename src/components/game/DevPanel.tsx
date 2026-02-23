import { useState } from 'react'
import type { GameConfig } from '@game/types'
import { DEFAULT_GAME_CONFIG } from '@game/index'
import { Button } from '@components/common'

interface DevPanelProps {
  onStart: (config: Partial<GameConfig>) => void
}

// 파라미터 설정 정의
const PARAMS: {
  key: keyof GameConfig
  label: string
  min: number
  max: number
  step: number
}[] = [
  { key: 'startingMoney', label: '시작 자금', min: 100, max: 10000, step: 100 },
  { key: 'marketPool', label: '시장 풀', min: 5000, max: 100000, step: 1000 },
  { key: 'competitorCount', label: '경쟁사 수', min: 0, max: 6, step: 1 },
  { key: 'maxTurns', label: '최대 턴', min: 5, max: 100, step: 5 },
  { key: 'baseAP', label: '기본 AP', min: 1, max: 5, step: 1 },
  { key: 'baseExpenses', label: '기본 지출', min: 0, max: 100, step: 5 },
  { key: 'sectorFlowRate', label: '섹터 유입 배율', min: 0.1, max: 5.0, step: 0.1 },
  { key: 'eventProbability', label: '이벤트 확률', min: 0, max: 1.0, step: 0.05 },
]

// 테스트 파라미터 패널
export function DevPanel({ onStart }: DevPanelProps) {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<GameConfig>({ ...DEFAULT_GAME_CONFIG })

  const handleChange = (key: keyof GameConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleReset = () => {
    setConfig({ ...DEFAULT_GAME_CONFIG })
  }

  const handleStart = () => {
    onStart(config)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        ⚙️ 테스트 설정
      </button>
    )
  }

  return (
    <div className="w-full bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(false)}
        className="w-full p-3 text-left text-sm font-semibold text-slate-300 hover:bg-slate-700 transition-colors flex justify-between items-center"
      >
        <span>⚙️ 테스트 설정</span>
        <span className="text-slate-500">▲</span>
      </button>

      <div className="p-4 border-t border-slate-700 flex flex-col gap-3">
        {PARAMS.map(({ key, label, min, max, step }) => (
          <div key={key} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">{label}</span>
              <span className="text-slate-200 font-mono">
                {step < 1 ? config[key].toFixed(step === 0.05 ? 2 : 1) : config[key]}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={config[key]}
              onChange={(e) => handleChange(key, Number(e.target.value))}
              className="w-full accent-money-500 h-1.5 bg-slate-600 rounded-full appearance-none cursor-pointer"
            />
          </div>
        ))}

        <div className="flex gap-2 mt-2">
          <Button variant="secondary" size="sm" onClick={handleReset} className="flex-1">
            기본값 리셋
          </Button>
          <Button variant="primary" size="sm" onClick={handleStart} className="flex-1">
            이 설정으로 시작
          </Button>
        </div>
      </div>
    </div>
  )
}
