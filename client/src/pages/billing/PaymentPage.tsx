import { useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { billingApi } from '@/api/billing'
import { groundsApi } from '@/api/grounds'

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
    <div style={{ minHeight: '100vh', background: '#F5F3EF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        <div style={{ fontSize: 11, color: '#9B9590', marginBottom: 20, cursor: 'pointer' }} onClick={() => navigate(-1)}>
          Back
        </div>

        <div style={{ fontSize: 22, fontWeight: 800, color: '#0A1628', marginBottom: 4 }}>
          {ground?.isFreeGround ? 'This ground' : 'Add sessions to this ground'}
        </div>
        {groundName && (
          <div style={{ fontSize: 13, color: '#6B6560', marginBottom: 20 }}>{groundName}</div>
        )}
        {!groundName && <div style={{ marginBottom: 20 }} />}

        {groundLoading ? (
          <div style={{ fontSize: 13, color: '#9B9590', padding: '20px 0' }}>Loading...</div>
        ) : ground?.isFreeGround ? (
          <div style={{ background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 13, color: '#085041', lineHeight: 1.6 }}>
              <strong>This ground has unlimited free sessions.</strong> There is nothing to purchase here - just continue from the ground page.
            </div>
          </div>
        ) : (
          <>
            {/* The session-purchase form is gone: sessions are not sold.
                A free ground has unlimited sessions and a subscription has
                unlimited sessions, so there was never a quantity to buy. What
                is left on this page is contributor-code redemption, which
                grants access and costs nobody anything. */}
            <div style={{ background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: '#085041', lineHeight: 1.6 }}>
                <strong>Sessions are not charged for.</strong> Every ground on the free tier runs
                unlimited sessions and reports; a subscription lifts the ten-ground cap.
              </div>
            </div>
          </>
        )}

        {/* Contributor code */}
        <div style={{ background: 'white', border: '0.5px solid #E2E0DB', borderRadius: 10, padding: 18, marginBottom: 16 }}>
          {!showCode ? (
            <button
              onClick={() => setShowCode(true)}
              style={{ background: 'none', border: 'none', fontSize: 12, color: '#9B9590', cursor: 'pointer', fontFamily: 'inherit', padding: 0, textDecoration: 'underline' }}
            >
              Have a contributor code?
            </button>
          ) : (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1916', marginBottom: 10 }}>Contributor code</div>
              <input
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value); setCodeMsg(null) }}
                placeholder="Enter code"
                style={{ width: '100%', padding: '9px 11px', fontSize: 13, fontFamily: 'inherit', border: `1px solid ${codeMsg && !codeMsg.ok ? '#c0392b' : '#E2E0DB'}`, borderRadius: 7, background: '#F5F3EF', color: '#0A1628', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
              />
              {codeMsg && (
                <div style={{ fontSize: 12, color: codeMsg.ok ? '#085041' : '#c0392b', marginBottom: 8 }}>{codeMsg.text}</div>
              )}
              <button
                onClick={() => redeemCode.mutate()}
                disabled={!code.trim() || redeemCode.isPending}
                style={{ width: '100%', padding: '9px', borderRadius: 7, background: '#0C447C', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: !code.trim() ? 'not-allowed' : 'pointer', opacity: !code.trim() ? 0.45 : 1, fontFamily: 'inherit' }}
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
