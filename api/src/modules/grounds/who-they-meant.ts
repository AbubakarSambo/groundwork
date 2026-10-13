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

/*
 * What the lead reads back. Never the address (Hafsah, 6 October). Somebody with no name is called back by the word the lead used for them, which is the
 * lead's own ("Amina"), and "this person" when the lead typed the address: "what you expect of Someone" read as a name nobody has (review of 1678157c).
 */
function labelFor(p: Party, said = ''): string {
  const n = nameToCall({ nameGiven: p.name });
  if (n !== SOMEONE) return n;
  const theirWord = said.trim();
  return theirWord && !theirWord.includes('@') && theirWord.split(/\s+/).length <= 3
    ? theirWord.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'this person';
}

/** Their first name, which is what a lead types nine times out of ten. */
function firstNameOf(p: Party): string {
  const n = p.name?.trim();
  if (n) return n.split(/\s+/)[0].toLowerCase();
  return p.email.split('@')[0].split(/[._-]/)[0].toLowerCase();
}

/** Their first name, capitalised for a sentence a person reads - see `Matched.firstName`. */
function firstNameLabelFor(p: Party, said = ''): string {
  const n = labelFor(p, said);
  if (n === 'this person') return n;
  const raw = n.split(/\s+/)[0];
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : n;
}

export function whoTheyMeant(said: string, parties: Party[]): Matched | null {
  const raw = (said ?? '').trim().toLowerCase();
  if (!raw || !parties.length) return null;

  /* An email is unambiguous, so it is tried first and exactly. */
  const byEmail = parties.filter((p) => p.email.toLowerCase() === raw);
  if (byEmail.length === 1) return { id: byEmail[0].id, label: labelFor(byEmail[0], said), firstName: firstNameLabelFor(byEmail[0], said) };

  const byFullName = parties.filter((p) => (p.name ?? '').trim().toLowerCase() === raw);
  if (byFullName.length === 1) return { id: byFullName[0].id, label: labelFor(byFullName[0], said), firstName: firstNameLabelFor(byFullName[0], said) };

  /*
   * FIRST NAME, AND ONLY WHEN ONE PERSON HAS IT. Two people called Sam is the exact case where
   * guessing does the damage - so two matches is no match, and the lead is asked which.
   */
  const byFirst = parties.filter((p) => firstNameOf(p) === raw);
  if (byFirst.length === 1) return { id: byFirst[0].id, label: labelFor(byFirst[0], said), firstName: firstNameLabelFor(byFirst[0], said) };

  return null;
}
