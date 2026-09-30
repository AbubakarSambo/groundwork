/**
 * WHAT THIS CHECK-IN KNOWS, IN NAMED BUCKETS.
 *
 * Hafsah, 22 September 2026, reading the Context page after a paste had landed on it: "this context
 * page is a mess... the content needs to be parsed and paraphrased in sections - we should have
 * strategy bucket, or notes/tips etc. those sections are so bulky." And, about the private half:
 * "the 'only you see this bit' shouldnt exist."
 *
 * So the page has five bands and the context is lines in buckets rather than four walls of text.
 * This module owns the two rules that decide where a line may be seen, because both were previously
 * spread across a service, a page and a prompt:
 *
 *   1. A LINE ABOUT A PERSON IS THE LEAD'S ALONE. Their read of somebody, a question they want put
 *      to them, or a thing between two people. Never shared, never quoted, never shown to the person
 *      it is about. It is not hidden from the LEAD, though - which is what the old section did badly
 *      by making a private steer look like a confession box.
 *   2. EVERYTHING ABOUT THE WORK IS THE TEAM'S. The strategy, the rules, what is still to decide and
 *      what is not settled are shared by default, because a lead who writes them down wants the team
 *      working from them. A lead can still make one private, one line at a time.
 */
import { ContextItemKind } from '@prisma/client';

/** The kinds that are about a person rather than about the work. Never shared. */
export const ABOUT_SOMEBODY: Set<ContextItemKind> = new Set([
  ContextItemKind.ABOUT_A_PERSON,
  ContextItemKind.QUESTION_FOR_PERSON,
  ContextItemKind.BETWEEN_PEOPLE,
]);

/** The buckets the page draws, in the order it draws them. */
export const THE_BUCKETS: { kind: ContextItemKind; title: string; sub: string }[] = [
  { kind: ContextItemKind.STRATEGY, title: 'The strategy', sub: 'how we win work and what we lead with' },
  { kind: ContextItemKind.WAY_OF_WORKING, title: 'How we work', sub: 'the rules, as the lead wrote them' },
  { kind: ContextItemKind.DECISION, title: 'Still to decide', sub: 'nobody has decided these yet' },
  { kind: ContextItemKind.UNSETTLED, title: 'Not settled', sub: 'not treated as fact or as a target' },
  { kind: ContextItemKind.NOTE, title: 'Notes', sub: 'kept because somebody said it' },
];

export interface AContextLine {
  id: string;
  kind: ContextItemKind;
  text: string;
  saidAs?: string | null;
  audience: 'LEAD_ONLY' | 'EVERYONE';
  aboutParticipantId?: string | null;
  closedAt?: Date | string | null;
  /** DECISION 63, 30 September 2026: set only when an admin added, changed or confirmed this line in
   *  the lead's place, because the lead had left the organisation - the plain sentence naming them.
   *  Null when the lead did it themselves. See who-may-confirm-setup.ts. */
  confirmedByAdminNote?: string | null;
}

/**
 * The lines this reader may see.
 *
 * The lead sees everything on their own check-in. Everybody else sees the work buckets that were
 * shared, and nothing about anybody - including nothing about themselves, because a lead's read of
 * somebody is not a message to them and was never written as one.
 */
export function theLinesFor(lines: AContextLine[], opts: { isTheLead: boolean }): AContextLine[] {
  const live = (lines ?? []).filter((l) => l?.text?.trim() && !l.closedAt);
  if (opts.isTheLead) return live;
  return live.filter((l) => !ABOUT_SOMEBODY.has(l.kind) && l.audience === 'EVERYONE');
}

/** Whether this line may be shared with the team at all. */
export const mayBeShared = (kind: ContextItemKind): boolean => !ABOUT_SOMEBODY.has(kind);

/** Why not, in the sentence the refusal uses. */
export const WHY_A_LINE_ABOUT_SOMEBODY_STAYS_YOURS =
  'A line about one person stays yours. Everyone reading your read of somebody is a public judgement of them, which is the one thing this product will not do. Say what you expect of them in your own check-in instead - that is published with your name on it.';
