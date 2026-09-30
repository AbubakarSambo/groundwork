/**
 * A CHANGE MADE BY TALKING IS SAID BACK FIRST, AND WRITTEN ONLY ON A YES (week 18, decision 12).
 *
 * Moving a deadline, adding a commitment and marking something done are all changes to a record a
 * person may later be held to. So each is put as one plain yes or no question with the exact change
 * in it, parked as a proposal, and only `POST /ask/answer` with a yes writes it. This file is the
 * reading of what was asked and the words said back. The rows are written by
 * `a-commitment-has-one-writer.ts`, which the product's own routes use too.
 *
 * THE WORDS ARE THE PRODUCT'S, NOT THE MODEL'S. A model is never asked to word the question or the
 * sentence after the yes, so it cannot change a date or a name on the way to the person. With a
 * proposal attached, the only thing the person reads is the question.
 *
 * A DATE SAID IN WORDS IS READ BY `whenTheyMeant`, the reader the product uses for dates said in a
 * check-in. It returns nothing for "soon" or "next sprint", and then this asks for the day.
 */
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { whenTheyMeant } from '../conversation/when-words-mean-a-date';
import { readToDo } from './a-to-do-is-yours';

/** A day at midnight UTC, written as a person says it: "Tuesday 7 October". */
export function theDay(d: Date, now: Date = new Date()): string {
  const said = whenItWas(d, 'weekdayAndDay', 'UTC');
  /* The year only where it is not this one, so "Thursday 2 September" never hides that it is next year. */
  return d.getUTCFullYear() === now.getUTCFullYear() ? said : `${said} ${d.getUTCFullYear()}`;
}

/** Today at midnight UTC, so a date is compared as a day and never as an hour. */
export function startOfDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export type ADate = { date: Date } | { ask: string };

/**
 * The day somebody's words mean, or the question that asks for it. Never a guess, and never a day
 * that has already gone, because moving a deadline to the past is almost always a slip of the tongue.
 */
export function readTheDay(said: string, now: Date): ADate {
  const words = said.trim().replace(/[.!?]+$/, '');
  const date = whenTheyMeant(words, now);
  if (!date) {
    return { ask: `I could not read a date from "${words}". Which day do you mean? For example, Tuesday 7 October.` };
  }
  if (date.getTime() < startOfDay(now).getTime()) {
    return { ask: `${theDay(date)} has already passed. Which day do you mean?` };
  }
  return { date };
}

/* --- moving a deadline --- */

const MOVE = [
  /^\s*(?:please\s+)?(?:can\s+you\s+)?(?:move|push|postpone|reschedule|delay)\s+(?:the\s+(?:deadline|due\s+date|date)\s+(?:on|for|of)\s+)?(.{3,160}?)\s+(?:back\s+)?(?:to|until|till|out\s+to)\s+(.{2,60}?)\s*$/i,
  /^\s*(?:please\s+)?(?:can\s+you\s+)?change\s+the\s+(?:deadline|due\s+date|date)\s+(?:on|for|of)\s+(.{3,160}?)\s+(?:to|until|till)\s+(.{2,60}?)\s*$/i,
];

export function readAMove(message: string): { what: string; whenSaid: string } | null {
  for (const rx of MOVE) {
    const m = rx.exec(message.trim().replace(/[.!]+$/, ''));
    if (m) return { what: m[1].trim().replace(/^["“]|["”]$/g, ''), whenSaid: m[2].trim() };
  }
  return null;
}

export function thereIsNoMoveToRead(): string {
  return 'Which one do you want to move, and to which day? For example, move "Send the Westgate price list" to Tuesday 7 October.';
}

export interface AMove {
  commitmentId: string;
  text: string;
  /** Whose it is, as the identity system knows them. */
  ownerExternalId: string;
  /** The first name of the owner, when the asker is moving somebody else's. */
  ownerFirstName: string | null;
  /** What the deadline was: a day, or the words somebody used, or nothing. */
  was: { at: string | null; said: string | null };
  /** The new day, as an ISO date. */
  toISO: string;
  toSaid: string;
}

export function moveProposal(m: AMove): string {
  const to = theDay(new Date(m.toISO));
  const what = m.ownerFirstName ? `"${m.text}", which you set for ${m.ownerFirstName},` : `"${m.text}"`;
  if (m.was.at) return `Shall I move ${what} from ${theDay(new Date(m.was.at))} to ${to}?`;
  if (m.was.said) return `Shall I move ${what} from "${m.was.said}" to ${to}?`;
  return `Shall I set ${what} to be done by ${to}?`;
}

export function moveDone(m: AMove): string {
  const to = theDay(new Date(m.toISO));
  return m.was.at || m.was.said ? `I have moved "${m.text}" to ${to}.` : `I have set "${m.text}" to be done by ${to}.`;
}

export const NOTHING_WAS_CHANGED = 'I have left it as it was. Nothing was changed.';

/** Said to somebody who asks to change what a colleague said they would do. */
export function onlyTheyCanChangeIt(firstName: string): string {
  return `Only ${firstName} can change what ${firstName} said they would do.`;
}

/* --- adding a commitment --- */

const ADD = [
  /\b(?:add|record|log|write\s+down)\s+(?:a\s+)?commitment[:,]?\s+(.{3,160})$/i,
  /\bcommit\s+me\s+to\s+(.{3,160})$/i,
];

export interface ACommitmentToAdd {
  text: string;
  dueSaid: string | null;
}

export function readACommitment(message: string): ACommitmentToAdd | null {
  for (const rx of ADD) {
    const m = rx.exec(message.trim());
    if (!m) continue;
    const t = readToDo(m[1], m[1]);
    if (!t) return null;
    /* The day is said once: out of the sentence, and beside it. */
    const when = (t.dueSaid ?? '').trim();
    const said = t.text.replace(/\s+/g, ' ');
    const text = when && said.toLowerCase().endsWith(when.toLowerCase()) && said.length > when.length
      ? said.slice(0, said.length - when.length).trim().replace(/[,;]+$/, '')
      : said;
    return { text, dueSaid: when || null };
  }
  return null;
}

export function noCommitmentToRead(): string {
  return 'What will you do, and by when? For example, add a commitment: Book the room for the launch by Friday.';
}

export interface AnAddition {
  text: string;
  dueSaid: string | null;
  /** ISO day, where a day was said and could be read. */
  dueISO: string | null;
}

export function additionProposal(a: AnAddition): string {
  return a.dueISO
    ? `Shall I add "${a.text}" as something you will do by ${theDay(new Date(a.dueISO))}?`
    : `Shall I add "${a.text}" as something you will do?`;
}

export function additionDone(a: AnAddition): string {
  return a.dueISO
    ? `I have added "${a.text}" as something you will do by ${theDay(new Date(a.dueISO))}.`
    : `I have added "${a.text}" as something you will do.`;
}

/* --- marking something done --- */

export interface ATick {
  kind: 'todo' | 'commitment';
  id: string;
  text: string;
}

export function tickProposal(t: ATick): string {
  return `Shall I mark "${t.text}" as done?`;
}

export function tickDone(t: ATick): string {
  return `I have marked "${t.text}" as done.`;
}
