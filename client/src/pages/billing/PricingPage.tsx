import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { billingApi, PLAN_LABELS, PLAN_PRICES, formatMemberCap, formatDollars, type SubscriptionPlan } from '@/api/billing'
import { theFreeTrialSentence } from '@/lib/the-free-trial'
import { whatCoversThem } from './what-plan-and-billing-says'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { Mark } from '@/components/gw/ui'

const PLANS: SubscriptionPlan[] = ['STARTER', 'SMALL_TEAM', 'GROWTH', 'BUSINESS', 'SCALE']

/* The prototype's words, from docs/prototype/screens/F2-billing/pricing.txt. */
const PLAN_DESCRIPTIONS: Record<SubscriptionPlan, string> = {
  STARTER: 'For small teams getting what each person says written down.',
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
  /*
   * NOTHING IS SAID ABOUT THE FREE PLAN UNTIL THE SERVER HAS SAID WHAT IS FREE (run 10). While the request was on its way, or had failed, this
   * page said "Start free with 10 check-ins, for teams of 5 or fewer" and "Free, Always" from numbers it shipped with, while the app said the
   * free month ends on 19 December. A page that does not yet know says no free offer at all; the numbers are the server's alone.
   */
  const pricingKnown = !!livePricing
  const freeGrounds = livePricing?.free?.groundLimit
  const freeTeam = livePricing?.free?.memberLimit
  /*
   * THE FREE MONTH IS SAID WHEREVER THE APP SAYS IT (run 9). The app told an admin "Your free month has started" while this page said "Start free with 10
   * check-ins" and "Free, Always", because the page read only the setting for new organisations. Signed in, an organisation that is on a free month is
   * told so here too, in the same words as everywhere; the setting's own numbers are used where it has them.
   */
  const onAFreeMonth = !!user && status?.onTheHouse?.freeTrial === true
  const trialShown = livePricing?.trial?.on ? livePricing.trial : (onAFreeMonth || livePricing?.anchorTrial?.on === true) ? { on: true, teamsUnder: livePricing?.trial?.teamsUnder ?? 20, months: livePricing?.anchorTrial?.on ? livePricing.anchorTrial.months : livePricing?.trial?.months ?? 1 } : livePricing?.trial
  /* The shared sentence, or nothing while the trial is off. */
  const trialSentence = theFreeTrialSentence(trialShown)
  const trialLength = trialShown?.months === 1 ? '1 month' : `${trialShown?.months ?? 0} months`

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
  const newPricing = !!trialShown?.on
  const seatCents = newPricing ? livePricing?.plans?.find(p => p.extraSeatCents != null)?.extraSeatCents ?? null : null
  const personCents = newPricing ? livePricing?.plans?.find(p => p.whatsappPersonCents != null)?.whatsappPersonCents ?? null : null
  const oneMonth = trialShown?.months === 1

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--gw-space-section)' }}>
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
        <div style={{ textAlign: 'center', marginBottom: 'var(--gw-space-section)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 'var(--gw-space-block)' }}>
            Pricing
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--gw-navy)', letterSpacing: '-.02em', marginBottom: 'var(--gw-space-block)', lineHeight: '38px' }}>
            Pricing
          </h1>
          <p style={{ fontSize: 15, color: 'var(--gw-sub)', maxWidth: 520, margin: '0 auto', lineHeight: '25px' }}>
            {trialSentence ?? (pricingKnown ? `Start free with ${freeGrounds} check-ins, for teams of ${freeTeam} or fewer, including you.` : '')} Subscribe as your team grows. Unlimited check-ins and reports on every plan.
          </p>
        </div>

        {/*
          THE FREE TRIAL, ONLY WHILE BILLING GIVES IT (U.19). The same setting switches the sentence
          and the grant (api/src/modules/billing/the-free-trial.service.ts), so while this shows it is
          true. Its offer is said in the one shared sentence; the numbers are the setting's.
        */}
        {trialSentence && trialShown && (
          <div style={{ background: 'var(--gw-card)', border: '1px solid var(--gw-navy)', borderRadius: 14, padding: '28px 32px', marginBottom: 'var(--gw-space-section)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-navy)', margin: '0 0 4px' }}>{trialLength} free</h2>
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 'var(--gw-space-block)' }}>{`Teams of fewer than ${trialShown.teamsUnder} people`}</div>
                <p style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: '21px', margin: 0 }}>
                  {oneMonth
                    ? `Everything on every plan, WhatsApp included, free for your first month. No card required. Unlimited check-ins and reports. After your free month, subscribe to keep going. Teams of ${trialShown.teamsUnder} or more start on a plan.`
                    : `${trialSentence} After ${trialLength}, subscribe to keep going.`}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--gw-navy)' }}>{`$0 for ${trialLength}`}</div>
                {!user && (
                  <button className="btn pri"
                    type="button"
                    onClick={() => navigate('/auth?next=/pricing')}
                    style={{ marginTop: 'var(--gw-space-block)' }}
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
        {pricingKnown && !trialSentence && <div style={{ background: 'var(--gw-card)', border: '1px solid var(--rule2-crisp)', borderRadius: 14, padding: '28px 32px', marginBottom: 'var(--gw-space-section)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--gw-space-line)' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-navy)' }}>Free</span>
                <span style={{ fontSize: 11, background: 'var(--gw-green-bg)', color: 'var(--gw-green)', border: '1px solid var(--gw-green-b)', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>Always</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: '21px', marginBottom: 'var(--gw-space-block)' }}>
                Create up to {freeGrounds} check-ins for free, for teams of {freeTeam} or fewer including you. No card required. Unlimited check-ins and reports on every check-in.
              </p>
              <ul style={{ fontSize: 12, color: 'var(--gw-sub)', paddingLeft: 16, margin: 0, lineHeight: '22px' }}>
                {/* "Templates" was listed here and on the marketing pricing page. There
                    is no templates feature anywhere in the product - the only
                    match in the codebase is "More templates" in a feature-REQUEST
                    list. A free-tier bullet nobody can find erodes trust in the
                    rest of the list. */}
                {[`${freeGrounds} check-ins`, `Teams of ${freeTeam} or fewer`, 'Unlimited check-ins', 'Unlimited reports', 'Admin dashboard'].map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--gw-navy)' }}>$0</div>
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
                  marginTop: 'var(--gw-space-block)', fontSize: 12, fontWeight: 700,
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
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 'var(--gw-space-line)' }}>
          Subscribe as your team grows
        </h2>
        <p style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 'var(--gw-space-section)', lineHeight: '21px' }}>
          {seatCents != null
            ? `Every person on your team counts as a seat. Each plan includes a number of seats; add more any time for +${formatDollars(seatCents)} a seat a month. Unlimited check-ins and reports.`
            : 'Every person on your team counts toward your plan. One flat monthly rate, unlimited everything.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 'var(--gw-space-section)' }}>
          {PLANS.map((plan) => (
            <div key={plan} style={{ background: 'var(--gw-card)', border: '1px solid var(--rule2-crisp)', borderRadius: 14, padding: '24px 20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 'var(--gw-space-line)' }}>{PLAN_LABELS[plan]}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 'var(--gw-space-line)' }}>{priceLabel(plan)}</div>
              <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginBottom: 'var(--gw-space-block)', minHeight: 15 }}>
                {capLabel(plan)}
                {seatCents != null && <><br /><b>{`+${formatDollars(seatCents)} per extra seat`}</b></>}
                {personCents != null && <><br />{`WhatsApp: +${formatDollars(personCents)} a month per person who uses it`}</>}
              </div>
              <p style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: '19px', marginBottom: 'var(--gw-space-block)', flexGrow: 1 }}>
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
          <div style={{ background: 'var(--gw-card)', border: '1px solid var(--rule2-crisp)', borderRadius: 14, padding: '20px 24px', marginBottom: 'var(--gw-space-section)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 'var(--gw-space-line)' }}>WhatsApp check-ins, on any plan</div>
            <p style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: '21px', margin: 0 }}>
              {`Your team can check in on WhatsApp instead of the app. You pay only for people who use it: ${formatDollars(personCents)} a person a month, on any plan, never more than your seats.${trialSentence ? ' It is included in your free month.' : ''}`}
            </p>
          </div>
        )}

        {/* Enterprise: the prototype's in-product plans page paints this panel with its --chat
            cream (docs/prototype/source/s16.js), which is our --gw-bg (#F7F1E5). #FAF5EA (--band) is
            the marketing site's alone. */}
        <div style={{ background: 'var(--gw-bg)', border: '1px solid var(--rule2-crisp)', borderRadius: 14, padding: '24px 28px', marginBottom: 'var(--gw-space-section)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 'var(--gw-space-line)' }}>Enterprise</div>
            <p style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: '21px', marginBottom: 'var(--gw-space-line)' }}>
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
