import { toast } from 'sonner'
import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { entryApi } from '@/api/entry'

import { loadEntryHandover, clearEntryHandover } from './entry-handover'
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
  /* Where they were going before Google, handed back by the server (U.3 review). Only a path in this app. */
  const rawNext = params.get('next')
  const goingTo = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\') ? rawNext : null

  useEffect(() => {
    if (exchanged.current) return
    exchanged.current = true

    if (!code) {
      navigate('/google-failed', { replace: true })
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
        const pending = loadEntryHandover()
        if (pending) {
          try {
            const res = await entryApi.commit(pending)
            /**
             * Cleared HERE and nowhere earlier. This used to run before the commit, so a request
             * that failed took the person's whole setup with it - the ground that went missing
             * after sign-in was deleted by the code meant to be saving it. W14-11.
             */
            clearEntryHandover()
            navigate(`/grounds/${res.groundId}`, { replace: true })
            return
          } catch {
            // The sign-in worked; only the ground did not. Everything is still in storage, so the
            // entry flow can pick up exactly where it was rather than stranding them here.
            toast.error('You are signed in, but your check-in did not save. Everything you wrote is still here.')
            navigate('/start', { replace: true })
            return
          }
        }

        /* The organisation the server just made is named on "Create an organisation" (A3, U.3). */
        if (shouldNameOrg) { navigate('/org-new?naming=1', { replace: true }); return }
        if (goingTo) { navigate(goingTo, { replace: true }); return }
        navigate(isNewUser ? '/start' : '/', { replace: true })
      } catch {
        // Deliberately vague: the failure modes here are an expired code, a
        // reused code, or a server that cannot reach Google, and none of them
        // are the person's fault or worth explaining on a sign-in screen.
        // One page says so for every way Google can fail (A2, #/google-failed).
        navigate('/google-failed', { replace: true })
      }
    })()
  }, [code, isNewUser, navigate, setAuth, shouldNameOrg, goingTo])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-page)' }}>
      <div className="gw-hdr">
        <span className="gw-logo">Groundwork</span>
      </div>
      <div className="gw-bd" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '70vh', textAlign: 'center' }}>
        <div className="gw-sub-t" style={{ textAlign: 'center' }}>Signing you in…</div>
      </div>
    </div>
  )
}
