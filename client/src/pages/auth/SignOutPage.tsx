import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { MARKETING_URL } from '@/lib/marketing'

/**
 * A REAL ADDRESS FOR SIGNING OUT, because the marketing site needs one it can link to. W15-2.
 *
 * Signing out existed only as a button inside the app shell, which is fine until the header on the
 * static marketing site has to offer it. A link cannot call a store, so there has to be a URL that
 * means "end my session", and this is it.
 *
 * It clears and leaves. No confirmation step: somebody who navigated to this address has already
 * decided, and a page asking "are you sure you want to sign out?" is the kind of politeness that
 * only ever costs a second click.
 *
 * Lands on the marketing site rather than the sign-in form, because arriving at a password box
 * immediately after signing out reads as the sign-out having failed.
 */
export function SignOutPage() {
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    /** `logout` clears the token, the store, and the shared signed-in flag. */
    logout()
    window.location.replace(MARKETING_URL)
  }, [logout])

  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ fontSize: 13.5, color: 'var(--gw-sub)' }}>Signing you out...</div>
    </div>
  )
}
