import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { entryApi } from '@/api/entry'
import { useAuthStore } from '@/stores/auth'

const COMMIT_KEY = 'gw_commit_payload'

function loadCommitPayload(): any | null {
  try {
    const raw = localStorage.getItem(COMMIT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function MagicVerifyPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [error, setError] = useState('')
  const [nextGroundId, setNextGroundId] = useState<string | null>(null)

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setError('Invalid link — no token found.'); return }

    authApi.verifyEmail(token)
      .then(async res => {
        setAuth(res.user, res.accessToken)
        const from = params.get('from')
        if (from && from.startsWith('/')) {
          navigate(from, { replace: true })
          return
        }
        const payload = loadCommitPayload()
        if (payload?.history?.length) {
          try {
            const { groundId } = await entryApi.commit(payload)
            localStorage.removeItem(COMMIT_KEY)
            localStorage.removeItem('gw_entry_session')
            setNextGroundId(groundId)
          } catch {
            // Commit failed — send them to grounds list, the ground wasn't created
            navigate('/grounds', { replace: true })
          }
        } else {
          const isNew = !res.user.jobTitle && res.user.role === 'ADMIN'
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

  if (nextGroundId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--gw-bg)', padding: '0 20px' }}>
        <div style={{ maxWidth: 380, width: '100%' }}>
          <div style={{ background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 12, padding: '20px 22px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#085041', marginBottom: 4 }}>Your ground is set up.</div>
            <div style={{ fontSize: 13, color: '#3A7A60', lineHeight: 1.6 }}>Your session is on record and your account is live.</div>
          </div>
          <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 12, padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-sub)', marginBottom: 14 }}>What happens next</div>
            {[
              { n: '1', title: 'Contributors get their invite', body: 'Anyone you added will receive an email with a private link. They check in independently — they never see your account.' },
              { n: '2', title: 'Their account comes in', body: 'Once they submit, Groundwork builds a picture across accounts. Nobody reads anyone else\'s words directly. The report shows where accounts agree and where they differ.' },
              { n: '3', title: 'You release the report', body: 'When you are ready, you release the report to both parties at the same time. Neither sees it before the other.' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--gw-navy)', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{s.n}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>{s.body}</div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate(`/grounds/${nextGroundId}`, { replace: true })}
            style={{ width: '100%', padding: '13px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Go to your ground →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--gw-bg)' }}>
      {!error ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--gw-navy)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 14, color: 'var(--gw-sub)' }}>Setting up your ground…</div>
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
