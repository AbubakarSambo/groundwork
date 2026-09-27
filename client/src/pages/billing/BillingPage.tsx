import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi, PLAN_LABELS, PLAN_PRICES, formatMemberCap, formatMonthlyPrice, formatDollars, type SubscriptionPlan, FALLBACK_FREE_LIMITS } from '@/api/billing'
import { theFreeTrialSentence } from '@/lib/the-free-trial'
import { whatCoversThem, thePlanLine, theNextPaymentLine, whoCounts, theTrialNotices } from './what-plan-and-billing-says'
import { groundsApi } from '@/api/grounds'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { scrollToId } from '@/lib/scroll-to'
import { copy } from '@/components/gw/copying-can-fail'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

const PLANS: SubscriptionPlan[] = ['STARTER', 'SMALL_TEAM', 'GROWTH', 'BUSINESS', 'SCALE', 'ENTERPRISE']


/**
 * ASKING FOR A CALL ABOUT COACHING OR SETUP.
 *
 * The pricing page names all three and this is where somebody acts on it. Integration has its own
 * button on the Connect page, next to the keys, which is where that question actually occurs.
 *
 * ONE OPEN REQUEST PER SUBJECT. Clicking the same one twice is somebody checking the first click
 * worked; asking about a coach must not make the setup button claim it was already asked.
 */
