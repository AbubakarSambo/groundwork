import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { MARKETING_URL } from '@/lib/marketing'
import { Button, Stack } from '@/components/gw/ui'
import { AuthCard } from './auth-kit'

/**
 * "YOU'RE SIGNED OUT" (A2, #/signout).
 *
 * Every way of signing out ends here: the Sign out in the sidebar's menu, in "More" on a phone, in
 * Settings, on the organisation setup page and in the back office, and the Sign out link in the
 * marketing site's header (a static page cannot call the store, only follow a link, which is why this
 * address exists at all. W15-2).
 *
 * It clears the session as it opens, so arriving here IS signing out, whichever door you came
 * through. It used to go straight on to the marketing site, and the other doors went to `/` or
 * `/auth`; so being signed out looked different depending on where you pressed it, and on the
 * marketing site it did not look like anything had happened at all.
 *
 * The words are the prototype's (docs/prototype/screens/A2-accounts-and-signing-in/signout.txt),
 * without its second sentence, "Anything you'd started is saved." Signing out clears the drafts this
 * browser was keeping (lib/what-signing-out-takes-with-it.ts), so that is not yet a promise this page
 * can make. It waits for Hafsah.
 *
 * ITS FIRST SENTENCE, NOT A DIFFERENT CLAIM (real-user walk, Kijani Foods, fault 8c). This used to
 * say "You are still signed in on your other devices." instead - true, but not what the prototype
 * says here, and a different fact ("other devices" rather than "this device"). "On this device."
 * is both the prototype's own wording and accurate: signing out here clears this browser only.
 */
export function SignOutPage() {
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    /** `logout` clears the token, the store, and the shared signed-in flag. Harmless if already done. */
    logout()
  }, [logout])

  return (
    /* True: signing out clears this browser only. There is no sign-out on the server, and a
       session on another device lasts until it ends there, or until a password reset raises the
       account's token epoch. */
    <AuthCard title="You’re signed out" sub="On this device.">
      <Stack gap={10}>
        <Button wide to="/auth">Sign in again</Button>
        <a href={MARKETING_URL} className="btn quiet wide">Go to the home page</a>
      </Stack>
    </AuthCard>
  )
}
