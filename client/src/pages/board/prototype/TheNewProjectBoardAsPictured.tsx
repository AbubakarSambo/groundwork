/**
 * A NEW PROJECT, AS PICTURED (Hafsah, 21 November 2026), ON THE DESIGN SYSTEM (24 November 2026), for whoever runs it.
 *
 * The prototype's board is "Engineering release" ("Get a new project off to a good start",
 * docs/boards-21-nov/prototype-dom/engineering-release-as-lead.html): its sections in its order and its words. On 21 November it was a
 * one-to-one port of the prototype's markup; it is now built from the shared blocks, and the sections it has in common with the sales and
 * goals boards are drawn once, in the-board-sections.tsx. The header, the tabs and "Last updated" are the board's frame, and its one Ask
 * is in that header.
 *
 * Every slot is the board the server served this reader. The prototype's tasks are this check-in's own records, named as the server
 * names what they hold ("incidents" for distribution operations, "tasks" for an engineering release).
 */
import { Section, EdgeList, EdgeRow, Tag, Button } from '@/components/gw/ui'
import { useWhatNeedsYou, isoDay, aShortDay, WhereThisIsHeading } from '../pictured/ThePicturedSalesBoard'
import { WhatNeedsYou, WhereEachTargetStands, EveryRecordAndWhatShowsIt, TheTeamToday, WhoCheckedIn, Blockers, WhatKeepsComingUp } from './the-board-sections'

type Any = any

export interface TheNewProjectBoardAsPicturedProps {
  b: Any
  groundId: string
  sessionRows: Any[]
  renderActions: (action: Any) => React.ReactNode
  onRecordTheDecision: () => void
  navigate: (to: string) => void
}

export function TheNewProjectBoardAsPictured(p: TheNewProjectBoardAsPicturedProps) {
  const { b, groundId } = p
  const today = isoDay(new Date())
  const records = ((b.workRecords ?? []) as Any[]).find((s) => s.state === 'filled' && (s.rows ?? []).length) ?? null
  const rows: Any[] = records?.rows ?? []
  const many: string = records?.holds ?? 'tasks' /* the prototype's own word where the server names none */
  const one = many.replace(/s$/, '')
  const needs = useWhatNeedsYou({ b, groundId, deals: null, sessionRows: p.sessionRows })
  const blockers: Any[] = (b.blockers ?? []).filter((x: Any) => x.state !== 'cleared')
  const [firstReport, secondReport] = p.sessionRows
  /* "All 38 sessions": the session the one clock names, never counted from the rows on the page (release test, 21 November 2026, bug 42). */
  const sessions = Number(b.theCount?.session ?? 0)
  const headline = b.headline ?? null
  return (
    <>
      <div className="ds-grid ds-grid-2">
        <div className="ds-pair">
          {headline?.question && <p className="ds-text-secondary">{headline.question}</p>}
          {/* With nothing on record, "Every task, and what shows it" says so once, below. */}
          {(headline?.answer || rows.length > 0) && <p className="ds-text-title">{headline?.answer ?? `${rows.length} ${rows.length === 1 ? one : many} on record so far.`}</p>}
          {!headline && b.objectivesPrompt && <p className="ds-text-secondary">{b.objectivesPrompt}</p>}
        </div>
        <WhereEachTargetStands b={b} />
      </div>
      <WhatNeedsYou needs={needs} lead renderActions={p.renderActions} />
      <EveryRecordAndWhatShowsIt b={b} groundId={groundId} rows={rows} one={one} many={many} owner="Owner" said="Their own word" navigate={p.navigate} />
      <TheTeamToday b={b} groundId={groundId} lead today={today} />
      <WhoCheckedIn b={b} />
      <Blockers b={b} blockers={blockers} />
      <WhatKeepsComingUp b={b} />
      {firstReport && (
        <Section heading="Reports" note="Every session has two: each person’s own, and the team’s once you share it." action={<Button kind="quiet" to={`/grounds/${groundId}?tab=report`}>{sessions > 1 ? `All ${sessions} sessions` : 'Every session'}</Button>}>
          <EdgeList label="Reports">
            {[firstReport, secondReport].filter(Boolean).map((r: Any) => (
              <EdgeRow key={r.sessionNumber} title={r.opened ? `${aShortDay(r.opened)}, session ${r.sessionNumber}` : `Session ${r.sessionNumber}`}
                detail={`${r.answered} of ${r.total} checked in.`}
                actions={<>
                  <Tag tone={r.shared ? 'proven' : 'attention'}>{r.shared ? 'Shared' : 'Not shared'}</Tag>
                  <Button kind="quiet" to={r.shared ? `/grounds/${groundId}/session/${r.sessionNumber}` : `/grounds/${groundId}?tab=report`}>{r.shared ? 'Open' : 'Share it'}</Button>
                </>} />
            ))}
          </EdgeList>
        </Section>
      )}
      <WhereThisIsHeading b={b} onRecordTheDecision={p.onRecordTheDecision} />
    </>
  )
}
