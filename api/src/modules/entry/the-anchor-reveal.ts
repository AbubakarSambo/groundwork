import { HOW_I_WILL_WORK_WITH_YOUR_TEAM } from './the-anchor-served-shapes';
import type { TheLeadsReveal } from './the-anchor-served-shapes';
import type { TheSevenItems } from './the-anchor-setup';

/**
 * THE LEAD'S REVEAL, "Help my team understand" (docs/anchor-scenario.md, sections 11 and 12; plan piece 8;
 * request 149). Built from the record the lead's own conversation leaves, with no model call.
 *
 * WHAT THE RECORD HOLDS TODAY. The conversation is kept as turns. Two of the six parts can be read from
 * those turns without asking a model anything: who the lead is trying to move (the people she named),
 * and what meaningful change would look like (her own answer to the hope question, kept word for word,
 * one sentence each). The other three need the seven things the lead says to be pulled out of her words:
 * what she is carrying, what she needs the team to understand, and what she is seeing today. That
 * extraction is a model step that has not been built, so those three are served as one plain sentence
 * that says they are not written down yet. They never hold a guess.
 *
 * WHO READS WHAT. "What you're carrying" and "What you're seeing today" are the lead's alone, and "What you
 * need the team to understand" reaches the team only once the lead has shared it (decision 96, item 8).
 * For anybody else the field is `null`. Nothing records that she has shared it, so `sharedWithTheTeam` is
 * always false for now.
 */

export const THE_HOPE_QUESTION_STARTS = /imagine a month from now/i;

type Turn = { role: string; content?: string | null };

/** What the lead said to the hope question: the first thing she typed after it was asked, or null when it has not been asked or answered. */
export function herAnswerToTheHopeQuestion(messages: Turn[]): string | null {
  const asked = messages.findIndex((m) => m.role !== 'user' && THE_HOPE_QUESTION_STARTS.test(m.content ?? ''));
  if (asked < 0) return null;
  const answer = messages.slice(asked + 1).find((m) => m.role === 'user' && (m.content ?? '').trim());
  return answer ? (answer.content ?? '').trim() : null;
}

/** Her answer cut into the separate things she said, each exactly as she wrote it. A bullet or a number in front of one is taken off, and nothing else is changed. */
export function whatSheSaidOneAtATime(answer: string): string[] {
  const pieces = answer
    .split(/\n+|(?<=[.!?])\s+|;\s+/)
    .map((p) => p.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
    .filter((p) => p.length > 0);
  return pieces.slice(0, 8);
}

const listed = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/** The people she named, said once each. More than six are said as the first six and a count. */
export function whoSheIsTryingToMove(names: string[]): string {
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const raw of names) {
    const n = (raw ?? '').trim();
    const k = n.toLowerCase();
    if (n && !seen.has(k)) { seen.add(k); clean.push(n); }
  }
  if (!clean.length) return 'Groundwork has not yet heard who you are trying to move with you.';
  const shown = clean.slice(0, 6);
  const more = clean.length - shown.length;
  return `You are trying to move ${listed(more > 0 ? [...shown, more === 1 ? 'one other person' : `${more} other people`] : shown)} with you.`;
}

export const NOT_WRITTEN_DOWN = {
  carrying: 'Groundwork has not yet written down what you are carrying.',
  whatTheTeamNeedsToUnderstand: 'Groundwork has not yet written down what you need the team to understand.',
  seeingToday: 'Groundwork has not yet written down what you are seeing today.',
  change: 'Groundwork has not yet heard what you would notice people doing without you having to ask.',
} as const;

/** The one sentence under "What Groundwork will explore": the same two promises section 12 makes under Understand and Cross-reference, said as a plan. */
export const WHAT_GROUNDWORK_WILL_EXPLORE = [
  'Groundwork will start by learning how each person currently sees their work and the wider outcome, and then set what they say beside what you have said.',
];

export type TheRevealReader = 'lead' | 'team';

/** A sentence as the lead reads it: a capital letter to start and one full stop to end, nothing else changed. */
export const asASentence = (t: string): string => {
  const x = t.trim();
  if (!x) return '';
  const up = x[0].toUpperCase() + x.slice(1);
  return /[.!?]$/.test(up) ? up : `${up}.`;
};

/** What she is carrying: what sits with her, and why it bothers her, in the words she gave. Nothing when she gave neither. */
const whatSheIsCarrying = (h: TheSevenItems): string | null => {
  const parts = [h.responsibleFor, h.whyItBothersYou].map((p) => asASentence(p ?? '')).filter(Boolean);
  return parts.length ? parts.join(' ') : null;
};

export function theLeadsReveal(input: { messages: Turn[]; peopleNamed?: string[]; reader?: TheRevealReader; sharedWithTheTeam?: boolean; heard?: TheSevenItems }): TheLeadsReveal {
  const reader = input.reader ?? 'lead';
  const shared = input.sharedWithTheTeam === true;
  const hers = herAnswerToTheHopeQuestion(input.messages);
  const heard = input.heard ?? {};
  /* Her answer as the read wrote it to her ("you", one thing to a sentence), else exactly as she wrote it. */
  const change = heard.whatTheyWouldDoDifferently ? whatSheSaidOneAtATime(heard.whatTheyWouldDoDifferently) : hers ? whatSheSaidOneAtATime(hers) : [];
  const forTheLead = reader === 'lead';
  return {
    title: 'Help my team understand',
    subtitle: 'One-month Groundwork',
    carrying: forTheLead ? whatSheIsCarrying(heard) ?? NOT_WRITTEN_DOWN.carrying : null,
    whatTheTeamNeedsToUnderstand: forTheLead ? (heard.whatTheyDontUnderstand ? asASentence(heard.whatTheyDontUnderstand) : NOT_WRITTEN_DOWN.whatTheTeamNeedsToUnderstand) : null,
    sharedWithTheTeam: shared,
    whoYouAreTryingToMove: heard.tryingToMove ? asASentence(heard.tryingToMove) : whoSheIsTryingToMove(input.peopleNamed ?? []),
    seeingToday: forTheLead ? (heard.seeingToday ? asASentence(heard.seeingToday) : NOT_WRITTEN_DOWN.seeingToday) : null,
    whatMeaningfulChangeWouldLookLike: change.length ? change : [NOT_WRITTEN_DOWN.change],
    whatGroundworkWillExplore: [...WHAT_GROUNDWORK_WILL_EXPLORE],
    howIWillWorkWithYourTeam: HOW_I_WILL_WORK_WITH_YOUR_TEAM.map((w) => ({ ...w })),
  };
}
