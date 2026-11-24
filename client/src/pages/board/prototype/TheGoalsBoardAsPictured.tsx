/**
 * A SALES ORGANISATION'S GOALS, AS PICTURED (22 November 2026; Hafsah's rule that the boards follow the prototype word for word), ON THE
 * DESIGN SYSTEM (24 November 2026), for whoever runs it.
 *
 * The prototype's board is "Sales org, Q3" ("Set goals and keep the team on track", docs/prototype/screens/G1-example-check-ins/
 * salesorg.txt, and its markup sales-org-as-lead.html): its sections in its order, with its headings, labels and button words. On 22
 * November it was a one-to-one port of the prototype's markup; it is now built from the shared blocks, and the sections it has in common
 * with the sales and new-project boards are drawn once, in the-board-sections.tsx. The header, the tabs and "Last updated" are the
 * board's frame, and its one Ask is in that header. A part with nothing in it is not drawn (rule 10).
 *
 * Every slot is the board the server served this reader, never the prototype's example numbers. Counts are the served count (the session
 * rows and the one count), never counted here.
 */
import { Section, Panel, EdgeList, EdgeRow, Button } from '@/components/gw/ui'
import { useWhatNeedsYou, isoDay, WhereThisIsHeading } from '../pictured/ThePicturedSalesBoard'
import {
  WhatNeedsYou, WhereEachTargetStands, EveryRecordAndWhatShowsIt, TheTeamToday, ReportedAgainstTheCriteria, WhoCheckedIn, Blockers, WhatKeepsComingUp,
} from './the-board-sections'

type Any = any
const aNumber = (n: unknown) => Number(n ?? 0).toLocaleString('en-GB')

export interface TheGoalsBoardAsPicturedProps {
  b: Any
  groundId: string
  sessionRows: Any[]
  renderActions: (action: Any) => React.ReactNode
  onRecordTheDecision: () => void
  navigate: (to: string) => void
}

export function TheGoalsBoardAsPictured(p: TheGoalsBoardAsPicturedProps) {
  const { b, groundId } = p
  const today = isoDay(new Date())
  const deals = ((b.workRecords ?? []) as Any[]).find((s) => s.section === 'Deal grid') ?? null
  const rows: Any[] = ((deals?.rows ?? []) as Any[]).filter((r) => r.kind === 'deal')
  const needs = useWhatNeedsYou({ b, groundId, deals, sessionRows: p.sessionRows })
  const headline = b.headline ?? null
  const bar = (headline?.bars ?? [])[0] ?? null
  /* "Sorted by team. A gap is a missed session." The rows are sorted by the team each person is in, where the record says it. */
  const teamOf = new Map<string, string>((b.participants ?? []).map((x: Any) => [x.id, String(x.team ?? x.department ?? '')]))
  const byTeamKnown = ((b.checkInGrid?.rows ?? []) as Any[]).some((r) => teamOf.get(r.participantId))
  const areas: Any[] = b.byArea?.state === 'filled' ? (b.byArea.areas ?? []) : []
  const blockers: Any[] = (b.blockers ?? []).filter((x: Any) => x.state !== 'cleared')
  const [today_] = p.sessionRows
  return (
    <>
      <div className="ds-grid ds-grid-2">
        <div className="ds-pair">
          {headline?.question && <p className="ds-text-secondary">{headline.question}</p>}
          {/* With nothing on record, "Every sale, and what shows it" says so once, below. */}
          {(headline?.answer || rows.length > 0) && <p className="ds-text-title">{headline?.answer ?? `${rows.length} ${rows.length === 1 ? 'sale is' : 'sales are'} on record so far.`}</p>}
          {bar && bar.filled != null && (
            <svg className="ds-bar" viewBox="0 0 100 16" preserveAspectRatio="none" role="img" aria-label={`${aNumber(bar.now)} of ${aNumber(bar.target)}`}>
              <rect className="whole" x="0" y="0" width="100" height="16" />
              <rect className="rec" x="0" y="0" width={Math.max(0, Math.min(100, Number(bar.filled)))} height="16" />
            </svg>
          )}
          {!headline && b.objectivesPrompt && <p className="ds-text-secondary">{b.objectivesPrompt}</p>}
        </div>
        <WhereEachTargetStands b={b} />
      </div>
      <WhatNeedsYou needs={needs} lead renderActions={p.renderActions} />
      <EveryRecordAndWhatShowsIt b={b} groundId={groundId} rows={rows} one="sale" many="sales" owner="Rep" said="Rep said" navigate={p.navigate} />
      <TheTeamToday b={b} groundId={groundId} lead records={rows} today={today} />
      <ReportedAgainstTheCriteria b={b} heading={areas.length > 1 ? `Reported vs criteria met, across ${areas.length} teams` : undefined} />
      {areas.length > 0 && (
        <Section heading="By team">
          <div className="ds-grid ds-grid-4">
            {areas.map((a) => (
              <Panel as="section" key={a.area} heading={a.area}>
                <p className="ds-text-body"><b className="ds-num">{aNumber(a.records)}</b> sales</p>
                {a.says && <p className="ds-text-secondary">{a.says}</p>}
              </Panel>
            ))}
          </div>
        </Section>
      )}
      <WhoCheckedIn b={b} sortBy={byTeamKnown ? (pid) => teamOf.get(pid) ?? '' : undefined} foot={byTeamKnown ? 'Sorted by team. A gap is a missed session.' : 'A gap is a missed session.'} />
      <Blockers b={b} blockers={blockers} records={rows} />
      <WhatKeepsComingUp b={b} />
      <Section heading="Reports" note="Each person’s own, the team’s once shared, and a weekly one." action={<Button kind="quiet" to={`/grounds/${groundId}?tab=report`}>Every session</Button>}>
        <EdgeList label="Reports">
          {today_ && (
            <EdgeRow title="Today’s team report" detail={`The day’s gaps: what moved, what didn’t, who’s missing. ${today_.answered} of ${today_.total} checked in.`}
              actions={<Button kind="quiet" to={today_.shared ? `/grounds/${groundId}/session/${today_.sessionNumber}` : `/grounds/${groundId}?tab=report`}>Open</Button>} />
          )}
          <EdgeRow title="Your own report" detail="Only you see it." actions={<Button kind="quiet" to={`/grounds/${groundId}?tab=report`}>Open</Button>} />
          <EdgeRow title="This week" detail="Patterns, once they’ve held for two weeks." actions={<Button kind="quiet" to={`/grounds/${groundId}/report/week`}>Open</Button>} />
        </EdgeList>
      </Section>
      <WhereThisIsHeading b={b} onRecordTheDecision={p.onRecordTheDecision} />
    </>
  )
}
