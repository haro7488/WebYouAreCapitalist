import { useCallback, useRef, type ReactNode } from 'react'
import { useGlossary } from './GlossaryProvider'

interface Props {
  termId: string
  children: ReactNode
  className?: string
}

export function GlossaryTerm({ termId, children, className = '' }: Props) {
  const { openTerm } = useGlossary()
  const ref = useRef<HTMLSpanElement>(null)

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (ref.current) {
      openTerm(termId, ref.current.getBoundingClientRect())
    }
  }, [termId, openTerm])

  return (
    <span
      ref={ref}
      data-glossary-term={termId}
      onClick={handleClick}
      className={`border-b border-dashed border-current/30 cursor-help transition-opacity hover:border-current/60 ${className}`}
    >
      {children}
    </span>
  )
}
