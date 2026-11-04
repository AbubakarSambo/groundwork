import '@/components/gw/ui/gw-ui.css'

/**
 * THE CHECK-IN'S HEADER (B3, docs/prototype/screens/B3-the-check-in/check-in-start.txt).
 *
 * The check-in's name, and "End session" on the right, small and quiet, always on screen (Hafsah, 3 November evening: "A check-in
 * should feel like texting one person ... 'End session', small and quiet, always visible"). Nothing under the name: how long it takes
 * and how to stop are said in the first message, and the "Pause" menu is gone. Its "Stop for now" is the back link above this card;
 * its "Skip this check-in" is what End session does before anything has been said (ChatPage).
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
  ending = false,
  onBack,
  backTitle,
}: {
  title: string
  underTitle?: string | null
  onEnd?: () => void
  ending?: boolean
  onBack?: () => void
  backTitle?: string
}) {
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
        <button type="button" onClick={onEnd} disabled={ending} className="btn quiet sm">
          {ending ? 'Ending…' : 'End session'}
        </button>
      )}
    </div>
  )
}
