import type { ReactNode } from 'react'
import './gw-ui.css'
import { useTheDesignSystem } from './the-design-system'

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
export function ConversationCard({ back, after, header, banners, children, footer, bodyRef }: {
  /** On a rebuilt page: a quiet link under the card (a lead's "Change how often this runs"). */
  after?: ReactNode
  /** On a rebuilt page: the way back, a link above the card ("← Sales team, Q3", check-in-start.jpg). */
  back?: ReactNode
  header: ReactNode
  /** Fixed notices between the header and the scrolling body - not part of the scroll. */
  banners?: ReactNode
  children: ReactNode
  footer?: ReactNode
  bodyRef?: React.RefObject<HTMLDivElement | null>
}) {
  /* On a rebuilt page (journey 2, Hafsah, 23 November 2026): the prototype's one 560px column, the way back above the card, and
     the card's header, messages and box to type in, every value a token (blocks.css, "THE CONVERSATION"). */
  if (useTheDesignSystem()) {
    return (
      <div className={back ? 'ds-ci ds-ci-alone' : 'ds-ci'}>
        {back && <div className="ds-ci-back">{back}</div>}
        <div className="ds-ci-card">
          {header}
          {banners}
          <div ref={bodyRef} aria-live="polite" className="ds-ci-body">{children}</div>
          {footer && <div className="ds-ci-foot">{footer}</div>}
        </div>
        {after && <div className="ds-ci-back">{after}</div>}
      </div>
    )
  }
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
