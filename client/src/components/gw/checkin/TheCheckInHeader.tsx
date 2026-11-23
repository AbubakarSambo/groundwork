import '@/components/gw/ui/gw-ui.css'
import { useTheDesignSystem } from '@/components/gw/ui/the-design-system'

/**
 * THE CHECK-IN'S HEADER (B3, docs/prototype/screens/B3-the-check-in/check-in-start.txt).
 *
 * The check-in's name, and "Pause" on the right, small and quiet, always on screen (the prototype's word; it was "End session" until
 * Hafsah's ruling of 15 November). Pause brings up the end card, so finishing early shows what was written down. Before anything has
 * been said it reads "Skip this one" and asks first (ChatPage). Nothing under the name: how long it takes is said in the first message.
 *
 * ONE LINE, AT EVERY WIDTH (3 November 2026, screens-after/checkin-reply-390.png). The way back used to be a link above the card,
 * "← Wanjiru's check-in", and the card's header then said "Wanjiru's check-in" again. Now the header is the way back: the arrow
 * and the name on the left, End session on the right, on one line. `onBack` makes the name the way out; without it (the bare
 * frame of a team update's link, and the page between check-ins) the name is only a title.
 *
 * `underTitle` is only for the page between check-ins (BetweenCheckIns), which is not a conversation in progress.
 */
export function TheCheckInHeader({
  title,
  underTitle = null,
  onEnd,
  endLabel = 'Pause',
  onBack,
  backTitle,
}: {
  title: string
  underTitle?: string | null
  onEnd?: () => void
  /** "Pause" once something has been answered, "Skip this one" before. */
  endLabel?: string
  onBack?: () => void
  backTitle?: string
}) {
  /* On a rebuilt page (journey 2, 23 November 2026), as check-in-start.jpg draws it: the name as the card's title, one meta line
     under it, and Pause as a link on the right. The way back is the link above the card (ConversationCard's `back`). */
  if (useTheDesignSystem()) {
    return (
      <div className="ds-ci-head">
        <div className="ds-ci-head-words">
          <h1 className="ds-text-card">{title}</h1>
          {underTitle && <p className="ds-text-meta">{underTitle}</p>}
        </div>
        {onEnd && <button type="button" onClick={onEnd} className="ds-btn ds-btn-link">{endLabel}</button>}
      </div>
    )
  }
  return (
    <div className="ci-h">
      <div>
        {/* The prototype's bold line; a heading for screen readers. */}
        <b className="t-body gw-block" role="heading" aria-level={1}>
          {onBack ? (
            <button type="button" onClick={onBack} title={backTitle} className="ci-h-back"><span aria-hidden="true" className="ci-h-arrow">←</span>{title}</button>
          ) : title}
        </b>
        {underTitle && <div className="t-tiny mut">{underTitle}</div>}
      </div>
      {onEnd && (
        <button type="button" onClick={onEnd} className="btn quiet sm">
          {endLabel}
        </button>
      )}
    </div>
  )
}
