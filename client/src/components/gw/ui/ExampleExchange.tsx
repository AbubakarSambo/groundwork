import { Bubble } from './Bubble'
import './gw-ui.css'

/**
 * AN EXAMPLE EXCHANGE (fault 5 of the live walk of the suites: suite-leave.txt's "How people ask"
 * and suite-spend.txt's "How people use it" both drop the prototype's own illustrative chat).
 *
 * The shared chat `Bubble`, stacked the same way a real conversation's body is (`ConversationCard`),
 * so an example reads as the same shape the product actually uses. This is sample data, clearly an
 * illustration of how the suite works, never a real exchange from this organisation - so a name the
 * prototype's own example used is replaced with a neutral word ("your manager", "your lead") rather
 * than carried over as if it were a real colleague.
 *
 * `role="img"` with one summarising `label` - the same pattern `EmbedWidgetExample` already uses for
 * its own illustration - so a screen reader is told once what this is a picture of, rather than
 * walking two lines of made-up chat as if they were a real, live conversation.
 */
export function ExampleExchange({ label, lines }: { label: string; lines: { mine: boolean; text: string }[] }) {
  return (
    <div className="gwui-example-chat" role="img" aria-label={label}>
      {lines.map((l, i) => <Bubble key={i} mine={l.mine}>{l.text}</Bubble>)}
    </div>
  )
}
