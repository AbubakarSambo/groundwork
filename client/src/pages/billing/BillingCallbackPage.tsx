import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PLAN_LABELS, type SubscriptionPlan } from '@/api/billing'

export function BillingCallbackPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const status = params.get('status')
  const groundId = params.get('groundId')
  const type = params.get('type') // 'session_fee' | 'subscription'
  const plan = params.get('plan') as SubscriptionPlan | null

  useEffect(() => {
    const timer = setTimeout(() => {
      if (type === 'subscription') navigate('/billing')
      else if (groundId) navigate(`/grounds/${groundId}`)
      else navigate('/billing')
    }, 3000)
    return () => clearTimeout(timer)
  }, [groundId, navigate, type])

  const success = status === 'success'
  const isSubscription = type === 'subscription'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gw-bg)', flexDirection: 'column', gap: 14, padding: 24 }}>
      {success ? (
        <>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gw-green-bg)', border: '1.5px solid var(--gw-green-b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            ✓
          </div>

          {isSubscription ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gw-navy)', letterSpacing: '-.01em', textAlign: 'center' }}>
                {plan ? `You are now on the ${PLAN_LABELS[plan]} plan.` : 'Subscription active.'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', maxWidth: 340, lineHeight: 1.65 }}>
                Thank you for supporting Groundwork. Your payment helps us continue building a product that helps teams align, make better decisions, and solve problems together.
              </div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', opacity: 0.7 }}>
                Unlimited Grounds and unlimited sessions are now active for your organization. Redirecting you to billing...
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gw-navy)', letterSpacing: '-.01em' }}>
                Session added.
              </div>
              <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', maxWidth: 340, lineHeight: 1.65 }}>
                Thank you for supporting Groundwork. Your payment helps us continue building a product that helps teams align, make better decisions, and solve problems together.
              </div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', opacity: 0.7 }}>
                1 session added to your ground. Redirecting you back...
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gw-text)' }}>Payment cancelled</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
            No charge was made. Redirecting you back...
          </div>
        </>
      )}
    </div>
  )
}
