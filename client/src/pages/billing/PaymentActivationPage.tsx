import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { billingApi, groundsApi } from '@/api'
import { GroundworkLogo } from '@/components/gw/GroundworkLogo'
import { toast } from 'sonner'

const ORG_MONTHLY = 25
const PERSON_MONTHLY = 25

export function PaymentActivationPage() {
  const navigate = useNavigate()

  const { data: billing, isLoading } = useQuery({
    queryKey: ['billing-status'],
    queryFn: billingApi.status,
  })
  const { data: grounds } = useQuery({
    queryKey: ['grounds'],
    queryFn: groundsApi.list,
  })

  const checkout = useMutation({
    mutationFn: billingApi.careFeeCheckout,
    onSuccess: ({ checkoutUrl }) => { window.location.href = checkoutUrl },
    onError: () => toast.error('Could not start checkout — please try again.'),
  })

  const activeGrounds = grounds?.filter(g => g.status !== 'CLOSED' && g.status !== 'RESOLVED') ?? []
  const totalParticipants = activeGrounds.reduce((n, g) => n + (g.participants?.length ?? 0), 0)
  const estimatedTotal = ORG_MONTHLY + totalParticipants * PERSON_MONTHLY

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>
      </div>
    )
  }

  if (billing?.billingReady) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
        <div className="gw-hdr"><GroundworkLogo /></div>
        <div className="gw-bd" style={{ maxWidth: 480, margin: '0 auto', width: '100%', paddingTop: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✓</div>
          <div className="gw-ttl">Billing is active</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 24 }}>
            You are already set up. Sessions 1–4 per ground are free; billing starts from session 5.
          </div>
          <button className="gw-btn" style={{ width: '100%' }} onClick={() => navigate('/')}>Back to grounds</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <GroundworkLogo />
        <button className="gw-back" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div className="gw-bd" style={{ maxWidth: 480, margin: '0 auto', width: '100%', paddingTop: 32 }}>
        <div className="gw-ttl">Activate billing</div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginTop: 6, marginBottom: 24, lineHeight: 1.65 }}>
          Sessions 1–4 on every ground are free. Billing starts from session 5.
        </div>

        {/* Cost breakdown */}
        <div style={{ background: 'white', border: '0.5px solid #E2E0DB', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-muted)', marginBottom: 12 }}>
            Estimated monthly cost
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--gw-sub)' }}>Organisation fee</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>${ORG_MONTHLY}/mo</span>
          </div>

          {activeGrounds.map(g => (
            <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--gw-sub)', flex: 1, paddingRight: 12 }}>
                {g.label} · {g.participants?.length ?? 0} participant{(g.participants?.length ?? 1) !== 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: 12, color: 'var(--gw-sub)', flexShrink: 0 }}>
                ${(g.participants?.length ?? 0) * PERSON_MONTHLY}/mo
              </span>
            </div>
          ))}

          <div style={{ height: 1, background: '#E2E0DB', margin: '10px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1916' }}>Estimated total</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0C447C' }}>${estimatedTotal}/mo</span>
          </div>

          <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 8 }}>
            Billing adjusts automatically as grounds open or close.
          </div>
        </div>

        {/* Free sessions callout */}
        <div className="gw-box gw-box-green" style={{ marginBottom: 20 }}>
          <strong>Sessions 1–4 are free on every ground.</strong> You won't be charged until session 5 begins.
        </div>

        <button
          className="gw-btn"
          style={{ width: '100%', marginBottom: 10 }}
          disabled={checkout.isPending}
          onClick={() => checkout.mutate()}
        >
          {checkout.isPending ? 'Redirecting to checkout…' : 'Set up billing →'}
        </button>

        <button className="gw-btn-sec" style={{ width: '100%' }} onClick={() => navigate('/')}>
          Not now
        </button>

        <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 14, textAlign: 'center', lineHeight: 1.6 }}>
          Payments are processed securely via Stripe. You can cancel at any time.
        </div>
      </div>
    </div>
  )
}
