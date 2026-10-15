import { Button, Stack } from '@/components/gw/ui'
import { AuthCard } from './auth-kit'

/**
 * "YOUR EMAIL IS CONFIRMED" (A2, #/verify-email), after a link has just created the account.
 *
 * The prototype (verify-email.txt) reads "wairimu@baridi.co.ke. You’ll get sign-in links and reports
 * here.", an address and a sentence joined by a full stop. It is one sentence here (U.2 review):
 * "We’ll send sign-in links and reports to wairimu@baridi.co.ke." The address comes from the account
 * the server has just signed in (`user.email` on the verify response); without it, "to this address".
 */
export function EmailConfirmed({ email, onContinue }: { email: string | null; onContinue: () => void }) {
  return (
    <AuthCard
      title="Your email is confirmed"
      sub={email
        ? <>We’ll send sign-in links and reports to <strong>{email}</strong>.</>
        : 'We’ll send sign-in links and reports to this address.'}
    >
      <Stack gap={10}>
        <Button wide size="big" onClick={onContinue}>Continue</Button>
      </Stack>
    </AuthCard>
  )
}
