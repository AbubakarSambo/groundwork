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
import { copy } from '@/components/gw/copying-can-fail'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { scrollToId } from '@/lib/scroll-to'
import {
  Page, PageTitle, Section, Panel, Stack, FieldRows, FieldRow, Button, Tag, Note, TextField, FieldLabel,
} from '@/components/gw/ui'

const PLANS: SubscriptionPlan[] = ['STARTER', 'SMALL_TEAM', 'GROWTH', 'BUSINESS', 'SCALE', 'ENTERPRISE']

/**
 * PLAN AND BILLING (F2, /billing and /settings/billing, group 1 of the screens rebuilt from the
 * shared parts). Wording copied from docs/prototype/screens/F2-billing/settings-billing.txt and
 * upgrade.txt (the free-trial notices, from what-plan-and-billing-says.ts, which already carries
 * that wording).
 *
 * `/settings/billing` and `/billing` both render this component (see App.tsx); Stripe billing keeps
 * working exactly as it does today - the Customer Portal for the card on file and past invoices,
 * checkout for a first subscription, and the same pause/cancel/resume calls - test mode only.
 *
 * settings-checkout.txt, settings-paid.txt and settings-payfailed.txt are Stripe's own checkout and
 * its return pages (PaymentPage, BillingCallbackPage), which this page hands off to and are not
 * rebuilt here; this task's brief names BillingPage.tsx and what /settings/billing renders.
 *
 * REBUILT FROM THE SHARED PARTS: `Page`/`PageTitle` for the frame, `Section`/`Panel`/`FieldRows` for
 * "Your plan" and "Invoices", a plain grid of `Panel`s for "Plans" (`.gwui-plan-grid`, since the
 * shared parts have no plan-card component of their own), and the standard `Button`/`Tag`/`Note`
 * everywhere else. "Share Groundwork with another organisation" is the product's access-code tool,
 * the working equivalent of the prototype's "A code they can use to start".
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
    <Section heading="Things our team does by hand" note="Not part of your plan; invoiced afterwards, what it costs told before anybody starts">
      <Panel pad={false}>
        <FieldRows>
          {rows.map(r => (
            <FieldRow
              key={r.subject}
              label={r.title}
              value={r.what}
              action={open[r.subject]
                ? <span className="gwui-fine">Asked. We will be in touch.</span>
                : <Button kind="secondary" size="small" disabled={ask.isPending} onClick={() => ask.mutate(r.subject)}>Request a call</Button>}
            />
          ))}
        </FieldRows>
      </Panel>
    </Section>
  )
}

export function BillingPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'ADMIN'

  const [genSessions, setGenSessions] = useState(1)
  const [genNote, setGenNote] = useState('')
  const [newCode, setNewCode] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [sendEmail, setSendEmail] = useState('')
  const [sendSessions, setSendSessions] = useState(5)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const { data: grounds = [], isLoading: groundsLoading } = useQuery({ queryKey: ['grounds'], queryFn: groundsApi.list, enabled: isAdmin })
  const { data: codes = [], isLoading: codesLoading } = useQuery({ queryKey: ['contributor-codes'], queryFn: billingApi.getContributorCodes, enabled: isAdmin })
  const { data: billingStatus } = useQuery({ queryKey: ['billing-status'], queryFn: billingApi.status, enabled: isAdmin })
  const { data: livePricing } = useQuery({ queryKey: ['public-pricing'], queryFn: billingApi.getPricing, enabled: isAdmin, staleTime: 60 * 1000 })

  const freeGrounds = livePricing?.free.groundLimit ?? FALLBACK_FREE_LIMITS.groundLimit
  const freeTeam = livePricing?.free.memberLimit ?? FALLBACK_FREE_LIMITS.memberLimit

  function priceLabel(plan: SubscriptionPlan): string {
    const live = livePricing?.plans.find(p => p.plan === plan)
    if (live) return live.amountCents === null ? 'Contact us' : formatMonthlyPrice(live.amountCents)
    return PLAN_PRICES[plan]
  }
  function capLabel(plan: SubscriptionPlan): string {
    return formatMemberCap(livePricing?.plans.find(p => p.plan === plan)?.memberCap)
  }

  const generateCode = useMutation({
    mutationFn: () => billingApi.generateContributorCode(genSessions, genNote.trim() || undefined),
    onSuccess: r => { setNewCode(r.code); qc.invalidateQueries({ queryKey: ['contributor-codes'] }); setGenNote('') },
    onError: () => toast.error('Could not generate code. Try again.'),
  })
  const sendCode = useMutation({
    mutationFn: () => billingApi.sendContributorCodeToEmail(sendEmail.trim(), sendSessions),
    onSuccess: r => { setSentTo(r.email); setSendEmail(''); qc.invalidateQueries({ queryKey: ['contributor-codes'] }) },
    onError: () => toast.error('The code did not send. Check the address and try again.'),
  })
  const createSubscriptionMut = useMutation({
    mutationFn: (plan: SubscriptionPlan) => billingApi.createSubscription(plan),
    onSuccess: r => { if (r.checkoutUrl) window.location.href = r.checkoutUrl },
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
  const portalMut = useMutation({
    mutationFn: () => billingApi.portal(),
    onSuccess: (res) => { if (res?.portalUrl) window.location.assign(res.portalUrl); else toast.error('Could not open the billing portal. Try again in a moment.') },
    onError: () => toast.error('Could not open the billing portal. Try again in a moment.'),
  })

  const [confirming, setConfirming] = useState<'cancel' | 'pause' | null>(null)
  const sayTheDate = (d: string | Date | null | undefined) => d ? whenItWas(d, 'full') : 'the end of the paid period'
  const cancelSubscriptionMut = useMutation({
    mutationFn: () => billingApi.cancelSubscription(),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['billing-status'] }); setConfirming(null); toast.success(`Your subscription ends on ${sayTheDate(res?.endsAt)}. Everything works until then.`) },
    onError: () => toast.error('Could not schedule the cancellation. Try again.'),
  })
  const keepSubscriptionMut = useMutation({
    mutationFn: () => billingApi.keepSubscription(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['billing-status'] }); toast.success('Kept. Your subscription carries on as before.') },
    onError: () => toast.error('Could not undo the cancellation. Try again.'),
  })
  const pauseSubscriptionMut = useMutation({
    mutationFn: () => billingApi.pauseSubscription(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['billing-status'] }); setConfirming(null); toast.success('Paused. Nothing is charged until you resume.') },
    onError: () => toast.error('Could not pause subscription. Try again.'),
  })
  const resumeSubscriptionMut = useMutation({
    mutationFn: () => billingApi.resumeSubscription(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['billing-status'] }); toast.success('Subscription resumed.') },
    onError: () => toast.error('Could not resume subscription. Try again.'),
  })

  async function copyToClipboard(text: string) {
    if (await copy(text)) { setCopied(text); setTimeout(() => setCopied(null), 2000) }
    else toast.error('Copying is not available here. Select the text and copy it yourself.')
  }

  const orgSub = billingStatus?.subscription ?? null
  const isSubscribed = !!(orgSub?.plan && orgSub?.status === 'active')
  const isPaused = orgSub?.status === 'paused'
  const endsAt = orgSub?.endsAt ?? null
  const peopleOverCap = billingStatus?.people?.cap != null && billingStatus.people.count > billingStatus.people.cap
  const hasBillingHistory = (billingStatus?.activeGrounds ?? []).length > 0

  if (!isAdmin) {
    return (
      <Page>
        <PageTitle title="Plan and billing" subtitle="You need admin access to manage billing for your organisation." />
      </Page>
    )
  }

  if (groundsLoading || codesLoading) {
    return <Page><p className="gwui-panel-text-muted">Loading…</p></Page>
  }

  const orgName = (user as any)?.organization?.name?.trim() || (user as any)?.organizationName || ''
  const covers = whatCoversThem(billingStatus)
  const notices = theTrialNotices(billingStatus, livePricing)
  const trialSentence = theFreeTrialSentence(livePricing?.trial)
  const invoices = billingStatus?.invoices ?? []
  const usage = billingStatus?.usage
  const busy = createSubscriptionMut.isPending || changePlanMut.isPending
  const choosePlan = (plan: SubscriptionPlan) => (isSubscribed ? changePlanMut.mutate(plan) : createSubscriptionMut.mutate(plan))
  const scrollToPlans = () => scrollToId('billing-plans', 'start')

  return (
    <Page>
      <PageTitle eyebrow={orgName} title="Plan and billing" subtitle="Your plan, and how many people it covers." />

      {notices.map((n) => (
        <Panel key={n.key}>
          <Stack gap={10}>
            <p className="gwui-panel-text"><b>{n.heading}</b></p>
            <p className="gwui-panel-text-muted">{n.body}</p>
            <div className="gwui-invite-actions">
              {n.choose && <Button kind="primary" disabled={busy} onClick={() => choosePlan(n.choose!)}>{`Choose ${PLAN_LABELS[n.choose]}`}</Button>}
              <Button kind="secondary" onClick={scrollToPlans}>{n.key === 'ending' ? 'See every plan' : 'See the plans'}</Button>
            </div>
          </Stack>
        </Panel>
      ))}

      {billingStatus?.onTheHouse && !billingStatus.onTheHouse.freeTrial && (
        <Panel>
          <Stack gap={10}>
            <p className="gwui-panel-text"><b>You are on us until {whenItWas(billingStatus.onTheHouse.until, 'full')}</b></p>
            <p className="gwui-panel-text-muted">
              Everything the {PLAN_LABELS[billingStatus.onTheHouse.plan as SubscriptionPlan] ?? String(billingStatus.onTheHouse.plan)} plan
              covers, at no cost. Nothing is charged and there is no card on file. After that date the free plan applies unless you subscribe.
            </p>
          </Stack>
        </Panel>
      )}

      <Section heading="Your plan">
        <Panel pad={false}>
          <FieldRows>
            <FieldRow
              label="Plan"
              value={`${thePlanLine(billingStatus, livePricing, freeGrounds)}${peopleOverCap ? ' More people have accounts here than this plan covers.' : ''}`}
              action={<Button kind="quiet" size="small" onClick={scrollToPlans}>Change</Button>}
            />
            <FieldRow
              label="Next payment"
              value={theNextPaymentLine(billingStatus, livePricing)}
              action={(isSubscribed || isPaused) ? (
                <Button kind="quiet" size="small" disabled={portalMut.isPending} onClick={() => portalMut.mutate()}>{portalMut.isPending ? 'Opening…' : 'Change card'}</Button>
              ) : undefined}
            />
            <FieldRow label="Everyone counts" value={whoCounts(orgName)} />
            {trialSentence && <FieldRow label="Free trial" value={trialSentence} />}
            {usage && (
              <FieldRow
                label="So far"
                value={`${usage.checkIns} ${usage.checkIns === 1 ? 'check-in' : 'check-ins'}, ${usage.reportsReleased} ${usage.reportsReleased === 1 ? 'report' : 'reports'} shared, and ${usage.peopleTakingPart} ${usage.peopleTakingPart === 1 ? 'person' : 'people'} taking part.`}
              />
            )}
          </FieldRows>
        </Panel>
      </Section>

      {!hasBillingHistory && covers === 'free' && (
        <Panel>
          <Stack gap={10}>
            <p className="gwui-panel-text"><b>Your first {freeGrounds} check-ins are free.</b></p>
            <p className="gwui-panel-text-muted">
              Create up to {freeGrounds} check-ins with unlimited sessions and reports, no card required. The free plan covers {freeTeam} people including you. Subscribe when your team outgrows it.
            </p>
          </Stack>
        </Panel>
      )}

      <div id="billing-plans">
        <Section heading="Plans" note="One flat monthly rate, unlimited check-ins, sessions and reports">
          <div className="gwui-plan-grid">
            {PLANS.filter(p => p !== 'ENTERPRISE').map(plan => {
              const mine = (isSubscribed || isPaused) && orgSub?.plan === plan
              const pending = (createSubscriptionMut.isPending && createSubscriptionMut.variables === plan) || (changePlanMut.isPending && changePlanMut.variables === plan)
              return (
                <Panel key={plan} className={mine ? 'gwui-plan-card gwui-plan-card-mine' : 'gwui-plan-card'}>
                  <p className="gwui-plan-name">{PLAN_LABELS[plan]}</p>
                  <p className="gwui-plan-price">{priceLabel(plan)}<span>/mo</span></p>
                  <p className="gwui-plan-cap">{capLabel(plan)}</p>
                  {mine ? <Tag tone="proven">Your plan</Tag> : (
                    <Button kind="secondary" disabled={busy || isPaused} onClick={() => choosePlan(plan)}>{pending ? 'Opening…' : 'Move to this'}</Button>
                  )}
                </Panel>
              )
            })}
            <Panel className="gwui-plan-card">
              <p className="gwui-plan-name">Enterprise</p>
              <p className="gwui-plan-cap">Custom needs, volume pricing or dedicated support.</p>
              <Button kind="secondary" onClick={() => { window.location.href = 'mailto:hello@myground.work?subject=Enterprise plan enquiry' }}>Contact us</Button>
            </Panel>
          </div>
        </Section>
      </div>

      {invoices.length > 0 && (
        <Section heading="Invoices">
          <Panel pad={false}>
            <FieldRows>
              {invoices.map((i) => (
                <FieldRow key={`${i.paidOn}-${i.amountCents}`} label={whenItWas(i.paidOn, 'dayAndMonthLong')} value={`${formatDollars(i.amountCents)}, paid.`} />
              ))}
            </FieldRows>
          </Panel>
          <Button kind="secondary" disabled={portalMut.isPending} onClick={() => portalMut.mutate()}>{portalMut.isPending ? 'Opening…' : 'Invoices and payment method'}</Button>
        </Section>
      )}

      {(isSubscribed || isPaused) && (
        <Section heading="Stopping">
          <Panel>
            <Stack gap={12}>
              <div className="gwui-sentence-row">
                <p className="gwui-panel-text-muted">
                  {isPaused
                    ? 'Paused. Nothing is being charged, and your check-ins stay as they are.'
                    : endsAt
                      ? `Ending on ${sayTheDate(endsAt)}. Everything works until then, and then it stops.`
                      : 'Pause, or cancel at the end of this period. Either way, everything stays readable.'}
                </p>
                {endsAt ? (
                  <Button kind="primary" disabled={keepSubscriptionMut.isPending} onClick={() => keepSubscriptionMut.mutate()}>{keepSubscriptionMut.isPending ? 'Keeping…' : 'Keep subscription'}</Button>
                ) : isPaused ? (
                  <Button kind="primary" disabled={resumeSubscriptionMut.isPending} onClick={() => resumeSubscriptionMut.mutate()}>{resumeSubscriptionMut.isPending ? 'Resuming…' : 'Resume subscription'}</Button>
                ) : (
                  <div className="gwui-invite-actions">
                    <Button kind="secondary" disabled={pauseSubscriptionMut.isPending} onClick={() => setConfirming('pause')}>Pause</Button>
                    <Button kind="quiet" disabled={cancelSubscriptionMut.isPending} onClick={() => setConfirming('cancel')}>Cancel</Button>
                  </div>
                )}
              </div>

              {confirming === 'cancel' && (
                <div role="dialog" aria-label="Cancel at the end of the period">
                  <Stack gap={10}>
                    <p className="gwui-panel-text"><b>Cancel at the end of the period?</b></p>
                    <p className="gwui-panel-text-muted">
                      Everything keeps working until {sayTheDate(orgSub?.periodEnd)}, and then it stops. Nothing more is charged, and nothing is refunded, because you are using what you have paid for. If you want to stop paying but keep the door open, pause instead: nothing is charged while paused, your check-ins stay exactly as they are, and you resume when you choose.
                    </p>
                    <div className="gwui-invite-actions">
                      <Button kind="primary" onClick={() => pauseSubscriptionMut.mutate()} disabled={pauseSubscriptionMut.isPending}>{pauseSubscriptionMut.isPending ? 'Pausing…' : 'Pause instead'}</Button>
                      <Button kind="secondary" onClick={() => cancelSubscriptionMut.mutate()} disabled={cancelSubscriptionMut.isPending}>{cancelSubscriptionMut.isPending ? 'Scheduling…' : `End it on ${sayTheDate(orgSub?.periodEnd)}`}</Button>
                      <Button kind="quiet" onClick={() => setConfirming(null)}>Keep it</Button>
                    </div>
                  </Stack>
                </div>
              )}

              {confirming === 'pause' && (
                <div role="dialog" aria-label="Pause the subscription">
                  <Stack gap={10}>
                    <p className="gwui-panel-text"><b>Pause the subscription?</b></p>
                    <p className="gwui-panel-text-muted">Nothing is charged while it is paused, and your check-ins stay exactly as they are. Collection starts again when you press Resume, and not before.</p>
                    <div className="gwui-invite-actions">
                      <Button kind="primary" onClick={() => pauseSubscriptionMut.mutate()} disabled={pauseSubscriptionMut.isPending}>{pauseSubscriptionMut.isPending ? 'Pausing…' : 'Pause'}</Button>
                      <Button kind="secondary" onClick={() => setConfirming(null)}>Not now</Button>
                    </div>
                  </Stack>
                </div>
              )}
            </Stack>
          </Panel>
        </Section>
      )}

      <Section heading={isSubscribed ? 'Your check-ins' : 'In progress'}>
        {isSubscribed && grounds.length > 0 ? (
          <Panel>
            <p className="gwui-panel-text-muted">
              All {grounds.length} of your check-ins have unlimited sessions and reports on this plan. Nothing is counted or charged per session.
            </p>
          </Panel>
        ) : grounds.length === 0 ? (
          <Panel><p className="gwui-panel-text-muted">Nothing active yet.</p></Panel>
        ) : (
          <Panel pad={false}>
            <FieldRows>
              {(grounds as any[]).map((g: any) => {
                const balance: number | undefined = g.sessionsBalance
                const isFree: boolean = !!g.isFreeGround
                const extUsed: boolean = g.org?.freeExtensionUsed ?? false
                return (
                  <FieldRow
                    key={g.id}
                    label={g.label}
                    value={(
                      <span className="gwui-invite-actions">
                        {isSubscribed ? (
                          <Tag tone="proven">Unlimited sessions</Tag>
                        ) : isFree ? (
                          <Tag tone="proven">Free check-in</Tag>
                        ) : balance !== undefined ? (
                          <Tag tone={balance > 0 ? 'plain' : 'concern'}>{balance} session{balance !== 1 ? 's' : ''} left</Tag>
                        ) : null}
                        {!isSubscribed && !extUsed && <Tag tone="proven">Free extension available</Tag>}
                        {!isSubscribed && extUsed && <Tag tone="plain">Free extension used</Tag>}
                      </span>
                    )}
                    action={!isFree && !isSubscribed
                      ? <Button kind="secondary" size="small" onClick={() => navigate('/billing/checkout', { state: { groundId: g.id, groundName: g.label } })}>Add sessions</Button>
                      : undefined}
                  />
                )
              })}
            </FieldRows>
          </Panel>
        )}
      </Section>

      <Section heading="Share Groundwork with another organisation" note="A code they can use to start">
        <Panel>
          <Stack gap={12}>
            <p className="gwui-panel-text-muted">A code gives another organisation sessions on us. Useful for a supplier or partner you want to check in with.</p>
            {codes.length > 0 && (
              <FieldRows>
                {(codes as any[]).map((c: any) => (
                  <FieldRow
                    key={c.code}
                    label={c.code}
                    value={`${c.sessionsGranted} session${c.sessionsGranted !== 1 ? 's' : ''} granted, ${c.sessionsUsed ?? 0} used${c.note ? `, ${c.note}` : ''}.`}
                    action={<Button kind="secondary" size="small" onClick={() => copyToClipboard(c.code)}>{copied === c.code ? 'Copied' : 'Copy'}</Button>}
                  />
                ))}
              </FieldRows>
            )}
          </Stack>
        </Panel>
      </Section>

      {user?.isPlatformAdmin && (
        <Section heading="Send access code by email">
          <Panel>
            <Stack gap={12}>
              <div>
                <FieldLabel htmlFor="billing-send-email">Recipient email</FieldLabel>
                <TextField id="billing-send-email" type="email" value={sendEmail} onChange={e => { setSendEmail(e.target.value); setSentTo(null) }} placeholder="name@example.com" />
              </div>
              <div>
                <FieldLabel htmlFor="billing-send-sessions">Check-ins to grant</FieldLabel>
                <TextField id="billing-send-sessions" type="number" min={1} max={20} value={sendSessions} onChange={e => setSendSessions(Math.min(20, Math.max(1, Number(e.target.value))))} />
              </div>
              <Button kind="primary" onClick={() => sendCode.mutate()} disabled={sendCode.isPending || !sendEmail.trim()}>{sendCode.isPending ? 'Sending…' : 'Send code'}</Button>
              {sentTo && <Note>Code sent to {sentTo}</Note>}
            </Stack>
          </Panel>
        </Section>
      )}

      {user?.isPlatformAdmin && (
        <Section heading="Generate a code">
          <Panel>
            <Stack gap={12}>
              <div>
                <FieldLabel htmlFor="billing-gen-sessions">Check-ins to grant</FieldLabel>
                <TextField id="billing-gen-sessions" type="number" min={1} max={10} value={genSessions} onChange={e => setGenSessions(Math.min(10, Math.max(1, Number(e.target.value))))} />
              </div>
              <div>
                <FieldLabel htmlFor="billing-gen-note">Note (optional)</FieldLabel>
                <TextField id="billing-gen-note" value={genNote} onChange={e => setGenNote(e.target.value)} placeholder="e.g. for the product team" />
              </div>
              <Button kind="primary" onClick={() => { setNewCode(null); generateCode.mutate() }} disabled={generateCode.isPending}>{generateCode.isPending ? 'Generating…' : 'Generate'}</Button>
              {newCode && (
                <div className="gwui-secret-box">
                  <p className="gwui-secret-box-label">New code</p>
                  <div className="gwui-invite-link-row">
                    <p className="gwui-secret-box-value">{newCode}</p>
                    <Button kind="secondary" size="small" onClick={() => copyToClipboard(newCode)}>{copied === newCode ? 'Copied' : 'Copy'}</Button>
                  </div>
                </div>
              )}
            </Stack>
          </Panel>
        </Section>
      )}

      {isAdmin && <ThingsWeDoByHand />}
    </Page>
  )
}
