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

/**
 * How many wrong codes before the code in flight is destroyed.
 *
 * Five. A six-digit code is a million possibilities and nothing counted the attempts, so the only
 * thing in front of the back office was how fast guesses could be posted - by somebody who already
 * holds a session on a staff account, which is the case this second factor exists for. The code is
 * destroyed rather than the person locked out: asking again is one click and resets the count, so a
 * flood costs the attacker the code and costs the owner an email.
 */
export const GUESSES_ALLOWED = 5;

export interface DoorFacts {
  path: string;
  /** Whether this request is for the back office at all. Defaults to the path test when absent. */
  behindTheDoor?: boolean;
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

/**
 * THE PATH AS EXPRESS SEES IT. The match was case-sensitive and undecoded while Express matched
 * case-insensitively on the decoded path, so /ADMIN and /%61dmin routed to the back office and
 * walked past the door (B16, P2-007). Lower-cased and decoded before matching; and main.ts sets
 * case-sensitive routing so the two agree on the spelling as well.
 */
export function normalisePath(path: string): string {
  let decoded = path;
  try { decoded = decodeURIComponent(path); } catch { /* a malformed escape is left as it is */ }
  return decoded.toLowerCase();
}

export function isTheBackOffice(path: string): boolean {
  const p = normalisePath(path);
  return THE_BACK_OFFICE.test(p) && !THE_DOOR_ITSELF.test(p);
}

/**
 * THE DOOR IS IN FRONT OF A PRIVILEGE, NOT A PATH.
 *
 * `/ops` and `/admin` are where the back office mostly lives, and matching on that is how this
 * started. But the privilege is not confined to those prefixes: the platform-admin guard also sits
 * on routes under /billing, /prompts, /patterns, /coach and /feedback - platform statistics,
 * contributor codes, the prompt library, pattern accuracy, every piece of customer feedback. All of
 * them were reachable with a signed-in staff session and no code, because the door was looking at
 * the URL and the privilege was somewhere else.
 *
 * So the question the door asks is what the handler DEMANDS, not where it lives. Anything a staff
 * guard protects is behind the door, wherever somebody later decides to mount it. A new staff route
 * under a new prefix is covered on the day it is written, by the guard its author already had to
 * put on it.
 *
 * The path test stays as well: an /ops route that forgot its guard is still back office.
 */
export const A_STAFF_GUARD = ['PlatformAdminGuard', 'OpsCapabilityGuard'];

export function isAStaffGuard(name: string | null | undefined): boolean {
  return !!name && A_STAFF_GUARD.includes(name);
}

/** Is this request for the back office - by where it is, or by what it asks to be allowed to do? */
export function standsBehindTheDoor(path: string, guardNames: (string | null | undefined)[]): boolean {
  if (isTheBackOffice(path)) return true;
  /* The door's own routes are never behind it, whatever guards them: asking for a code is how you
     get through, and a door you need the code to knock on cannot be opened. */
  if (THE_DOOR_ITSELF.test(normalisePath(path))) return false;
  return guardNames.some(isAStaffGuard);
}

export function mayOpen(f: DoorFacts): DoorDecision {
  /* `behindTheDoor` is supplied when the caller has read the handler's guards; falling back to the
     path keeps every existing caller and every test honest. */
  const behind = f.behindTheDoor ?? isTheBackOffice(f.path);
  if (!behind) return { open: true, because: 'not-the-back-office' };
  if (!f.signedIn) return { open: true, because: 'nobody' };
  if (f.signedInVia === 'google') return { open: true, because: 'google' };
  if (f.passExpiresAt && f.passExpiresAt.getTime() > f.now.getTime()) return { open: true, because: 'pass' };
  return { open: false };
}

export const CODE_REQUIRED = 'BACK_OFFICE_CODE_REQUIRED';
