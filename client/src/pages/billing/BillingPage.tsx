import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi } from '@/api/billing'
import { groundsApi } from '@/api/grounds'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

export function BillingPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  const groundId = params.get('groundId') ?? undefined
  const returned = params.get('status') === 'success'

  const [contribCode, setContribCode] = useState('')
  const [showContrib, setShowContrib] = useState(false)

  const { data: status, isLoading } = useQuery({
    queryKey: ['billing'],
    queryFn: billingApi.status,
  })

  const { data: ground } = useQuery({
    queryKey: ['ground', groundId],
    queryFn: () => groundsApi.get(groundId!),
    enabled: !!groundId,
  })

  const checkout = useMutation({
    mutationFn: () => billingApi.createCareFeeCheckout(groundId),
    onSuccess: url => { if (url) window.location.href = url },
    onError: () => toast.error('Could not start checkout. Try again.'),
  })

  const portal = useMutation({
    mutationFn: billingApi.portal,
    onSuccess: r => { window.location.href = r.url },
    onError: () => toast.error('Could not open billing portal.'),
  })

  const applyCode = useMutation({
    mutationFn: () => billingApi.applyContributorCode(contribCode.trim()),
    onSuccess: r => {
      if (r.ok) {
        toast.success(r.message)
        qc.invalidateQueries({ queryKey: ['billing'] })
        if (groundId) setTimeout(() => navigate(`/grounds/${groundId}`), 800)
      } else {
        toast.error(r.message)
      }
    },
    onError: () => toast.error('Could not apply code. Try again.'),
  })

  const activeParticipants = status?.activeParticipants ?? []
  const threshold = status?.participantsAtThreshold ?? []
  const participantCount = Math.max(activeParticipants.length, threshold.length, 1)
  const monthlyTotal = 25 + participantCount * 25

  // Name to show in heading: from threshold participant, ground label, or ground participants
  const triggerName = threshold[0]?.name ?? threshold[0]?.email?.split('@')[0]
    ?? (ground as any)?.participants?.find((p: any) => p.partyType === 'PARTICIPANT')?.email?.split('@')[0]

  const heading = triggerName
    ? `${triggerName.charAt(0).toUpperCase()}${triggerName.slice(1)} is done with session 2.`
    : ground?.label
    ? `Session 2 is complete for ${ground.label}.`
    : 'Sessions 1 and 2 are complete.'

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: '#9B9590' }}>Loading…</div>
      </div>
    )
  }

  // Already active — show management view
  if (status?.careFeeActive) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F3EF' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 16px 64px' }}>
          <div style={{ fontSize: 11, color: '#9B9590', marginBottom: 20, cursor: 'pointer' }} onClick={() => navigate(groundId ? `/grounds/${groundId}` : '/grounds')}>
            ← {returned ? 'Back to ground' : 'Back'}
          </div>

          {returned && (
            <div style={{ background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 10, padding: '13px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#085041', marginBottom: 3 }}>Billing is active.</div>
              <div style={{ fontSize: 12, color: '#3A7A60', lineHeight: 1.6 }}>
                You can now release the session 2 report from the ground page and continue to session 3.
              </div>
            </div>
          )}

          <div style={{ fontSize: 22, fontWeight: 800, color: '#0A1628', marginBottom: 6, lineHeight: 1.3 }}>
            Your plan is active.
          </div>
          <div style={{ fontSize: 13, color: '#6B6560', lineHeight: 1.65, marginBottom: 24 }}>
            Sessions 1 and 2 are always free. You are billed from session 3 onward.
          </div>

          {/* Pricing summary */}
          <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #F0EEE9', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#6B6560' }}>Platform fee (per ground)</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>$80/ground</span>
            </div>
            {activeParticipants.map((p: any, i: number) => (
              <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid #F0EEE9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#6B6560' }}>{p.name ?? p.email}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>$10/person</span>
              </div>
            ))}
            <div style={{ padding: '14px 16px', background: '#F5F3EF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>Monthly total</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#0C447C' }}>${status.careFeeActive ? monthlyTotal : 0}/mo</span>
            </div>
          </div>

          {status.nextBillingDate && (
            <div style={{ fontSize: 12, color: '#9B9590', marginBottom: 20 }}>
              Next billing: {new Date(status.nextBillingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              {status.card && ` · ${status.card.brand} ···· ${status.card.last4}`}
            </div>
          )}

          <button
            onClick={() => portal.mutate()}
            disabled={portal.isPending}
            style={{ width: '100%', padding: '13px 16px', borderRadius: 8, background: '#0A1628', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: portal.isPending ? 0.6 : 1 }}
          >
            {portal.isPending ? 'Loading…' : 'Manage payment method and invoices →'}
          </button>
        </div>
      </div>
    )
  }

  // Gate view — needs to add card
  return (
    <div style={{ minHeight: '100vh', background: '#F5F3EF' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 16px 64px' }}>
        <div style={{ fontSize: 11, color: '#9B9590', marginBottom: 24, cursor: 'pointer' }} onClick={() => navigate(groundId ? `/grounds/${groundId}` : '/grounds')}>
          ← Back
        </div>

        {/* Heading */}
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0A1628', lineHeight: 1.3, marginBottom: 8 }}>
          {heading}
        </div>
        <div style={{ fontSize: 14, color: '#6B6560', lineHeight: 1.65, marginBottom: 28 }}>
          Sessions 1 and 2 were free. Add a card to release the session 2 report and continue.
        </div>

        {/* Pricing breakdown */}
        <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #F0EEE9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: '#6B6560' }}>Platform fee (per ground)</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>$80/ground</div>
          </div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #F0EEE9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: '#6B6560' }}>Per active participant</div>
              <div style={{ fontSize: 11, color: '#9B9590' }}>{participantCount} participant{participantCount !== 1 ? 's' : ''} in this ground</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>$10/person</div>
          </div>
          <div style={{ padding: '14px 16px', background: '#F5F3EF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>Monthly total</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0C447C' }}>${monthlyTotal}/mo</div>
          </div>
        </div>

        {/* Guarantees */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 28 }}>
          {[
            'Sessions 1 and 2 were free for everyone in this ground',
            'Participants in several Grounds are billed once',
            'Unlimited Grounds and Ground leads at no extra cost',
            'Participants never see a payment screen',
            'Cancel any time. Your records are always yours.',
          ].map((text, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ color: '#5DCAA5', fontWeight: 800, fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: 13, color: '#4A4540', lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Email field */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B6560', display: 'block', marginBottom: 5 }}>
            Your email (for billing notifications)
          </label>
          <input
            type="email"
            defaultValue={user?.email ?? ''}
            readOnly
            style={{ width: '100%', padding: '10px 12px', borderRadius: 7, border: '1px solid #E2E0DB', background: '#F5F3EF', fontSize: 13, color: '#6B6560', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        {/* Primary CTA */}
        <button
          onClick={() => checkout.mutate()}
          disabled={checkout.isPending}
          style={{ width: '100%', padding: '15px 16px', borderRadius: 9, background: '#0A1628', color: 'white', fontSize: 15, fontWeight: 800, border: 'none', cursor: checkout.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: checkout.isPending ? 0.7 : 1, marginBottom: 10 }}
        >
          {checkout.isPending ? 'Redirecting to Stripe…' : 'Add card and release report →'}
        </button>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#9B9590', marginBottom: 28 }}>
          Secured by Stripe. Cancel any time.
        </div>

        {/* Contributor code */}
        <div style={{ borderTop: '1px solid #E2E0DB', paddingTop: 20 }}>
          {!showContrib ? (
            <button
              onClick={() => setShowContrib(true)}
              style={{ background: 'none', border: 'none', fontSize: 12, color: '#9B9590', cursor: 'pointer', fontFamily: 'inherit', padding: 0, textDecoration: 'underline' }}
            >
              Have a contributor code?
            </button>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: '#6B6560', marginBottom: 10, lineHeight: 1.6 }}>
                Enter your contributor code to continue without payment.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Contributor code"
                  value={contribCode}
                  onChange={e => setContribCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && contribCode.trim() && applyCode.mutate()}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 7, border: '1px solid #E2E0DB', background: 'white', fontSize: 13, fontFamily: 'inherit' }}
                />
                <button
                  onClick={() => applyCode.mutate()}
                  disabled={applyCode.isPending || !contribCode.trim()}
                  style={{ padding: '10px 16px', borderRadius: 7, background: '#0C447C', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: (applyCode.isPending || !contribCode.trim()) ? 0.6 : 1 }}
                >
                  {applyCode.isPending ? 'Checking…' : 'Apply'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
