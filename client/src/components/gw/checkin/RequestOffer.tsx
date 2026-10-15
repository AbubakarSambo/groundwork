import { useNavigate } from 'react-router-dom'
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
 * served label. The button opens the suite's own request form, Leave or Payment Requests
 * (`/suite/leave/new` or `/suite/spend/new`), never Ask (Hafsah, 6 October, request 165) - carrying
 * `open.prefill` in router state, so the form starts from what was read in the person's own words,
 * and empty when nothing was. Nothing is sent here; pressing the button only opens the form. With
 * the suite off, `open.button` is null and only the sentence shows.
 *
 * FAULT 7 (LIVE RE-WALK): "YOU CAN SUBMIT THAT THROUGH LEAVE HERE..." TWICE. The reply that
 * carries `open` is its own chat bubble, drawn above this panel - and the model's own reply text
 * sometimes already contains the spec's sentence word for word, since that sentence is the answer
 * to the person's yes. Reading both meant reading the same sentence twice in a row: once as what
 * the assistant said, once again in the card underneath it. `replyText`, the same bubble's own
 * content, lets this draw only the button when the reply already said it, and the sentence when
 * it did not.
 */
export function OpenTheRequest({ open, replyText }: {
  open: TheRequestToOpen | null | undefined
  /** The chat reply this card is drawn under - the same text a reader has already just read. */
  replyText?: string | null
}) {
  const navigate = useNavigate()
  if (!open) return null
  const to = open.kind === 'leave' ? '/suite/leave/new' : '/suite/spend/new'
  const replyAlreadySaysIt = !!replyText && !!open.says && replyText.includes(open.says)

  return (
    <Panel>
      {!replyAlreadySaysIt && <p className="gwui-panel-text">{open.says}</p>}
      {open.button && (
        <div style={{ marginTop: 10 }}>
          <Button kind="secondary" onClick={() => navigate(to, { state: { prefill: open.prefill ?? null } })}>{open.button}</Button>
        </div>
      )}
    </Panel>
  )
}
