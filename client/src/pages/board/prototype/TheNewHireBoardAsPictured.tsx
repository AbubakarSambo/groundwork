/**
 * A NEW HIRE'S FIRST NINETY DAYS, AS PICTURED (Hafsah, 21 November 2026), ON THE DESIGN SYSTEM (24 November 2026), for whoever runs it.
 *
 * The prototype's board is "Kwame, first 90 days" (docs/boards-21-nov/prototype-dom/kwame-first-90-days-as-lead.html,
 * B6-ending-a-check-in/day-30-and-60.txt): its sections in its order and its words. On 21 November it was a one-to-one port of the
 * prototype's markup; it is now built from the shared blocks (Section, Panel, EdgeRow, Tag, Button, Empty), like the sales board. The
 * header, the tabs and "Last updated" are the board's frame (../TheBoardFrame.tsx), and its one Ask is in that header.
 *
 * Every slot is the board the server served this reader: what was agreed at the start (startingState), the change since the last
 * check-in (changeSinceLast), the ninety days in three steps (ninetyDays), the new hire's history (personHistory), where the two of them
 * see it differently (divergence), and where this is heading.
 */
import { Section, Panel, EdgeList, EdgeRow, Tag, Button, Empty, Callout } from '@/components/gw/ui'
import { WhereThisIsHeading } from '../pictured/ThePicturedSalesBoard'
import { firstName } from './the-board-sections'

type Any = any

export interface TheNewHireBoardAsPicturedProps {
  b: Any
  groundId: string
  onRecordTheDecision: () => void
}

const lowerFirst = (s: string) => (s ? `${s.charAt(0).toLowerCase()}${s.slice(1)}` : s)

export function TheNewHireBoardAsPictured(p: TheNewHireBoardAsPicturedProps) {
  const { b, groundId } = p
  const hire = (b.participants ?? []).find((x: Any) => x.partyType !== 'INITIATOR' && !x.managingOnly) ?? null
  const hireName = firstName(hire?.name) || 'the new hire'
  /* Done when every planned session is done, by the server's own count of sessions done (howItIsGoing's roundsDone), as the list reads it. */
  const progress = b.howItIsGoing?.glance?.progress
  const lastIsDone = !!progress?.roundsPlanned && (progress.roundsDone ?? 0) >= progress.roundsPlanned
  const agreed: Any[] = typeof b.startingState === 'object' && b.startingState ? b.startingState.rows ?? [] : []
  const changes: Any[] = b.changeSinceLast?.rows ?? []
  const steps: Any[] = b.ninetyDays?.steps ?? []
  const history = (b.personHistory ?? []).find((h: Any) => h.participantId === hire?.id) ?? null
  const sessions: Any[] = history?.sessions ?? []
  /* The first thing the two of them see differently, both views word for word (as ThePicturedBoard reads divergence). */
  const accounts: Any[] = ((b.divergence?.items ?? []) as Any[]).find((d) => (d.positions ?? []).length >= 2)?.positions?.slice(0, 2) ?? []
  return (
    <>
      {lastIsDone && (
        <Callout tone="info" title="The last session is done">
          <p className="ds-text-body">It’s yours to decide how this ends.</p>
          <Button to={`/grounds/${groundId}/end`}>Decide how it ends</Button>
        </Callout>
      )}
      <Section heading="What was agreed at the start" note={agreed.length ? 'Confirmed by both on day 1.' : undefined}>
        {agreed.length ? (
          <div className="ds-grid ds-grid-3">
            {agreed.map((a: Any, i: number) => (
              <Panel as="section" key={i} aria-label={a.when}>
                <p className="ds-text-meta">{a.when}</p>
                <p className="ds-text-card">{a.what ?? a.says}</p>
              </Panel>
            ))}
          </div>
        ) : <Empty>Nothing was agreed at the start yet.</Empty>}
      </Section>
      <Section heading="Change since last check-in">
        {changes.length ? (
          <EdgeList label="Change since last check-in">
            {changes.map((c: Any, i: number) => (
              <EdgeRow key={i} title={c.area} detail={c.says}
                actions={<Tag tone={c.state === 'late' ? 'attention' : 'proven'}>{c.state === 'moved' ? 'Moved' : c.state === 'held' ? 'Held' : 'Late'}</Tag>} />
            ))}
          </EdgeList>
        ) : <Empty>Nothing has changed since the last check-in yet.</Empty>}
      </Section>
      {steps.length > 0 && (
        <Section heading={b.ninetyDays?.heading ?? 'The 90 days, in three steps'} note={`You and ${hireName} see the same pictures.`}>
          <EdgeList label={b.ninetyDays?.heading ?? 'The 90 days, in three steps'}>
            {steps.map((s: Any) => (
              <EdgeRow key={s.day} kind={s.reached ? 'look' : undefined} reason={null} title={`${s.step}: ${lowerFirst(s.question)}`}
                detail={s.day >= 90 ? undefined : s.says}
                actions={s.day >= 90 ? <Button kind="quiet" to={`/grounds/${groundId}/end`}>Open it</Button> : undefined} />
            ))}
          </EdgeList>
        </Section>
      )}
      {history && (
        <Section heading={`${hireName}’s history, ${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'}`} note="Agreement, commitments, work, evidence, feedback, changes.">
          <Panel as="section" aria-label={`${hireName}’s history`}>
            <div role="list" aria-label={`${hireName}’s history`}>
              <div className="ds-when" role="listitem"><span className="ds-text-secondary"><b>Check-ins</b></span><span className="ds-text-secondary">{history.says}</span></div>
              {sessions.map((s: Any) => (
                <div key={s.n} className="ds-when" role="listitem"><span className="ds-text-secondary"><b>{`Session ${s.n}`}</b></span><span className="ds-text-secondary">{s.says}</span></div>
              ))}
            </div>
          </Panel>
        </Section>
      )}
      <Section heading="Where you both see it differently">
        {accounts.length ? (
          <div className="ds-grid ds-grid-2">
            {accounts.map((a: Any, i: number) => (
              <Panel as="section" key={i} heading={a.who === 'You' ? 'You' : firstName(a.who)}>
                <p className="ds-text-body">{`“${a.view}”`}</p>
              </Panel>
            ))}
          </div>
        ) : <Empty>{`You and ${hireName} have not seen anything differently yet.`}</Empty>}
      </Section>
      <Button kind="secondary" to={`/grounds/${groundId}?tab=report`}>Every session</Button>
      <WhereThisIsHeading b={b} onRecordTheDecision={p.onRecordTheDecision} />
    </>
  )
}
