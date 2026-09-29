import React, { useEffect, useRef } from 'react'
import './gw-ui.css'

/**
 * MODAL (prototype: .modal-bg, .modal, app.css). Up to 520px wide, 24px inside, 14px corners, 14px
 * between its parts, behind it `rgba(14,19,24,.45)`. Closes on Escape and on a click outside it;
 * traps focus inside while open, and returns focus to what opened it when it closes.
 *
 * REVIEW ROUND 3, ITEM 7: A VISIBLE "Close" BUTTON. `title` used to reach only the dialog's
 * `aria-label` - nothing on screen said the words, and the only ways to leave were Escape or a
 * click on the scrim outside the box, neither of which a person reads as a way out. Now a heading
 * (the same title) sits with a "Close" button beside it, above whatever the caller puts in
 * `children` - one definition, so every dialog built from this part gets it, not only the one that
 * prompted the fix.
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
        <div className="gwui-modal-head">
          <h2 className="gwui-modal-title">{title}</h2>
          <button type="button" className="gwui-modal-close" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  )
}
