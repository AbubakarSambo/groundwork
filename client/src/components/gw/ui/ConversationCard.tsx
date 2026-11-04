import type { ReactNode } from 'react'
import './gw-ui.css'

/**
 * THE FOCUSED CHECK-IN'S CARD FRAME (B3, docs/prototype/source/app.css: `.ci-focus`, `.ci-card`,
 * `.ci-h`, `.ci-b`, `.ci-c`).
 *
 * A centred ~560px card (the way back is in the header itself, TheCheckInHeader's `onBack`): `.ci-focus{max-width:560px;margin:0
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
export function ConversationCard({ header, banners, children, footer, bodyRef }: {
  header: ReactNode
  /** Fixed notices between the header and the scrolling body - not part of the scroll. */
  banners?: ReactNode
  children: ReactNode
  footer?: ReactNode
  bodyRef?: React.RefObject<HTMLDivElement | null>
}) {
  return (
    /* The prototype's focused check-in: .ci-focus, then the card (.ci-card: .ci-h, .ci-b, .ci-c). */
    <div className="ci-focus">
      <div className="ci-card">
        {header}
        {banners}
        <div ref={bodyRef} aria-live="polite" className="ci-b">
          {children}
        </div>
        {footer}
      </div>
    </div>
  )
}
