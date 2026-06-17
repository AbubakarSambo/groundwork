import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { entryStorage, participantStorage } from '@/api/entry'
import { groundsApi } from '@/api/grounds'
import { participantsApi } from '@/api'

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
  const [resendEmail, setResendEmail] = useState(() =>
    sessionStorage.getItem('gw_magic_email') ||
    localStorage.getItem('gw_magic_email') ||
    params.get('email') ||
    ''
  )

  const resend = useMutation({
    mutationFn: () => authApi.entrySave(resendEmail.trim()),
    onSuccess: () => {
      const trimmed = resendEmail.trim()
      sessionStorage.setItem('gw_magic_type', 'entry')
      sessionStorage.setItem('gw_magic_email', trimmed)
      localStorage.setItem('gw_magic_email', trimmed)
      navigate(`/auth/sent?email=${encodeURIComponent(trimmed)}`, { replace: true })
    },
  })

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setError('Invalid link. No token found.'); return }

    authApi.verifyEmail(token)
      .then(async res => {
        setAuth(res.user, res.accessToken)

        // Track signin count for Step 6 password prompt
        const count = parseInt(localStorage.getItem(SIGNIN_COUNT_KEY) ?? '0', 10) + 1
        localStorage.setItem(SIGNIN_COUNT_KEY, String(count))

        // If there is a completed participant session, link account via accept()
        const participantSession = participantStorage.load()
        if (participantSession?.inviteToken) {
          try {
            const acceptRes = await participantsApi.accept(participantSession.inviteToken)
            setAuth(acceptRes.user, acceptRes.accessToken)
            const pGroundLabel = participantSession.groundLabel
            participantStorage.clear()
            if (acceptRes.checkInId) {
              navigate(`/checkin/${acceptRes.checkInId}`, { state: { sessionNumber: 1, groundLabel: pGroundLabel, groundId: acceptRes.groundId }, replace: true })
            } else {
              navigate(`/grounds/${acceptRes.groundId}/p`, { replace: true })
            }
            return
          } catch {
            participantStorage.clear()
          }
        }

        // If there is a completed entry session, create a ground from it
        const session = entryStorage.load()
        if (session?.completed) {
          try {
            const scenario = MODE_TO_SCENARIO[session.mode] ?? 'NEW_PROJECT'
            const lastAiMsg = [...session.messages].reverse().find(m => m.role === 'assistant')
            const summaryMatch = lastAiMsg?.content.match(/Here is what you have described:\s*(.+?)(?:\n\n|\n(?=[A-Z]))/s)
            const label = summaryMatch
              ? summaryMatch[1].replace(/\[.*?\]/g, '').trim().slice(0, 120) || session.firstMessage.slice(0, 80).trim() || 'New ground'
              : session.firstMessage.slice(0, 80).trim() || 'New ground'
            const ground = await groundsApi.create({
              label,
              scenario: scenario as any,
              moment: 'STARTING',
            })
            if (session.participantEmail) {
              await groundsApi.addParticipant(ground.id, {
                email: session.participantEmail,
                inviteToken: session.inviteToken,
                note: session.inviteNote,
              }).catch(() => {})
            }
            entryStorage.clear()
            localStorage.removeItem('gw_magic_email')
            // Second signin: offer password setup before ground
            if (count === 2) {
              navigate(`/welcome?next=${encodeURIComponent(`/grounds/${ground.id}?setup=1`)}`, { replace: true })
            } else {
              navigate(`/grounds/${ground.id}?setup=1`, { replace: true })
            }
            return
          } catch {
            // Don't clear entryStorage — session is preserved so the next sign-in retries ground creation
            navigate('/grounds', { replace: true })
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
        <div style={{ maxWidth: 360, width: '100%', padding: '0 20px' }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>Link expired</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 20, lineHeight: 1.6, textAlign: 'center' }}>
            This link has expired or has already been used. Enter your email and we will send a fresh one.
          </div>
          <input
            type="email"
            value={resendEmail}
            onChange={e => setResendEmail(e.target.value)}
            placeholder="your@email.com"
            style={{ width: '100%', padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', border: '1px solid var(--gw-border)', borderRadius: 7, background: 'white', color: 'var(--gw-text)', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
          />
          <button
            className="gw-btn"
            style={{ margin: 0 }}
            disabled={!resendEmail.trim() || resend.isPending}
            onClick={() => resend.mutate()}
          >
            {resend.isPending ? 'Sending…' : 'Send a new link'}
          </button>
          {resend.isError && (
            <div style={{ fontSize: 12, color: '#c0392b', marginTop: 8, textAlign: 'center' }}>Could not send. Try again.</div>
          )}
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <span onClick={() => navigate('/auth')} style={{ fontSize: 12, color: 'var(--gw-sub)', cursor: 'pointer', textDecoration: 'underline' }}>
              Sign in with a different email
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
