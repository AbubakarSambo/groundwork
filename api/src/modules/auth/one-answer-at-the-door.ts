/**
 * ONE ANSWER AT THE DOOR.
 *
 * The sign-in form gave five different answers, and four of them are facts about a stranger's
 * address:
 *
 *   "Invalid email or password"                              — no account, or a wrong password
 *   "Account is deactivated"                                 — registered
 *   "Please verify your email before logging in"             — registered, not yet verified
 *   "Your account uses Google Sign-In…"                      — registered, and which provider
 *   "We've emailed you a link to set your password…"         — registered, and has no password
 *
 * So anybody could type addresses into the form and learn which of them work here, who signs in
 * with Google, and which accounts have never set a password — that last one being the most useful
 * to somebody choosing a target. Found by probing the running product during the hundred-journey
 * audit: a wrong password on an existing account answered "we've emailed you a link", which both
 * confirms the account and answers a question nobody asked.
 *
 * The HELPFUL behaviour stays: a participant with no password really does get a setup link, and a
 * Google user really does get one too. What changes is that the answer on the screen is the same
 * sentence in every case, and the detail lives in the mail — which only the owner of the address
 * receives. That is the whole trick: say it where only they can read it.
 */

/**
 * The one sentence. True whichever branch produced it, and actionable in each: somebody with a
 * password reads "check it"; somebody without reads "we have emailed you a way in".
 */
export const THE_SAME_ANSWER_EITHER_WAY =
  'We have emailed you a sign-in link, if we know that address. Check your inbox. ' +
  'Did you use a password? Check it and try again.';

/** Recorded for us, so a support question is still answerable. Never sent to the caller. */
export type WhyTheyCouldNotSignIn =
  | 'no such account'
  | 'the password was wrong'
  | 'the account is deactivated'
  | 'the address is not verified'
  | 'they sign in with Google and have no password'
  | 'they have no password yet';
