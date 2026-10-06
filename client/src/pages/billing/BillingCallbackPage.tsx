import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { billingApi, PLAN_LABELS, type SubscriptionPlan } from '@/api/billing'
import { useAuthStore } from '@/stores/auth'

/**
 * THE THANK-YOU PAGE DOES NOT PROMISE WHAT IT HAS NOT READ.
 *
 * Stripe redirects here with the plan in the query string, and this page used to read it back as
 * fact - "You are now on the Team plan", "Unlimited check-ins are now active" - then leave after three
 * seconds. The redirect routinely beats the webhook that actually activates the plan, so the sentence
 * was true a few seconds later at best, and never if the webhook failed. Now it says what is true -
 * the payment was received - and asks the server until the plan is really on the record.
 */
const POLL_MS = 1500
const GIVE_UP_AFTER_MS = 20_000

export function BillingCallbackPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const status = params.get('status')
  const groundId = params.get('groundId')
  const type = params.get('type') // 'session_fee' | 'subscription'
  const planFromUrl = params.get('plan') as SubscriptionPlan | null

  const success = status === 'success'
  const isSubscription = type === 'subscription'

  /* `confirmed` is the plan the SERVER reports, never the one in the URL. */
  const [confirmed, setConfirmed] = useState<SubscriptionPlan | null>(null)
  const [peopleHere, setPeopleHere] = useState<number | null>(null)
  const user = useAuthStore((st: any) => st.user)
  const orgName: string = user?.organization?.name?.trim() || user?.organizationName || ''
  const [gaveUp, setGaveUp] = useState(false)
  const started = useRef(Date.now())

  useEffect(() => {
    if (!success || !isSubscription) return
    let stop = false
    const ask = async () => {
      try {
        const s = await billingApi.status()
        if (s.subscription?.plan && s.subscription.status === 'active') {
          if (!stop) { setConfirmed(s.subscription.plan); setPeopleHere(s.people?.count ?? null) }
          return
        }
      } catch { /* try again below */ }
      if (Date.now() - started.current > GIVE_UP_AFTER_MS) { if (!stop) setGaveUp(true); return }
      if (!stop) setTimeout(ask, POLL_MS)
    }
    ask()
    return () => { stop = true }
  }, [success, isSubscription])

  useEffect(() => {
    /* Leave once there is something true to leave on: a confirmed plan, a non-subscription payment, or a cancel. */
    if (isSubscription && success && !confirmed && !gaveUp) return
    /* U.19: a confirmed plan and a payment that did not go through stay on the screen, as the
       prototype's "paid" and "payfailed" pages do, with a way back, so the words can be read. */
    if ((isSubscription && success && confirmed) || !success) return
    const timer = setTimeout(() => {
      if (isSubscription) navigate('/billing')
      else if (groundId) navigate(`/grounds/${groundId}`)
      else navigate('/billing')
    }, gaveUp ? 8000 : 2000)
    return () => clearTimeout(timer)
  }, [groundId, navigate, isSubscription, success, confirmed, gaveUp])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gw-page)', flexDirection: 'column', gap: 14, padding: 24 }}>
      {success ? (
        <>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gw-green-bg)', border: '1.5px solid var(--gw-green-b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            ✓
          </div>

          {isSubscription ? (
            confirmed ? (
              <>
                {/* The prototype's paid page (settings-paid.txt). No receipt is promised: sending one is Stripe's setting, not ours. */}
                <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--gw-navy)', letterSpacing: '-.01em', textAlign: 'center', margin: 0 }}>
                  {orgName ? `Done. ${orgName} is on ${PLAN_LABELS[confirmed]}.` : `Done. You are on ${PLAN_LABELS[confirmed]}.`}
                </h1>
                {peopleHere !== null && (
                  <p style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', maxWidth: 340, lineHeight: 1.65, margin: 0 }}>
                    {peopleHere === 1 ? 'You can check in.' : `All ${peopleHere} people can check in.`}
                  </p>
                )}
                <Link to="/billing" className="gw-btn-sec" style={{ textDecoration: 'none' }}>Back to Plan and billing</Link>
              </>
            ) : gaveUp ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gw-navy)', letterSpacing: '-.01em', textAlign: 'center' }}>
                  Payment received.
                </div>
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', maxWidth: 380, lineHeight: 1.65 }}>
                  It is taking a moment to land on your account. Your <Link to="/billing" style={{ color: 'var(--gw-navy)' }}>billing page</Link> will show the {planFromUrl ? PLAN_LABELS[planFromUrl] : 'new'} plan as soon as it does - usually within a minute. Nothing more is needed from you.
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gw-navy)', letterSpacing: '-.01em', textAlign: 'center' }}>
                  Payment received. Activating...
                </div>
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', maxWidth: 340, lineHeight: 1.65 }}>
                  Thank you for supporting Groundwork. This takes a few seconds.
                </div>
              </>
            )
          ) : (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gw-navy)', letterSpacing: '-.01em' }}>
                Payment received.
              </div>
              <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', maxWidth: 340, lineHeight: 1.65 }}>
                Thank you for supporting Groundwork. Redirecting you back...
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {/*
            The prototype's payfailed page (settings-payfailed.txt). Stripe sends somebody back here when
            they leave its checkout without paying; a declined card is refused on Stripe's own page. So
            this says what is true either way, without "Your bank declined it", which we cannot know.
          */}
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--gw-navy)', margin: 0, textAlign: 'center' }}>The payment didn’t go through</h1>
          <p style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', maxWidth: 340, lineHeight: 1.6, margin: 0 }}>
            You haven’t been charged, and your plan hasn’t changed.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/billing" className="gw-btn" style={{ textDecoration: 'none' }}>Try another card</Link>
            <Link to="/talk-to-us" className="gw-btn-sec" style={{ textDecoration: 'none' }}>Talk to us</Link>
          </div>
        </>
      )}
    </div>
  )
}
