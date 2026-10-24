import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { billingApi, PLAN_LABELS, PLAN_PRICES, formatMemberCap, formatDollars, type SubscriptionPlan, FALLBACK_FREE_LIMITS } from '@/api/billing'
import { theFreeTrialSentence } from '@/lib/the-free-trial'
import { whatCoversThem } from './what-plan-and-billing-says'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { Mark } from '@/components/gw/ui'

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
  const freeGrounds = livePricing?.free?.groundLimit ?? FALLBACK_FREE_LIMITS.groundLimit
  const freeTeam = livePricing?.free?.memberLimit ?? FALLBACK_FREE_LIMITS.memberLimit
  /* The shared sentence, or nothing while the trial is off. */
  const trialSentence = theFreeTrialSentence(livePricing?.trial)
  const trialLength = livePricing?.trial?.months === 1 ? '1 month' : `${livePricing?.trial?.months ?? 0} months`

  /*
   * SCREEN FAULT 11 (FINAL WALK): "$25/mo" IS NOT A SENTENCE. Drawn here as one plain line of text
   * (unlike BillingPage's own plan card, which deliberately splits a big price figure from a small
   * "/mo" unit label beside it, the prototype's own card shape), so this is "the screen formats
   * it" - "/mo" becomes "a month", keeping the currency symbol and the number exactly as served.
   */
  function priceLabel(plan: SubscriptionPlan): string {
    const live = livePricing?.plans?.find(p => p.plan === plan)
    /** A contact-sales plan has no amount, and "$0 a month" is the one thing this must never say. */
    if (live) return live.amountCents === null ? 'Contact us' : `${formatDollars(live.amountCents)} a month`
    return PLAN_PRICES[plan].replace(/\/mo$/, ' a month')
  }

  /** No fallback: an absent seat count is honest, a stale one is the bug being removed. */
  function capLabel(plan: SubscriptionPlan): string {
    const cap = livePricing?.plans?.find(p => p.plan === plan)?.memberCap
    /* "5 seats included" (fix list item 6, the light prototype's s74), once a plan can add seats. */
    if (cap != null && seatCents != null) return `${cap.toLocaleString('en-US')} seats included`
    return formatMemberCap(cap)
  }
  /* The extra seat and WhatsApp per person, from the plan rows (Admin, System, Pricing). Said only when served. */
  /* Only once the new pricing is switched on, with the free trial (release step 13a); until then the plans are as before. */
  const newPricing = !!livePricing?.trial?.on
  const seatCents = newPricing ? livePricing?.plans?.find(p => p.extraSeatCents != null)?.extraSeatCents ?? null : null
  const personCents = newPricing ? livePricing?.plans?.find(p => p.whatsappPersonCents != null)?.whatsappPersonCents ?? null : null
  const oneMonth = livePricing?.trial?.months === 1

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

        {/*
          B-162: A SIGNED-OUT VISITOR HAD NO WAY OFF THIS PAGE BUT THE BROWSER'S OWN BACK BUTTON.
          Every other public page (Talk to us, the invitation, "Almost in") carries the logo, which
          always goes home; this one had neither it nor a way to sign in or sign up, only five
          "Subscribe" buttons that each demand an account anyway. A signed-in visitor gets a way
          back into the product instead, matching what B-046 already notes about this page losing
          the side menu.
        */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <Mark />
          {user ? (
            <Link to="/today" className="gwui-plain-link">Go to your check-ins</Link>
          ) : (
            <div style={{ display: 'flex', gap: 16 }}>
              <Link to="/auth" className="gwui-plain-link">Sign in</Link>
              <Link to="/auth?mode=signup" className="gwui-plain-link">Sign up</Link>
            </div>
          )}
        </div>

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
                <p style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, margin: 0 }}>
                  {oneMonth
                    ? `Everything on every plan, WhatsApp included, free for your first month. No card required. Unlimited check-ins, sessions and reports. After your free month, subscribe to keep going. Teams of ${livePricing.trial.teamsUnder} or more start on a plan.`
                    : `${trialSentence} After ${trialLength}, subscribe to keep going.`}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--gw-navy)' }}>{`$0 for ${trialLength}`}</div>
                {!user && (
                  <button className="btn pri"
                    type="button"
                    onClick={() => navigate('/auth?next=/pricing')}
                    style={{ marginTop: 12 }}
                  >
                    {oneMonth ? 'Start your free month' : `Start your free ${trialLength}`}
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
          {seatCents != null
            ? `Every person with a Groundwork account counts as a seat. Each plan includes a number of seats; add more any time for +${formatDollars(seatCents)} a seat a month. Unlimited check-ins, sessions and reports.`
            : 'Every person with a Groundwork account in your organisation counts toward your plan. One flat monthly rate, unlimited everything.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 48 }}>
          {PLANS.map((plan) => (
            <div key={plan} style={{ background: 'var(--gw-card)', border: '1.5px solid var(--gw-border)', borderRadius: 14, padding: '24px 20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>{PLAN_LABELS[plan]}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gw-navy)', marginBottom: 4 }}>{priceLabel(plan)}</div>
              <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginBottom: 12, minHeight: 15 }}>
                {capLabel(plan)}
                {seatCents != null && <><br /><b>{`+${formatDollars(seatCents)} per extra seat`}</b></>}
                {personCents != null && <><br />{`WhatsApp: +${formatDollars(personCents)} a month per person who uses it`}</>}
              </div>
              <p style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 16, flexGrow: 1 }}>
                {PLAN_DESCRIPTIONS[plan]}
              </p>
              <button className="btn pri"
                onClick={() => handleSubscribe(plan)}
                disabled={subscribeMut.isPending && subscribingPlan === plan}
              >
                {subscribeMut.isPending && subscribingPlan === plan ? 'Loading...' : 'Subscribe'}
              </button>
            </div>
          ))}
        </div>

        {/* WhatsApp, explained once (fix list item 6, the light prototype's s74, word for word). */}
        {personCents != null && (
          <div style={{ background: 'var(--gw-card)', border: '1.5px solid var(--gw-border)', borderRadius: 14, padding: '20px 24px', marginBottom: 32 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>WhatsApp check-ins, on any plan</div>
            <p style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, margin: 0 }}>
              {`Your team can check in on WhatsApp instead of the app. You pay only for people who use it: ${formatDollars(personCents)} a person a month, on any plan, never more than your seats.${trialSentence ? ' It is included in your free month.' : ''}`}
            </p>
          </div>
        )}

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
          <a className="btn sec" href="mailto:hello@myground.work" >
            Contact us
          </a>
        </div>

      </div>
    </div>
  )
}
