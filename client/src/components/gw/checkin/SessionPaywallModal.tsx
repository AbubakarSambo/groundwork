import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { billingApi } from '@/api/billing'
import { useAuthStore } from '@/stores/auth'

/**
 * REVIEW ROUND 3, ITEM 2: THE PAYWALL OVERLAY, PULLED OUT OF GroundParticipantPage.tsx SO
 * GroundAdminPage.tsx CAN SHOW THE SAME ONE. See useOpenSession.ts for why.
 *
 * Unchanged content and behaviour: the free-extension tier, the organisation-upgrade tier, the
 * access-code box (lead/admin only), and "Not now".
 */
export function SessionPaywallModal({
  paywall,
  canPayHere,
  groundId,
}: {
  paywall: ReturnType<typeof import('@/hooks/useOpenSession').useOpenSession>['paywall']
  canPayHere: boolean
  /**
   * "REMIND THEM" (decision 106's neighbour, upgrade.txt, "Anyone else, once it has paused"):
   * `POST /billing/remind-the-admins` with this check-in's ground. An admin, a lead or a member
   * may press it; the server refuses a guest, so it is never offered to one here either.
   */
  groundId?: string
}) {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [remindedSays, setRemindedSays] = useState<string | null>(null)
  const remindTheAdmins = useMutation({
    mutationFn: () => billingApi.remindTheAdmins(groundId!),
    onSuccess: (r) => setRemindedSays(r.says),
    onError: () => toast.error('Could not send the reminder. Nothing has changed - try again.'),
  })
  if (!paywall.show) return null
  return (
    <div
      role="dialog" aria-modal="true" aria-label="Your session is complete"
      onKeyDown={e => { if (e.key === 'Escape') paywall.close() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}
    >
      <div tabIndex={-1} ref={el => el?.focus()} style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 400, width: '100%', maxHeight: '90vh', overflowY: 'auto', outline: 'none' }}>

        {canPayHere ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-dark)', marginBottom: 4 }}>Your session is complete.</div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 20, lineHeight: '21px' }}>
              Did Groundwork help your team move forward? Choose what works best for you.
            </div>

            {paywall.freeExtensionAvailable && (
              <div style={{ border: '1px solid var(--gw-green-b-soft)', borderRadius: 10, padding: '14px 16px', marginBottom: 12, background: 'var(--gw-green-bg)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-green-t)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Add one more free session</div>
                <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: '21px', marginBottom: 12 }}>
                  Not ready to pay yet? Keep using Groundwork until you are confident it is delivering value. Add another free session and continue your Check-in.
                </div>
                <button className="btn sec"
                  onClick={() => paywall.claimFreeExtension.mutate()}
                  disabled={paywall.claimFreeExtension.isPending}
                  style={{ width: '100%' }}
                >
                  {paywall.claimFreeExtension.isPending ? 'Adding...' : 'Continue for free'}
                </button>
              </div>
            )}

            <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-navy)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Upgrade organisation</div>
              <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: '21px', marginBottom: 12 }}>
                Your team is getting value from Groundwork. Unlock unlimited check-ins and unlimited sessions for everyone in your organisation with one simple monthly subscription.
              </div>
              <button className="btn pri"
                onClick={() => paywall.createSubscription.mutate('STARTER')}
                disabled={paywall.createSubscription.isPending}
                style={{ width: '100%', marginBottom: 8 }}
              >
                {paywall.createSubscription.isPending ? 'Redirecting...' : 'Upgrade organisation'}
              </button>
              <button className="btn sec"
                onClick={() => navigate('/pricing')}
                style={{ width: '100%' }}
              >
                View all plans
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-dark)', marginBottom: 8 }}>Session needed to continue</div>
            <div style={{ background: 'var(--gw-paper-2)', borderRadius: 8, padding: '12px 14px', marginBottom: 14, fontSize: 13, color: 'var(--gw-sub-d)', lineHeight: '21px' }}>
              Only an organisation admin can add sessions. We have told them you are waiting.
            </div>
            {groundId && user?.role !== 'GUEST' && (
              remindedSays ? (
                <div style={{ fontSize: 13, color: 'var(--gw-sub-d)', lineHeight: '21px', marginBottom: 14 }}>{remindedSays}</div>
              ) : (
                <button className="btn sec"
                  onClick={() => remindTheAdmins.mutate()}
                  disabled={remindTheAdmins.isPending}
                  style={{ width: '100%', marginBottom: 14 }}
                >
                  {remindTheAdmins.isPending ? 'Reminding…' : 'Remind them'}
                </button>
              )
            )}
          </>
        )}

        {canPayHere && (
          <div style={{ borderTop: '1px solid var(--gw-border)', paddingTop: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 8 }}>Have an access code?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={paywall.code}
                onChange={e => { paywall.setCode(e.target.value); paywall.setCodeMsg(null) }}
                placeholder="Enter code"
                className="gwui-input" style={{ flex: 1, ...(paywall.codeMsg && !paywall.codeMsg.ok ? { borderColor: 'var(--gw-danger)' } : {}) }}
              />
              <button className="btn pri sm"
                onClick={() => paywall.redeem.mutate()}
                disabled={!paywall.code.trim() || paywall.redeem.isPending}
              >
                {paywall.redeem.isPending ? 'Checking...' : 'Apply'}
              </button>
            </div>
            {paywall.codeMsg && (
              <div style={{ fontSize: 12, color: paywall.codeMsg.ok ? 'var(--gw-green-t)' : 'var(--gw-danger)', marginTop: 6 }}>{paywall.codeMsg.text}</div>
            )}
          </div>
        )}

        <button
          onClick={paywall.close}
          style={{ marginTop: 14, background: 'none', border: 'none', fontSize: 12, color: 'var(--gw-muted)', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
        >
          Not now
        </button>
      </div>
    </div>
  )
}
