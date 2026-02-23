import { useMemo, createElement } from 'react'
import { GLOSSARY, type GlossaryEntry } from '@game/glossary'
import { GlossaryTerm } from './GlossaryTerm'

/** 용어 매칭용 (긴 용어 우선) */
const SORTED_ENTRIES = [...GLOSSARY].sort((a, b) => b.term.length - a.term.length)

/** 짧은 별칭 → entry id */
const ALIAS_MAP = new Map<string, GlossaryEntry>()
for (const entry of GLOSSARY) {
  // "AP (행동력)" → "AP", "호황 (Boom)" → "호황"
  const m = entry.term.match(/^(.+?)\s*\(/)
  if (m && m[1].length >= 2) {
    ALIAS_MAP.set(m[1], entry)
  }
}

interface MatchCandidate {
  entry: GlossaryEntry
  matchText: string
}

/**
 * 텍스트를 파싱하여 용어를 GlossaryTerm으로 변환한 ReactNode[] 반환
 * @param text 원본 텍스트
 * @param excludeId 현재 보고 있는 용어 (자기 자신 제외)
 */
export function useGlossaryText(text: string, excludeId?: string) {
  return useMemo(() => {
    const result: (string | ReturnType<typeof createElement>)[] = []
    let remaining = text
    let keyIdx = 0

    while (remaining.length > 0) {
      let earliest = -1
      let best: MatchCandidate | null = null

      // 모든 용어 + 별칭에서 가장 먼저 나타나는 것 찾기
      for (const entry of SORTED_ENTRIES) {
        if (entry.id === excludeId) continue

        // 정확한 term
        const idx = remaining.indexOf(entry.term)
        if (idx !== -1 && (earliest === -1 || idx < earliest || (idx === earliest && entry.term.length > (best?.matchText.length ?? 0)))) {
          earliest = idx
          best = { entry, matchText: entry.term }
        }
      }

      // 별칭 체크
      for (const [alias, entry] of ALIAS_MAP) {
        if (entry.id === excludeId) continue
        const idx = remaining.indexOf(alias)
        if (idx !== -1 && (earliest === -1 || idx < earliest)) {
          earliest = idx
          best = { entry, matchText: alias }
        }
      }

      if (earliest === -1 || !best) {
        result.push(remaining)
        break
      }

      if (earliest > 0) {
        result.push(remaining.slice(0, earliest))
      }

      result.push(
        createElement(GlossaryTerm, { key: `g-${keyIdx++}`, termId: best.entry.id, children: best.matchText }),
      )
      remaining = remaining.slice(earliest + best.matchText.length)
    }

    return result
  }, [text, excludeId])
}
