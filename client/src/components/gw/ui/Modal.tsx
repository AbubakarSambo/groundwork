import React, { useEffect, useRef } from 'react'
import './gw-ui.css'

/**
 * MODAL (prototype: .modal-bg, .modal, app.css). Up to 520px wide, 24px inside, 14px corners, 14px
 * between its parts, behind it `rgba(14,19,24,.45)`. Closes on Escape and on a click outside it;
 * traps focus inside while open, and returns focus to what opened it when it closes.
 */
export function Modal({ title, onClose, children }: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLElement | null>(null)

  useEffect(() => {
    opener.current = document.activeElement as HTMLElement | null
    ref.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener.current?.focus?.()
    }
  }, [onClose])

  return (
    <div
      className="gwui-modal-bg"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={ref}
        className="gwui-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  )
}
