import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const ENTRY_KEY = 'gw_entry_session'

function hasPendingEntry(): boolean {
  try {
    const raw = localStorage.getItem(ENTRY_KEY)
    if (!raw) return false
    const p = JSON.parse(raw)
    return !!(p?.history?.length)
  } catch { return false }
}

export function MagicVerifyPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setError('Invalid link — no token found.'); return }

    authApi.verifyEmail(token)
      .then(res => {
        setAuth(res.user, res.accessToken)
        const isNew = !res.user.jobTitle && res.user.role === 'ADMIN'
        const from = params.get('from')
        if (from && from.startsWith('/')) {
          navigate(from, { replace: true })
        } else if (hasPendingEntry()) {
          navigate('/grounds', { replace: true })
        } else {
          navigate(isNew ? '/setup' : '/grounds', { replace: true })
        }
      })
      .catch((err: any) => {
        const msg: string = err?.response?.data?.message ?? ''
        if (msg.toLowerCase().includes('expired')) {
          setError('This link has expired. Links are valid for 24 hours — please request a fresh one.')
        } else if (msg.toLowerCase().includes('used') || msg.toLowerCase().includes('already')) {
          setError('This link has already been used. Please request a new one to sign in again.')
        } else {
          setError('This link is not valid. It may have been replaced by a newer one — use the most recent link from your inbox.')
        }
      })
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--gw-bg)' }}>
      {!error ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--gw-navy)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 14, color: 'var(--gw-sub)' }}>Signing you in…</div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', maxWidth: 340, padding: '0 20px' }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Link invalid</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 20, lineHeight: 1.6 }}>{error}</div>
          <button className="gw-btn" style={{ display: 'inline-block', width: 'auto', padding: '10px 24px' }} onClick={() => navigate('/auth')}>
            Get a new link
          </button>
        </div>
      )}
    </div>
  )
}
