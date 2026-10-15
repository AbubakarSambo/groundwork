import { useQuery } from '@tanstack/react-query'
import { TheLeadsOwnWayIn } from '@/components/gw/TheLeadsOwnWayIn'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { Page, PageTitle, Section, Note, Button, FoldedLine, NumberTiles } from '@/components/gw/ui'
import { whatWentWrong, whyYouCannotSeeThis } from './why-you-cannot-see-this'

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

  /* "This week, 21 to 23 Sep, so far" when the server sends it; a week with nothing to show yet
     reads only `saying`, exactly as the lead-less daily report already does elsewhere. */
  const title = data.heading ?? 'This week'

  /*
   * THE LIGHT WEEKLY REPORT (docs/light-rebuild/sales-first.md, section 2; the light prototype's s60),
   * for a sales check-in: what this week shows, the week in numbers and what to do next week first;
   * every other part folds to one line with the server's fact (`inThisReport`). Every part is the same
   * one drawn below, from the same fields; nothing is left out. Built from this check-in's own record.
   */
  if ((ground as any)?.kindOfWork === 'sales org') {
    const glance = data.inThisReport ?? {}
    return (
      <Page>
        <PageTitle crumbs={crumbs} title={title} subtitle={data.whatThisIs} />
        {data.saying && <Note>{data.saying}</Note>}
        {(data.eachPerson.length > 0 || (data.acrossTheTeam && data.acrossTheTeam.length > 0)) && (
          <Section heading="What this week shows">
            <div className="gwui-light-report-part">
              {data.eachPerson.map((p, i) => <p key={i} className="gwui-panel-text">{p.says}</p>)}
              {(data.acrossTheTeam ?? []).map((s, i) => <p key={`att-${i}`} className="gwui-panel-text">{s}</p>)}
            </div>
          </Section>
        )}
        {data.inNumbers && data.inNumbers.length > 0 && (
          <Section heading="The week in numbers">
            <NumberTiles label="The week in numbers" tiles={data.inNumbers.map((row, i) => ({ key: String(i), label: row.of, value: String(row.figure), sub: row.says }))} />
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
        {((data.threeInARow?.length ?? 0) > 0 || !!data.saidAndProof || !!data.whatChanged) && (
          <Section heading="More in this report" note="Tap any line to see more">
            <div className="gwui-folds">
              {data.threeInARow && data.threeInARow.length > 0 && (
                <FoldedLine name="Things that happened in three check-ins in a row" fact={glance.threeInARow ?? null}>
                  {data.threeInARow.map((row, i) => (
                    <div key={i}>
                      <p className="gwui-panel-text gwui-light-report-do">{row.isYou ? 'You' : row.who}</p>
                      <p className="gwui-panel-text-muted">{row.says}</p>
                    </div>
                  ))}
                </FoldedLine>
              )}
              {data.saidAndProof && (
                <FoldedLine name="What people said, and what the proof shows" fact={glance.saidAndProof ?? null}>
                  <p className="gwui-panel-text">{data.saidAndProof}</p>
                </FoldedLine>
              )}
              {data.whatChanged && (
                <FoldedLine name="What changed" fact={glance.whatChanged ?? null}>
                  {(['moved', 'dropped', 'result'] as const).map((key) => (
                    <div key={key}>
                      <p className="gwui-panel-text gwui-light-report-do">{key === 'moved' ? 'Moved' : key === 'dropped' ? 'Dropped' : 'Result'}</p>
                      {data.whatChanged![key].map((line, i) => <p key={i} className="gwui-panel-text-muted">{line}</p>)}
                    </div>
                  ))}
                </FoldedLine>
              )}
            </div>
          </Section>
        )}
        {(ground as any)?.viewerIsInitiator && !['CLOSED', 'RESOLVED', 'STALLED', 'PAUSED'].includes((ground as any)?.status) && (
          <TheLeadsOwnWayIn groundId={id!} />
        )}
      </Page>
    )
  }
  return (
    <Page>
      <PageTitle crumbs={crumbs} title={title} subtitle={data.whatThisIs} />

      {data.saying && (
        <Note>{data.saying}</Note>
      )}

      {data.inNumbers && data.inNumbers.length > 0 && (
        <Section heading="The week in numbers">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            {data.inNumbers.map((row, i) => (
              <div key={i}>
                <div style={{ fontFamily: 'var(--gw-font-name)', fontSize: 28, color: 'var(--gw-navy)' }}>{row.figure}</div>
                <div style={{ fontSize: 13, color: 'var(--gw-sub)' }}>{row.of}</div>
                <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{row.says}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {(data.eachPerson.length > 0 || (data.acrossTheTeam && data.acrossTheTeam.length > 0)) && (
        <Section heading="What this week shows">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.eachPerson.map((p, i) => (
              <p key={i} style={{ fontSize: 14.5, color: 'var(--gw-text)', margin: 0 }}>{p.says}</p>
            ))}
            {(data.acrossTheTeam ?? []).map((s, i) => (
              <p key={`att-${i}`} style={{ fontSize: 14.5, color: 'var(--gw-text)', margin: 0 }}>{s}</p>
            ))}
          </div>
        </Section>
      )}

      {data.threeInARow && data.threeInARow.length > 0 && (
        <Section heading="Things that happened in three check-ins in a row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.threeInARow.map((row, i) => (
              <div key={i}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)' }}>{row.isYou ? 'You' : row.who}</div>
                <div style={{ fontSize: 14, color: 'var(--gw-sub)' }}>{row.says}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {data.saidAndProof && (
        <Section heading="What people said, and what the proof shows">
          <p style={{ fontSize: 14.5, color: 'var(--gw-text)', margin: 0 }}>{data.saidAndProof}</p>
        </Section>
      )}

      {data.whatChanged && (
        <Section heading="What changed">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(['moved', 'dropped', 'result'] as const).map((key) => (
              <div key={key}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gw-text)', textTransform: 'capitalize' }}>{key}</div>
                {data.whatChanged![key].map((line, i) => (
                  <p key={i} style={{ fontSize: 14, color: 'var(--gw-sub)', margin: '4px 0 0' }}>{line}</p>
                ))}
              </div>
            ))}
          </div>
        </Section>
      )}

      {data.forNextWeek && data.forNextWeek.length > 0 && (
        <Section heading="For you to do next week">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {data.forNextWeek.map((row, i) => (
              <div key={i}>
                <p style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--gw-text)', margin: 0 }}>{row.do}</p>
                <p style={{ fontSize: 13.5, color: 'var(--gw-sub)', margin: '2px 0 0' }}>{row.why}</p>
                <p style={{ fontSize: 13, color: 'var(--gw-muted)', margin: '2px 0 0' }}>{row.comesFrom}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Decision 133: each report the lead reads ends with "Check in yourself" and "Add context". */}
      {(ground as any)?.viewerIsInitiator && !['CLOSED', 'RESOLVED', 'STALLED', 'PAUSED'].includes((ground as any)?.status) && (
        <TheLeadsOwnWayIn groundId={id!} />
      )}
    </Page>
  )
}
