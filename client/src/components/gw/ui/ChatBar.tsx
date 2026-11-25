import { useLayoutEffect, useRef } from 'react'
import type { KeyboardEvent, RefObject } from 'react'

/**
 * THE CHAT BAR (rule 12's building block; D1, ask-panel-lead.jpg and ask-on-a-phone.jpg): the paperclip,
 * one box to write in, and Send, the one main button. Every value is a token (blocks.css, `.ds-chat-bar`).
 *
 * The box is one line high and grows with what is written, up to three lines, then scrolls, so a pasted
 * plan keeps its line breaks. Enter sends; Shift and Enter starts a new line. Send stays the main button
 * while the box is empty, as the prototype draws it, and sends nothing until there is something to send.
 */
export function ChatBar({
  value, onChange, onSend, onAttach, attachLabel = 'Add a photo or a document',
  disabled, attachDisabled, placeholder, inputRef,
}: {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  /** The paperclip. Left out for somebody who may not add a file here. */
  onAttach?: () => void
  attachLabel?: string
  /** While a reply is on its way, or before the panel is ready. */
  disabled?: boolean
  attachDisabled?: boolean
  placeholder: string
  inputRef?: RefObject<HTMLTextAreaElement | null>
}) {
  const own = useRef<HTMLTextAreaElement | null>(null)
  const box = inputRef ?? own
  /* Grows with what is written; its most is set in blocks.css. */
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    if (!value) { el.removeAttribute('style'); return }
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value, box])
  const send = () => { if (value.trim() && !disabled) onSend() }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }
  return (
    <div className="ds-chat-bar">
      {onAttach && (
        <button type="button" className="ds-chat-attach" onClick={onAttach} disabled={attachDisabled ?? disabled}
          aria-label={attachLabel} title={attachLabel}>
          <PaperClip />
        </button>
      )}
      <textarea
        ref={box}
        rows={1}
        className="ds-chat-box"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <button type="button" className="ds-btn ds-btn-main" onClick={send} disabled={disabled}>Send</button>
    </div>
  )
}

/* The prototype's paperclip. */
function PaperClip() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}
