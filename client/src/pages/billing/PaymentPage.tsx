import { useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi } from '@/api/billing'
import { toast } from 'sonner'

const PERIOD_OPTIONS = [
  { value: '1w', label: '1 week' },
  { value: '2w', label: '2 weeks' },
  { value: '1m', label: '1 month' },
  { value: '3m', label: '3 months' },
  { value: '6m', label: '6 months' },
]

export function PaymentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const qc = useQueryClient()

  const groundId: string | undefined =
    (location.state as any)?.groundId ?? params.get('groundId') ?? undefined
  const groundName: string | undefined =
    (location.state as any)?.groundName ?? params.get('groundName') ?? undefined

  const [count, setCount] = useState(1)
  const [period, setPeriod] = useState('1m')
  const [showCode, setShowCode] = useState(false)
  const [code, setCode] = useState('')
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const total = count * 5

  const checkout = useMutation({
    mutationFn: () => {
      if (!groundId) {
        toast.error('Ground not found. Return to your ground and try again.')
        return Promise.reject(new Error('groundId missing'))
      }
      return billingApi.purchaseSession(groundId)
    },
    onSuccess: r => {
      if (r.checkoutUrl) window.location.href = r.checkoutUrl
    },
    onError: (err: any) => {
      if (err?.message !== 'groundId missing') toast.error('Could not start checkout.')
    },
  })

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

        <div style={{ fontSize: 22, fontWeight: 800, color: '#0A1628', marginBottom: 4 }}>Add sessions to this ground</div>
        {groundName && (
          <div style={{ fontSize: 13, color: '#6B6560', marginBottom: 20 }}>{groundName}</div>
        )}
        {!groundName && <div style={{ marginBottom: 20 }} />}

        {/* Session calculator */}
        <div style={{ background: 'white', border: '0.5px solid #E2E0DB', borderRadius: 10, padding: 18, marginBottom: 14 }}>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B6560', marginBottom: 6 }}>
              How many sessions?
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={e => setCount(Math.min(20, Math.max(1, Number(e.target.value))))}
              style={{ width: '100%', padding: '9px 11px', fontSize: 13, fontFamily: 'inherit', border: '1px solid #E2E0DB', borderRadius: 7, background: '#F5F3EF', color: '#0A1628', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B6560', marginBottom: 6 }}>
              Over what period?
            </label>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              style={{ width: '100%', padding: '9px 11px', fontSize: 13, fontFamily: 'inherit', border: '1px solid #E2E0DB', borderRadius: 7, background: '#F5F3EF', color: '#0A1628', outline: 'none', boxSizing: 'border-box' }}
            >
              {PERIOD_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: 13, color: '#4A4540', lineHeight: 1.6, marginBottom: 16 }}>
            That is {count} session{count !== 1 ? 's' : ''} at $5 each. Total: ${total}.
          </div>

          <button
            onClick={() => checkout.mutate()}
            disabled={checkout.isPending}
            style={{ width: '100%', padding: '11px', borderRadius: 7, background: '#0A1628', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: checkout.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: checkout.isPending ? 0.7 : 1 }}
          >
            {checkout.isPending ? 'Redirecting...' : `Buy ${count} session${count !== 1 ? 's' : ''} for $${total}`}
          </button>
        </div>

        {/* Contributor code collapsible */}
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
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1916', marginBottom: 10 }}>Have a contributor code?</div>
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
