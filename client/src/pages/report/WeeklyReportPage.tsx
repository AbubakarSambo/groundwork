import { isTheDirectMorningOn } from '@/lib/the-direct-morning'
import { useQuery } from '@tanstack/react-query'
import { TheLeadsOwnWayIn } from '@/components/gw/TheLeadsOwnWayIn'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { Page, PageTitle, Section, Note, Button, NumberTiles, EdgeList, EdgeRow } from '@/components/gw/ui'
import { whatWentWrong, whyYouCannotSeeThis } from './why-you-cannot-see-this'
import './weekly-report.css'
import { TheCheckInsOwnHeader, YourCheckIn } from './pictured/TheCheckInsOwnHeader'
import '@/pages/board/pictured/pictured-board.css'
import { threeFromDifferentPlaces } from '@/lib/three-from-different-places'

/**
 * THE WEEKLY REPORT (B4, "This week"; docs/prototype/screens/B4-reports-and-sharing/weekly-report.txt
 * and weekly-report-operations.txt; `GET /grounds/:groundId/report/week`, decisions in
 * docs/answers-from-engine.md "request 9, part (d)" and "decision 73").
 *
 * The server decides who reads what - it drops the aim/limit and `forNextWeek` for a reader who
 * should not have them, and sends a participant only their own sentence in `eachPerson` - so this
 * page draws every field it is sent and adds no restriction of its own.
 *
 * `?week=2026-09-21` reads an earlier week by the date of its Monday; without it, the latest week.
 * A week with no report comes back as `saying` alone, which this page shows as a plain sentence
 * rather than treat as an error - the route answered, it just has nothing for that week.
 */


/**
 * THE WEEK FOR THE LEAD (browser test, 21 October 2026): the weekly letter's three parts, on the screen, first, as the server sends them to
 * the person who runs the check-in where the direct morning is on. Absent, nothing is drawn and the report reads as before.
 */
export function TheWeekForTheLead({ w }: { w: NonNullable<import('@/api/reports').WeeklyReport['forTheLead']> }) {
  return (
    <>
      {w.target && (
        <Section heading="Where the target stands">
          <div className="panel pad"><p>{w.target}</p></div>
        </Section>
      )}
      {w.movedWithProof.length > 0 && (
        <Section heading="What moved this week, with what shows it">
          <div className="panel pad stack" style={{ gap: 10 }}>{w.movedWithProof.map((line, i) => <p key={i}>{line}</p>)}</div>
        </Section>
      )}
      {w.needsYou.length > 0 && (
        <Section heading="Who needs you">
          {w.needsYou.map((n, i) => (
            <div key={i} className="panel pad stack" style={{ gap: 10 }}>
              <p><b>{n.says}</b></p>
              {n.evidence.map((e, j) => <p key={j}>{e}</p>)}
            </div>
          ))}
        </Section>
      )}
    </>
  )
}

