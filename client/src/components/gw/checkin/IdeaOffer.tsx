import { Panel } from '../ui/Panel'
import { QuickReplies } from '../ui/QuickReplies'
import type { TheIdeaOfferInTheCheckIn } from '@/api/anchorShapes'

/**
 * PIECE 21: THE YES IN THE PERSON'S CHECK-IN (plan section 5 row 21; decision 96, item 10;
 * docs/answers-from-engine.md, "Request 149, missing (1)", `TheIdeaOfferInTheCheckIn`).
 *
 * Drawn under the latest question, the same place `SuggestedAnswers` draws its pills - this is
 * `ChatPage.tsx`'s own idea-offer counterpart, attached to the reply that offers it rather than
 * always present. Shows the person's own words back to them (so they see exactly what would be
 * captured), who will see it, then the two answers as pills: "Yes, capture it" sends the yes
 * straight through, same as picking a suggested answer; "Not now" leaves nothing behind. Draws
 * nothing while `offer` is undefined or `null` - the field is not served yet, so today every caller
 * passes nothing and this component is simply absent.
 */
export function IdeaOffer({ offer, onPick, disabled }: {
  offer: TheIdeaOfferInTheCheckIn | null | undefined
  onPick: (answer: string) => void
  disabled?: boolean
}) {
  if (!offer) return null

  return (
    <Panel>
      <p className="gwui-panel-text" style={{ fontStyle: 'italic' }}>&ldquo;{offer.idea}&rdquo;</p>
      <p className="gwui-panel-text" style={{ marginTop: 8 }}>{offer.question}</p>
      <p className="gwui-panel-text" style={{ color: 'var(--gw-sub)', marginBottom: 10 }}>{offer.whoWillSeeIt}</p>
      <QuickReplies items={[offer.yes, offer.no]} onPick={onPick} disabled={disabled} label={offer.question} stacked />
    </Panel>
  )
}
