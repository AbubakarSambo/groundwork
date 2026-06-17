import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi } from '@/api/billing'
import { toast } from 'sonner'

export function PaymentPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')

  const checkout = useMutation({
    mutationFn: billingApi.createCareFeeCheckout,
    onSuccess: r => { window.location.href = r.url },
    onError: () => { toast.error('Could not start checkout.'); navigate('/billing') },
  })

  const applyCode = useMutation({
    mutationFn: () => billingApi.applyContributorCode(code.trim().toUpperCase()),
    onSuccess: r => {
      if (r.applied) {
        qc.invalidateQueries({ queryKey: ['billing'] })
        toast.success('Contributor code applied. You are all set.')
        navigate('/grounds')
      } else {
        setCodeError('That code is not recognised. Check it and try again.')
      }
    },
    onError: () => setCodeError('Something went wrong. Try again.'),
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--gw-bg)', padding: '0 20px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Header */}
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 6 }}>Activate billing</div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 28 }}>
          Sessions 1–5 are free. From session 6, the platform costs $20/month per org plus $50/person/month per active ground. You can activate billing now or use a contributor code if you have one.
        </div>

        {/* Contributor code */}
        <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--gw-text)' }}>Contributor code</div>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 12, lineHeight: 1.5 }}>
            If you are evaluating the platform and have a contributor code, enter it here to continue without payment.
          </div>
          <input
            type="text"
            value={code}
            onChange={e => { setCode(e.target.value); setCodeError('') }}
            placeholder="Enter your code"
            style={{ width: '100%', padding: '9px 11px', fontSize: 13, fontFamily: 'inherit', border: `1px solid ${codeError ? '#c0392b' : 'var(--gw-border)'}`, borderRadius: 7, background: 'var(--gw-bg)', color: 'var(--gw-text)', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
          />
          {codeError && <div style={{ fontSize: 11.5, color: '#c0392b', marginBottom: 8 }}>{codeError}</div>}
          <button
            onClick={() => applyCode.mutate()}
            disabled={!code.trim() || applyCode.isPending}
            style={{ width: '100%', padding: '9px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: !code.trim() ? 'not-allowed' : 'pointer', opacity: !code.trim() ? 0.45 : 1, fontFamily: 'inherit' }}
          >
            {applyCode.isPending ? 'Checking…' : 'Apply code'}
          </button>
        </div>

        {/* Payment */}
        <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--gw-text)' }}>Activate with payment</div>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, marginBottom: 12 }}>
            $20/month base. Per-person fees apply from session 6.
          </div>
          <button
            onClick={() => checkout.mutate()}
            disabled={checkout.isPending}
            style={{ width: '100%', padding: '9px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {checkout.isPending ? 'Redirecting…' : 'Continue to payment →'}
          </button>
        </div>

        <button
          onClick={() => navigate('/billing')}
          style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--gw-muted)', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
        >
          ← Back to billing
        </button>
      </div>
    </div>
  )
}
