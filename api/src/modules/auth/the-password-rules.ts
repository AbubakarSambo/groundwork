/**
 * THE RULES A NEW PASSWORD HAS TO MEET. Hafsah's decision of 26 September: the prototype's rules.
 *
 *   At least 8 characters
 *   A number or a symbol
 *   Not your email address
 *
 * They apply when a password is chosen or changed (set-password, reset-password, sign-up with a
 * password), never to a password somebody already has: signing in only compares against the hash.
 * The first two are checked on the request (the DTOs use the pattern and messages below); the third
 * needs the account's or the sign-up's address, so the service checks it with `isTheirEmail`.
 *
 * The client says the same rules in the same words: client/src/pages/auth/password-rules.ts. The
 * messages here are what a person reads if the server refuses, so they are full sentences.
 *
 * Replaced: "at least 1 uppercase and 1 lowercase letter", the rule before Hafsah's decision.
 */
export const AT_LEAST = 8;
/** Any character that is not a letter: a digit, a symbol, punctuation or a space. */
export const A_NUMBER_OR_A_SYMBOL = /[^A-Za-z]/;

export const TOO_SHORT = 'Your password needs at least 8 characters.';
export const NO_NUMBER_OR_SYMBOL = 'Your password needs a number or a symbol.';
export const IS_THEIR_EMAIL = 'Your password cannot be your email address.';

export function isTheirEmail(password: string, email: string | null | undefined): boolean {
  if (!email) return false;
  return password.trim().toLowerCase() === email.trim().toLowerCase();
}
