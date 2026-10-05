import { Panel } from '../ui/Panel'
import { QuickReplies } from '../ui/QuickReplies'
import { Button } from '../ui/Button'
import type { TheRequestOfferInTheCheckIn, TheRequestToOpen } from '@/api/anchorShapes'

/**
 * ANCHOR PIECES 26 AND 27: A REQUEST OFFERED IN THE CHECK-IN (section 22;
 * docs/anchor-scenario.md; docs/answers-from-engine.md, "Anchor pieces 26 and 27, a request
 * offered in the check-in, are built"). Beside `IdeaOffer.tsx`, which this follows exactly: drawn
 * under the latest question, only while `offer` is there. "Yes" and "No" are sent as pills, same as
 * picking a suggested answer - "Yes" is sent exactly as `offer.yes`, never paraphrased. Draws
 * nothing while `offer` is `undefined` or `null`.
 */
export function RequestOffer({ offer, onPick, disabled }: {
  offer: TheRequestOfferInTheCheckIn | null | undefined
  onPick: (answer: string) => void
  disabled?: boolean
}) {
  if (!offer) return null

  return (
    <Panel>
      <p className="gwui-panel-text">{offer.question}</p>
      <QuickReplies items={[offer.yes, offer.no]} onPick={onPick} disabled={disabled} label={offer.question} stacked />
    </Panel>
  )
}

/**
 * ANCHOR PIECES 26 AND 27: WHAT THEIR YES OPENS. Served on the reply that follows the person's
 * yes - the spec's sentence (`open.says`), and, only while the suite is on, a button with the
 * served label. The button opens Ask Groundwork, where leave and spending are already filed (it
 * never prefills or sends anything for the person, so a date or a sum is never guessed). With the
 * suite off, `open.button` is null and only the sentence shows.
 */
export function OpenTheRequest({ open, onOpenAsk }: {
  open: TheRequestToOpen | null | undefined
  onOpenAsk: () => void
}) {
  if (!open) return null

  return (
    <Panel>
      <p className="gwui-panel-text">{open.says}</p>
      {open.button && (
        <div style={{ marginTop: 10 }}>
          <Button kind="secondary" onClick={onOpenAsk}>{open.button}</Button>
        </div>
      )}
    </Panel>
  )
}
