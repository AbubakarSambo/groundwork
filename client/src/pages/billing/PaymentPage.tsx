import { useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { billingApi } from '@/api/billing'
import { groundsApi } from '@/api/grounds'
import { useBackOrFallback } from '@/lib/a-back-button-never-leaves-groundwork'

export function PaymentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const qc = useQueryClient()

  const groundId: string | undefined =
    (location.state as any)?.groundId ?? params.get('groundId') ?? undefined
  const groundName: string | undefined =
    (location.state as any)?.groundName ?? params.get('groundName') ?? undefined

  // Free-tier grounds have unlimited sessions - never show "add sessions here"
  // for one. The backend already refuses the charge itself (the mechanism);
  // this is the cleaner-UX layer so a free-tier admin never sees a payment
  // form for a ground that has nothing to buy.
  const { data: ground, isLoading: groundLoading } = useQuery({
    queryKey: ['ground', groundId],
    queryFn: () => groundsApi.get(groundId!),
    enabled: !!groundId,
  })

  // B-126: opened from an email link or a new tab, there is no browser history to go back to, and
  // a bare `navigate(-1)` fell through to about:blank. A paid checkout is always reached from this
  // ground's own page when there is one; Today is the named fallback when there is nothing to
  // return to and no ground to name.
  const back = useBackOrFallback(
    groundId ? `/grounds/${groundId}` : '/today',
    groundId ? 'Back to this check-in' : 'Back to Today',
  )

  const [showCode, setShowCode] = useState(false)
  const [code, setCode] = useState('')
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null)


  // The session-purchase checkout went with the form above.

  const redeemCode = useMutation({
    mutationFn: () => {
      if (!groundId) return Promise.reject(new Error('groundId missing'))
      return billingApi.redeemContributorCode(code.trim().toUpperCase(), groundId)
    },
    onSuccess: r => {
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
      setCodeMsg({ ok: r.ok, text: r.message })
      if (r.ok) {
        setTimeout(() => navigate(groundId ? `/grounds/${groundId}` : '/grounds'), 1200)
      }
    },
    onError: () => setCodeMsg({ ok: false, text: 'Something went wrong. Try again.' }),
  })

  return (
    /* B-045: `justifyContent: 'center'` on a `minHeight: '100vh'` column centred this page's own
       content vertically in the whole viewport, leaving an empty band of roughly 300px above
       "Back" and the heading - every other page in the audit starts at the same height, near the
       top. `flex-start` with the same 48px top padding PricingPage already uses for its own
       centred column removes the band without changing how this page looks once its content is
       on screen. */
    <div style={{ minHeight: '100vh', background: 'var(--gw-paper-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '48px 20px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        <button type="button" style={{ fontSize: 11, color: 'var(--gw-muted)', marginBottom: 20, cursor: 'pointer' }} onClick={back.onClick}>{back.label}</button>

        {/* B-145: this page titled itself "Add sessions to this check-in" and then said, right
            underneath, that sessions are not charged for - a title that contradicted its own
            body. The only thing left to do here is redeem an access code (the session-purchase
            form is gone; see the comment below), so the title now says that. */}
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gw-dark)', marginBottom: 4 }}>
          {ground?.isFreeGround ? 'This check-in' : 'Use an access code'}
        </div>
        {groundName && (
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 20 }}>{groundName}</div>
        )}
        {!groundName && <div style={{ marginBottom: 20 }} />}

        {groundLoading ? (
          <div style={{ fontSize: 13, color: 'var(--gw-muted)', padding: '20px 0' }}>Loading...</div>
        ) : ground?.isFreeGround ? (
          <div style={{ background: 'var(--gw-green-bg)', border: '1px solid var(--gw-green-b-soft)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 13, color: 'var(--gw-green-t)', lineHeight: 1.6 }}>
              <strong>This check-in has unlimited free sessions.</strong> There is nothing to purchase here - just continue from the check-in page.
            </div>
          </div>
        ) : (
          <>
            {/* The session-purchase form is gone: sessions are not sold.
                A free ground has unlimited sessions and a subscription has
                unlimited sessions, so there was never a quantity to buy. What
                is left on this page is contributor-code redemption, which
                grants access and costs nobody anything. */}
            <div style={{ background: 'var(--gw-green-bg)', border: '1px solid var(--gw-green-b-soft)', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--gw-green-t)', lineHeight: 1.6 }}>
                <strong>Sessions are not charged for.</strong> Every check-in runs as many sessions
                and reports as it needs. An access code is only for the number of check-ins your
                organisation can run at once.
              </div>
            </div>
          </>
        )}

        {/* Access code */}
        <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: 18, marginBottom: 16 }}>
          {!showCode ? (
            <button
              onClick={() => setShowCode(true)}
              style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--gw-muted)', cursor: 'pointer', fontFamily: 'inherit', padding: 0, textDecoration: 'underline' }}
            >
              Have an access code?
            </button>
          ) : (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 10 }}>Access code</div>
              <input
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value); setCodeMsg(null) }}
                placeholder="Enter code"
                className="gwui-input" style={{ boxSizing: 'border-box', marginBottom: 8, ...(codeMsg && !codeMsg.ok ? { borderColor: 'var(--gw-danger)' } : {}) }}
              />
              {codeMsg && (
                <div style={{ fontSize: 12, color: codeMsg.ok ? 'var(--gw-green-t)' : 'var(--gw-danger)', marginBottom: 8 }}>{codeMsg.text}</div>
              )}
              <button className="gwui-btn gwui-btn-primary"
                onClick={() => redeemCode.mutate()}
                disabled={!code.trim() || redeemCode.isPending}
                style={{ width: '100%' }}
              >
                {redeemCode.isPending ? 'Checking...' : 'Apply'}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
