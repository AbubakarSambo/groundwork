import '@/components/gw/ui/gw-ui.css'

/**
 * THE CHECK-IN'S HEADER (B3, docs/prototype/screens/B3-the-check-in/check-in-start.txt).
 *
 * The check-in's name, and "End session" on the right, small and quiet, always on screen (Hafsah, 3 November evening: "A check-in
 * should feel like texting one person ... 'End session', small and quiet, always visible"). Nothing under the name: how long it takes
 * and how to stop are said in the first message, and the "Pause" menu is gone. Its "Stop for now" is the back link above this card;
 * its "Skip this check-in" is what End session does before anything has been said (ChatPage).
 *
 * `underTitle` is only for the page between check-ins (BetweenCheckIns), which is not a conversation in progress.
 */
export function TheCheckInHeader({
  title,
  underTitle = null,
  onEnd,
  ending = false,
}: {
  title: string
  underTitle?: string | null
  onEnd?: () => void
  ending?: boolean
}) {
  return (
    <div className="ci-h">
      <div>
        {/* The prototype's bold line; a heading for screen readers. */}
        <b className="t-body gw-block" role="heading" aria-level={1}>{title}</b>
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
