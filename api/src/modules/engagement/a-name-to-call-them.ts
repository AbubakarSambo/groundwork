import { theFirstNameOfAParticipant } from '../reports/a-title-is-not-a-first-name';

/**
 * A NAME TO CALL SOMEBODY BY, NEVER AN EMPTY ONE, AND NEVER AN EMAIL ADDRESS (decision 109 review; existing-users check, section 15).
 *
 * 26 of 364 "has not started" subjects read ` has not started "...", and Groundwork has reminded them`, because an account with a blank first name was
 * written as an empty string. The name is the first name; where there is none, the name they were given on the check-in; then the rest of the name on
 * their account; and, last, "Someone". "Someone" is a name for the verb too: it is one person, so it takes "has".
 *
 * AN EMAIL IS NEVER SHOWN IN PLACE OF A NAME (Hafsah, 6 October). Not the whole address and not the start of it: "amina.otieno" read as "Amina Otieno",
 * but "info@", "sales@" and an open link's placeholder ("open-2a3aa45daca8@unclaimed.invalid") read as names nobody has. So the address is never used.
 * Where a list of names is followed by a count of the rest, "Someone" is not listed but counted (aNameToList).
 */
export interface SomebodyOnACheckIn {
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
  nameGiven?: string | null;
  email?: string | null;
}

export const SOMEONE = 'Someone';

/* A name field that holds an address is not a name either. */
const aName = (t: string | null | undefined): string => {
  const s = (t ?? '').trim();
  return s && !s.includes('@') ? s : '';
};

export function nameToCall(p: SomebodyOnACheckIn | null | undefined): string {
  /* A first name they typed, with a title never taken for it. */
  if (aName(p?.user?.firstName)) {
    const first = theFirstNameOfAParticipant(p as any);
    if (aName(first)) return aName(first);
  }
  /* No first name: the name they were given on the check-in, whole, then the rest of the name on their account. */
  const given = aName(p?.nameGiven);
  if (given) return given;
  const rest = [p?.user?.firstName, p?.user?.lastName].map(aName).filter(Boolean).join(' ').trim();
  if (rest) return rest;
  return SOMEONE;
}

/** For a list of names that is followed by a count of the rest: "Someone" is not a name to list, so that person is counted with the others. */
export const aNameToList = (n: string): boolean => !!n && n !== SOMEONE;

/**
 * Names for a sentence, with everybody called "Someone" counted instead of listed: ["Amina", "Someone", "Someone"] reads ["Amina", "two others"],
 * ["Someone", "Someone"] reads ["two people"], and one alone stays "Someone". The verb follows how many people there are, not how many words.
 */
export function namesWithTheRestCounted(names: string[], inWords: (n: number) => string): string[] {
  const named = names.filter(aNameToList);
  const k = names.length - named.length;
  if (k <= 0) return named;
  if (!named.length) return [k === 1 ? SOMEONE : `${inWords(k)} people`];
  return [...named, k === 1 ? 'one other person' : `${inWords(k)} others`];
}

/** Where a person is named in full for somebody who needs to tell people apart (an admin's list, "added by"): first and last name, else the same fallbacks, never an address. */
export function fullNameToCall(p: SomebodyOnACheckIn | null | undefined): string {
  const full = [p?.user?.firstName, p?.user?.lastName].map(aName).filter(Boolean).join(' ').trim();
  return full || nameToCall(p);
}
