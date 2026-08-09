import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { entryApi } from '@/api/entry'

/** The entry flow's own saved session - cleared once its ground exists. */
const ENTRY_SESSION_KEY = 'gw_entry_session'
import { useAuthStore } from '@/stores/auth'

/**
 * WHERE GOOGLE SENDS PEOPLE BACK TO.
 *
 * The server-side Google flow has been complete for a long time - strategy,
 * callback, find-or-create, and a one-time exchange code so the JWT never rides
 * in a URL - and no client route existed to catch the redirect. So the whole
 * thing was unreachable, and the friction it was built to remove stayed.
 *
 * This is the missing half. The server redirects here with `?code=`, this trades
 * it for a token, loads the profile, and drops the person where they were going.
 *
 * The code is single-use and expires in 60 seconds, which is why the exchange
 * must not run twice. React StrictMode double-invokes effects in development, so
 * the second call would redeem an already-deleted code and show a failure on a
 * sign-in that actually worked - hence the ref guard rather than relying on the
 * effect firing once.
 */
export function GoogleCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [error, setError] = useState<string | null>(null)
  const exchanged = useRef(false)

  const code = params.get('code')
  const isNewUser = params.get('new') === 'true'
  /**
   * Should we ask what their organisation is called?
   *
   * Only when the server made one for them. Someone who already had an account,
   * or who was invited to a ground and therefore belongs to the organisation
   * that invited them, is never asked - being handed a box asking you to name
   * your employer, when you have just been added to someone else's ground, would
   * be worse than the guess it replaces.
   */
  const shouldNameOrg = params.get('nameOrg') === 'true'
  const [askingOrgName, setAskingOrgName] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [savingOrg, setSavingOrg] = useState(false)

  useEffect(() => {
    if (exchanged.current) return
    exchanged.current = true

    if (!code) {
      setError('That sign-in link was incomplete. Please try again.')
      return
    }

    ;(async () => {
      try {
        const { accessToken } = await authApi.googleExchange(code)
        // The exchange returns a token only, so the profile is a second call.
        // The token has to be in the store first for the interceptor to send it.
        setAuth({} as any, accessToken)
        const user = await authApi.me()
        setAuth(user, accessToken)

        /**
         * A ground was already built before they signed in.
         *
         * In the entry flow the whole conversation happens first and signing up
         * is the LAST step, so someone choosing Google there has a finished
         * ground waiting in this browser. Google has verified their address, so
         * there is no emailed confirmation to wait for - it is created now.
         *
         * The org name is not asked for on this path even for a brand-new
         * account: the setup panel has its own field for it, and interrupting
         * someone between "sign in" and "here is your ground" to ask a question
         * they have already been offered would be the worst moment for it.
         */
        const pending = localStorage.getItem('gw_entry_pending_commit')
        if (pending) {
          localStorage.removeItem('gw_entry_pending_commit')
          try {
            const { payload, history } = JSON.parse(pending)
            const res = await entryApi.commit({ ...payload, history })
            localStorage.removeItem(ENTRY_SESSION_KEY)
            navigate(`/grounds/${res.groundId}`, { replace: true })
            return
          } catch {
            // The sign-in worked; only the ground did not. Send them to the
            // entry flow, where their session is still in storage, rather than
            // stranding them on a callback screen.
            navigate('/start', { replace: true })
            return
          }
        }

        if (shouldNameOrg) { setAskingOrgName(true); return }
        navigate(isNewUser ? '/start' : '/', { replace: true })
      } catch {
        // Deliberately vague: the failure modes here are an expired code, a
        // reused code, or a server that cannot reach Google, and none of them
        // are the person's fault or worth explaining on a sign-in screen.
        setError('That sign-in could not be completed. Please try again.')
      }
    })()
  }, [code, isNewUser, navigate, setAuth, shouldNameOrg])

  /**
   * OPTIONAL, and it has to look optional.
   *
   * A default is already in place, so skipping costs nothing and nobody is held
   * at a form on their way in. The point is only that the name on every page
   * their team sees was chosen rather than concatenated.
   */
  if (askingOrgName) {
    const save = async () => {
      const trimmed = orgName.trim()
      if (trimmed.length >= 2) {
        setSavingOrg(true)
        try { await authApi.renameOrganization(trimmed) } catch { /* the default stands */ }
      }
      navigate('/start', { replace: true })
    }
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>What should we call your workspace?</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 16 }}>
            This is the name your team sees. You can change it later.
          </div>
          <input
            autoFocus
            value={orgName}
            onChange={e => setOrgName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save() }}
            placeholder="Your team or company name"
            style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1px solid var(--gw-border)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 12 }}
          />
          <button className="gw-btn" disabled={savingOrg} onClick={save} style={{ width: '100%', marginBottom: 10 }}>
            {savingOrg ? 'Saving…' : 'Continue →'}
          </button>
          <button
            onClick={() => navigate('/start', { replace: true })}
            style={{ background: 'none', border: 'none', color: 'var(--gw-sub)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
          >
            Skip for now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <span className="gw-logo">Groundwork</span>
      </div>
      <div className="gw-bd" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '70vh', textAlign: 'center' }}>
        {error ? (
          <>
            <div className="gw-ttl" style={{ textAlign: 'center' }}>Sign-in did not complete</div>
            <div className="gw-sub-t" style={{ textAlign: 'center', maxWidth: 320, margin: '8px auto 18px' }}>{error}</div>
            <button
              onClick={() => navigate('/login', { replace: true })}
              style={{ fontSize: 13, fontWeight: 700, color: 'white', background: 'var(--gw-navy)', border: 'none', borderRadius: 7, padding: '10px 18px', cursor: 'pointer', fontFamily: 'inherit', margin: '0 auto' }}
            >
              Back to sign in
            </button>
          </>
        ) : (
          <div className="gw-sub-t" style={{ textAlign: 'center' }}>Signing you in…</div>
        )}
      </div>
    </div>
  )
}
