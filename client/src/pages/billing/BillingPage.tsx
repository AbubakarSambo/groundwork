import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { billingApi, groundsApi } from '@/api'
import { GroundworkLogo } from '@/components/gw/GroundworkLogo'

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

  const { data: billing, isLoading: billingLoading } = useQuery({
    queryKey: ['billing-status'],
    queryFn: billingApi.status,
  })

  const { data: grounds = [] } = useQuery({
    queryKey: ['grounds'],
    queryFn: groundsApi.list,
  })

  // Session-5 trigger: any active ground has a check-in at session 5 or beyond
  const hasSession5Ground = grounds.some(g =>
    g.status !== 'CLOSED' &&
    g.status !== 'RESOLVED' &&
    (g.checkIns ?? []).some((c: any) => (c.sessionNumber ?? 0) >= 5),
  )
  const showSession5Banner = hasSession5Ground && !billing?.billingReady

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="gw-hdr">
        <div>
          <GroundworkLogo />
          <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 1 }}>Billing</div>
        </div>
        <button className="gw-back" onClick={() => navigate('/')}>← Grounds</button>
      </div>

      <div className="gw-bd" style={{ maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <div className="gw-ttl" style={{ marginBottom: 4 }}>Billing</div>
        <div className="gw-sub-t" style={{ marginBottom: 16 }}>Manage your plan and active grounds.</div>

        {/* Session-5 activation prompt */}
        {showSession5Banner && (
          <div style={{ background: '#FDF3E3', border: '1px solid #E8A94A', borderRadius: 8, padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#8A5C1A', marginBottom: 6 }}>Session 5 reached</div>
            <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.65, marginBottom: 12 }}>
              One or more of your grounds has reached session 5. Sessions 1 to 4 were free.
              Activate billing to continue.
            </div>
            <div style={{ fontSize: 12, color: '#8A5C1A', fontWeight: 600 }}>
              $25/month per org + $25/person/month per active ground
            </div>
            <button
              className="gw-btn"
              style={{ marginTop: 12, width: 'auto', padding: '9px 20px' }}
              onClick={() => billingApi.careFeeCheckout().then(r => { window.location.href = r.checkoutUrl }).catch(() => {})}
            >
              Activate billing
            </button>
          </div>
        )}

        {/* Plan summary */}
        <Section title="Account">
          <div style={{ fontSize: 13, color: 'var(--gw-text)', marginBottom: 8 }}>
            Base fee: <strong>$25/month per org</strong>
          </div>
          <div style={{ fontSize: 13, color: 'var(--gw-text)', marginBottom: 12 }}>
            Per-ground fee: <strong>$25/person/month</strong> per active ground (sessions 1–4 free)
          </div>
          {billingLoading ? (
            <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>
          ) : billing?.billingReady ? (
            <div className="gw-box gw-box-green" style={{ marginBottom: 0 }}>
              Your account is active.
            </div>
          ) : (
            <div className="gw-box gw-box-amber" style={{ marginBottom: 0 }}>
              No active subscription. Sessions 1 to 4 are free — billing starts at session 5.
            </div>
          )}
        </Section>

        {/* Active grounds */}
        <Section title="Active grounds">
          {billingLoading && (
            <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>
          )}

          {!billingLoading && (!billing?.activeGrounds || billing.activeGrounds.length === 0) && (
            <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>
              No grounds are currently on a paid plan. Sessions 1 to 4 are free for all parties.
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
                Active since {formatDate(g.activeSince)}
              </div>
            </div>
          ))}

          {billing?.estimatedMonthlyTotal != null && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E2E0DB', fontSize: 13, color: 'var(--gw-text)' }}>
              Estimated this month: <strong>${billing.estimatedMonthlyTotal}</strong>
            </div>
          )}
        </Section>

        {/* Manage */}
        <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '16px', marginBottom: 8 }}>
          <button className="gw-btn" style={{ marginTop: 0 }} onClick={() => billingApi.careFeeCheckout().then(r => { window.location.href = r.checkoutUrl }).catch(() => {})}>
            Manage subscription
          </button>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 12, lineHeight: 1.6 }}>
            Your records are never deleted when a subscription changes. Records belong to the people in them.
          </div>
        </div>
      </div>
    </div>
  )
}
