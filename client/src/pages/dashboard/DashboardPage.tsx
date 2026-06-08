import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api'

export function DashboardPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <div className="gw-logo">Dashboard</div>
        <button className="gw-back" onClick={() => navigate('/')}>← Grounds</button>
      </div>

      <div className="gw-bd" style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
        {isLoading && <div style={{ fontSize: 13, color: 'var(--gw-muted)', padding: '20px 0' }}>Loading…</div>}

        {data && (
          <>
            {/* Ground activity */}
            <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '16px', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
                Ground activity
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
                <StatBox label="Active" value={data.groundActivity.active} color="#0C447C" />
                <StatBox label="Report ready" value={data.groundActivity.reportReady} color="#085041" />
                <StatBox label="Resolved" value={data.groundActivity.resolved} color="#6B6560" />
                <StatBox label="Total" value={data.groundActivity.total} color="#1A1916" />
              </div>
              <div style={{ borderTop: '1px solid #E2E0DB', paddingTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#1A1916' }}>
                    {data.groundActivity.session2Rate === null ? '—' : `${data.groundActivity.session2Rate}%`}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
                    session-2 rate ({data.groundActivity.session2Completions}/{data.groundActivity.session1Completions})
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 4 }}>
                  Below 60% means session 1 isn't producing enough surprise to bring people back.
                </div>
              </div>
            </div>

            {/* Outcome rates */}
            <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '16px', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                Outcome & learning
              </div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 12 }}>
                Outcome rate per prompt version. When a prompt changes, this shows whether it improved the rate.
              </div>

              {data.outcomeRates.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>No resolved grounds yet.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E0DB' }}>
                      {['Prompt version', 'Resolved', 'Responses', 'Felt fair'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 0', fontWeight: 600, fontSize: 12, color: 'var(--gw-sub)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.outcomeRates.map((r: any, i: number) => (
                      <tr key={i} style={{ borderBottom: i < data.outcomeRates.length - 1 ? '1px solid #E2E0DB' : 'none' }}>
                        <td style={{ padding: '8px 0' }}>{r.key} v{r.version}</td>
                        <td style={{ padding: '8px 0' }}>{r.resolvedCount}</td>
                        <td style={{ padding: '8px 0' }}>{r.responses}</td>
                        <td style={{ padding: '8px 0' }}>
                          {r.fairnessRate === null ? '—' : `${r.fairnessRate}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 2 }}>{label}</div>
    </div>
  )
}
