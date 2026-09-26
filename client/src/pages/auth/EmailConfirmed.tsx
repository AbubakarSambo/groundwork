import { Button } from '@/components/gw/kit'
import { AuthCard } from './auth-kit'

/**
 * "YOUR EMAIL IS CONFIRMED" (A2, #/verify-email), after a link has just created the account.
 *
 * The words are the prototype's (docs/prototype/screens/A2-accounts-and-signing-in/verify-email.txt):
 * "wairimu@baridi.co.ke. You’ll get sign-in links and reports here." The address comes from the
 * account the server has just signed in (`user.email` on the verify response). If it is not there,
 * the sentence starts at "You’ll get", rather than guessing.
 */
export function EmailConfirmed({ email, onContinue }: { email: string | null; onContinue: () => void }) {
  return (
    <AuthCard
      title="Your email is confirmed"
      sub={email
        ? <><strong>{email}</strong>. You’ll get sign-in links and reports here.</>
        : 'You’ll get sign-in links and reports here.'}
    >
      <div className="gw-auth-actions">
        <Button wide size="big" onClick={onContinue}>Continue</Button>
      </div>
    </AuthCard>
  )
}
