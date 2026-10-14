import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi, PLAN_LABELS, PLAN_PRICES, formatMemberCap, formatMonthlyPrice, formatDollars, isWhatsAppBillingAdmin, type SubscriptionPlan, FALLBACK_FREE_LIMITS } from '@/api/billing'
import { theFreeTrialSentence } from '@/lib/the-free-trial'
import { whatCoversThem, thePlanLine, theNextPaymentLine, whoCounts, theTrialNotices } from './what-plan-and-billing-says'
import { groundsApi } from '@/api/grounds'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { copy } from '@/components/gw/copying-can-fail'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { scrollToId } from '@/lib/scroll-to'
import { useWhatsAppIsOn } from '@/lib/whatsapp-is-on'
import { aPersonsSentenceForAServerError } from '@/lib/a-persons-sentence-for-a-server-error'
import { ADoorYouCannotOpen } from '@/components/gw/a-door-you-cannot-open-says-so'
import {
  Page, PageTitle, Section, Panel, Stack, FieldRows, FieldRow, Button, Tag, Note, TextField, FieldLabel, SwitchRow,
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
 *
 * NO PRIMARY (NAVY) BUTTON ANYWHERE ON THIS PAGE (Hafsah, 30 September), matching
 * settings-billing.jpg exactly: every plan card reads "Move to this" in white, and "Pause",
 * "Cancel", "Contact us" and "Copy" are the same weight. The alternate states this screen can be
 * in but the prototype does not draw - a subscription ending ("Keep subscription"), paused
 * ("Resume subscription"), the two confirm dialogs, and the platform admin's "Send code"/
 * "Generate" - used to be `kind="primary"`, which put a navy button on screen the prototype never
 * has. They are `kind="secondary"` now, the same weight this page already gives "Pause" and
 * "Move to this" in the state the prototype does draw.
 *
 * FIXED, 30 SEPTEMBER (the setting row, settings-billing.jpg): four things this page's own use of
 * the shared parts got wrong, none of them the parts themselves.
 *  1. Every price read "$25/mo/mo" - `priceLabel` already returns "$25/mo" (`formatMonthlyPrice`,
 *     the one price formatter this page uses everywhere else), and the plan card appended a
 *     second "/mo" after it. Now the card splits that same string instead of appending a new one.
 *  2. The plan grid was five cards to a row (`repeat(auto-fit, minmax(200px,1fr))`); the prototype
 *     (`.g3`, s20.js/s21.js) is three. Fixed in `gwui-plan-grid`.
 *  3. "Move to this" and "Contact us" were the normal button size, half the card's width; the
 *     prototype's are `"btn sec sm"`, the small size, filling the card. Both are `size="small"
 *     wide` now.
 *  4. The Enterprise card was a plain white `Panel` like every other plan card; the prototype
 *     draws it alone on the warm chat-colour fill (`background:var(--band)`, the same colour as
 *     `--chat`). `gwui-plan-card-enterprise` now sets `background: var(--gw-bg)` (the product's
 *     name for that same colour, #F7F1E5).
 * Also: the subtitle "Your plan, and how many people it covers." is gone - settings-billing.jpg
 * has no subtitle under "Plan and billing" at all; it was the product's own invention. And the
 * `FieldRows` under "Your plan", "Invoices" and "Your check-ins" no longer sit inside a `Panel` -
 * see FieldRow.tsx: `srow` in the prototype has no side padding and sits flat on the page.
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

  /* SCREEN FAULT 4c, CHECKED: "Sahar Jamal, a partner at Groundwork" is not a prototype sample name
     invented for a screenshot - she is a real, named member of Groundwork's own team (the "Partner,
     coach and setup" on the public About page, docs/prototype/source/s19.js's `R.about`, and
     about.txt), the actual person this paid "coach in the room" service names in the prototype's
     own pricing page (s19.js). There is no served field for who she is - this is a fact about
     Groundwork's own staff, the same kind of fact a company's own site names about itself, not
     about the organisation using the product - so it stays hard-coded, same as the prototype has
     it. A prior review (group 1) already checked this introduces her by name only after saying who
     she is; see the "group 1 review fixes" tests below. */
  const open: Record<string, string> = asked.data?.open ?? {}
  const rows = [
    { subject: 'COACHING', title: 'A coach in the room', what: 'Sahar Jamal, a partner at Groundwork who coaches teams and helps them set up, reads the report with your team and turns what it found into a decision somebody owns.' },
    { subject: 'HANDS_ON', title: 'Setting you up', what: 'A named person gets you running and trains your team during your first month.' },
  ]

  return (
    <Section heading="Things our team does by hand" note="These are not part of your plan. We tell you what they cost before anyone starts, and invoice you afterwards.">
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
  /* U.6 (Hafsah): WhatsApp is mentioned only while it is switched on, platform-wide - GET
     /auth/whatsapp, the same check every other screen makes before saying its name. Without it,
     this page kept the organisation's own add-on (price, switch, usage) on screen even with
     WhatsApp off across all of Groundwork, which no admin can act on. */
  const whatsappIsOn = useWhatsAppIsOn()
  const { data: whatsapp } = useQuery({ queryKey: ['billing-whatsapp'], queryFn: billingApi.getWhatsApp, enabled: isAdmin && whatsappIsOn })
  const setWhatsAppMut = useMutation({
    mutationFn: (on: boolean) => billingApi.setWhatsApp(on),
    onSuccess: (r) => qc.setQueryData(['billing-whatsapp'], r),
    onError: (e: any) => toast.error(aPersonsSentenceForAServerError(e?.response?.data?.message, 'WhatsApp did not change. Try again.')),
  })

  const freeGrounds = livePricing?.free?.groundLimit ?? FALLBACK_FREE_LIMITS.groundLimit
  const freeTeam = livePricing?.free?.memberLimit ?? FALLBACK_FREE_LIMITS.memberLimit

  function priceLabel(plan: SubscriptionPlan): string {
    const live = livePricing?.plans?.find(p => p.plan === plan)
    if (live) return live.amountCents === null ? 'Contact us' : formatMonthlyPrice(live.amountCents)
    return PLAN_PRICES[plan]
  }
  function capLabel(plan: SubscriptionPlan): string {
    return formatMemberCap(livePricing?.plans?.find(p => p.plan === plan)?.memberCap)
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
    onError: (e: any) => toast.error(aPersonsSentenceForAServerError(e?.response?.data?.message, 'Could not start checkout. Try again.')),
  })
  const changePlanMut = useMutation({
    mutationFn: (plan: SubscriptionPlan) => billingApi.changeSubscriptionPlan(plan),
    onSuccess: (_r, plan) => {
      qc.invalidateQueries({ queryKey: ['grounds'] })
      qc.invalidateQueries({ queryKey: ['billing-status'] })
      toast.success(`Switched to ${PLAN_LABELS[plan]}. The difference is prorated on your next invoice.`)
    },
    onError: () => toast.error('Your plan did not change, and you have not been charged. Try again.'),
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
  /* "IN PROGRESS": ONE SENTENCE ABOVE THE LIST WHEN IT IS TRUE OF EVERY ROW, never a tag repeated
     on each one for a fact that is the same for all of them. See the comment where this is used. */
  const allFreeRows = grounds.length > 0 && (grounds as any[]).every((g: any) => g.isFreeGround)
  const anyExtensionUsed = (grounds as any[]).some((g: any) => g.org?.freeExtensionUsed ?? false)

  /*
   * B-216: A DEAD END, NOT ANY MORE. "You need admin access to manage billing for your
   * organisation." gave a member nothing to press - the same fault the People page's own refusal
   * was fixed for. Uses the same shared door, the same shape: who can open it, that the reader's
   * role is not that, who can change it, and a way back.
   */
  if (!isAdmin) {
    return <ADoorYouCannotOpen may={false} what="open Plan and billing"><></></ADoorYouCannotOpen>
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
  /* SCREEN FAULT 4b: a team of 8 used to be offered Starter, "Up to 5 people", with no warning that
     it does not fit them - the plan grid drew `capLabel` and nothing else. Only served numbers: the
     plan's own member cap (the pricing table) and the organisation's own people count (the status
     the admin already reads as "27 of 100 people"). */
  const peopleCount = billingStatus?.people?.count ?? null
  function tooSmallFor(plan: SubscriptionPlan): string | null {
    const cap = livePricing?.plans.find(p => p.plan === plan)?.memberCap ?? null
    if (cap == null || peopleCount == null || peopleCount <= cap) return null
    return `This plan is for up to ${cap} ${cap === 1 ? 'person' : 'people'}, and ${orgName} has ${peopleCount}.`
  }

  return (
    <Page>
      {/* NO SUBTITLE HERE (Hafsah, 30 September, settings-billing.jpg): the prototype's own
          Plan-and-billing page draws no sentence under its title at all - "Your plan, and how many
          people it covers." was the product's own invention. */}
      <PageTitle eyebrow={orgName} title="Plan and billing" />

      {notices.map((n) => (
        <Panel key={n.key}>
          <Stack gap={10}>
            <p className="gwui-panel-text"><b>{n.heading}</b></p>
            <p className="gwui-panel-text-muted">{n.body}</p>
            <div className="gwui-invite-actions">
              {n.choose && <Button kind="secondary" disabled={busy} onClick={() => choosePlan(n.choose!)}>{`Choose ${PLAN_LABELS[n.choose]}`}</Button>}
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
        <FieldRows>
          <FieldRow
            label="Plan"
            value={`${thePlanLine(billingStatus, livePricing, freeGrounds)}${peopleOverCap ? ` ${billingStatus?.overThePlanSays?.trim() || 'More people have accounts here than this plan covers.'}` : ''}`}
            /*
             * SCREEN FAULT 11 (FINAL WALK): "MORE PEOPLE HAVE ACCOUNTS HERE THAN THIS PLAN COVERS."
             * NAMED A PROBLEM WITH NO NEXT STEP BESIDE IT. The row's own action was the same plain
             * "Change" every other plan row carries, which says nothing about why somebody in this
             * situation specifically would press it. Named for what it actually does here instead.
             */
            action={<Button kind="quiet" size="small" onClick={scrollToPlans}>{peopleOverCap ? "Choose a plan for your team's size" : 'Change'}</Button>}
          />
          {/*
           * "WHEN BARIDI APPLIANCES WAS SET UP, IT HAD 20 OR MORE PEOPLE, SO IT BEGAN ON A PLAN."
           * `startedWith` is served to an admin only (5 October, evening) - one plain sentence, read
           * exactly as it comes, never a number this page works out for itself.
           */}
          {billingStatus?.startedWith && (
            <FieldRow label="How it began" value={billingStatus.startedWith.says} />
          )}
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
              value={`So far there have been ${usage.checkIns} ${usage.checkIns === 1 ? 'check-in' : 'check-ins'} and ${usage.reportsReleased} shared ${usage.reportsReleased === 1 ? 'report' : 'reports'}, with ${usage.peopleTakingPart} ${usage.peopleTakingPart === 1 ? 'person' : 'people'} taking part.`}
            />
          )}
        </FieldRows>
      </Section>

      {/*
       * WHATSAPP, THE PAID ADD-ON (decision 78, 2 October; U.6, platform gate added as screen
       * fault 2). Two switches, read at two levels, both of which must be on before this page says
       * a word about WhatsApp: the platform switch (`useWhatsAppIsOn`, GET /auth/whatsapp - the
       * same one every other screen checks before naming it), and `release.planAndBillingNewParts`,
       * as the server decides: while either is off, the query above is not even asked, `whatsapp`
       * stays undefined, and `isWhatsAppBillingAdmin` reads false, so nothing here shows.
       * Every price, limit and use figure is the server's own sentence (`whatsapp-add-on.service.ts`,
       * "WHAT PLAN AND BILLING SAYS ABOUT WHATSAPP") - this draws `says` exactly as it comes and
       * holds no number of its own.
       *
       * THE ALLOWANCE ONLY MEANS SOMETHING WHILE WHATSAPP IS ON (known issue U16): the server keeps
       * serving an admin the full shape, `use`/`atTheLimit`/`reachedTheLimit` included, while
       * `whatsapp.on` is false, because an admin who has just turned it off still needs the price
       * and the switch itself to turn it back on. But "Your organisation has sent 0 of 500 WhatsApp
       * messages this month" read next to a switch that is off is a number for an allowance nothing
       * is drawing on. These three rows show only once the switch itself reads on.
       */}
      {isWhatsAppBillingAdmin(whatsapp) && (
        <Section heading="WhatsApp" id="billing-whatsapp">
          <Panel>
            <Stack gap={12}>
              <SwitchRow
                title={whatsapp.says.onOrOff}
                /* The switch says whether it is on the subscription; during the free month it is on either way (13 October, evening). */
                on={whatsapp.on}
                onChange={(on) => setWhatsAppMut.mutate(on)}
                disabled={setWhatsAppMut.isPending}
              />
              <FieldRows>
                {whatsapp.says.freeMonth && <FieldRow label="Free month" value={whatsapp.says.freeMonth} />}
                {whatsapp.says.price && <FieldRow label="Price" value={whatsapp.says.price} />}
                <FieldRow label="What is charged" value={whatsapp.says.charge} />
                {whatsapp.on && <FieldRow label="This month" value={whatsapp.says.use} />}
                {whatsapp.on && (whatsapp.says.reachedTheLimit ? (
                  <FieldRow label="Reached" value={whatsapp.says.reachedTheLimit} />
                ) : whatsapp.says.atTheLimit ? (
                  <FieldRow label="At the limit" value={whatsapp.says.atTheLimit} />
                ) : null)}
              </FieldRows>
            </Stack>
          </Panel>
        </Section>
      )}

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
        <Section heading="Plans" note="Each plan is one monthly price, with as many check-ins and reports as you need.">
          <div className="gwui-plan-grid">
            {PLANS.filter(p => p !== 'ENTERPRISE').map(plan => {
              const mine = (isSubscribed || isPaused) && orgSub?.plan === plan
              const pending = (createSubscriptionMut.isPending && createSubscriptionMut.variables === plan) || (changePlanMut.isPending && changePlanMut.variables === plan)
              /* THE PRICE'S OWN "/mo" (Hafsah, 30 September): `priceLabel` returns the whole string,
                 e.g. "$25/mo", already carrying its own "/mo" (the one formatter every other price
                 on this page uses, `formatMonthlyPrice`). The prototype's plan card splits it into
                 the big figure and a small muted "/mo" beside it (s20.js/s21.js's `PLANS.map`) - so
                 this splits the same string instead of appending a second "/mo" after it, which is
                 what read "$25/mo/mo" before. */
              const price = priceLabel(plan) ?? ''
              const showsPerMonth = price.endsWith('/mo')
              const priceFigure = showsPerMonth ? price.slice(0, -3) : price
              return (
                <Panel key={plan} className={mine ? 'gwui-plan-card gwui-plan-card-mine' : 'gwui-plan-card'}>
                  <p className="gwui-plan-name">{PLAN_LABELS[plan]}</p>
                  <p className="gwui-plan-price">{priceFigure}{showsPerMonth && <span>/mo</span>}</p>
                  <p className="gwui-plan-cap">{capLabel(plan)}</p>
                  {tooSmallFor(plan) && <Note tone="amber">{tooSmallFor(plan)}</Note>}
                  {/* tag("act","Your plan") in the prototype (s20.js/s21.js): the navy tag, not green. */}
                  {mine ? <Tag tone="action">Your plan</Tag> : (
                    <Button kind="secondary" size="small" wide disabled={busy || isPaused} onClick={() => choosePlan(plan)}>{pending ? 'Opening…' : 'Move to this'}</Button>
                  )}
                </Panel>
              )
            })}
            <Panel className="gwui-plan-card gwui-plan-card-enterprise">
              <p className="gwui-plan-name">Enterprise</p>
              <p className="gwui-plan-cap">For special needs, a lower price per person, or your own support person.</p>
              <Button kind="secondary" size="small" wide onClick={() => { window.location.href = 'mailto:hello@myground.work?subject=Enterprise plan enquiry' }}>Contact us</Button>
            </Panel>
          </div>
        </Section>
      </div>

      {invoices.length > 0 && (
        <Section heading="Invoices">
          <FieldRows>
            {invoices.map((i) => (
              <FieldRow key={`${i.paidOn}-${i.amountCents}`} label={whenItWas(i.paidOn, 'dayAndMonthLong')} value={`${formatDollars(i.amountCents)}, paid.`} />
            ))}
          </FieldRows>
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
                  <Button kind="secondary" disabled={keepSubscriptionMut.isPending} onClick={() => keepSubscriptionMut.mutate()}>{keepSubscriptionMut.isPending ? 'Keeping…' : 'Keep subscription'}</Button>
                ) : isPaused ? (
                  <Button kind="secondary" disabled={resumeSubscriptionMut.isPending} onClick={() => resumeSubscriptionMut.mutate()}>{resumeSubscriptionMut.isPending ? 'Resuming…' : 'Resume subscription'}</Button>
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
                      <Button kind="secondary" onClick={() => pauseSubscriptionMut.mutate()} disabled={pauseSubscriptionMut.isPending}>{pauseSubscriptionMut.isPending ? 'Pausing…' : 'Pause instead'}</Button>
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
                      <Button kind="secondary" onClick={() => pauseSubscriptionMut.mutate()} disabled={pauseSubscriptionMut.isPending}>{pauseSubscriptionMut.isPending ? 'Pausing…' : 'Pause'}</Button>
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
            {/*
             * B-231: "All 1 of your check-ins have unlimited sessions" DID NOT READ RIGHT FOR ONE
             * CHECK-IN, AND "have" DID NOT AGREE WITH ONE EITHER. Said plainly for both counts.
             *
             * B-232: "All 2 of your check-ins have..." read just as oddly for two. Two check-ins
             * reads as "Both of your check-ins have...", and three or more keeps "All N of your
             * check-ins have...".
             */}
            <p className="gwui-panel-text-muted">
              {grounds.length === 1
                ? 'Your check-in has unlimited sessions and reports on this plan. Nothing is counted or charged per session.'
                : grounds.length === 2
                ? 'Both of your check-ins have unlimited sessions and reports on this plan. Nothing is counted or charged per session.'
                : `All ${grounds.length} of your check-ins have unlimited sessions and reports on this plan. Nothing is counted or charged per session.`}
            </p>
          </Panel>
        ) : grounds.length === 0 ? (
          <Panel><p className="gwui-panel-text-muted">Nothing active yet.</p></Panel>
        ) : (
          <Stack gap={10}>
            {/*
             * ONE SENTENCE ABOVE THE LIST, NOT A TAG ON EVERY ROW (group 1 review): "Free
             * check-in" and "Free extension available" repeated on every row read as clipped
             * labels, not sentences, saying the same thing over and over for the same
             * organisation-wide facts (every ground here is free the same way, and the free
             * extension is an organisation's, not a ground's). Said once above the list instead,
             * and only when it is true of every row - if the rows differ (some free, some metered,
             * or the extension already used on this organisation), each row keeps its own tag
             * below rather than a sentence that would not be true of all of them.
             */}
            {/*
             * GROUP 1'S THIRD REVIEW: "You can extend any of them for free" was not true of
             * anything on this page - the free extension is claimed from inside a check-in itself
             * (SessionPaywallModal.tsx's "Continue for free", shown when a session completes),
             * never from Plan and billing. Said truthfully, naming where it actually happens.
             */}
            {allFreeRows && !anyExtensionUsed && (
              <p className="gwui-panel-text-muted">Each of these is a free check-in. You can extend one for free from its own check-in.</p>
            )}
            {allFreeRows && anyExtensionUsed && (
              <p className="gwui-panel-text-muted">Each of these is a free check-in. The one free extension for your organisation has already been used.</p>
            )}
            <FieldRows>
              {(grounds as any[]).map((g: any) => {
                const balance: number | undefined = g.sessionsBalance
                const isFree: boolean = !!g.isFreeGround
                const extUsed: boolean = g.org?.freeExtensionUsed ?? false
                return (
                  <FieldRow
                    key={g.id}
                    /* WALKTHROUGH PASS 2, ITEM 6: EACH NAME HERE LINKS TO ITS OWN CHECK-IN. */
                    label={<Link to={`/grounds/${g.id}`}>{g.label}</Link>}
                    value={(
                      <span className="gwui-invite-actions">
                        {isSubscribed ? (
                          <Tag tone="proven">Unlimited sessions</Tag>
                        ) : allFreeRows ? null : isFree ? (
                          <Tag tone="proven">Free check-in</Tag>
                        ) : balance !== undefined ? (
                          <Tag tone={balance > 0 ? 'plain' : 'concern'}>{balance} session{balance !== 1 ? 's' : ''} left</Tag>
                        ) : null}
                        {!isSubscribed && !allFreeRows && !extUsed && <Tag tone="proven">Free extension available</Tag>}
                        {!isSubscribed && !allFreeRows && extUsed && <Tag tone="plain">Free extension used</Tag>}
                      </span>
                    )}
                    action={!isFree && !isSubscribed
                      ? <Button kind="secondary" size="small" onClick={() => navigate('/billing/checkout', { state: { groundId: g.id, groundName: g.label } })}>Add sessions</Button>
                      : undefined}
                  />
                )
              })}
            </FieldRows>
          </Stack>
        )}
      </Section>

      {/*
       * SHOWN ONLY TO SOMEONE WHO CAN MAKE OR SEE A CODE (group 1 review): generating a code is a
       * platform admin's own action ("Send access code by email" and "Generate a code" below are
       * already `user?.isPlatformAdmin` only) - so this section was a dead end for an ordinary
       * admin, with nothing to see and no way to make one. Shown to a platform admin as before, or
       * to any admin whose organisation already has a code to see.
       */}
      {(user?.isPlatformAdmin || codes.length > 0) && (
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
      )}

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
              <Button kind="secondary" onClick={() => sendCode.mutate()} disabled={sendCode.isPending || !sendEmail.trim()}>{sendCode.isPending ? 'Sending…' : 'Send code'}</Button>
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
              <Button kind="secondary" onClick={() => { setNewCode(null); generateCode.mutate() }} disabled={generateCode.isPending}>{generateCode.isPending ? 'Generating…' : 'Generate'}</Button>
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
