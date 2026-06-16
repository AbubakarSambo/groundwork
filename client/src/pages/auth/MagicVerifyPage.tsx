import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { entryStorage } from '@/api/entry'
import { groundsApi } from '@/api/grounds'

const MODE_TO_SCENARIO: Record<string, string> = {
  something_new: 'NEW_PROJECT',
  look_back: 'DRIFT',
  look_forward: 'CONTRACT_RENEWAL',
  both: 'NEW_PROJECT',
}

const SIGNIN_COUNT_KEY = 'gw-signin-count'

export function MagicVerifyPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setError('Invalid link. No token found.'); return }

    authApi.verifyEmail(token)
      .then(async res => {
        setAuth(res.user, res.accessToken)

        // Track signin count for Step 6 password prompt
        const count = parseInt(localStorage.getItem(SIGNIN_COUNT_KEY) ?? '0', 10) + 1
        localStorage.setItem(SIGNIN_COUNT_KEY, String(count))

        // If there is a completed entry session, create a ground from it
        const session = entryStorage.load()
        if (session?.completed) {
          try {
            const scenario = MODE_TO_SCENARIO[session.mode] ?? 'NEW_PROJECT'
            const label = session.firstMessage.slice(0, 60).trim() || 'New ground'
            const ground = await groundsApi.create({
              label,
              scenario: scenario as any,
              moment: 'STARTING',
            })
            if (session.participantEmail) {
              await groundsApi.addParticipant(ground.id, { email: session.participantEmail }).catch(() => {})
            }
            entryStorage.clear()
            // Second signin: offer password setup before ground
            if (count === 2) {
              navigate(`/welcome?next=${encodeURIComponent(`/grounds/${ground.id}?setup=1`)}`, { replace: true })
            } else {
              navigate(`/grounds/${ground.id}?setup=1`, { replace: true })
            }
            return
          } catch {
            entryStorage.clear()
          }
        }

        // Second signin (no entry session): offer password setup
        if (count === 2) {
          navigate('/welcome?next=%2Fgrounds', { replace: true })
          return
        }

        navigate('/grounds', { replace: true })
      })
      .catch(() => setError('This link has expired or is invalid. Please request a new one.'))
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
