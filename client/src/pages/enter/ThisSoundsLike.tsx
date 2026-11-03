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
 * the header's "This sounds like <name>." "Confirmed" answers the first reply's question in the conversation, as the lead would, and
 * is only offered while that question is the last thing said; "It’s something else" is always there.
 */
export const CONFIRMED = 'Confirmed'
export const IT_IS_SOMETHING_ELSE = 'It’s something else'
/** What "Confirmed" says in the conversation for the lead. */
export const THAT_IS_RIGHT = 'That’s right.'

export function theKindOfCheckIn(scenario: string | null | undefined, brief?: string | null): { name: string; meaning: string | null } | null {
  if (!scenario) return null
  const name = sentenceCase(scenarioLabel(scenario, brief))
  const card = SCENARIOS.find((c) => c.scenario === scenario && sentenceCase(c.label) === name) ?? SCENARIOS.find((c) => c.scenario === scenario)
  return { name, meaning: card ? theOneLine(card) : null }
}

export function ThisSoundsLike({ scenario, brief, mayConfirm, onConfirm, onSomethingElse }: {
  scenario: string | null | undefined
  brief?: string | null
  mayConfirm: boolean
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
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        {mayConfirm && <Button kind="primary" onClick={onConfirm}>{CONFIRMED}</Button>}
        <Button kind="secondary" onClick={onSomethingElse}>{IT_IS_SOMETHING_ELSE}</Button>
      </div>
    </Panel></section>
  )
}
