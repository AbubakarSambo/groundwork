import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi, PLAN_LABELS, PLAN_PRICES, PLAN_MEMBER_CAPS, type SubscriptionPlan } from '@/api/billing'
import { groundsApi } from '@/api/grounds'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { Stat, Pill } from '@/components/gw/kit'

const PLANS: SubscriptionPlan[] = ['STARTER', 'SMALL_TEAM', 'GROWTH', 'BUSINESS', 'SCALE', 'ENTERPRISE']

export function BillingPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  const groundId = params.get('groundId') ?? undefined

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
  })

  const { data: codes = [], isLoading: codesLoading } = useQuery({
    queryKey: ['contributor-codes'],
    queryFn: billingApi.getContributorCodes,
  })

  const { data: billingStatus } = useQuery({
    queryKey: ['billing-status'],
    queryFn: billingApi.status,
  })

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
    onError: () => toast.error('Could not send code. Check the email and try again.'),
  })

  const createSubscriptionMut = useMutation({
    mutationFn: (plan: SubscriptionPlan) => billingApi.createSubscription(plan),
    onSuccess: r => { if (r.checkoutUrl) window.location.href = r.checkoutUrl },
    onError: () => toast.error('Could not start checkout. Try again.'),
  })

  const cancelSubscriptionMut = useMutation({
    mutationFn: () => billingApi.cancelSubscription(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-status'] })
      toast.success('Subscription cancelled.')
    },
    onError: () => toast.error('Could not cancel subscription. Try again.'),
  })

  const pauseSubscriptionMut = useMutation({
    mutationFn: () => billingApi.pauseSubscription(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-status'] })
      toast.success('Subscription paused.')
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

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(text)
      setTimeout(() => setCopied(null), 2000)
    })
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
  const peopleOverCap =
    billingStatus?.people?.cap != null && billingStatus.people.count > billingStatus.people.cap
  const hasBillingHistory = (billingStatus?.activeGrounds ?? []).length > 0

  if (groundsLoading || codesLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-paper-2)' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 16px 64px' }}>

        <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginBottom: 20, cursor: 'pointer' }} onClick={() => navigate(groundId ? `/grounds/${groundId}` : '/grounds')}>
          Back
        </div>

        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gw-dark)', marginBottom: 4 }}>Billing</div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 28, lineHeight: 1.6 }}>
          Manage sessions for your grounds and generate access codes.
        </div>

        {/**
          * AT A GLANCE, IN THE BOARD'S VOCABULARY. Stage 5.
          *
          * The three numbers that decide whether somebody upgrades - which plan, how many people
          * against the cap, when it renews - were prose lines stacked inside a card, in a page whose
          * whole job is a decision about money. The board answers "what is the state of this" with a
          * row of serif numerals under small labels, and it is the best-reading page in the product
          * for exactly that reason.
          *
          * `Stat` is the board's own component, not a copy of it, so this row cannot drift from the
          * one on the board.
          */}
        {(isSubscribed || isPaused) && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            <Stat
              label="Plan"
              value={PLAN_LABELS[orgSub!.plan as SubscriptionPlan] ?? String(orgSub!.plan)}
              caption={PLAN_PRICES[orgSub!.plan as SubscriptionPlan]}
              tone={isPaused ? 'warn' : undefined}
            />
            {billingStatus?.people && (
              <Stat
                label="People"
                value={billingStatus.people.cap != null
                  ? `${billingStatus.people.count} of ${billingStatus.people.cap}`
                  : String(billingStatus.people.count)}
                caption={peopleOverCap ? 'Over what this plan covers' : billingStatus.people.cap != null ? 'Everyone with an account here' : 'No cap on this plan'}
                tone={peopleOverCap ? 'bad' : undefined}
              />
            )}
            <Stat
              label={isPaused ? 'Paused since' : 'Renews'}
              value={orgSub?.periodEnd
                ? new Date(orgSub.periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                : 'Not set'}
              caption={isPaused ? 'Nothing is being charged' : 'On the card ending below'}
              tone={isPaused ? 'warn' : undefined}
            />
          </div>
        )}

        {/* Current plan */}
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-dark)', marginBottom: 12 }}>Current plan</div>
        {isSubscribed || isPaused ? (
          <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '16px 18px', marginBottom: 28 }}>
            {/**
              * SAID ONCE. Stage 5.
              *
              * The plan, the price and the seat count are in the tiles above now, and this card
              * repeated all three - so a page about a decision on money stated the same three facts
              * twice within one screen. What belongs here is the state and the two things you can do
              * about it.
              */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                {isPaused
                  ? 'Paused. Nothing is being charged, and your grounds stay as they are.'
                  : peopleOverCap
                    ? 'More people have accounts here than this plan covers. Moving up a plan is below.'
                    : 'Running normally.'}
              </div>
              <Pill tone={isPaused ? 'warn' : 'good'}>{isPaused ? 'Paused' : 'Active'}</Pill>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {isPaused ? (
                <button
                  onClick={() => resumeSubscriptionMut.mutate()}
                  disabled={resumeSubscriptionMut.isPending}
                  style={{ padding: '8px 14px', borderRadius: 7, background: 'var(--gw-dark)', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: resumeSubscriptionMut.isPending ? 0.7 : 1 }}
                >
                  {resumeSubscriptionMut.isPending ? 'Resuming...' : 'Resume subscription'}
                </button>
              ) : (
                <button
                  onClick={() => pauseSubscriptionMut.mutate()}
                  disabled={pauseSubscriptionMut.isPending}
                  style={{ padding: '8px 14px', borderRadius: 7, background: 'none', color: 'var(--gw-sub)', fontSize: 12, fontWeight: 600, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit', opacity: pauseSubscriptionMut.isPending ? 0.7 : 1 }}
                >
                  {pauseSubscriptionMut.isPending ? 'Pausing...' : 'Pause subscription'}
                </button>
              )}
              <button
                onClick={() => {
                  if (window.confirm('Cancel your subscription? Your team will move to per-session billing.')) {
                    cancelSubscriptionMut.mutate()
                  }
                }}
                disabled={cancelSubscriptionMut.isPending}
                style={{ padding: '8px 14px', borderRadius: 7, background: 'none', color: 'var(--gw-clay)', fontSize: 12, fontWeight: 600, border: '1px solid #F0D6D3', cursor: 'pointer', fontFamily: 'inherit', opacity: cancelSubscriptionMut.isPending ? 0.7 : 1 }}
              >
                {cancelSubscriptionMut.isPending ? 'Cancelling...' : 'Cancel subscription'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '16px 18px', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-dark)' }}>Free</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 3 }}>Up to 10 Grounds, with unlimited sessions and reports.</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'var(--gw-paper-2)', color: 'var(--gw-muted)' }}>
                No subscription
              </span>
            </div>
          </div>
        )}

        {/* Empty state: no billing history yet */}
        {!hasBillingHistory && !isSubscribed && !isPaused && (
          <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '20px 18px', marginBottom: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-dark)', marginBottom: 6 }}>
              Your first 10 Grounds are free.
            </div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, marginBottom: 14 }}>
              Create up to 10 Grounds with unlimited sessions and reports, no card required. Subscribe when your team outgrows the free tier.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => document.getElementById('upgrade-section')?.scrollIntoView({ behavior: 'smooth' })}
                style={{ padding: '9px 18px', borderRadius: 7, background: 'var(--gw-dark)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                View org plans
              </button>
            </div>
          </div>
        )}

        {/* Your grounds */}
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-dark)', marginBottom: 12 }}>Your grounds</div>

        {grounds.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: 20, marginBottom: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>No active grounds yet.</div>
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
                      {isFree ? (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--gw-green-bg)', color: 'var(--gw-green-t)' }}>Free ground</span>
                      ) : isSubscribed ? (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--gw-green-bg)', color: 'var(--gw-green-t)' }}>Unlimited sessions</span>
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

        {/* Upgrade organization */}
        <div id="upgrade-section" style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-dark)', marginBottom: 4 }}>Upgrade your organization</div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 14, lineHeight: 1.6 }}>
          Your team is getting value from Groundwork. Unlock unlimited Grounds and unlimited sessions for everyone in your organization with one simple monthly subscription.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
          {PLANS.filter(p => p !== 'ENTERPRISE').map(plan => (
            <div key={plan} style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-dark)' }}>{PLAN_LABELS[plan]}</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 2 }}>{PLAN_MEMBER_CAPS[plan]}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--gw-dark)' }}>{PLAN_PRICES[plan]}</span>
                {isSubscribed && orgSub?.plan === plan ? (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'var(--gw-green-bg)', color: 'var(--gw-green-t)' }}>Current</span>
                ) : (
                  /* One primary colour in the product. The subscribe buttons were
                     the only purple thing in it - a hardcoded hex in three files
                     with no token behind it, on the pages where somebody is
                     deciding whether to trust us with money. W8-24. */
                  <button
                    onClick={() => createSubscriptionMut.mutate(plan)}
                    disabled={createSubscriptionMut.isPending}
                    style={{ padding: '7px 14px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: createSubscriptionMut.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: createSubscriptionMut.isPending ? 0.7 : 1 }}
                  >
                    {createSubscriptionMut.isPending ? '...' : 'Subscribe'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Enterprise */}
          <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-dark)' }}>Enterprise</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 2 }}>Unlimited members</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-dark)' }}>Contact us</span>
              <a
                href={`mailto:${user?.email ?? 'support@myground.work'}?subject=Enterprise plan enquiry`}
                style={{ padding: '7px 14px', borderRadius: 7, background: 'var(--gw-dark)', color: 'white', fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'inherit' }}
              >
                Contact
              </a>
            </div>
          </div>
        </div>

        {/* Billing principles */}
        <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '16px 18px', marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-dark)', marginBottom: 12 }}>Billing</div>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              'No upfront payment.',
              'No credit card required to get started.',
              'Pay when Groundwork is creating value for your team.',
              'Choose between buying sessions or subscribing your organization.',
              'Pause your organization subscription whenever you are no longer using Groundwork.',
            ].map((line, i) => (
              <li key={i} style={{ fontSize: 13, color: 'var(--gw-sub-d)', lineHeight: 1.6 }}>{line}</li>
            ))}
          </ul>
        </div>

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
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--gw-sub)', marginBottom: 5 }}>Sessions to grant</label>
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
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--gw-sub)', marginBottom: 5 }}>Sessions to grant</label>
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

      </div>
    </div>
  )
}
