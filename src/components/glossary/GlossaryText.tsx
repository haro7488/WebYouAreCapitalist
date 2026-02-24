import { useMemo } from 'react'
import { GLOSSARY } from '../../game/glossary'
import { GlossaryTerm } from './GlossaryTerm'

interface Props {
  children: string
  className?: string
  highlightAll?: boolean // 기본 false: 첫 매칭만
}

interface TermPattern {
  id: string
  pattern: string
  regex: RegExp
}

interface TextSegment {
  type: 'text' | 'term'
  content: string
  termId?: string
}

export function GlossaryText({ children, className = '', highlightAll = false }: Props) {
  // 1. GLOSSARY에서 모든 term/aliases 수집하고 길이순 내림차순 정렬
  const termPatterns = useMemo((): TermPattern[] => {
    const patterns: TermPattern[] = []
    
    GLOSSARY.forEach(entry => {
      const terms = [entry.term, ...(entry.aliases || [])]
      terms.forEach(term => {
        // 특수문자 이스케이프 처리
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        // 한글이 포함된 경우 word boundary(\b) 제거 (한글에서 동작 안 함)
        const hasKorean = /[가-힣]/.test(term)
        const regexStr = hasKorean ? escaped : `\\b${escaped}\\b`
        patterns.push({
          id: entry.id,
          pattern: term,
          regex: new RegExp(regexStr, 'gi')
        })
      })
    })
    
    // 긴 패턴 우선 정렬 (길이가 같으면 알파벳 순)
    return patterns.sort((a, b) => 
      b.pattern.length - a.pattern.length || a.pattern.localeCompare(b.pattern)
    )
  }, [])

  // 2. 텍스트를 스캔해서 매칭 부분 분리
  const segments = useMemo((): TextSegment[] => {
    if (!children.trim()) return [{ type: 'text', content: children }]
    
    const result: TextSegment[] = []
    const usedTerms = new Set<string>() // highlightAll=false일 때 첫 매칭만 추적
    let remaining = children
    let offset = 0
    
    while (offset < children.length) {
      let matched = false
      
      // 긴 패턴부터 매칭 시도
      for (const { id, regex } of termPatterns) {
        const searchText = remaining.slice(offset)
        const match = searchText.match(regex)
        
        if (!match || match.index === undefined) continue
        
        const matchIndex = offset + match.index
        const matchText = match[0]
        
        // highlightAll=false면 이미 사용한 termId는 스킵
        if (!highlightAll && usedTerms.has(id)) continue
        
        // 매칭 전 텍스트가 있으면 추가
        if (matchIndex > offset) {
          const beforeText = children.slice(offset, matchIndex)
          if (result.length && result[result.length - 1].type === 'text') {
            result[result.length - 1].content += beforeText
          } else {
            result.push({ type: 'text', content: beforeText })
          }
        }
        
        // 매칭된 용어 추가
        result.push({
          type: 'term',
          content: matchText,
          termId: id
        })
        
        usedTerms.add(id)
        offset = matchIndex + matchText.length
        matched = true
        break
      }
      
      if (!matched) {
        // 매칭 실패 시 한 글자씩 진행
        const char = children[offset]
        if (result.length && result[result.length - 1].type === 'text') {
          result[result.length - 1].content += char
        } else {
          result.push({ type: 'text', content: char })
        }
        offset++
      }
    }
    
    return result.length ? result : [{ type: 'text', content: children }]
  }, [children, termPatterns, highlightAll])

  return (
    <span className={className}>
      {segments.map((segment, idx) => {
        if (segment.type === 'term' && segment.termId) {
          return (
            <GlossaryTerm key={`${segment.termId}-${idx}`} termId={segment.termId}>
              {segment.content}
            </GlossaryTerm>
          )
        }
        return segment.content
      })}
    </span>
  )
}
