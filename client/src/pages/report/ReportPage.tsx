import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'

export function ReportPage() {
  const { groundId } = useParams<{ groundId: string }>()
  const navigate = useNavigate()
  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['report', groundId],
    queryFn: () => reportsApi.get(groundId!),
    enabled: !!groundId,
  })

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading report…</div>
      </div>
    )
  }

  if (isError || !report) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 8, padding: '40px 32px', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--gw-muted)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Report not available yet</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 20 }}>
            Both parties need to complete two check-ins before the report is released — simultaneously.
          </div>
          <button className="gw-btn-sec" style={{ display: 'inline-block', width: 'auto', padding: '9px 18px' }} onClick={() => navigate(`/grounds/${groundId}`)}>
            ← Back to ground
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <div className="gw-logo">The shared picture</div>
        <button className="gw-back" onClick={() => navigate(`/grounds/${groundId}`)}>← Ground</button>
      </div>

      <div className="gw-bd" style={{ maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <div className="gw-box gw-box-blue" style={{ marginBottom: 16 }}>
          This report was released to both parties at the same time. Neither side had advance access.
        </div>

        {/* What this is built on — engagement quality + confidence + the "not verified" disclosure */}
        {report.engagement && (
          <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '14px 16px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--gw-muted)' }}>What this is built on</span>
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', padding: '2px 8px', borderRadius: 999,
                background: report.engagement.coverage === 'strong' ? '#E4F3EC' : report.engagement.coverage === 'moderate' ? '#FDF3E3' : '#F7E9E6',
                color: report.engagement.coverage === 'strong' ? '#085041' : report.engagement.coverage === 'moderate' ? '#8A5C1A' : '#9B3B2E',
              }}>
                {report.engagement.coverage} coverage
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
              {report.engagement.parties.map((p, i) => (
                <div key={i} style={{ fontSize: 12, color: '#1A1916' }}>
                  {p.label}: {p.contributed
                    ? `${p.sessions} session${p.sessions === 1 ? '' : 's'}, ${p.recordEntries} record entr${p.recordEntries === 1 ? 'y' : 'ies'}${p.documentsAttached ? `, ${p.documentsAttached} document${p.documentsAttached === 1 ? '' : 's'}` : ''}`
                    : 'did not contribute'}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gw-muted)', lineHeight: 1.5 }}>{report.engagement.note}</div>
          </div>
        )}

        {/* Shared picture */}
        <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '16px', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
            The shared picture
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: '#1A1916', whiteSpace: 'pre-wrap' }}>
            {report.sharedPicture}
          </div>
        </div>

        {/* Agreements */}
        {report.agreements?.length > 0 && (
          <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '16px', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#085041', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
              Where you agree
            </div>
            {report.agreements.map((a: string, i: number) => (
              <div key={i} style={{ fontSize: 13, padding: '6px 0', borderBottom: i < report.agreements.length - 1 ? '1px solid #E2E0DB' : 'none', display: 'flex', gap: 8 }}>
                <span style={{ color: '#5DCAA5', marginTop: 1 }}>✓</span>
                <span>{a}</span>
              </div>
            ))}
          </div>
        )}

        {/* Divergences */}
        {report.divergences?.length > 0 && (
          <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '16px', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8A5C1A', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
              The gap
            </div>
            {report.divergences.map((d: any, i: number) => {
              // N-party shape is `positions[]`; tolerate the legacy two-field shape.
              const positions: { participantLabel: string; view: string }[] = d.positions ?? [
                ...(d.initiatorView ? [{ participantLabel: 'One of you', view: d.initiatorView }] : []),
                ...(d.participantView ? [{ participantLabel: 'The other', view: d.participantView }] : []),
              ]
              return (
                <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < report.divergences.length - 1 ? '1px solid #E2E0DB' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{d.topic}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {positions.map((p, j: number) => (
                      <div key={j} style={{ background: '#F4F1EC', borderRadius: 4, padding: '8px 10px', fontSize: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#6B6862', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                          {p.participantLabel}
                        </div>
                        {p.view}
                      </div>
                    ))}
                  </div>
                  {d.evidence?.length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--gw-muted)', lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 700 }}>Grounded in:</span> {d.evidence.join(' · ')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Central question */}
        {report.centralQuestion && (
          <div style={{ background: '#0C447C', borderRadius: 6, padding: '20px 20px', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#B5D4F4', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
              The one question worth answering
            </div>
            <div style={{ fontSize: 15, color: 'white', fontWeight: 500, lineHeight: 1.5 }}>
              {report.centralQuestion}
            </div>
          </div>
        )}

        {/* Before your conversation — post-report guide — #99 */}
        <PostReportGuide guide={(report as any).postReportGuide} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// #99 — Post-report conversation guide
// ─────────────────────────────────────────────────────────────────────────────

interface PostReportGuideData {
  openWith: string
  askThis: string
  acknowledge: string
}

function PostReportGuide({ guide }: { guide?: PostReportGuideData | null }) {
  const placeholder = !guide

  const cards: { key: keyof PostReportGuideData; title: string; text: string }[] = [
    {
      key: 'openWith',
      title: 'Open with',
      text: guide?.openWith ?? 'Your guide is being prepared.',
    },
    {
      key: 'askThis',
      title: 'Ask this',
      text: guide?.askThis ?? 'Your guide is being prepared.',
    },
    {
      key: 'acknowledge',
      title: 'Acknowledge',
      text: guide?.acknowledge ?? 'Your guide is being prepared.',
    },
  ]

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
        Before your conversation
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cards.map((card) => (
          <div
            key={card.key}
            style={{
              background: 'white', border: '1px solid #E2E0DB', borderRadius: 6,
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
              {card.title}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: placeholder ? 'var(--gw-muted)' : '#1A1916', fontStyle: placeholder ? 'italic' : 'normal' }}>
              {card.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
