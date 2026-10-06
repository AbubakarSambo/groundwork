import { theFirstNameOfAParticipant } from '../reports/a-title-is-not-a-first-name';

/**
 * A NAME TO CALL SOMEBODY BY, NEVER AN EMPTY ONE (decision 109 review; existing-users check, section 15).
 *
 * 26 of 364 "has not started" subjects read ` has not started "...", and Groundwork has reminded them`, because an account with a blank first name was
 * written as an empty string. The name is the first name; where there is none, the rest of the name they gave; then the name they were given on the
 * check-in; then the start of their email address; and, last, "Someone". "Someone" is a name for the verb too: it is one person, so it takes "has".
 */
export interface SomebodyOnACheckIn {
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
  nameGiven?: string | null;
  email?: string | null;
}

export const SOMEONE = 'Someone';

const fromAnAddress = (email: string | null | undefined): string | null => {
  const local = (email ?? '').split('@')[0]?.replace(/[._+-]+/g, ' ').replace(/\d+/g, '').trim();
  if (!local || local.length < 2) return null;
  return local.split(/\s+/).map((w) => `${w.charAt(0).toUpperCase()}${w.slice(1)}`).join(' ');
};

export function nameToCall(p: SomebodyOnACheckIn | null | undefined): string {
  /* A first name they typed, with a title never taken for it. */
  if ((p?.user?.firstName ?? '').trim()) {
    const first = theFirstNameOfAParticipant(p as any);
    if (first && first.trim()) return first.trim();
  }
  /* No first name: the name they were given on the check-in, whole, then the rest of the name on their account, then their address. */
  const given = (p?.nameGiven ?? '').trim();
  if (given) return given;
  const rest = [p?.user?.firstName, p?.user?.lastName].filter((x) => (x ?? '').trim()).join(' ').trim();
  if (rest) return rest;
  return fromAnAddress(p?.user?.email ?? p?.email) ?? SOMEONE;
}
