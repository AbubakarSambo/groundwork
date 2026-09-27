/**
 * HOW LONG A LINK LASTS, AND WHAT TO SAY WHEN IT DOES NOT.
 *
 * Password-setup links have three different lifetimes in this service — one hour, seventy-two
 * hours, seven days — and the audit read that as four accidental windows. It is not: each has a
 * reason (one is handed straight to the screen and never emailed; one rides a team invitation that
 * somebody may open next week). What was genuinely missing is that NOTHING SAID WHICH ONE YOU GOT,
 * so a person holding a dead link could not tell whether they were an hour or a week late, and the
 * expiry sentence was the same either way.
 *
 * So the windows are named by PURPOSE rather than by database type — the type cannot tell a
 * setup link that was emailed from one that was not — and the sentence is derived from the window
 * instead of written out beside it.
 */
import { TokenType } from '@prisma/client';

const HOUR = 60 * 60 * 1000;

export type Purpose =
  | 'verify an address'
  | 'set a password from an email'
  | 'set a password from a team invitation'
  | 'set a password on the screen you are already on'
  | 'reset a password'
  | 'sign in from a team invitation'
  | 'join a check-in'
  | 'choose where you work after Google';

export const HOW_LONG: Record<Purpose, number> = {
  'verify an address': 24 * HOUR,
  'set a password from an email': 72 * HOUR,
  /* Longer on purpose: a team invitation is opened when somebody gets round to it. */
  'set a password from a team invitation': 7 * 24 * HOUR,
  /* Shorter on purpose: never emailed, handed straight to the screen in front of them. */
  'set a password on the screen you are already on': 1 * HOUR,
  'reset a password': 1 * HOUR,
  /* A magic sign-in link riding a team invitation, so it keeps the invitation's own week. */
  'sign in from a team invitation': 7 * 24 * HOUR,
  'join a check-in': 14 * 24 * HOUR,
  /* Short on purpose: handed straight back to the browser that has just come from Google (U.3 review). */
  'choose where you work after Google': 1 * HOUR,
};

export const WHICH_TYPE: Record<Purpose, TokenType> = {
  'verify an address': TokenType.EMAIL_VERIFICATION,
  'set a password from an email': TokenType.PASSWORD_SETUP,
  'set a password from a team invitation': TokenType.PASSWORD_SETUP,
  'set a password on the screen you are already on': TokenType.PASSWORD_SETUP,
  'reset a password': TokenType.PASSWORD_RESET,
  'sign in from a team invitation': TokenType.EMAIL_VERIFICATION,
  'join a check-in': TokenType.PARTICIPANT_INVITE,
  'choose where you work after Google': TokenType.EMAIL_VERIFICATION,
};

export function expiresAtFor(purpose: Purpose, now: Date = new Date()): Date {
  return new Date(now.getTime() + HOW_LONG[purpose]);
}

/** "24 hours", "3 days", "an hour" — for a sentence somebody reads, not a log. */
export function howLongInWords(purpose: Purpose): string {
  const ms = HOW_LONG[purpose];
  const hours = Math.round(ms / HOUR);
  if (hours === 1) return 'an hour';
  if (hours < 48) return `${hours} hours`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'a day' : `${days} days`;
}

/**
 * WHAT A DEAD LINK SHOULD SAY, which depends on what the link was for.
 *
 * The used-link message asserted "so your password is set" for every type. Told to somebody who
 * arrived by a verification link and has no password, that is both wrong and a dead end: they go
 * looking for a password they never chose. And `usedAt` was tested before `expiresAt`, so a link
 * that was both used and expired always reported the used message — right for a password that
 * really is set, misleading for anything else.
 */
export function whatToSayAboutADeadLink(input: {
  type: TokenType;
  used: boolean;
  expired: boolean;
}): string {
  const { type, used, expired } = input;

  if (used && type === TokenType.PASSWORD_SETUP) {
    return 'This link has already been used, so your password is set. Sign in with it, or use "Forgot password?" if you cannot remember it.';
  }
  if (used && type === TokenType.PASSWORD_RESET) {
    return 'This link has already been used and your password was changed. Sign in with the new one, or ask for another reset.';
  }
  if (used && type === TokenType.EMAIL_VERIFICATION) {
    return 'This link has already been used, so your address is confirmed. Sign in from the sign-in page.';
  }
  if (used) {
    return 'This link has already been used. Sign in from the sign-in page, or ask for a new link.';
  }
  if (expired) {
    return 'This link has expired. Ask for a new one from the sign-in page. The new one arrives in a moment, and nothing you have done is lost.';
  }
  return 'This link did not work. Each link works only once, and only for a short while. Open the newest one in your inbox, or ask for a new one from the sign-in page.';
}
