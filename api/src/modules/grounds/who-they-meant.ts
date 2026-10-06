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

import { nameToCall, SOMEONE } from '../engagement/a-name-to-call-them';

export interface Party {
  id: string;
  email: string;
  name?: string | null;
}

export interface Matched {
  id: string;
  /** What to call them back, in the sentence the lead confirms. */
  label: string;
  /**
   * Their first name, capitalised - how the rest of the product names a person in a sentence a
   * lead or a participant reads ("Ben", not "Ben Okafor"). `label` (above) stays the fuller form
   * for places that need to tell two people with the same first name apart; a say-back or a
   * confirmation reads more like something a colleague would say with just the first name.
   */
  firstName: string;
}

/* What the lead reads back. Never the address: somebody with no name is "Someone" (Hafsah, 6 October). */
function labelFor(p: Party): string {
  return nameToCall({ nameGiven: p.name });
}

/** Their first name, which is what a lead types nine times out of ten. */
function firstNameOf(p: Party): string {
  const n = p.name?.trim();
  if (n) return n.split(/\s+/)[0].toLowerCase();
  return p.email.split('@')[0].split(/[._-]/)[0].toLowerCase();
}

/** Their first name, capitalised for a sentence a person reads - see `Matched.firstName`. */
function firstNameLabelFor(p: Party): string {
  const n = labelFor(p);
  if (n === SOMEONE) return SOMEONE;
  const raw = n.split(/\s+/)[0];
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : n;
}

export function whoTheyMeant(said: string, parties: Party[]): Matched | null {
  const raw = (said ?? '').trim().toLowerCase();
  if (!raw || !parties.length) return null;

  /* An email is unambiguous, so it is tried first and exactly. */
  const byEmail = parties.filter((p) => p.email.toLowerCase() === raw);
  if (byEmail.length === 1) return { id: byEmail[0].id, label: labelFor(byEmail[0]), firstName: firstNameLabelFor(byEmail[0]) };

  const byFullName = parties.filter((p) => (p.name ?? '').trim().toLowerCase() === raw);
  if (byFullName.length === 1) return { id: byFullName[0].id, label: labelFor(byFullName[0]), firstName: firstNameLabelFor(byFullName[0]) };

  /*
   * FIRST NAME, AND ONLY WHEN ONE PERSON HAS IT. Two people called Sam is the exact case where
   * guessing does the damage - so two matches is no match, and the lead is asked which.
   */
  const byFirst = parties.filter((p) => firstNameOf(p) === raw);
  if (byFirst.length === 1) return { id: byFirst[0].id, label: labelFor(byFirst[0]), firstName: firstNameLabelFor(byFirst[0]) };

  return null;
}
