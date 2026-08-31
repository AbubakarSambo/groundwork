/**
 * MATCHING A NAME SOMEBODY TYPED TO A PERSON ON THE CHECK-IN.
 *
 * A lead says "I need Dele to own the renewals" and the record needs a participant id. The gap
 * between those two is a name typed by a human, so it arrives partial, lower-cased, misspelled, or
 * as an email.
 *
 * REFUSES WHEN IT IS NOT SURE, AND THAT IS THE POINT. Attaching an expectation to the wrong person
 * is worse in kind than attaching it to nobody: a wrong one is read as a standard that person is
 * being held to, and they have no idea where it came from. So an ambiguous name matches nothing,
 * the proposal says so, and the lead can say which one they meant.
 */

export interface Party {
  id: string;
  email: string;
  name?: string | null;
}

export interface Matched {
  id: string;
  /** What to call them back, in the sentence the lead confirms. */
  label: string;
}

function labelFor(p: Party): string {
  return p.name?.trim() || p.email;
}

/** Their first name, which is what a lead types nine times out of ten. */
function firstNameOf(p: Party): string {
  const n = p.name?.trim();
  if (n) return n.split(/\s+/)[0].toLowerCase();
  return p.email.split('@')[0].split(/[._-]/)[0].toLowerCase();
}

export function whoTheyMeant(said: string, parties: Party[]): Matched | null {
  const raw = (said ?? '').trim().toLowerCase();
  if (!raw || !parties.length) return null;

  /* An email is unambiguous, so it is tried first and exactly. */
  const byEmail = parties.filter((p) => p.email.toLowerCase() === raw);
  if (byEmail.length === 1) return { id: byEmail[0].id, label: labelFor(byEmail[0]) };

  const byFullName = parties.filter((p) => (p.name ?? '').trim().toLowerCase() === raw);
  if (byFullName.length === 1) return { id: byFullName[0].id, label: labelFor(byFullName[0]) };

  /*
   * FIRST NAME, AND ONLY WHEN ONE PERSON HAS IT. Two people called Sam is the exact case where
   * guessing does the damage - so two matches is no match, and the lead is asked which.
   */
  const byFirst = parties.filter((p) => firstNameOf(p) === raw);
  if (byFirst.length === 1) return { id: byFirst[0].id, label: labelFor(byFirst[0]) };

  return null;
}
