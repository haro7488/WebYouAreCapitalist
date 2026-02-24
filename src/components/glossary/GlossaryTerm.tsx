import { useCallback, useContext, useRef, type ReactNode } from 'react'
import { useGlossary, PopoverStackIndexContext } from './GlossaryProvider'

interface Props {
  termId: string
  children: ReactNode
  className?: string
}

export function GlossaryTerm({ termId, children, className = '' }: Props) {
  const { openTerm, startCloseTimer, cancelCloseTimer } = useGlossary()
  const popoverIndex = useContext(PopoverStackIndexContext)
  const ref = useRef<HTMLSpanElement>(null)

  const handleMouseEnter = useCallback(() => {
    cancelCloseTimer()
    if (ref.current) {
      // popoverIndex: null이면 루트, 숫자면 해당 popover의 stackIndex
      openTerm(termId, ref.current.getBoundingClientRect(), popoverIndex)
    }
  }, [termId, openTerm, cancelCloseTimer, popoverIndex])

  const handleMouseLeave = useCallback(() => {
    startCloseTimer()
  }, [startCloseTimer])

  // 모바일 터치 대응
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (ref.current) {
      openTerm(termId, ref.current.getBoundingClientRect(), popoverIndex)
    }
  }, [termId, openTerm, popoverIndex])

  return (
    <span
      ref={ref}
      data-glossary-term={termId}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`border-b border-dashed border-current/30 cursor-help transition-opacity hover:border-current/60 ${className}`}
    >
      {children}
    </span>
  )
}
