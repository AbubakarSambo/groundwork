import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { Page, PageTitle, Section, Note, Button } from '@/components/gw/ui'
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
    </Page>
  )
}