function ThingsWeDoByHand() {
  const qc = useQueryClient()
  const asked = useQuery({
    queryKey: ['call-request'],
    queryFn: () => apiClient.get('/users/call-request').then((r: any) => r.data.data ?? r.data),
    retry: false,
  })
  const ask = useMutation({
    mutationFn: (subject: string) => apiClient.post('/users/call-request', { subject }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['call-request'] })
      toast.success('Asked. We will be in touch.')
    },
    onError: () => toast.error('That did not send. What you wrote is still here - try again.'),
  })

  const open: Record<string, string> = asked.data?.open ?? {}

  const rows = [
    { subject: 'COACHING', title: 'A coach in the room', what: 'Sahar reads the report with your team and turns what it found into a decision somebody owns.' },
    { subject: 'HANDS_ON', title: 'Setting you up', what: 'A named person to get you running and train your team, over the first month.' },
  ]

  return (
    <div style={{ border: '1px solid var(--gw-border)', borderRadius: 12, padding: '18px 20px', marginTop: 18, background: 'var(--gw-card)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 3 }}>Things our team does by hand</div>
      <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 14 }}>
        Not part of your plan and not charged to your card. Ask for a call, we tell you what it costs
        before anybody starts, and it is invoiced afterwards.
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {rows.map(r => (
          <div key={r.subject} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)' }}>{r.title}</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>{r.what}</div>
            </div>
            {open[r.subject] ? (
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', whiteSpace: 'nowrap', paddingTop: 2 }}>
                Asked. We will be in touch.
              </div>
            ) : (
              <button
                type="button"
                disabled={ask.isPending}
                onClick={() => ask.mutate(r.subject)}
                style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 700, padding: '7px 14px', borderRadius: 7, border: '1px solid var(--gw-border)', background: 'white', color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit' }}
              >Request a call</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function BillingPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  /**
   * THE SIDEBAR WAS THE ONLY THING HIDING THIS PAGE.
   *
   * `AppShell` marks the Billing item `adminOnly`, and that was the whole of it: the route is
   * `RequireAuth` only and this component read `user` without ever looking at `user.role`. Signed in
   * as a plain participant on a ground, typing the URL rendered the organisation's plan, its
   * grounds, the full price ladder from $25 to $400 a month with live Subscribe buttons, and the
   * access-code tools.
   *
   * The server was holding the line - the admin-only reads came back refused - so nothing sensitive
   * was disclosed. What was wrong is that a member was being OFFERED controls over the
   * organisation's money that they have no authority to use. A hidden link is not a permission.
   *
   * Found by signing in as a participant and typing the address, which is exactly what somebody
   * being reviewed has a motive to do.
   */
  const isAdmin = user?.role === 'ADMIN'

  const [genSessions, setGenSessions] = useState(1)
  const [genNote, setGenNote] = useState('')
  const [newCode, setNewCode] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [sendEmail, setSendEmail] = useState('')
  const [sendSessions, setSendSessions] = useState(5)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const { data: grounds = [], isLoading: groundsLoading } = useQuery({
    queryKey: ['grounds'],
    queryFn: groundsApi.list,
    enabled: isAdmin,
  })

  const { data: codes = [], isLoading: codesLoading } = useQuery({
    queryKey: ['contributor-codes'],
    queryFn: billingApi.getContributorCodes,
    enabled: isAdmin,
  })

  const { data: billingStatus } = useQuery({
    queryKey: ['billing-status'],
    queryFn: billingApi.status,
    /**
     * Gated too, and this is what also removes the pair of overlapping "Access denied" toasts: a
     * request that is never made cannot fail. Two identical failures rendered as two stacked toasts
     * that truncated each other, which is its own small mess.
     */
    enabled: isAdmin,
  })

  /**
   * Prices are admin-editable (Admin -> System -> Pricing), not fixed at build time - the
   * static PLAN_PRICES strings below are only the pre-load fallback. Without this, this page
   * could show "$25/mo" while checkout actually charges whatever's in the pricing_plans table.
   */
  const { data: livePricing } = useQuery({
    queryKey: ['public-pricing'],
    queryFn: billingApi.getPricing,
    /**
     * Admin-only, like every other read on this page, because `if (!isAdmin)` below returns before
     * any price is rendered. I removed this gate on the grounds that the endpoint is public and a
     * non-admin would otherwise read stale fallbacks - which was wrong: a member never reaches the
     * plan list at all, so the request was work for a page they are being turned away from. The
     * public pricing page has no such gate, which is where a non-admin actually reads a price.
     */
    enabled: isAdmin,
    staleTime: 60 * 1000,
  })

  /** The live free limit, or what we shipped with, until the request lands. */
  const freeGrounds = livePricing?.free.groundLimit ?? FALLBACK_FREE_LIMITS.groundLimit
  const freeTeam = livePricing?.free.memberLimit ?? FALLBACK_FREE_LIMITS.memberLimit

  function priceLabel(plan: SubscriptionPlan): string {
    const live = livePricing?.plans.find(p => p.plan === plan)
    if (live) return live.amountCents === null ? 'Contact us' : formatMonthlyPrice(live.amountCents)
    return PLAN_PRICES[plan]
  }

  /** No fallback: an absent seat count is honest, a stale one is the bug being removed. */
  function capLabel(plan: SubscriptionPlan): string {
    return formatMemberCap(livePricing?.plans.find(p => p.plan === plan)?.memberCap)
  }

  const generateCode = useMutation({
    mutationFn: () => billingApi.generateContributorCode(genSessions, genNote.trim() || undefined),
    onSuccess: r => {
      setNewCode(r.code)
      qc.invalidateQueries({ queryKey: ['contributor-codes'] })
      setGenNote('')
    },
    onError: () => toast.error('Could not generate code. Try again.'),
  })

  const sendCode = useMutation({
    mutationFn: () => billingApi.sendContributorCodeToEmail(sendEmail.trim(), sendSessions),
    onSuccess: r => {
      setSentTo(r.email)
      setSendEmail('')
      qc.invalidateQueries({ queryKey: ['contributor-codes'] })
    },
    onError: () => toast.error('The code did not send. Check the address and try again.'),
  })

  const createSubscriptionMut = useMutation({
    mutationFn: (plan: SubscriptionPlan) => billingApi.createSubscription(plan),
    onSuccess: r => { if (r.checkoutUrl) window.location.href = r.checkoutUrl },
    /* The server's own sentence when billing is not set up on this deployment - "no card was touched" -
       was swallowed into this generic toast. Say it when it is there. */
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not start checkout. Try again.'),
  })

  const changePlanMut = useMutation({
    mutationFn: (plan: SubscriptionPlan) => billingApi.changeSubscriptionPlan(plan),
    onSuccess: (_r, plan) => {
      qc.invalidateQueries({ queryKey: ['grounds'] })
      qc.invalidateQueries({ queryKey: ['billing-status'] })
      toast.success(`Switched to ${PLAN_LABELS[plan]}. The difference is prorated on your next invoice.`)
    },
    onError: () => toast.error('Your plan did not change. You have not been charged - try again.'),
  })

  /**
   * Stripe's Customer Portal: invoices, receipts, the card on file, and cancellation, on their
   * screens rather than rebuilt on ours. The endpoint and the client call both already existed.
   */
  const portalMut = useMutation({
    mutationFn: () => billingApi.portal(),
    onSuccess: (res) => {
      if (res?.portalUrl) window.location.assign(res.portalUrl)
      else toast.error('Could not open the billing portal. Try again in a moment.')
    },
    onError: () => toast.error('Could not open the billing portal. Try again in a moment.'),
  })

  /*
   * CANCELLING RUNS TO THE END OF WHAT WAS PAID FOR. This used to end the subscription that moment
   * behind a window.confirm that promised "per-session billing" - a mode that no longer exists -
   * and a customer who cancelled on day two lost the rest of the month. Now it schedules the end,
   * the confirmation below says when access stops, and pause is offered in the same place for
   * somebody who wants to stop paying sooner.
   */
  const [confirming, setConfirming] = useState<'cancel' | 'pause' | null>(null)
  const sayTheDate = (d: string | Date | null | undefined) =>
    d ? whenItWas(d, 'full') : 'the end of the paid period'
  const cancelSubscriptionMut = useMutation({
    mutationFn: () => billingApi.cancelSubscription(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['billing-status'] })
      setConfirming(null)
      toast.success(`Your subscription ends on ${sayTheDate(res?.endsAt)}. Everything works until then.`)
    },
    onError: () => toast.error('Could not schedule the cancellation. Try again.'),
  })

  const keepSubscriptionMut = useMutation({
    mutationFn: () => billingApi.keepSubscription(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-status'] })
      toast.success('Kept. Your subscription carries on as before.')
    },
    onError: () => toast.error('Could not undo the cancellation. Try again.'),
  })

  const pauseSubscriptionMut = useMutation({
    mutationFn: () => billingApi.pauseSubscription(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-status'] })
      setConfirming(null)
      toast.success('Paused. Nothing is charged until you resume.')
    },
    onError: () => toast.error('Could not pause subscription. Try again.'),
  })

  const resumeSubscriptionMut = useMutation({
    mutationFn: () => billingApi.resumeSubscription(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-status'] })
      toast.success('Subscription resumed.')
    },
    onError: () => toast.error('Could not resume subscription. Try again.'),
  })

  async function copyToClipboard(text: string) {
    if (await copy(text)) {
      setCopied(text)
      setTimeout(() => setCopied(null), 2000)
    } else {
      toast.error('Copying is not available here. Select the text and copy it yourself.')
    }
  }

  /**
   * THE SUBSCRIPTION COMES FROM THE ORGANISATION, NOT FROM A GROUND. W14-6.
   *
   * This read `grounds[0].org` - "all grounds share the same org", which is true and beside the
   * point. An organisation that has closed its grounds has no `grounds[0]`, so `orgSub` was
   * undefined, `isSubscribed` was false, and a **paying customer saw "Free · No subscription"
   * with no way to pause, resume or cancel**. The one page they would go to in order to stop
   * being charged was the page that denied they were being charged.
   *
   * `/billing/status` now returns it, which is where an organisation-level fact belongs.
   */
  const orgSub = billingStatus?.subscription ?? null
  const isSubscribed = !!(orgSub?.plan && orgSub?.status === 'active')
  const isPaused = orgSub?.status === 'paused'
  /* A cancellation is scheduled: still active, still working, ending on this date. */
  const endsAt = orgSub?.endsAt ?? null
  const peopleOverCap =
    billingStatus?.people?.cap != null && billingStatus.people.count > billingStatus.people.cap
  const hasBillingHistory = (billingStatus?.activeGrounds ?? []).length > 0

  if (!isAdmin) {
    return (
      <div style={{ padding: '48px 32px', maxWidth: 560 }}>
        <div style={{ fontSize: 15, color: 'var(--gw-sub)' }}>
          You need admin access to manage billing for your organisation.
        </div>
      </div>
    )
  }

  if (groundsLoading || codesLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading...</div>
      </div>
    )
  }

  const orgName = (user as any)?.organization?.name?.trim() || (user as any)?.organizationName || ''
  const covers = whatCoversThem(billingStatus)
  const notices = theTrialNotices(billingStatus, livePricing)
  const trialSentence = theFreeTrialSentence(livePricing?.trial)
  const invoices = billingStatus?.invoices ?? []
  const usage = billingStatus?.usage
  const busy = createSubscriptionMut.isPending || changePlanMut.isPending
  const choosePlan = (plan: SubscriptionPlan) => (isSubscribed ? changePlanMut.mutate(plan) : createSubscriptionMut.mutate(plan))

  return (
    <div className="gw-you gw-conn gw-bill">
      <div>
        {orgName && <p className="gw-suites-org">{orgName}</p>}
        <h1 className="gw-t-title gw-suites-h1">Plan and billing</h1>
        <p className="gw-you-sub">Your plan, and how many people it covers.</p>

        {/*
          WHEN THE FREE MONTHS END (upgrade.txt). Only inside the free trial's months, and only while
          the trial setting is on: see what-plan-and-billing-says.ts.
        */}
        {notices.map((n) => (
          <section key={n.key} className="gw-you-card gw-bill-notice" aria-labelledby={`bill-notice-${n.key}`}>
            <h2 id={`bill-notice-${n.key}`} className="gw-t-h3">{n.heading}</h2>
            <p className="gw-t-body">{n.body}</p>
            <div className="gw-conn-actions">
              {n.choose && (
                <button type="button" className="gw-btn" disabled={busy} onClick={() => choosePlan(n.choose!)}>
                  {`Choose ${PLAN_LABELS[n.choose]}`}
                </button>
              )}
              <button type="button" className="gw-btn-sec" onClick={() => scrollToId('upgrade-section', 'start')}>
                {n.key === 'ending' ? 'See every plan' : 'See the plans'}
              </button>
            </div>
          </section>
        ))}

        {/*
          THREE MONTHS ON THE HOUSE, SAID ON THE PAGE ABOUT MONEY, for a free run we gave by hand.
          Somebody inside one has no subscription and no card, so this says what they have and the day
          it stops. The free trial's months are said in the plan line and the notices above instead.
        */}
        {billingStatus?.onTheHouse && !billingStatus.onTheHouse.freeTrial && (
          <div className="gw-you-card gw-bill-notice">
            <h2 className="gw-t-h3">You are on us until {whenItWas(billingStatus.onTheHouse.until, 'full')}</h2>
            <p className="gw-t-body">
              Everything the {PLAN_LABELS[billingStatus.onTheHouse.plan as SubscriptionPlan] ?? String(billingStatus.onTheHouse.plan)} plan
              covers, at no cost. Nothing is charged and there is no card on file. After that date the free plan applies unless you subscribe.
            </p>
          </div>
        )}

        <section className="gw-conn-sec" aria-labelledby="bill-yours">
          <h2 id="bill-yours" className="gw-t-h2">Your plan</h2>
          <ul className="gw-conn-rows gw-bill-rows">
            <li>
              <b>Plan</b>
              <span>
                {thePlanLine(billingStatus, livePricing, freeGrounds)}
                {peopleOverCap ? ' More people have accounts here than this plan covers.' : ''}
              </span>
              <button type="button" className="gw-bill-link" onClick={() => scrollToId('upgrade-section', 'start')}>Change</button>
            </li>
            <li>
              <b>Next payment</b>
              <span>{theNextPaymentLine(billingStatus, livePricing)}</span>
              {(isSubscribed || isPaused) ? (
                <button type="button" className="gw-bill-link" disabled={portalMut.isPending} onClick={() => portalMut.mutate()}>
                  {portalMut.isPending ? 'Opening…' : 'Change card'}
                </button>
              ) : <span />}
            </li>
            <li>
              <b>Everyone counts</b>
              <span>{whoCounts(orgName)}</span>
              <span />
            </li>
            {trialSentence && (
              <li>
                <b>Free trial</b>
                <span>{trialSentence}</span>
                <span />
              </li>
            )}
            {/*
              WHAT THIS ACCOUNT HAS ACTUALLY DONE. An admin asked to pay for a year needs to be able to
              say what was got for it, and a page that only says what it costs cannot.
            */}
            {usage && (
              <li>
                <b>So far</b>
                <span>
                  {`${usage.checkIns} ${usage.checkIns === 1 ? 'check-in' : 'check-ins'}, ${usage.reportsReleased} ${usage.reportsReleased === 1 ? 'report' : 'reports'} shared, and ${usage.peopleTakingPart} ${usage.peopleTakingPart === 1 ? 'person' : 'people'} taking part.`}
                </span>
                <span />
              </li>
            )}
          </ul>
        </section>

        {/* Empty state for the free plan: what it gives, before anybody pays. */}
        {!hasBillingHistory && covers === 'free' && (
          <div className="gw-you-card gw-bill-notice">
            <h2 className="gw-t-h3">Your first {freeGrounds} check-ins are free.</h2>
            <p className="gw-t-body">
              Create up to {freeGrounds} check-ins with unlimited sessions and reports, no card required. The free plan covers {freeTeam} people including you. Subscribe when your team outgrows it.
            </p>
          </div>
        )}

        {/*
          THE PLANS, FROM THE TABLE. The same list is a first choice for a free organisation and a
          plan switcher for a paying one: "Move to this" starts Stripe's checkout for the first, and
          changes the plan, prorated by Stripe, for the second. The plan they are on says "Your plan".
        */}
        <section className="gw-conn-sec" aria-labelledby="upgrade-section">
          <div className="gw-you-section-head">
            <h2 id="upgrade-section" className="gw-t-h2">Plans</h2>
            <span className="gw-t-tiny">One flat monthly rate, unlimited check-ins, sessions and reports</span>
          </div>
          <div className="gw-bill-plans">
            {PLANS.filter(p => p !== 'ENTERPRISE').map(plan => {
              const mine = (isSubscribed || isPaused) && orgSub?.plan === plan
              const pending = (createSubscriptionMut.isPending && createSubscriptionMut.variables === plan) || (changePlanMut.isPending && changePlanMut.variables === plan)
              return (
                <section key={plan} className={`gw-you-card gw-bill-plan${mine ? ' gw-bill-mine' : ''}`} aria-labelledby={`bill-plan-${plan}`}>
                  <h3 id={`bill-plan-${plan}`} className="gw-t-h3">{PLAN_LABELS[plan]}</h3>
                  <p className="gw-bill-price">{priceLabel(plan)}</p>
                  <p className="gw-t-small">{capLabel(plan)}</p>
                  {mine ? (
                    <span className="gw-bill-yours">Your plan</span>
                  ) : (
                    <button type="button" className="gw-btn-sec" disabled={busy || isPaused} onClick={() => choosePlan(plan)}>
                      {pending ? 'Opening…' : 'Move to this'}
                    </button>
                  )}
                </section>
              )
            })}
            <section className="gw-you-card gw-bill-plan gw-bill-enterprise" aria-labelledby="bill-plan-ENTERPRISE">
              <h3 id="bill-plan-ENTERPRISE" className="gw-t-h3">Enterprise</h3>
              <p className="gw-t-small">Custom needs, volume pricing or dedicated support.</p>
              <a className="gw-btn-sec" href="mailto:hello@myground.work?subject=Enterprise plan enquiry">Contact us</a>
            </section>
          </div>
        </section>

        {invoices.length > 0 && (
          <section className="gw-conn-sec" aria-labelledby="bill-invoices">
            <h2 id="bill-invoices" className="gw-t-h2">Invoices</h2>
            <ul className="gw-conn-rows gw-bill-rows">
              {invoices.map((i) => (
                <li key={`${i.paidOn}-${i.amountCents}`}>
                  <b>{whenItWas(i.paidOn, 'dayAndMonthLong')}</b>
                  <span>{`${formatDollars(i.amountCents)}, paid.`}</span>
                  <span />
                </li>
              ))}
            </ul>
            <div className="gw-conn-actions">
              <button type="button" className="gw-btn-sec" disabled={portalMut.isPending} onClick={() => portalMut.mutate()}>
                {portalMut.isPending ? 'Opening…' : 'Invoices and payment method'}
              </button>
            </div>
          </section>
        )}

        {(isSubscribed || isPaused) && (
          <section className="gw-conn-sec" aria-labelledby="bill-stopping">
            <h2 id="bill-stopping" className="gw-t-h2">Stopping</h2>
            <div className="gw-you-card">
              <div className="gw-conn-actions gw-conn-spread">
                <p className="gw-t-body gw-conn-grow">
                  {isPaused
                    ? 'Paused. Nothing is being charged, and your check-ins stay as they are.'
                    : endsAt
                      ? `Ending on ${sayTheDate(endsAt)}. Everything works until then, and then it stops.`
                      : 'Pause, or cancel at the end of this period. Either way, everything stays readable.'}
                </p>
                {endsAt ? (
                  <button type="button" className="gw-btn" disabled={keepSubscriptionMut.isPending} onClick={() => keepSubscriptionMut.mutate()}>
                    {keepSubscriptionMut.isPending ? 'Keeping…' : 'Keep subscription'}
                  </button>
                ) : isPaused ? (
                  <button type="button" className="gw-btn" disabled={resumeSubscriptionMut.isPending} onClick={() => resumeSubscriptionMut.mutate()}>
                    {resumeSubscriptionMut.isPending ? 'Resuming…' : 'Resume subscription'}
                  </button>
                ) : (
                  <>
                    <button type="button" className="gw-btn-sec" disabled={pauseSubscriptionMut.isPending} onClick={() => setConfirming('pause')}>Pause</button>
                    <button type="button" className="gw-bill-link" disabled={cancelSubscriptionMut.isPending} onClick={() => setConfirming('cancel')}>Cancel</button>
                  </>
                )}
              </div>

              {confirming === 'cancel' && (
                <div role="dialog" aria-label="Cancel at the end of the period" className="gw-bill-confirm">
                  <h3 className="gw-t-h3">Cancel at the end of the period?</h3>
                  <p className="gw-t-body">
                    Everything keeps working until {sayTheDate(orgSub?.periodEnd)}, and then it stops. Nothing more is charged, and nothing is refunded, because you are using what you have paid for. If you want to stop paying but keep the door open, pause instead: nothing is charged while paused, your check-ins stay exactly as they are, and you resume when you choose.
                  </p>
                  <div className="gw-conn-actions">
                    <button type="button" className="gw-btn" onClick={() => pauseSubscriptionMut.mutate()} disabled={pauseSubscriptionMut.isPending}>
                      {pauseSubscriptionMut.isPending ? 'Pausing…' : 'Pause instead'}
                    </button>
                    <button type="button" className="gw-btn-sec" onClick={() => cancelSubscriptionMut.mutate()} disabled={cancelSubscriptionMut.isPending}>
                      {cancelSubscriptionMut.isPending ? 'Scheduling…' : `End it on ${sayTheDate(orgSub?.periodEnd)}`}
                    </button>
                    <button type="button" className="gw-btn-sec" onClick={() => setConfirming(null)}>Keep it</button>
                  </div>
                </div>
              )}

              {confirming === 'pause' && (
                <div role="dialog" aria-label="Pause the subscription" className="gw-bill-confirm">
                  <h3 className="gw-t-h3">Pause the subscription?</h3>
                  <p className="gw-t-body">
                    Nothing is charged while it is paused, and your check-ins stay exactly as they are. Collection starts again when you press Resume, and not before.
                  </p>
                  <div className="gw-conn-actions">
                    <button type="button" className="gw-btn" onClick={() => pauseSubscriptionMut.mutate()} disabled={pauseSubscriptionMut.isPending}>
                      {pauseSubscriptionMut.isPending ? 'Pausing…' : 'Pause'}
                    </button>
                    <button type="button" className="gw-btn-sec" onClick={() => setConfirming(null)}>Not now</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/*
          THE FOURTH COPY OF THE CHECK-IN LIST, AND ON A PAID PLAN IT SAID NOTHING. W-UX-5.
          
          Seen on the running page: ten rows, each carrying the identical badge "Unlimited sessions",
          under a heading already carried by the rail, the list page and the attention line. The list
          exists to show what differs per check-in - a session balance, a free stamp, a used
          extension - and on a subscription NOTHING differs, by definition. So it was a tenfold
          repetition of one fact, on the fourth screen to hold the same names.
          
          It stays for the accounts it means something to. A subscribed org gets the one fact once.
        */}
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-dark)', marginBottom: 12 }}>
          {isSubscribed ? 'Your check-ins' : 'In progress'}
        </div>

        {isSubscribed && grounds.length > 0 ? (
          <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 28, fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
            All {grounds.length} of your check-ins have unlimited sessions and reports on this plan.
            Nothing is counted or charged per session.
          </div>
        ) : grounds.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: 20, marginBottom: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Nothing active yet.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
            {(grounds as any[]).map((g: any) => {
              const balance: number | undefined = g.sessionsBalance
              const isFree: boolean = !!g.isFreeGround
              const extUsed: boolean = g.org?.freeExtensionUsed ?? false
              return (
                <div key={g.id} style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.label}</div>
                    <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {/*
                        "FREE CHECK-IN" ON A $400/MONTH PLAN. W-UX-5.
                        
                        `isFreeGround` is a stamp left on the row from the day it was created, and it
                        was tested BEFORE the subscription. So an org that started free and then paid
                        saw every check-in it had ever opened labelled "Free check-in" - on the
                        billing page, which is the one screen whose whole job is to say what is being
                        charged for. The audit's line: "Makes a paying customer think nothing is
                        being counted."
                        
                        What the org is paying NOW decides what the badge says. The stamp still
                        matters - it is what exempts the row from the free-plan cap - it just does
                        not get to describe a paid account.
                      */}
                      {isSubscribed ? (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--gw-green-bg)', color: 'var(--gw-green-t)' }}>Unlimited sessions</span>
                      ) : isFree ? (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--gw-green-bg)', color: 'var(--gw-green-t)' }}>Free check-in</span>
                      ) : balance !== undefined ? (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                          background: balance > 0 ? 'var(--gw-blue-bg)' : 'var(--gw-clay-bg)',
                          color: balance > 0 ? 'var(--gw-navy)' : 'var(--gw-clay)',
                        }}>
                          {balance} session{balance !== 1 ? 's' : ''} left
                        </span>
                      ) : null}
                      {!isSubscribed && !extUsed && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'var(--gw-green-bg)', color: 'var(--gw-green-t)', border: '1px solid var(--gw-green-b-soft)' }}>
                          Free extension available
                        </span>
                      )}
                      {!isSubscribed && extUsed && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--gw-paper-2)', color: 'var(--gw-muted)' }}>
                          Free extension used
                        </span>
                      )}
                    </div>
                  </div>
                  {!isFree && !isSubscribed && (
                    <button
                      /**
                       * '/billing/payment' DOES NOT EXIST. It was the only
                       * destination in the product that 404'd, and it was the one
                       * that takes money: PaymentPage is mounted at
                       * '/billing/checkout'. So "Add sessions" landed a paying
                       * customer on "There is nothing at this address", which
                       * tells them THEY mistyped something.
                       *
                       * PaymentPage already reads groundId/groundName from
                       * location.state and falls back to query params, so the
                       * payload was always right. Only the path was wrong.
                       */
                      onClick={() => navigate('/billing/checkout', { state: { groundId: g.id, groundName: g.label } })}
                      style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 7, background: 'var(--gw-dark)', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Add sessions
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Access codes */}
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-dark)', marginBottom: 12 }}>Access codes</div>

        {codes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {(codes as any[]).map((c: any) => (
              <div key={c.code} style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--gw-dark)', letterSpacing: '.05em' }}>{c.code}</span>
                  <button
                    onClick={() => copyToClipboard(c.code)}
                    style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--gw-border)', background: copied === c.code ? 'var(--gw-green-bg)' : 'white', color: copied === c.code ? 'var(--gw-green-t)' : 'var(--gw-sub)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                  >
                    {copied === c.code ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
                  {c.sessionsGranted} session{c.sessionsGranted !== 1 ? 's' : ''} granted, {c.sessionsUsed ?? 0} used
                  {c.note ? ` · ${c.note}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}

        {user?.isPlatformAdmin && <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-dark)', marginBottom: 12 }}>Send access code by email</div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--gw-sub)', marginBottom: 5 }}>Recipient email</label>
            <input type="email" value={sendEmail} onChange={e => { setSendEmail(e.target.value); setSentTo(null) }} placeholder="name@example.com"
              style={{ width: '100%', padding: '9px 11px', fontSize: 13, fontFamily: 'inherit', border: '1px solid var(--gw-border)', borderRadius: 7, background: 'var(--gw-paper-2)', color: 'var(--gw-dark)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--gw-sub)', marginBottom: 5 }}>Check-ins to grant</label>
            <input type="number" min={1} max={20} value={sendSessions} onChange={e => setSendSessions(Math.min(20, Math.max(1, Number(e.target.value))))}
              style={{ width: '100%', padding: '9px 11px', fontSize: 13, fontFamily: 'inherit', border: '1px solid var(--gw-border)', borderRadius: 7, background: 'var(--gw-paper-2)', color: 'var(--gw-dark)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button onClick={() => sendCode.mutate()} disabled={sendCode.isPending || !sendEmail.trim()}
            style={{ width: '100%', padding: '10px', borderRadius: 7, background: 'var(--gw-dark)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: (sendCode.isPending || !sendEmail.trim()) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: (sendCode.isPending || !sendEmail.trim()) ? 0.5 : 1 }}>
            {sendCode.isPending ? 'Sending...' : 'Send code'}
          </button>
          {sentTo && (
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--gw-green-t)', background: 'var(--gw-green-bg)', border: '1px solid var(--gw-green-b-soft)', borderRadius: 7, padding: '10px 14px' }}>
              Code sent to {sentTo}
            </div>
          )}
        </div>}

        {user?.isPlatformAdmin && <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-dark)', marginBottom: 12 }}>Generate a code</div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--gw-sub)', marginBottom: 5 }}>Check-ins to grant</label>
            <input type="number" min={1} max={10} value={genSessions} onChange={e => setGenSessions(Math.min(10, Math.max(1, Number(e.target.value))))}
              style={{ width: '100%', padding: '9px 11px', fontSize: 13, fontFamily: 'inherit', border: '1px solid var(--gw-border)', borderRadius: 7, background: 'var(--gw-paper-2)', color: 'var(--gw-dark)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--gw-sub)', marginBottom: 5 }}>Note (optional)</label>
            <input type="text" value={genNote} onChange={e => setGenNote(e.target.value)} placeholder="e.g. for the product team"
              style={{ width: '100%', padding: '9px 11px', fontSize: 13, fontFamily: 'inherit', border: '1px solid var(--gw-border)', borderRadius: 7, background: 'var(--gw-paper-2)', color: 'var(--gw-dark)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button onClick={() => { setNewCode(null); generateCode.mutate() }} disabled={generateCode.isPending}
            style={{ width: '100%', padding: '10px', borderRadius: 7, background: 'var(--gw-dark)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: generateCode.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: generateCode.isPending ? 0.7 : 1 }}>
            {generateCode.isPending ? 'Generating...' : 'Generate'}
          </button>
          {newCode && (
            <div style={{ marginTop: 14, background: 'var(--gw-green-bg)', border: '1px solid var(--gw-green-b-soft)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-green-t)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>New code</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: 'var(--gw-green-t)', letterSpacing: '.08em' }}>{newCode}</span>
                <button onClick={() => copyToClipboard(newCode)}
                  style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 6, border: '1px solid var(--gw-green-b-soft)', background: copied === newCode ? 'var(--gw-green-t)' : 'white', color: copied === newCode ? 'white' : 'var(--gw-green-t)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                  {copied === newCode ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>}


      {/*
        * THE THREE THINGS OUR TEAM DOES BY HAND, WHERE SOMEBODY IS ALREADY THINKING ABOUT MONEY.
        *
        * None of them is bought here and none of them ever will be: each is a person's time, priced
        * from rather than at, and a form cannot quote a week of work. So this asks for a call, our
        * team rings back, and what is agreed is invoiced afterwards.
        *
        * NOT GATED ON THE PLAN. The services are for subscribers and our team says so on the call.
        * Somebody on the free plan asking about coaching is the conversation most likely to end in
        * a subscription, and refusing it here would lose exactly that.
        */}
      {isAdmin && <ThingsWeDoByHand />}

      </div>
    </div>
  )
}
