import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { billingApi, PLAN_LABELS, PLAN_PRICES, formatMemberCap, formatMonthlyPrice, type SubscriptionPlan, FALLBACK_FREE_LIMITS } from '@/api/billing'
import { theFreeTrialSentence } from '@/lib/the-free-trial'
import { whatCoversThem } from './what-plan-and-billing-says'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

const PLANS: SubscriptionPlan[] = ['STARTER', 'SMALL_TEAM', 'GROWTH', 'BUSINESS', 'SCALE']

/* The prototype's words, from docs/prototype/screens/F2-billing/pricing.txt. */
const PLAN_DESCRIPTIONS: Record<SubscriptionPlan, string> = {
  STARTER: 'For small teams getting each person\u2019s own account written down.',
  SMALL_TEAM: 'For growing teams running multiple check-ins at once.',
  GROWTH: 'For organisations running Groundwork across departments or client groups.',
  BUSINESS: 'For larger organisations with multiple teams and check-ins in flight.',
  SCALE: 'For organisations running Groundwork across many teams at once.',
  ENTERPRISE: 'For organisations with custom needs, volume pricing, or dedicated support.',
}


export function PricingPage() {
  const navigate = useNavigate()

  const { user } = useAuthStore()
  const [subscribingPlan, setSubscribingPlan] = useState<SubscriptionPlan | null>(null)
  /*
   * Nothing on this page said which plan you are on. `subscriptionPlan` is null for everybody who
   * has never paid, which is what "on the free tier" means.
   */
  /*
   * "YOUR CURRENT PLAN" ONLY FOR SOMEBODY WHO HAS ONE (U.19). This read `!subscriptionPlan`, which is
   * also true of a visitor who is not signed in, so the public page told every stranger the free plan
   * was theirs. And it was true of an organisation inside a free run, which is not on the free plan.
   * Signed in, the server says what covers the organisation; signed out, nothing is anybody's.
   */
  const { data: status } = useQuery({
    queryKey: ['billing-status'],
    queryFn: billingApi.status,
    enabled: !!user,
    retry: false,
  })
  const onFree = !!user && !!status?.people && whatCoversThem(status) === 'free'

  /** Live prices (Admin -> System -> Pricing) - PLAN_PRICES is only the pre-load fallback. */
  const { data: livePricing } = useQuery({
    queryKey: ['public-pricing'],
    queryFn: billingApi.getPricing,
    staleTime: 60 * 1000,
  })
  /** The live free limit, or what we shipped with, until the request lands. */
  const freeGrounds = livePricing?.free.groundLimit ?? FALLBACK_FREE_LIMITS.groundLimit
  const freeTeam = livePricing?.free.memberLimit ?? FALLBACK_FREE_LIMITS.memberLimit
  /* The shared sentence, or nothing while the trial is off. */
  const trialSentence = theFreeTrialSentence(livePricing?.trial)
  const trialLength = livePricing?.trial?.months === 1 ? '1 month' : `${livePricing?.trial?.months ?? 0} months`

  function priceLabel(plan: SubscriptionPlan): string {
    const live = livePricing?.plans.find(p => p.plan === plan)
    /** A contact-sales plan has no amount, and "$0/mo" is the one thing this must never say. */
    if (live) return live.amountCents === null ? 'Contact us' : formatMonthlyPrice(live.amountCents)
    return PLAN_PRICES[plan]
  }

  /** No fallback: an absent seat count is honest, a stale one is the bug being removed. */
  function capLabel(plan: SubscriptionPlan): string {
    return formatMemberCap(livePricing?.plans.find(p => p.plan === plan)?.memberCap)
  }

  const subscribeMut = useMutation({
    mutationFn: (plan: SubscriptionPlan) => billingApi.createSubscription(plan),
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl
    },
    /* No onError at all: a failed checkout left the row spinning for ever. Clearing the plan is half the fix. */
    onError: (e: any) => { setSubscribingPlan(null); toast.error(e?.response?.data?.message ?? 'Could not start checkout. Try again.') },
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
    <div style={{ minHeight: '100vh', background: 'var(--gw-page)', padding: '48px 24px 80px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>
            Pricing
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--gw-navy)', letterSpacing: '-.02em', marginBottom: 16, lineHeight: 1.2 }}>
            Pricing
          </h1>
          <p style={{ fontSize: 15, color: 'var(--gw-sub)', maxWidth: 520, margin: '0 auto', lineHeight: 1.65 }}>
            {trialSentence ?? `Start free with ${freeGrounds} check-ins, for teams of ${freeTeam} or fewer, including you.`} Subscribe as your team grows. Unlimited sessions and reports on every plan.
          </p>
        </div>

        {/*
          THE FREE TRIAL, ONLY WHILE BILLING GIVES IT (U.19). The same setting switches the sentence
          and the grant (api/src/modules/billing/the-free-trial.service.ts), so while this shows it is
          true. Its offer is said in the one shared sentence; the numbers are the setting's.
        */}
        {trialSentence && livePricing?.trial && (
          <div style={{ background: 'var(--gw-card)', border: '1.5px solid var(--gw-navy)', borderRadius: 14, padding: '28px 32px', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-navy)', margin: '0 0 4px' }}>{trialLength} free</h2>
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 10 }}>{`Teams of fewer than ${livePricing.trial.teamsUnder} people`}</div>
                <p style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, margin: 0 }}>{trialSentence} {`After ${trialLength}, subscribe to keep going.`}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--gw-navy)' }}>{`$0 for ${trialLength}`}</div>
                {!user && (
                  <button
                    type="button"
                    onClick={() => navigate('/auth?next=/pricing')}
                    style={{ marginTop: 12, fontSize: 13, fontWeight: 600, background: 'var(--gw-navy)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 16px', cursor: 'pointer' }}
                  >
                    {`Start your free ${trialLength}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/*
          THE FREE PLAN, ONLY WHILE THE SWITCH IS OFF (Hafsah, 27 September). One switch, the free
          trial's: while it is off the free plan is offered as today; once it is on, the trial above is
          the only free period and new organisations pay, so the free plan is not offered to anybody.
        */}
        {!trialSentence && <div style={{ background: 'var(--gw-card)', border: '1.5px solid var(--gw-border)', borderRadius: 14, padding: '28px 32px', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-navy)' }}>Free</span>
                <span style={{ fontSize: 11, background: 'var(--gw-green-bg)', color: 'var(--gw-green)', border: '1px solid var(--gw-green-b)', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>Always</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 12 }}>
                Create up to {freeGrounds} check-ins for free, for teams of {freeTeam} or fewer including you. No card required. Unlimited sessions and reports on every check-in.
              </p>
              <ul style={{ fontSize: 12, color: 'var(--gw-sub)', paddingLeft: 16, margin: 0, lineHeight: 1.8 }}>
                {/* "Templates" was listed here and on the marketing pricing page. There
                    is no templates feature anywhere in the product - the only
                    match in the codebase is "More templates" in a feature-REQUEST
                    list. A free-tier bullet nobody can find erodes trust in the
                    rest of the list. */}
                {[`${freeGrounds} check-ins`, `Teams of ${freeTeam} or fewer`, 'Unlimited sessions', 'Unlimited reports', 'Admin dashboard'].map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--gw-navy)' }}>$0</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>forever</div>
              {/*
                * A CARD WITH NO STATE AND NO BUTTON READS AS UNAVAILABLE.
                *
                * Every paid plan below has something to press and this one had nothing at all, so
                * the free tier looked like the one option that could not be chosen. It cannot be
                * chosen, because it is where everybody already is - which is a completely different
                * thing and was nowhere on the screen. Reported by somebody signing up: "start for
                * free is not selectable, you can only select from the other options".
                */}
              {user && <div
                style={{
                  marginTop: 12, fontSize: 12, fontWeight: 700,
                  color: onFree ? 'var(--gw-green-t)' : 'var(--gw-sub)',
                  background: onFree ? 'var(--gw-green-bg)' : 'transparent',
                  border: `1px solid ${onFree ? 'var(--gw-green-b)' : 'var(--gw-border)'}`,
                  borderRadius: 7, padding: '6px 12px', display: 'inline-block',
                }}
              >
                {onFree ? 'Your current plan' : 'Included with every plan'}
              </div>}
            </div>
          </div>
        </div>}

        {/* Subscription plans */}
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 8 }}>
          Subscribe as your team grows
        </h2>
        <p style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 28, lineHeight: 1.6 }}>
          Every person with a Groundwork account in your organisation counts toward your plan. One flat monthly rate, unlimited everything.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 48 }}>
          {PLANS.map((plan) => (
            <div key={plan} style={{ background: 'var(--gw-card)', border: '1.5px solid var(--gw-border)', borderRadius: 14, padding: '24px 20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>{PLAN_LABELS[plan]}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gw-navy)', marginBottom: 4 }}>{priceLabel(plan)}</div>
              <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginBottom: 12, minHeight: 15 }}>{capLabel(plan)}</div>
              <p style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 16, flexGrow: 1 }}>
                {PLAN_DESCRIPTIONS[plan]}
              </p>
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

        {/* Enterprise: the prototype's in-product plans page paints this panel with its --chat
            cream (docs/prototype/source/s16.js), which is our --gw-bg (#F7F1E5). #FAF5EA (--band) is
            the marketing site's alone. */}
        <div style={{ background: 'var(--gw-bg)', border: '1.5px solid var(--gw-border)', borderRadius: 14, padding: '24px 28px', marginBottom: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>Enterprise</div>
            <p style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 0 }}>
              {PLAN_DESCRIPTIONS.ENTERPRISE}
            </p>
          </div>
          <a href="mailto:hello@myground.work" style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', background: 'none', border: '1px solid var(--gw-navy)', borderRadius: 9, padding: '10px 20px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Contact us
          </a>
        </div>

      </div>
    </div>
  )
}
