import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi } from '@/api/billing'
import { toast } from 'sonner'

interface Props {
  groundId: string
  freeExtensionUsed: boolean
  onDismiss: () => void
}

export function PostSessionPanel({ groundId, freeExtensionUsed, onDismiss }: Props) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [dismissed, setDismissed] = useState(false)

  const claimFreeExtensionMut = useMutation({
    mutationFn: () => billingApi.claimFreeExtension(groundId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
      toast.success('Free session added. Your team can continue checking in.')
      setDismissed(true)
      onDismiss()
    },
    /* The server says which it was - "already used", which is permanent, or a free check-in with
       nothing to extend - and "try again" was the message for both. Say what it said. */
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not add the free session. Try again.'),
  })

  // purchaseSessionMut removed with the buy-a-session tier.

  const createSubscriptionMut = useMutation({
    mutationFn: (plan: string) => billingApi.createSubscription(plan as any),
    onSuccess: r => { if (r.checkoutUrl) window.location.href = r.checkoutUrl },
    onError: () => toast.error('Could not start checkout. Try again.'),
  })

  if (dismissed) return null

  return (
    <div style={{ background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '20px 20px 16px', marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-dark)', marginBottom: 4 }}>
        Your session is complete.
      </div>
      <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: '21px', marginBottom: 18 }}>
        Did Groundwork help your team move forward? Choose what works best for you.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Free extension */}
        {!freeExtensionUsed && (
          <div style={{ background: 'white', border: '1px solid var(--gw-green-b-soft)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-green-t)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>
              Add one more free session
            </div>
            <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: '21px', marginBottom: 12 }}>
              Not ready to pay yet? Keep using Groundwork until you are confident it is delivering value. Add another free session and continue your Check-in.
            </div>
            <button className="btn sec"
              onClick={() => claimFreeExtensionMut.mutate()}
              disabled={claimFreeExtensionMut.isPending}
            >
              {claimFreeExtensionMut.isPending ? 'Adding...' : 'Continue for free'}
            </button>
          </div>
        )}

        {/* The "Buy sessions" tier is gone: there is no per-session
            billing. A free ground has unlimited sessions, a subscription has
            unlimited sessions, and nothing in between is sold by the session. */}

        {/* Upgrade org */}
        <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-navy)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>
            Upgrade organisation
          </div>
          <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: '21px', marginBottom: 12 }}>
            Your team is getting value from Groundwork. Unlock unlimited check-ins and unlimited sessions for everyone in your organisation with one simple monthly subscription.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn pri"
              onClick={() => createSubscriptionMut.mutate('STARTER')}
              disabled={createSubscriptionMut.isPending}
            >
              {createSubscriptionMut.isPending ? 'Redirecting...' : 'Upgrade organisation'}
            </button>
            <button className="btn sec"
              onClick={() => navigate('/pricing')}
            >
              View all plans
            </button>
          </div>
        </div>

      </div>

      <button
        onClick={() => { setDismissed(true); onDismiss() }}
        style={{ marginTop: 14, background: 'none', border: 'none', fontSize: 12, color: 'var(--gw-muted)', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
      >
        Not now
      </button>
    </div>
  )
}
