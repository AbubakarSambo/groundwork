import { whatIsOpenFor, type WhatIsOpen } from './the-one-thing-today';

/**
 * EACH PERSON'S OPENER AND FIRST QUESTION, PREPARED IN ADVANCE (Hafsah, 3 November 2026 night, answers 1 to 3; fix plan, release batch 1,
 * group 7, item 1).
 *
 * Opening a check-in made two model calls while the person waited: the session plan (about 4.3 seconds) and then the opener (about 2.7).
 * Now, at the end of a session, and again when something relevant changes before the next one, the opener and the first question of
 * that person's next session are prepared from the record and the session plan, and stored with a note of what they were based on.
 *
 * - It is a stored draft only. It sits on the next session's own row, inside its plan, which already exists and is NOT_STARTED; nothing
 *   here starts a session, writes a turn or counts as a round.
 * - When the person opens the check-in and nothing has changed since the draft, the opener and first question are shown straight away,
 *   with no model call. If something has, a plain fact line from the record is shown straight away and the question is prepared fresh.
 * - The opener is one plain fact from the record, by name ("Joseph, Juja Hardware said they would pay the deposit today."), or, with
 *   nothing open, "Joseph, nothing is open from last time.". It is always followed by the first question, and never stands alone.
 *
 * Only a team member's sessions are prepared: the lead checks in when she chooses, so there is no next session of hers to prepare.
 */

/** What the draft was based on, so an open can tell whether anything relevant changed since. */
export interface WhatItRestsOn {
  /** The fact line as the record gave it then. It changes with a new wait, a payment, a deal or a promise carried over. */
  line: string;
  /** The things on record behind it, by key. */
  things: string[];
  /** Their own latest update: a check-in line or something they added. */
  lastOwnUpdateAt: string | null;
  /** The lead's latest decision about them: praise, a plan, a deadline or a reassignment. */
  lastLeadDecisionAt: string | null;
  /** The latest change to what they are waiting on, or what is waited on them for. */
  lastWaitChangeAt: string | null;
}

export interface APreparedOpening {
  /** The fact line, from the record, by name. */
  line: string;
  /** The first question, from the record and the session plan, building on the line. */
  question: string;
  preparedAt: string;
  /** A note of what it was based on, in plain words, for whoever reads the row. */
  basedOn: string;
  restsOn: WhatItRestsOn;
}

/** The key it is kept under inside the next session's plan. */
export const KEPT_IN_THE_PLAN_AS = 'preparedOpening';

const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

/** One plain fact by name, the most important thing on record for them today; "nothing is open from last time" when there is none. */
export function theFactLine(open: Pick<WhatIsOpen, 'firstName' | 'things'>): string {
  const first = open.things[0]?.says?.trim();
  const fact = first || 'nothing is open from last time.';
  return open.firstName ? `${open.firstName}, ${fact}` : capital(fact);
}

/** The opener as the person reads it: the fact line, then the first question. Never the line alone. */
export function theOpeningAsRead(line: string, question: string): string {
  return `${line.trim()} ${question.trim()}`.trim();
}

const latest = (rows: { at?: Date | string | null }[]): string | null => {
  const times = rows.map((r) => (r?.at ? new Date(r.at).getTime() : NaN)).filter((t) => Number.isFinite(t));
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
};

/** What a draft for this person would rest on, read from the record now. Null where no draft is made (see whatIsOpenFor). */
export async function whatItWouldRestOn(
  prisma: any,
  who: { groundId: string; participantId: string; sessionNumber?: number | null; now?: Date },
): Promise<WhatItRestsOn | null> {
  const open = await whatIsOpenFor(prisma, who);
  if (!open) return null;
  const [own, decisions, waits] = await Promise.all([
    Promise.resolve(prisma?.recordEntry?.findFirst?.({ where: { participantId: who.participantId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } })).catch(() => null),
    Promise.resolve(prisma?.personLeadAction?.findFirst?.({ where: { participantId: who.participantId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } })).catch(() => null),
    Promise.resolve(prisma?.groundDependency?.findFirst?.({
      where: { groundId: who.groundId, OR: [{ fromParticipantId: who.participantId }, { onParticipantId: who.participantId }] },
      orderBy: { updatedAt: 'desc' }, select: { updatedAt: true },
    })).catch(() => null),
  ]);
  return {
    line: theFactLine(open),
    things: open.things.map((t) => t.key),
    lastOwnUpdateAt: latest([{ at: (own as any)?.createdAt }]),
    lastLeadDecisionAt: latest([{ at: (decisions as any)?.createdAt }]),
    lastWaitChangeAt: latest([{ at: (waits as any)?.updatedAt }]),
  };
}

/** Nothing relevant changed since the draft: the same fact line, the same things, and no update, decision or wait change since. */
export function nothingChangedSince(prepared: APreparedOpening, now: WhatItRestsOn): boolean {
  const was = prepared.restsOn;
  return was.line === now.line
    && was.things.join('|') === now.things.join('|')
    && was.lastOwnUpdateAt === now.lastOwnUpdateAt
    && was.lastLeadDecisionAt === now.lastLeadDecisionAt
    && was.lastWaitChangeAt === now.lastWaitChangeAt;
}

/** The plain note kept with it: what it was written from, and when. */
export function whatItWasBasedOn(restsOn: WhatItRestsOn, preparedAt: Date, planned: boolean): string {
  const from = [
    restsOn.things.length ? `the record's ${restsOn.things.length === 1 ? 'one open thing' : `${restsOn.things.length} open things`}` : 'the record, with nothing open',
    restsOn.lastOwnUpdateAt ? `their own updates up to ${restsOn.lastOwnUpdateAt}` : null,
    restsOn.lastLeadDecisionAt ? `the lead's decisions up to ${restsOn.lastLeadDecisionAt}` : null,
    planned ? 'the session plan' : null,
  ].filter(Boolean).join(', ');
  return `Prepared on ${preparedAt.toISOString()} from ${from}.`;
}

/** The draft kept inside a session's plan, or null. */
export function thePreparedOpeningIn(sessionPlan: unknown): APreparedOpening | null {
  const p = (sessionPlan as any)?.[KEPT_IN_THE_PLAN_AS];
  return p && typeof p.line === 'string' && typeof p.question === 'string' && p.question.trim() && p.restsOn ? p as APreparedOpening : null;
}

/** What the model is told when only the question is to be written: the line is already said, first. */
export function writeOnlyTheQuestion(line: string): string {
  return [
    'THE OPENING LINE IS ALREADY WRITTEN, FROM THE RECORD, AND IS SAID FIRST, WORD FOR WORD:',
    `"${line}"`,
    'Write only the first question that follows it: one plain sentence that builds on that line where it can, ending in a question mark.',
    'Do not repeat the line, do not greet them, and do not say what this check-in is for.',
  ].join('\n');
}
