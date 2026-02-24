import { useCallback, useContext, useRef, type ReactNode } from 'react'
import { useGlossary, PopoverStackIndexContext } from './GlossaryProvider'

interface Props {
  termId: string
  children: ReactNode
  className?: string
  decorated?: boolean // true면 점선 밑줄 (popover/help 내부)
}

export function GlossaryTerm({ termId, children, className = '', decorated = false }: Props) {
  const { openTerm } = useGlossary()
  const popoverIndex = useContext(PopoverStackIndexContext)
  const ref = useRef<HTMLSpanElement>(null)

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (ref.current) {
      openTerm(termId, ref.current.getBoundingClientRect(), popoverIndex ?? null)
    }
  }, [termId, openTerm, popoverIndex])

  // decorated (popover/help 내부): 점선 밑줄 + cursor help
  // inline (인게임): 밑줄 없음, hover 시 약간 밝아짐
  const styleClass = decorated
    ? 'border-b border-dashed border-current/30 cursor-help hover:border-current/60'
    : 'cursor-help hover:text-blue-300 transition-colors'

  return (
    <span
      ref={ref}
      data-glossary-term={termId}
      onClick={handleClick}
      className={`${styleClass} ${className}`}
    >
      {children}
    </span>
  )
}
