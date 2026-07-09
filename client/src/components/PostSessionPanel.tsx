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
    onError: () => toast.error('Could not claim free session. Try again.'),
  })

  const purchaseSessionMut = useMutation({
    mutationFn: () => billingApi.purchaseSession(groundId),
    onSuccess: r => { if (r.checkoutUrl) window.location.href = r.checkoutUrl },
    onError: () => toast.error('Could not start checkout. Try again.'),
  })

  const createSubscriptionMut = useMutation({
    mutationFn: (plan: string) => billingApi.createSubscription(plan as any),
    onSuccess: r => { if (r.checkoutUrl) window.location.href = r.checkoutUrl },
    onError: () => toast.error('Could not start checkout. Try again.'),
  })

  if (dismissed) return null

  return (
    <div style={{ background: '#F5F3EF', border: '1px solid #E2E0DB', borderRadius: 12, padding: '20px 20px 16px', marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#0A1628', marginBottom: 4 }}>
        Your session is complete.
      </div>
      <div style={{ fontSize: 13, color: '#6B6560', lineHeight: 1.65, marginBottom: 18 }}>
        Did Groundwork help your team move forward? Choose what works best for you.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Free extension */}
        {!freeExtensionUsed && (
          <div style={{ background: 'white', border: '1px solid #B6E8D4', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#085041', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>
              Add one more free session
            </div>
            <div style={{ fontSize: 13, color: '#1A1916', lineHeight: 1.6, marginBottom: 12 }}>
              Not ready to pay yet? Keep using Groundwork until you are confident it is delivering value. Add another free session and continue your Ground.
            </div>
            <button
              onClick={() => claimFreeExtensionMut.mutate()}
              disabled={claimFreeExtensionMut.isPending}
              style={{ padding: '9px 18px', borderRadius: 7, background: '#085041', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: claimFreeExtensionMut.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: claimFreeExtensionMut.isPending ? 0.7 : 1 }}
            >
              {claimFreeExtensionMut.isPending ? 'Adding...' : 'Continue for free'}
            </button>
          </div>
        )}

        {/* Buy session */}
        <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0C447C', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>
            Buy sessions
          </div>
          <div style={{ fontSize: 13, color: '#1A1916', lineHeight: 1.6, marginBottom: 12 }}>
            Groundwork helping your team? Continue this Ground with additional sessions whenever you need them. Pay only because you have experienced the value, not because a trial expired.
          </div>
          <button
            onClick={() => purchaseSessionMut.mutate()}
            disabled={purchaseSessionMut.isPending}
            style={{ padding: '9px 18px', borderRadius: 7, background: '#0A1628', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: purchaseSessionMut.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: purchaseSessionMut.isPending ? 0.7 : 1 }}
          >
            {purchaseSessionMut.isPending ? 'Redirecting...' : 'Buy a session ($5)'}
          </button>
        </div>

        {/* Upgrade org */}
        <div style={{ background: 'white', border: '1px solid #D4C8EC', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B4FA0', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>
            Upgrade organization
          </div>
          <div style={{ fontSize: 13, color: '#1A1916', lineHeight: 1.6, marginBottom: 12 }}>
            Your team is getting value from Groundwork. Unlock unlimited Grounds and unlimited sessions for everyone in your organization with one simple monthly subscription.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => createSubscriptionMut.mutate('STARTER')}
              disabled={createSubscriptionMut.isPending}
              style={{ padding: '9px 18px', borderRadius: 7, background: '#6B4FA0', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: createSubscriptionMut.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: createSubscriptionMut.isPending ? 0.7 : 1 }}
            >
              {createSubscriptionMut.isPending ? 'Redirecting...' : 'Upgrade organization'}
            </button>
            <button
              onClick={() => navigate('/pricing')}
              style={{ padding: '9px 18px', borderRadius: 7, background: 'none', color: '#6B4FA0', fontSize: 13, fontWeight: 600, border: '1px solid #D4C8EC', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              View all plans
            </button>
          </div>
        </div>

      </div>

      <button
        onClick={() => { setDismissed(true); onDismiss() }}
        style={{ marginTop: 14, background: 'none', border: 'none', fontSize: 12, color: '#9B9590', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
      >
        Not now
      </button>
    </div>
  )
}
