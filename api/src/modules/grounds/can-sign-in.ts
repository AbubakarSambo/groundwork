/**
 * DOES THIS PERSON HAVE ANY WAY INTO THE PRODUCT?
 *
 * Asked whenever we are about to email somebody a link and have to choose
 * between sending them to a page behind auth and sending them somewhere that can
 * let them in.
 *
 * It exists because the question that used to be asked was a different one:
 * whether the user row had just been created. Those come apart constantly. A row
 * can exist for somebody who has never signed in - added to a ground and never
 * accepted, invited to the organisation, or left behind by an earlier attempt
 * that failed after creating them. Every one of those people gets treated as
 * established, sent to a page behind auth, and shown a sign-in form asking for a
 * password they have never had.
 *
 * There is no way out of that screen either. "Forgot your password?" is wrong,
 * because they never had one. The only working escape is headed "New here?",
 * which they have no reason to read, being neither new nor aware that they are
 * stuck.
 *
 * So the test is what it should always have been: is there a credential.
 */
export interface SignInMeans {
  passwordHash?: string | null;
  googleId?: string | null;
}

export function canSignIn(user: SignInMeans | null | undefined): boolean {
  if (!user) return false;
  return !!user.passwordHash || !!user.googleId;
}
