import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { API_ORIGIN } from '@/lib/where-the-api-lives'
import { Button, Stack } from '@/components/gw/ui'
import { AuthCard } from './auth-kit'

/**
 * "GOOGLE SIGN-IN DIDN'T FINISH" (A2, #/google-failed).
 *
 * There were two versions of this, both thin. The API's failure redirect landed on `/auth` with an
 * amber line under the password form, and a failed code exchange left GoogleCallbackPage showing
 * "Sign-in did not complete" with one button back. Both come here now: the callback page navigates
 * here, and `/auth?why=google-signin-failed` (where the API still sends people) redirects here.
 *
 * The heading is the prototype's (docs/prototype/screens/A2-accounts-and-signing-in/google-failed.txt).
 * The sentence under it is in full sentences (Hafsah, 26 September): the prototype's "It usually works
 * on a second try; or use an email link instead." joined two pieces with a semicolon. And one of its
 * sentences is left out. The prototype opens with "Nothing was created or changed." That is not always
 * true here: a first Google sign-in makes the account and its organisation before the last step, and
 * an existing account is linked to Google before its checks run, so a failure after either has
 * created or changed something. A line we cannot stand behind is left out until it is true.
 *
 * "Try Google again" is offered only while the server says Google is set up. Otherwise the button
 * would send somebody to Google's own error page.
 */
export function GoogleFailedPage() {
  const { data: methods } = useQuery({
    queryKey: ['auth-methods'],
    queryFn: authApi.methods,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })

  return (
    <AuthCard
      title="Google sign-in didn’t finish"
      sub="Google did not finish signing you in. It usually works if you try again. You can also sign in with an email link instead."
    >
      <Stack gap={10}>
        {methods?.google && (
          <Button wide onClick={() => { window.location.href = `${API_ORIGIN}/api/v1/auth/google` }}>
            Try Google again
          </Button>
        )}
        <Button kind={methods?.google ? 'quiet' : 'primary'} wide to="/auth?mode=member">
          Email me a sign-in link
        </Button>
      </Stack>
    </AuthCard>
  )
}