export default function WeeklyReportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const week = searchParams.get('week') ?? undefined

  const { data: ground } = useQuery({
    queryKey: ['ground', id],
    queryFn: () => groundsApi.get(id!),
    enabled: !!id,
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['weekly-report', id, week],
    queryFn: () => reportsApi.week(id!, week),
    enabled: !!id,
  })

  const crumbs = [
    { label: 'Check-ins', to: '/grounds' },
    ...(ground ? [{ label: ground.label, to: `/grounds/${id}?tab=report` }] : []),
    { label: 'This week' },
  ]

  if (isLoading) {
    return (
      <Page>
        <PageTitle crumbs={crumbs} title="This week" />
        <Note role="status">Getting this week's report…</Note>
      </Page>
    )
  }

  if (isError) {
    const { say, canRetry } = whyYouCannotSeeThis(whatWentWrong(error))
    return (
      <Page>
        <PageTitle crumbs={crumbs} title="This week" />
        <Note tone="error">{say}</Note>
        {canRetry && <Button kind="secondary" onClick={() => navigate(0)}>Try again</Button>}
      </Page>
    )
  }

  if (!data) return null
  /* The direct morning (lib/the-direct-morning.tsx): the week itself, with no line explaining what a weekly report is. */
  const direct = isTheDirectMorningOn(data) || isTheDirectMorningOn(ground)

  /* "This week, 21 to 23 Sep, so far" when the server sends it; a week with nothing to show yet
     reads only `saying`, exactly as the lead-less daily report already does elsewhere. */
  const title = data.heading ?? 'This week'

  /*
   * THE LIGHT WEEKLY REPORT (docs/light-rebuild/sales-first.md, section 2; the light prototype's s60),
   * for a sales check-in: what this week shows, the week in numbers and what to do next week first;
   * every other part folds to one line with the server's fact (`inThisReport`). Every part is the same
   * one drawn below, from the same fields; nothing is left out. Built from this check-in's own record.
   */
  /*
   * THE WEEKLY REPORT AS PICTURED, FOR EVERY CHECK-IN (screen match, 16 October; weekly-report.jpg and
   * weekly-report-operations.jpg). Every part open
   * and in the picture's order: the week in numbers, what this week shows, what happened three check-ins in a row, what
   * people said and what the proof shows, what changed, and what to do next week. The light report folded the middle
   * three to one line each; they are open now, so nothing is behind a fold.
   */
  /*
   * THE WEEKLY REPORT AS PICTURED (weekly-report.jpg, weekly-report-operations.jpg; screens 43, 44, 50 to 80). Each number
   * large with what it counts under it; what this week shows in a panel, with what came up across the team in its own amber
   * strip; each thing that happened three check-ins in a row on an amber edge; what people said and the proof in a panel;
   * what changed as a two-column panel; each thing to do next week on a navy edge with where it comes from beneath it. The
   * report as it was, with each number's own sentence and the lead's way in, is one tap away (?whole=1). Same fields, same walls.
   */
  /* faith90-weekly-report.jpg (screen 58): a week nothing has come into yet reads as the check-in, and says it fills in once people check in. */
  const nothingYet = !!data.saying && !(data.inNumbers ?? []).length && !(data.eachPerson ?? []).length && !(data.acrossTheTeam ?? []).length && !(data.threeInARow ?? []).length && !(data.forNextWeek ?? []).length && !data.saidAndProof && !data.forTheLead
  if (searchParams.get('whole') !== '1' && !week && nothingYet && ground) {
    return (
      <Page>
        <TheCheckInsOwnHeader groundId={id!} ground={ground} sessionNumber={(ground as any)?.currentSession ?? (Math.max(0, ...(((ground as any)?.checkIns ?? []) as any[]).map((c: any) => Number(c.sessionNumber) || 0)) || null)} label={(ground as any).label} />
        <h2 className="wr-nothing-h">Nothing here yet.</h2>
        <p className="wr-nothing-p">It fills in once people start checking in.</p>
        <div><YourCheckIn groundId={id!} /></div>
      </Page>
    )
  }
  if (searchParams.get('whole') !== '1') {
    const changed = data.whatChanged
    return (
      <Page>
        <PageTitle crumbs={crumbs} title={title} subtitle={direct ? undefined : data.whatThisIs} />
        {data.saying && <Note>{data.saying}</Note>}
        {data.inNumbers && data.inNumbers.length > 0 && (
          <Section heading="The week in numbers">
            <div className="g4">
              {data.inNumbers.map((row, i) => (
                <div key={i} className="panel pad wr-tile"><b>{String(row.figure)}</b><span className="t-small mut">{row.of}</span></div>
              ))}
            </div>
          </Section>
        )}
        {/* A sales check-in (Release 1): the server's paragraphs, read from the deals, as the kit has them. */}
        {(data.whatThisWeekShows ?? []).length > 0 ? (
          <Section heading="What this week shows">
            <div className="panel pad stack" style={{ gap: 10 }}>{(data.whatThisWeekShows ?? []).map((p, i) => <p key={i}>{p}</p>)}</div>
            {/* sales-weekly-report.txt: the amber strip under the panel (quality pass, 18 October, W-8). */}
            {(data.acrossTheTeam ?? []).map((line, i) => <div key={`att-${i}`} className="panel pad" style={{ background: 'var(--att-soft)', borderColor: 'transparent' }}><b>{line}</b></div>)}
          </Section>
        ) : (data.eachPerson.length > 0 || (data.acrossTheTeam && data.acrossTheTeam.length > 0)) && (
          <Section heading="What this week shows">
            {data.eachPerson.length > 0 && (
              <div className="panel pad stack" style={{ gap: 10 }}>{data.eachPerson.map((p, i) => <p key={i}>{p.says}</p>)}</div>
            )}
            {(data.acrossTheTeam ?? []).map((line, i) => <div key={`att-${i}`} className="panel pad" style={{ background: 'var(--att-soft)', borderColor: 'transparent' }}><b>{line}</b></div>)}
          </Section>
        )}
        <Section heading="Things that happened in three check-ins in a row">
          {(data.threeInARow ?? []).length
            ? <EdgeList label="Things that happened in three check-ins in a row">{(data.threeInARow ?? []).map((row, i) => (
              <EdgeRow key={i} kind="look" title={row.isYou ? 'You' : row.who} detail={row.says} />
            ))}</EdgeList>
            : <p className="gwui-panel-text">Nothing happened three check-ins in a row this week.</p>}
        </Section>
        {data.saidAndProof && (
          <Section heading="What people said, and what the proof shows">
            <div className="panel pad"><p>{data.saidAndProof}</p></div>
          </Section>
        )}
        {changed && (
          <Section heading="What changed">
            <div className="panel pad wr-changed">
              {/* sales-weekly-report.txt: Moved, Dropped, Adapted (only where somebody changed the way they work, W-6), Result. */}
              {(['moved', 'dropped', 'adapted', 'result'] as const).filter((key) => (changed[key] ?? []).length > 0).map((key) => (
                <div key={key} className="wr-changed-row">
                  <b>{key === 'moved' ? 'Moved' : key === 'dropped' ? 'Dropped' : key === 'adapted' ? 'Adapted' : 'Result'}</b>
                  <div>{(changed[key] ?? []).map((line, i) => <p key={i}>{line}</p>)}</div>
                </div>
              ))}
            </div>
          </Section>
        )}
        {data.forNextWeek && data.forNextWeek.length > 0 && (
          <Section heading="For you to do next week">
            <EdgeList label="For you to do next week">
              {/* A sales week read from the record is in the order to do it (W-7), up to five; otherwise three from different places. */}
              {(data.forNextWeekIsRanked ? data.forNextWeek.slice(0, 5) : threeFromDifferentPlaces(data.forNextWeek)).map((row, i) => (
                <EdgeRow key={i} kind="decide" title={row.do} detail={(row.why || row.comesFrom) ? <>{row.why}{row.comesFrom && <span className="tag plain" style={{ marginLeft: row.why ? 8 : 0 }}>{row.comesFrom}</span>}</> : undefined} />
              ))}
            </EdgeList>
          </Section>
        )}
        {/* The lead's own week (where the target stands, what moved with what shows it, who needs you), after every part the prototype draws. */}
        {data.forTheLead && <TheWeekForTheLead w={data.forTheLead} />}
        {/* Kept from the report as it was, though the picture has no place for it: the lead's own way in at the end of a report (decision of 14 October). */}
        {(ground as any)?.viewerIsInitiator && !['CLOSED', 'RESOLVED', 'STALLED', 'PAUSED'].includes((ground as any)?.status) && (
          <TheLeadsOwnWayIn groundId={id!} asLinks />
        )}
        <div className="pb-whole-board-link">
          <a className="gwui-plain-link" href={`?${new URLSearchParams({ ...(week ? { week } : {}), whole: '1' }).toString()}`} onClick={(e) => { e.preventDefault(); navigate({ search: `?${new URLSearchParams({ ...(week ? { week } : {}), whole: '1' }).toString()}` }) }}>See every other part of this report</a>
        </div>
      </Page>
    )
  }

  {
    return (
      <Page>
        <PageTitle crumbs={crumbs} title={title} subtitle={direct ? undefined : data.whatThisIs} />
        {data.saying && <Note>{data.saying}</Note>}
        {data.forTheLead && <TheWeekForTheLead w={data.forTheLead} />}
        {data.inNumbers && data.inNumbers.length > 0 && (
          <Section heading="The week in numbers">
            <NumberTiles label="The week in numbers" tiles={data.inNumbers.map((row, i) => ({ key: String(i), label: row.of, value: String(row.figure), sub: row.says }))} />
          </Section>
        )}
        {(data.whatThisWeekShows ?? []).length > 0 ? (
          <Section heading="What this week shows">
            <div className="gwui-light-report-part">
              {(data.whatThisWeekShows ?? []).map((p, i) => <p key={i} className="gwui-panel-text">{p}</p>)}
            </div>
          </Section>
        ) : (data.eachPerson.length > 0 || (data.acrossTheTeam && data.acrossTheTeam.length > 0)) && (
          <Section heading="What this week shows">
            <div className="gwui-light-report-part">
              {data.eachPerson.map((p, i) => <p key={i} className="gwui-panel-text">{p.says}</p>)}
              {(data.acrossTheTeam ?? []).map((s, i) => <p key={`att-${i}`} className="gwui-panel-text">{s}</p>)}
            </div>
          </Section>
        )}
        <Section heading="Things that happened in three check-ins in a row">
          <div className="gwui-light-report-part">
            {(data.threeInARow ?? []).length
              ? (data.threeInARow ?? []).map((row, i) => (
                <div key={i}>
                  <p className="gwui-panel-text gwui-light-report-do">{row.isYou ? 'You' : row.who}</p>
                  <p className="gwui-panel-text-muted">{row.says}</p>
                </div>
              ))
              : <p className="gwui-panel-text">Nothing happened three check-ins in a row this week.</p>}
          </div>
        </Section>
        {data.saidAndProof && (
          <Section heading="What people said, and what the proof shows">
            <p className="gwui-panel-text">{data.saidAndProof}</p>
          </Section>
        )}
        {data.whatChanged && (
          <Section heading="What changed">
            <div className="gwui-light-report-part">
              {(['moved', 'dropped', 'adapted', 'result'] as const).filter((key) => (data.whatChanged![key] ?? []).length > 0).map((key) => (
                <div key={key}>
                  <p className="gwui-panel-text gwui-light-report-do">{key === 'moved' ? 'Moved' : key === 'dropped' ? 'Dropped' : key === 'adapted' ? 'Adapted' : 'Result'}</p>
                  {(data.whatChanged![key] ?? []).map((line, i) => <p key={i} className="gwui-panel-text-muted">{line}</p>)}
                </div>
              ))}
            </div>
          </Section>
        )}
        {data.forNextWeek && data.forNextWeek.length > 0 && (
          <Section heading="For you to do next week">
            <div className="gwui-light-report-part">
              {data.forNextWeek.map((row, i) => (
                <div key={i}>
                  <p className="gwui-panel-text gwui-light-report-do">{row.do}</p>
                  <p className="gwui-panel-text-muted">{row.why}</p>
                  <p className="gwui-light-report-from">{row.comesFrom}</p>
                </div>
              ))}
            </div>
          </Section>
        )}
        {(ground as any)?.viewerIsInitiator && !['CLOSED', 'RESOLVED', 'STALLED', 'PAUSED'].includes((ground as any)?.status) && (
          <TheLeadsOwnWayIn groundId={id!} />
        )}
      </Page>
    )
  }
}
