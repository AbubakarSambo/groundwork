import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './gw-ui.css'

/**
 * THE FOCUSED CHECK-IN'S CARD FRAME (B3, docs/prototype/source/app.css: `.ci-focus`, `.ci-card`,
 * `.ci-h`, `.ci-b`, `.ci-c`).
 *
 * A "← <check-in name>" link above a centred ~560px card: `.ci-focus{max-width:560px;margin:0
 * auto}`, `.ci-card{border-radius:16px;display:flex;flex-direction:column}`, a header row
 * (`.ci-h`), a scrolling body (`.ci-b`), and a footer (the `Composer`, whose own frame is `.ci-c`).
 *
 * ROUND 4/5, ITEM B: the frame only, extracted with the prototype's exact sizes - `ChatPage.tsx`
 * still owns everything that goes inside each slot (the header's own Pause menu, the messages, the
 * composer's behaviour), which is why this takes them as `header`/`children`/`footer` rather than
 * opinions about what a check-in page contains. `banners` is a fixed (non-scrolling) slot between
 * the header and the scrolling body, for things like a clarification notice or a session-open
 * failure - shown once, never inside the scroll, so they cannot be lost by scrolling past them.
 */
export function ConversationCard({ backLabel, backTo, onBack, backTitle, header, banners, children, footer, bodyRef }: {
  /** "← <check-in name>". Omitted on the bare frame (a team update's link opens on the question). */
  backLabel?: string
  /** A real link, when leaving is only navigation. */
  backTo?: string
  /** A callback instead, when leaving has to do something first (ChatPage's own `leave`, which
      may confirm before it navigates). Takes precedence over `backTo` when both are given. */
  onBack?: () => void
  backTitle?: string
  header: ReactNode
  /** Fixed notices between the header and the scrolling body - not part of the scroll. */
  banners?: ReactNode
  children: ReactNode
  footer?: ReactNode
  bodyRef?: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="gwui-conv-outer" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {backLabel && (onBack || backTo) && (
        <div className="gwui-conv-back-row">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              title={backTitle}
              style={{ fontWeight: 700, color: 'var(--gw-navy)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}
            >
              ← {backLabel}
            </button>
          ) : (
            <Link to={backTo!} title={backTitle} style={{ fontWeight: 700, color: 'var(--gw-navy)', textDecoration: 'none' }}>
              ← {backLabel}
            </Link>
          )}
        </div>
      )}
      <div className="gwui-conv-card">
        {header}
        {banners}
        <div ref={bodyRef} aria-live="polite" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {children}
        </div>
        {footer}
      </div>
    </div>
  )
}
