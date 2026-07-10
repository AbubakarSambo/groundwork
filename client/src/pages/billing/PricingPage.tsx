import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { billingApi, PLAN_LABELS, PLAN_PRICES, PLAN_MEMBER_CAPS, type SubscriptionPlan } from '@/api/billing'
import { useAuthStore } from '@/stores/auth'

const PLANS: SubscriptionPlan[] = ['STARTER', 'SMALL_TEAM', 'GROWTH', 'BUSINESS', 'SCALE']

const PLAN_DESCRIPTIONS: Record<SubscriptionPlan, string> = {
  STARTER: 'For small teams getting started with structured check-ins.',
  SMALL_TEAM: 'For growing teams running multiple Grounds at once.',
  GROWTH: 'For organizations running Groundwork across departments or client groups.',
  BUSINESS: 'For larger organizations with multiple teams and Grounds in flight.',
  SCALE: 'For organizations scaling Groundwork across a large workforce.',
  ENTERPRISE: 'For organizations with custom needs, volume pricing, or dedicated support.',
}

const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  STARTER: ['Unlimited Grounds', 'Unlimited sessions', 'Unlimited reports', 'Up to 5 people', 'Admin dashboard'],
  SMALL_TEAM: ['Unlimited Grounds', 'Unlimited sessions', 'Unlimited reports', 'Up to 20 people', 'Admin dashboard'],
  GROWTH: ['Unlimited Grounds', 'Unlimited sessions', 'Unlimited reports', 'Up to 100 people', 'Admin dashboard'],
  BUSINESS: ['Unlimited Grounds', 'Unlimited sessions', 'Unlimited reports', 'Up to 250 people', 'Admin dashboard'],
  SCALE: ['Unlimited Grounds', 'Unlimited sessions', 'Unlimited reports', 'Up to 1,000 people', 'Admin dashboard'],
  ENTERPRISE: ['Unlimited Grounds', 'Unlimited sessions', 'Unlimited reports', 'Unlimited people', 'Dedicated account manager'],
}

export function PricingPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [subscribingPlan, setSubscribingPlan] = useState<SubscriptionPlan | null>(null)

  const subscribeMut = useMutation({
    mutationFn: (plan: SubscriptionPlan) => billingApi.createSubscription(plan),
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl
    },
  })

  const handleSubscribe = (plan: SubscriptionPlan) => {
    if (!user) {
      navigate('/auth?next=/pricing')
      return
    }
    setSubscribingPlan(plan)
    subscribeMut.mutate(plan)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', padding: '48px 24px 80px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-accent)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>
            Pricing
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--gw-navy)', letterSpacing: '-.02em', marginBottom: 16, lineHeight: 1.2 }}>
            Simple, honest pricing.
          </h1>
          <p style={{ fontSize: 15, color: 'var(--gw-sub)', maxWidth: 520, margin: '0 auto', lineHeight: 1.65 }}>
            Start free with 10 Grounds. Subscribe when your team grows. Every plan includes unlimited Grounds, sessions, and reports.
          </p>
        </div>

        {/* Free tier */}
        <div style={{ background: 'var(--gw-card)', border: '1.5px solid var(--gw-border)', borderRadius: 14, padding: '28px 32px', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-navy)' }}>Free</span>
                <span style={{ fontSize: 11, background: 'var(--gw-green-bg)', color: 'var(--gw-green)', border: '1px solid var(--gw-green-b)', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>Always</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 12 }}>
                Create up to 10 Grounds for free. No card required. Unlimited sessions and reports on every Ground.
              </p>
              <ul style={{ fontSize: 12, color: 'var(--gw-sub)', paddingLeft: 16, margin: 0, lineHeight: 1.8 }}>
                {['10 Grounds', 'Unlimited sessions', 'Unlimited reports', 'Admin dashboard', 'Templates'].map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--gw-navy)' }}>$0</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>forever</div>
            </div>
          </div>
        </div>

        {/* Subscription plans */}
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 8 }}>
          Subscribe as your team grows
        </h2>
        <p style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 28, lineHeight: 1.6 }}>
          Every person with a Groundwork account in your organization counts toward your plan. One flat monthly rate, unlimited everything.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 48 }}>
          {PLANS.map((plan) => (
            <div key={plan} style={{ background: 'var(--gw-card)', border: '1.5px solid var(--gw-border)', borderRadius: 14, padding: '24px 20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>{PLAN_LABELS[plan]}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gw-navy)', marginBottom: 4 }}>{PLAN_PRICES[plan]}</div>
              <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginBottom: 12 }}>{PLAN_MEMBER_CAPS[plan]}</div>
              <p style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 16, flexGrow: 1 }}>
                {PLAN_DESCRIPTIONS[plan]}
              </p>
              <ul style={{ fontSize: 12, color: 'var(--gw-sub)', paddingLeft: 16, marginBottom: 20, lineHeight: 1.8 }}>
                {PLAN_FEATURES[plan].map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe(plan)}
                disabled={subscribeMut.isPending && subscribingPlan === plan}
                style={{ fontSize: 13, fontWeight: 600, background: 'var(--gw-navy)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 0', cursor: 'pointer', opacity: subscribeMut.isPending && subscribingPlan === plan ? 0.6 : 1 }}
              >
                {subscribeMut.isPending && subscribingPlan === plan ? 'Loading...' : 'Subscribe'}
              </button>
            </div>
          ))}
        </div>

        {/* Enterprise */}
        <div style={{ background: 'var(--gw-card)', border: '1.5px solid var(--gw-border)', borderRadius: 14, padding: '24px 28px', marginBottom: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>Enterprise</div>
            <p style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 0 }}>
              {PLAN_DESCRIPTIONS.ENTERPRISE}
            </p>
          </div>
          <a href="mailto:hello@groundwork.so" style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-accent)', background: 'none', border: '1px solid var(--gw-accent)', borderRadius: 9, padding: '10px 20px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Contact us
          </a>
        </div>

        {/* Billing principles */}
        <div style={{ borderTop: '1px solid var(--gw-border)', paddingTop: 40, marginBottom: 48 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 20 }}>Why we price this way</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {[
              { title: 'Start free, no card required.', body: '10 Grounds is enough to know whether Groundwork works for your team. No credit card, no trial that expires, no pressure to upgrade before you have seen the value.' },
              { title: 'Pay for your team size, not your usage.', body: 'Every person with a Groundwork account in your organization counts toward your plan. Unlimited Grounds, sessions, and reports at every tier.' },
              { title: 'One price, no tiers per feature.', body: 'Every plan gives you the same thing: full AI-facilitated check-ins, structured reports, and a permanent record. No features locked behind higher tiers.' },
              { title: 'Transparent and consistent.', body: 'The price you see is the price you pay. No proration surprises, no hidden add-ons, no sudden price changes without notice.' },
            ].map((item) => (
              <div key={item.title} style={{ padding: '18px 20px', background: 'var(--gw-card)', border: '1px solid var(--gw-border)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 6 }}>{item.title}</div>
                <p style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.65, marginBottom: 0 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Guiding principle */}
        <div style={{ textAlign: 'center', padding: '32px 24px', background: 'var(--gw-card)', border: '1px solid var(--gw-border)', borderRadius: 14 }}>
          <p style={{ fontSize: 15, color: 'var(--gw-sub)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7, fontStyle: 'italic' }}>
            "Pay when something real happens. Stop when it doesn't. We built the pricing to match how trust actually works."
          </p>
        </div>

      </div>
    </div>
  )
}
