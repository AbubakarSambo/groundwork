import { Section, Panel, EdgeList, EdgeRow, Button } from '@/components/gw/ui'
import type { BoardPresent } from '@/api/board'

/* The picture's short name for each ending the engine offers (board-as-lead.txt, kwame-board.txt), in the picture's order. */
export const OUTCOME_WORDS: Record<string, string> = {
  ALIGNED: 'On course',
  REACH_WITH_A_CHANGE: 'Reach it with a change',
  GAPS_IDENTIFIED: 'Change the target',
  KEEP: 'Keep on',
  EXTEND: 'Extend settling-in',
  RESTRUCTURE: 'Change the role',
  EXIT: 'Part ways',
}
export const OUTCOME_ORDER = ['ALIGNED', 'REACH_WITH_A_CHANGE', 'GAPS_IDENTIFIED', 'KEEP', 'EXTEND', 'RESTRUCTURE', 'EXIT']

type TheHeading = NonNullable<BoardPresent['whereThisIsHeading']>

/**
 * "WHERE THIS IS HEADING" (board-as-lead.txt), ONE DRAWING FOR EVERY BOARD (journey 3, Hafsah, 23 November 2026).
 *
 * The outcomes, the signals behind them, what would settle it, and who decides, each a card in a grid of two, from the shared blocks.
 * Before, three boards each drew this their own way (the switchboard's rows, the pictured board's dark box, the sales port's inline
 * styles), so the same section looked three ways. A card with nothing in it is not drawn; where there are no signals, the server's
 * own sentence says so under the outcomes (rule 10). "Record the decision" is a second button: the page's one main button is
 * "Your check-in" (rule 8).
 */
export function WhereThisIsHeadingBody({ d, onRecordTheDecision, readOnly = false }: {
  d: TheHeading
  onRecordTheDecision?: () => void
  readOnly?: boolean
}) {
  const rank = (v: string) => (OUTCOME_ORDER.includes(v) ? OUTCOME_ORDER.indexOf(v) : 99)
  const outcomes = (d.outcomes ?? []).filter((o) => o.value !== 'NOT_YET').sort((a, c) => rank(a.value) - rank(c.value))
  const signals = d.signals ?? []
  const settle = d.whatWouldSettleIt ?? []
  const about = d.about ? `${String(d.about).replace(/\.$/, '')}.` : undefined
  return (
    <Section heading={d.heading ?? 'Where this is heading'} note={about}>
      <div className="ds-grid ds-grid-2">
        <Panel as="section" heading="The possible outcomes">
          {outcomes.length ? (
            <EdgeList label="The possible outcomes">
              {outcomes.map((o) => <EdgeRow key={o.value} title={OUTCOME_WORDS[o.value] ?? o.says} detail={o.more ?? undefined} />)}
            </EdgeList>
          ) : d.outcomesSays && <p className="ds-text-secondary">{d.outcomesSays}</p>}
          {!signals.length && d.signalsSays && <p className="ds-text-secondary">{d.signalsSays}</p>}
        </Panel>
        {signals.length > 0 && (
          <Panel as="section" heading="The signals behind them">
            <EdgeList label="The signals behind them">
              {signals.map((s, i) => <EdgeRow key={i} kind={(s as { mark?: string }).mark === 'proven' ? 'ready' : 'look'} reason={null} title={s.says} detail={s.from ?? undefined} />)}
            </EdgeList>
          </Panel>
        )}
        {settle.length > 0 && (
          <Panel as="section" heading="What would settle it">
            {settle.map((w) => <p key={w} className="ds-text-body">{w}</p>)}
          </Panel>
        )}
        <Panel as="section" heading={d.whoDecides}>
          <p className="ds-text-secondary">Groundwork lays out the outcomes and the proof. It doesn’t choose.</p>
          {d.decided ? <p className="ds-text-body">{d.decided}</p> : !readOnly && onRecordTheDecision && (
            <Button kind="secondary" onClick={onRecordTheDecision}>{d.recordTheDecision ?? 'Record the decision'}</Button>
          )}
        </Panel>
      </div>
    </Section>
  )
}
