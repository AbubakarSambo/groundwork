import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { billingApi } from '@/api'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '16px', marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export function BillingPage() {
  const navigate = useNavigate()

  const { data: billing, isLoading } = useQuery({
    queryKey: ['billing-status'],
    queryFn: billingApi.status,
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="gw-hdr">
        <div>
          <div className="gw-logo">Groundwork</div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 1 }}>Billing</div>
        </div>
        <button className="gw-back" onClick={() => navigate('/')}>← Grounds</button>
      </div>

      <div className="gw-bd" style={{ maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <div className="gw-ttl" style={{ marginBottom: 4 }}>Your account</div>
        <div className="gw-sub-t">Manage your Groundwork subscription and active grounds.</div>

        {/* Care fee */}
        <Section title="Groundwork is available">
          <div style={{ fontSize: 13, color: 'var(--gw-text)', marginBottom: 8 }}>
            Care fee: <strong>USD 20/month</strong>
          </div>
          {billing?.billingReady ? (
            <div className="gw-box gw-box-green" style={{ marginBottom: 0 }}>
              Your account is active.
            </div>
          ) : (
            <div className="gw-box gw-box-amber" style={{ marginBottom: 0 }}>
              No active subscription. Set up billing to activate grounds.
            </div>
          )}
        </Section>

        {/* Active grounds */}
        <Section title="Active grounds">
          {isLoading && (
            <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>
          )}

          {!isLoading && (!billing?.activeGrounds || billing.activeGrounds.length === 0) && (
            <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>
              No grounds are currently active.
            </div>
          )}

          {billing?.activeGrounds?.map((g) => (
            <div
              key={g.groundId}
              style={{ padding: '10px 12px', background: '#F7F6F3', borderRadius: 5, marginBottom: 7 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)' }}>{g.label}</div>
                <span style={{ fontSize: 11, color: 'var(--gw-sub)', background: '#EEF4FB', border: '1px solid #B5D4F4', borderRadius: 20, padding: '2px 8px' }}>
                  {g.scenario.replace(/_/g, ' ').toLowerCase()}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
                Scenario fee: <strong>USD 50/month</strong> since {formatDate(g.activeSince)}
              </div>
            </div>
          ))}

          {billing?.estimatedMonthlyTotal != null && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E2E0DB', fontSize: 13, color: 'var(--gw-text)' }}>
              Estimated this month: <strong>USD {billing.estimatedMonthlyTotal}</strong>
            </div>
          )}
        </Section>

        {/* Manage subscription */}
        <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '16px', marginBottom: 8 }}>
          <a href="#" style={{ textDecoration: 'none' }}>
            <button className="gw-btn" style={{ marginTop: 0 }}>Manage subscription</button>
          </a>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 12, lineHeight: 1.6 }}>
            Your records are never deleted when a subscription changes. Records belong to the people in them.
          </div>
        </div>
      </div>
    </div>
  )
}
