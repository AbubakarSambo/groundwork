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
          <div style={{ fontSize: 24, marginBottom: 12 }}>🔒</div>
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
      </div>
    </div>
  )
}
