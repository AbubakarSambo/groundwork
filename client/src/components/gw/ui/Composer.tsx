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
  rows = 1, variant = 'checkin',
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
  /**
   * FAULT 7 (live walk, 6 October 2026): A LONGER PLACEHOLDER WAS CLIPPED AT 375px.
   *
   * The setup composer's own placeholder ("Type your response, or add a document.") is longer
   * than the check-in composer's ("Type your answer") and shares the same single-row box,
   * which only ever shows one line - at a narrow width, with the wide "+ Doc" and "Send" buttons
   * beside it, the placeholder wrapped onto a second line nobody could see. Given only by the
   * caller with the longer placeholder; every other `Composer` keeps the default `rows={1}` it
   * already had.
   */
  rows?: number
  /** Which of the prototype's two composers this is. */
  variant?: 'checkin' | 'ask'
}) {
  const plusWide = plusGlyph.length > 1
  const ask = variant === 'ask'
  /* The prototype's two composers: the check-in's (.ci-c: "+", the field, "↑") and Ask's (.asst-comp: the paperclip,
     the field, "Send"). The field is the prototype's .input, kept a textarea so a pasted plan keeps its line breaks. */
  return (
    <div className={ask ? 'asst-comp gw-composer' : 'ci-c gw-composer'}>
      {plusOpen && plusMenu && <div className="gw-composer-menu">{plusMenu}</div>}
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
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        maxLength={maxLength}
        autoFocus={autoFocus}
        rows={rows}
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
