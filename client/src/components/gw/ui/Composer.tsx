import type { KeyboardEvent, ReactNode } from 'react'

/**
 * THE CHECK-IN'S FOOTER BAR (B3, docs/prototype/source/app.css: `.ci-c`, `.ci-sq`; s29.js's
 * `ciFocus`): a "+" square button, "Type, or hold to speak", and a navy send button with an up
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
  inputRef, placeholder = 'Type, or hold to speak', ariaLabel = 'Your answer', maxLength, autoFocus,
  rows = 1,
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
   * than the check-in composer's ("Type, or hold to speak") and shares the same single-row box,
   * which only ever shows one line - at a narrow width, with the wide "+ Doc" and "Send" buttons
   * beside it, the placeholder wrapped onto a second line nobody could see. Given only by the
   * caller with the longer placeholder; every other `Composer` keeps the default `rows={1}` it
   * already had.
   */
  rows?: number
}) {
  const plusWide = plusGlyph.length > 1
  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--gw-border)', display: 'flex', gap: 8, alignItems: 'center', background: 'var(--gw-page)', position: 'relative' }}>
      {plusOpen && plusMenu && (
        <div style={{ position: 'absolute', bottom: '100%', left: 16, marginBottom: 8, background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, boxShadow: 'var(--gw-shadow-menu)', padding: 6, zIndex: 20, width: 260, maxWidth: 'calc(100vw - 40px)' }}>
          {plusMenu}
        </div>
      )}
      {onPlus && (
        <button
          type="button"
          onClick={onPlus}
          disabled={plusDisabled ?? disabled}
          /* Only when the glyph is a plain icon (the check-in's own "+") does it need an aria-label
             standing in for its name - a readable glyph like "+ Doc" already is one, and
             overriding it would hide the very text a person just read on the button. */
          aria-label={plusWide ? undefined : plusLabel}
          aria-expanded={plusMenu ? plusOpen : undefined}
          title={plusLabel}
          style={plusWide ? {
            padding: '0 12px', height: 48, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', borderRadius: 10, background: 'white', border: '1.5px solid var(--gw-rule-2)', color: 'var(--gw-navy)',
            cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          } : {
            width: 48, height: 48, padding: 0, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, borderRadius: 10, background: 'white', border: '1.5px solid var(--gw-rule-2)', color: 'var(--gw-text)',
            cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}
        >
          {plusGlyph}
        </button>
      )}
      {/*
        REVIEW ROUND 3, ITEM 7: THE PROTOTYPE'S BORDERED WHITE BOX, NOT A BARE, BORDERLESS FIELD.
        The prototype's own `.input` (docs/prototype/source/app.css): a 1.5px rule-coloured
        border, white, 10px corners - the same box every text field in the prototype uses. This
        sat transparent, blended into the footer bar's own background, with no field to see at
        all until you clicked inside it.
      */}
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
        style={{
          flex: 1, minWidth: 0, resize: 'none', outline: 'none',
          border: '1.5px solid var(--gw-rule-2)', borderRadius: 10, background: 'white',
          fontFamily: 'inherit', fontSize: 16, lineHeight: 1.5, color: 'var(--gw-text)', padding: '11px 16px', maxHeight: 120,
        }}
      />
      <button
        type="button"
        onClick={onSend}
        disabled={disabled || sendDisabled}
        aria-label={sendLabel}
        style={sendText ? {
          padding: '0 16px', height: 48, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, borderRadius: 10, background: 'var(--gw-navy)', color: 'white', border: 'none',
          cursor: (disabled || sendDisabled) ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          opacity: (disabled || sendDisabled) ? 0.6 : 1,
        } : {
          width: 48, height: 48, padding: 0, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, borderRadius: 10, background: 'var(--gw-navy)', color: 'white', border: 'none',
          cursor: (disabled || sendDisabled) ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          opacity: (disabled || sendDisabled) ? 0.6 : 1,
        }}
      >
        {sendText ?? '↑'}
      </button>
    </div>
  )
}
