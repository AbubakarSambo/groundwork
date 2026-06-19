import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { billingApi } from '@/api/billing'
import { toast } from 'sonner'

export function BillingPage() {
  const navigate = useNavigate()
  const { data: status, isLoading } = useQuery({ queryKey: ['billing'], queryFn: billingApi.status })

  const portal = useMutation({
    mutationFn: billingApi.portal,
    onSuccess: r => { window.location.href = r.url },
    onError: () => toast.error('Could not open billing portal.'),
  })

  const checkout = useMutation({
    mutationFn: billingApi.createCareFeeCheckout,
    onSuccess: r => { window.location.href = r.url },
    onError: () => toast.error('Could not start checkout.'),
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <a href="https://myground.work" target="_blank" rel="noopener noreferrer" className="gw-logo" style={{ textDecoration: 'none', color: 'inherit' }}>Groundwork</a>
        <button className="gw-back" onClick={() => navigate('/grounds')}>← Back</button>
      </div>

      <div className="gw-bd" style={{ maxWidth: 540, margin: '0 auto', width: '100%' }}>
        <div className="gw-ttl">Billing</div>
        <div className="gw-sub-t">Manage your plan, seats, and payment method.</div>

        {isLoading && <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>}

        {status && (
          <>
            {/* Plan summary */}
            <div style={{ background: 'var(--gw-blue-bg)', border: '0.5px solid var(--gw-blue-b)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)' }}>Current plan</div>
                <span className={`gw-pill ${status.careFeeActive ? 'gw-pill-green' : 'gw-pill-gray'}`}>{status.careFeeActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)' }}>$25/mo</div><div style={{ fontSize: 11, color: 'var(--gw-sub)' }}>platform fee</div></div>
                <div><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)' }}>+$25/person</div><div style={{ fontSize: 11, color: 'var(--gw-sub)' }}>active participant/mo</div></div>
                <div><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)' }}>{status.activeParticipantCount ?? 0}</div><div style={{ fontSize: 11, color: 'var(--gw-sub)' }}>active participants</div></div>
                <div><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)' }}>${status.estimatedNextCharge ?? 0}</div><div style={{ fontSize: 11, color: 'var(--gw-sub)' }}>est. this month</div></div>
              </div>
              {status.nextBillingDate && (
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 10 }}>
                  Next billing: {new Date(status.nextBillingDate).toLocaleDateString()}
                  {status.card && ` · ${status.card.brand} ending ${status.card.last4}`}
                </div>
              )}
            </div>

            {/* Activate billing */}
            {!status.careFeeActive && (
              <div style={{ background: 'var(--gw-amber-bg)', border: '0.5px solid var(--gw-amber-b)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 6 }}>Activate billing</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 12 }}>
                  Sessions 1–2 are free. Activate to unlock session 3 and beyond — the session 3 report releases once billing is active. Pricing: $25/month platform fee plus $25/month per active participant.
                </div>
                <button onClick={() => checkout.mutate()} disabled={checkout.isPending}
                  style={{ padding: '10px 18px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {checkout.isPending ? 'Loading…' : 'Activate billing'}
                </button>
              </div>
            )}

            {/* Pricing note */}
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.7, background: 'var(--gw-bg)', borderRadius: 8, padding: '12px 14px', marginBottom: 20, border: '0.5px solid var(--gw-border)' }}>
              $25/month platform fee + $25/month per active participant. Participants in multiple Grounds are billed once. Unlimited Grounds and Ground leads. Sessions 1–2 are free.
            </div>

            {/* Manage */}
            {status.careFeeActive && (
              <button onClick={() => portal.mutate()} disabled={portal.isPending} className="gw-btn-sec" style={{ margin: 0 }}>
                {portal.isPending ? 'Loading…' : 'Manage payment method and invoices →'}
              </button>
            )}

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Billing history</div>
              <div style={{ fontSize: 13, color: 'var(--gw-sub)', padding: 12, background: 'var(--gw-bg)', borderRadius: 8, border: '0.5px solid var(--gw-border)', textAlign: 'center' }}>No billing history yet.</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
