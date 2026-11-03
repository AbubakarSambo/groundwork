import { SCENARIOS } from '@/pages/grounds/CreateGroundPage'
import { sentenceCase } from '@/pages/grounds/how-a-row-reads'
import { scenarioLabel } from '@/lib/scenario-catalog'
import { Button, Panel } from '@/components/gw/ui'
import { theOneLine } from './EverySituation'

/**
 * THE KIND OF CHECK-IN, AS A CARD UNDER SETUP'S FIRST REPLY (F5, the approved target journey, stage 2; new.txt).
 *
 *   This sounds like
 *   Keep a read on live work
 *   What moved, what’s stuck and what changed, every week.
 *   [Confirmed]  [It’s something else]
 *
 * The name is never a bare label: its one-line meaning is the same line the list of every situation shows (theOneLine). It replaces
 * the header's "This sounds like <name>." Both buttons stay until the lead has used one, whatever has been said since (plan round 32:
 * "Confirmed" showed only while the first reply was the last thing said, so a card that arrived later had no way to accept it, and
 * "It’s something else" threw the whole conversation away). Neither one ever holds the box.
 */
export const CONFIRMED = 'Confirmed'
export const IT_IS_SOMETHING_ELSE = 'It’s something else'
/** What "Confirmed" says in the conversation for the lead, while the first reply's question is still the last thing said. */
export const THAT_IS_RIGHT = 'That’s right.'
/** What the conversation says after "It’s something else": what is said next is read for the kind, and nothing said so far is lost. */
export const SAY_WHAT_IT_IS = 'Then tell me in a sentence what it is, and I will set it up for that.'

export function theKindOfCheckIn(scenario: string | null | undefined, brief?: string | null): { name: string; meaning: string | null } | null {
  if (!scenario) return null
  const name = sentenceCase(scenarioLabel(scenario, brief))
  const card = SCENARIOS.find((c) => c.scenario === scenario && sentenceCase(c.label) === name) ?? SCENARIOS.find((c) => c.scenario === scenario)
  return { name, meaning: card ? theOneLine(card) : null }
}

export function ThisSoundsLike({ scenario, brief, confirmed, onConfirm, onSomethingElse }: {
  scenario: string | null | undefined
  brief?: string | null
  /** The lead pressed "Confirmed": the kind is theirs, and the card keeps only what it says. */
  confirmed: boolean
  onConfirm: () => void
  onSomethingElse: () => void
}) {
  const kind = theKindOfCheckIn(scenario, brief)
  if (!kind) return null
  return (
    <section aria-label="This sounds like" className="gwui-ec-sounds-like"><Panel>
      <p className="gwui-panel-text-muted">This sounds like</p>
      <p className="gwui-panel-text" style={{ fontWeight: 700 }}>{kind.name}</p>
      {kind.meaning && <p className="gwui-panel-text">{kind.meaning}</p>}
      {!confirmed && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <Button kind="primary" onClick={onConfirm}>{CONFIRMED}</Button>
          <Button kind="secondary" onClick={onSomethingElse}>{IT_IS_SOMETHING_ELSE}</Button>
        </div>
      )}
    </Panel></section>
  )
}
