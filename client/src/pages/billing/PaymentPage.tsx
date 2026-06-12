import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { billingApi } from '@/api/billing'

export function PaymentPage() {
  const navigate = useNavigate()

  const checkout = useMutation({
    mutationFn: billingApi.createCareFeeCheckout,
    onSuccess: r => { window.location.href = r.url },
    onError: () => navigate('/billing'),
  })

  useEffect(() => { checkout.mutate() }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gw-bg)', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 14, color: 'var(--gw-sub)' }}>Redirecting to payment…</div>
    </div>
  )
}
