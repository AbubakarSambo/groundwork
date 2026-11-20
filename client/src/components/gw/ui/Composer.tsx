import { useCallback, useEffect, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

/**
 * THE CHECK-IN'S FOOTER BAR (B3, docs/prototype/source/app.css: `.ci-c`, `.ci-sq`; s29.js's
 * `ciFocus`): a "+" square button, "Type your answer", and a navy send button with an up
 * arrow.
 *
 * `.ci-c{padding:12px 16px;border-top:1px solid var(--rule);display:flex;gap:8px;align-items:
 * center;background:var(--paper)}` and `.ci-sq{width:48px;height:48px;padding:0;font-size:20px}`.
 *
 * ROUND 4/5, ITEM B: extracted from `ChatPage.tsx`'s own inline footer, with the exact prototype
 * values. Behaviour (autoresize, Enter-to-send, disabled while loading/closed) stays with the
 * caller - this is the frame and the two buttons, not the logic around them. The "+" is a real
 * attach menu (a photo or a document, paste text - private by default), passed in as `plusMenu`
 * rather than built in here, since what it offers is the caller's own business (ChatPage's own
 * upload/paste flow); this only positions it and toggles it open.
 */
export function Composer({
  value, onChange, onKeyDown, onSend, onPlus, plusOpen, plusMenu,
  disabled, sendDisabled, plusDisabled, plusLabel = 'Add a photo, a document or some text',
  sendLabel = 'Send',
  sendText, plusGlyph = '+',
  /* Not "or hold to speak": there is no voice yet, so the box promised what it could not do (26 October 2026). */
  inputRef, placeholder = 'Type your answer', ariaLabel = 'Your answer', maxLength, autoFocus,
  variant = 'checkin',
}: {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  /** The "+" square button. Omitted (not disabled) when there is nothing to attach yet. */
  onPlus?: () => void
  /** Whether the attach menu is open - only meaningful together with `plusMenu`. */
  plusOpen?: boolean
  /** The attach menu's own content (its choices, e.g. "Add a photo or a document" / "Paste
      text"), positioned above the "+" button when `plusOpen`. The caller owns what it offers. */
  plusMenu?: ReactNode
  disabled?: boolean
  sendDisabled?: boolean
  /** Falls back to `disabled` when not given - the "+" is sometimes allowed on its own narrower
      condition than the field and send button (e.g. still offered while a session is opening). */
  plusDisabled?: boolean
  plusLabel?: string
  /** The send button's accessible name, always. */
  sendLabel?: string
  /**
   * THE SETUP CONVERSATION'S OWN COMPOSER READS "SEND", NOT AN ARROW (B1, new.txt/start-chat.txt:
   * a literal "Send" button, not the check-in composer's "↑"). Given, the button shows this text
   * instead of the arrow; the arrow stays the default so the check-in composer (B3) is unchanged.
   */
  sendText?: string
  /** The "+" button's own glyph - B1's door composer uses a paperclip (new.jpg), not B3's "+". */
  plusGlyph?: string
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
  placeholder?: string
  ariaLabel?: string
  maxLength?: number
  autoFocus?: boolean
  /** Which of the prototype's two composers this is. */
  variant?: 'checkin' | 'ask'
}) {
  const plusWide = plusGlyph.length > 1
  const ask = variant === 'ask'
  /*
   * A BOX THAT SHOWS ITS WHOLE PLACEHOLDER (Fatima round 2, D3; the same fault as fault 7 above, fixed at its cause). The field is one row high, so a placeholder
   * longer than the width (Ask's "Ask about the company, your work or your check-ins." at 390px) wrapped onto a line nobody could see and read as a box cut in half.
   * While the box is empty its least height is the height of its placeholder, measured at the width it really has, so every caller's box shows what it says and
   * no caller has to guess a number of rows. Once there are words in it the caller's own growing takes over. The browser measures: nothing is guessed from the
   * number of characters.
   */
  const own = useRef<HTMLTextAreaElement | null>(null)
  const setRef = useCallback((el: HTMLTextAreaElement | null) => {
    own.current = el
    if (inputRef) (inputRef as { current: HTMLTextAreaElement | null }).current = el
  }, [inputRef])
  useEffect(() => {
    const fit = () => {
      const el = own.current
      if (!el) return
      /* Nothing to scroll while it is empty, and a scrollbar would narrow the box and wrap the placeholder onto a line more than was measured. */
      if (value) { el.style.minHeight = ''; el.style.overflowY = ''; return }
      el.style.overflowY = 'hidden'
      const cs = getComputedStyle(el)
      const probe = document.createElement('div')
      probe.setAttribute('aria-hidden', 'true')
      probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;box-sizing:border-box;white-space:pre-wrap;overflow-wrap:break-word;width:${el.offsetWidth}px;font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:${cs.fontWeight};letter-spacing:${cs.letterSpacing};line-height:${cs.lineHeight};padding:${cs.padding};border:${cs.borderTopWidth} solid transparent`
      probe.textContent = placeholder
      document.body.appendChild(probe)
      const needed = Math.min(probe.offsetHeight, 120)
      document.body.removeChild(probe)
      el.style.minHeight = needed > 48 ? `${needed}px` : ''
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [placeholder, value])
  /* The prototype's two composers: the check-in's (.ci-c: "+", the field, "↑") and Ask's (.asst-comp: the paperclip,
     the field, "Send"). The field is the prototype's .input, kept a textarea so a pasted plan keeps its line breaks. */
  return (
    <div className={ask ? 'asst-comp gw-composer' : 'ci-c gw-composer'}>
      {plusOpen && plusMenu && <div className="gw-composer-menu">{plusMenu}</div>}
      {/* One box to type in, with the attach button and send inside it (Hafsah, 3 November evening). */}
      <div className={ask ? 'gw-composer-row' : 'gw-composer-box'}>
      {onPlus && (
        <button
          type="button"
          onClick={onPlus}
          disabled={plusDisabled ?? disabled}
          /* Only when the glyph is a plain icon does it need an aria-label standing in for its name. */
          aria-label={plusWide ? undefined : plusLabel}
          aria-expanded={plusMenu ? plusOpen : undefined}
          title={plusLabel}
          className={ask ? 'attach' : plusWide ? 'btn sec' : 'btn sec ci-sq'}
        >
          {ask ? <PaperClip /> : plusGlyph}
        </button>
      )}
      <textarea
        ref={setRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        maxLength={maxLength}
        autoFocus={autoFocus}
        className="input"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={disabled || sendDisabled}
        aria-label={sendLabel}
        className={ask || sendText ? 'btn pri' : 'btn pri ci-sq'}
      >
        {ask ? (sendText ?? 'Send') : (sendText ?? '↑')}
      </button>
      </div>
    </div>
  )
}

/* The prototype's paperclip, drawn as it draws it. */
function PaperClip() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}
