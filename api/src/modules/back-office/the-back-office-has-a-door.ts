/**
 * THE BACK OFFICE HAS A DOOR, AND SIGNING IN IS NOT IT.
 *
 * Signing in opens the product. Opening the team's own system (/ops) or the platform console
 * (/admin) also needs a code sent to the signed-in address, and the code holds for a week. A session
 * that came from Google sign-in walks through: Google already asked the second question. The panel
 * embedded in the back office sits behind the same door because it is on the same pages.
 *
 * Pure: the facts come in, the decision comes out. Where the facts come from is the guard's business.
 */

export const A_WEEK_MS = 7 * 24 * 3600_000;
export const CODE_LIFETIME_MS = 10 * 60_000;

export interface DoorFacts {
  path: string;
  /** Nobody signed in: a public route, and not this door's business. */
  signedIn: boolean;
  signedInVia?: string | null;
  passExpiresAt?: Date | null;
  now: Date;
}

export type DoorDecision = { open: true; because: 'not-the-back-office' | 'nobody' | 'google' | 'pass' } | { open: false };

/** The routes the door lets through so somebody can ask for and enter the code. */
const THE_DOOR_ITSELF = /^\/api\/v1\/back-office\/door(\/|$|\?)/;
const THE_BACK_OFFICE = /^\/api\/v1\/(ops|admin)(\/|$|\?)/;

export function isTheBackOffice(path: string): boolean {
  return THE_BACK_OFFICE.test(path) && !THE_DOOR_ITSELF.test(path);
}

export function mayOpen(f: DoorFacts): DoorDecision {
  if (!isTheBackOffice(f.path)) return { open: true, because: 'not-the-back-office' };
  if (!f.signedIn) return { open: true, because: 'nobody' };
  if (f.signedInVia === 'google') return { open: true, because: 'google' };
  if (f.passExpiresAt && f.passExpiresAt.getTime() > f.now.getTime()) return { open: true, because: 'pass' };
  return { open: false };
}

export const CODE_REQUIRED = 'BACK_OFFICE_CODE_REQUIRED';
