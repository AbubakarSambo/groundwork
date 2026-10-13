import type { PrismaService } from '../prisma/prisma.service';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { PATTERN_ROW_SELECT, seenAgainAfterTalk, servedPatterns, type APatternRow } from '../patterns/who-reads-a-pattern';
import type { ARecordLine } from './the-record-read-for-a-review';

/**
 * THE MANAGER'S BRIEFING FOR A REVIEW (decision 85, item 4; build step 13 of
 * docs/suites-against-the-workflow-model.md).
 *
 * "The manager gets a separate briefing. Groundwork gives evidence and patterns and never makes the
 * employment decision."
 *
 * WHAT IT HOLDS, all of it from the record, none of it from a model:
 *   - THE COUNTS (decision 86, item 2: the manager reads the counts): the commitments the person made
 *     in the check-ins this reader is in, how many were kept, not done, dropped and still open, and
 *     how many took longer than first said. Read from the record the review keeps, so it says the same
 *     whenever it is opened.
 *   - THE PERSON'S PATTERNS, from check-ins this reader runs, only after the person has had their turn,
 *     with the person's answer beside each (decision 86, item 1). They go through `servedPatterns`, the
 *     one place that decides who reads a pattern, so detection and wording are untouched (decision 55).
 *     The lead's own mark on a pattern, and the coaching lines, are not in it.
 *   - WHAT CHANGED AFTER EARLIER CONVERSATIONS: each pattern somebody talked through with the person,
 *     and whether it came up again after, and how the person's earlier reviews were decided.
 *   - THE PERSON'S CORRECTIONS of the record, beside the line they correct, for the lines this reader
 *     may read.
 *
 * WHAT IT NEVER HOLDS: a verdict, a label, a score or a rating. "PIP", "exit" and "at risk" are never
 * said (decision 85, and "no labels on people"). The decision stays the writer's, with reasons.
 *
 * WHO READS IT. Whoever may open the review and is not the person it is about, each limited to what
 * they may read already: the counts and corrections from check-ins they are in, the patterns from
 * check-ins they run. The person reads the record itself, their own patterns where they are, and
 * their own answers, so nothing here is new to them.
 */

export interface APatternInTheBriefing {
  /** The plain name of what keeps coming up. Never a code, never a label on the person. */
  heading: string;
  whatHappened: string | null;
  howOften: string;
  /** The check-in it came up in. */
  checkIn: string;
  /** The person's answer, in the prototype's words: "Kwame’s answer: “...”", or "Kwame hasn’t answered this yet." */
  theirAnswer: string;
}

export interface ABriefing {
  heading: string;
  /** The counts, as sentences. Null when this reader is in no check-in where the person made a commitment. */
  counts: string | null;
  patterns: APatternInTheBriefing[];
  /** Said when there are patterns: they come only after three check-ins, the person sees them first. */
  patternsNote: string | null;
  changedAfterEarlierConversations: string[];
  corrections: { line: string; said: string; whatIsTrue: string }[];
  /** Groundwork gives evidence and patterns; a person decides, with reasons. */
  whoDecides: string;
}

const said = (d: Date | string) => whenItWas(new Date(d), 'full', 'UTC');
const sayDay = (d: string) => said(`${d}T12:00:00.000Z`);
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const andList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);
const inQuotes = (words: string) => `“${/[.!?…”"]$/.test(words.trim()) ? words.trim() : `${words.trim()}.`}”`;

/** The counts, from the commitment lines of the record this reader may read. */
export function theCountsSaid(lines: readonly ARecordLine[], first: string): string | null {
  const cs = lines.filter((l): l is Extract<ARecordLine, { kind: 'commitments' }> => l.kind === 'commitments');
  if (!cs.length) return null;
  const sum = (k: 'made' | 'done' | 'notDone' | 'dropped' | 'open' | 'delayed') => cs.reduce((n, l) => n + (Number(l[k]) || 0), 0);
  const made = sum('made');
  if (!made) return null;
  const firstDay = cs.map((l) => l.first).sort()[0];
  const lastDay = cs.map((l) => l.last).sort().slice(-1)[0];
  const when = firstDay === lastDay ? `on ${sayDay(firstDay)}` : `between ${sayDay(firstDay)} and ${sayDay(lastDay)}`;
  const rest: string[] = [];
  if (sum('notDone')) rest.push(`${sum('notDone')} ${sum('notDone') === 1 ? 'was' : 'were'} not done`);
  if (sum('dropped')) rest.push(`${sum('dropped')} ${sum('dropped') === 1 ? 'was' : 'were'} dropped`);
  if (sum('open')) rest.push(`${sum('open')} ${sum('open') === 1 ? 'was' : 'were'} still open when this review started`);
  const kept = `${first} kept ${sum('done') === made ? 'all of them' : sum('done') ? `${sum('done')} of them` : 'none of them'}`;
  const delayed = sum('delayed');
  return [
    `In the check-ins you are in with ${first}, ${first} made ${plural(made, 'commitment', 'commitments')} ${when}.`,
    sum('open') === made ? 'None of them was settled before this review started.' : rest.length ? `${kept}, ${andList(rest)}.` : `${kept}.`,
    delayed ? `Of them, ${delayed} took longer than first said, because ${delayed === 1 ? 'it was' : 'they were'} not done, or ${first} said ${delayed === 1 ? 'it' : 'them'} again in a later check-in.` : '',
  ].filter(Boolean).join(' ');
}

/**
 * The person's patterns from check-ins this reader runs, after the person has had their turn, and each
 * pattern somebody talked through with them, with whether it came up again.
 */
export async function thePatternsForTheBriefing(
  prisma: PrismaService,
  input: { organizationId: string; personUserId: string | null; readerUserId: string; first: string; now?: Date },
): Promise<{ patterns: APatternInTheBriefing[]; talkedThrough: string[] }> {
  if (!input.personUserId || input.personUserId === input.readerUserId) return { patterns: [], talkedThrough: [] };
  const db = prisma as any;
  const theirs: any[] = ((await db.groundParticipant?.findMany?.({
    where: {
      userId: input.personUserId, managingOnly: false,
      ground: { organizationId: input.organizationId, OR: [{ initiatorId: input.readerUserId }, { createdByUserId: input.readerUserId }] },
    },
    select: { id: true, groundId: true, ground: { select: { label: true } } },
  }).catch(() => [])) ?? []);
  if (!theirs.length) return { patterns: [], talkedThrough: [] };
  const rows: (APatternRow & { talkedAboutBy?: string | null })[] = ((await db.patternDetection?.findMany?.({
    where: { participantId: { in: theirs.map((t) => t.id) } },
    select: { ...PATTERN_ROW_SELECT, talkedAboutBy: true },
  }).catch(() => [])) ?? []);
  const labelOf = new Map(theirs.map((t) => [t.id, String(t.ground?.label ?? '').trim()]));
  const talkers = [...new Set(rows.map((r) => r.talkedAboutBy).filter((x): x is string => !!x && x !== input.readerUserId))];
  const names: any[] = talkers.length ? ((await db.user?.findMany?.({ where: { id: { in: talkers } }, select: { id: true, firstName: true } }).catch(() => [])) ?? []) : [];
  const nameOf = new Map(names.map((u) => [u.id, (u.firstName ?? '').trim()]));
  const patterns: APatternInTheBriefing[] = [];
  const talkedThrough: string[] = [];
  /* The one place that decides who reads a pattern: this reader runs the check-in, and is not the person. */
  const served = servedPatterns(rows, { participantId: null, runsIt: true }, { firstNameOf: () => input.first, now: input.now });
  for (const p of served) {
    const row = rows.find((r) => r.id === p.id)!;
    patterns.push({
      heading: p.heading, whatHappened: p.whatHappened, howOften: p.howOften, checkIn: labelOf.get(p.participantId) ?? '',
      theirAnswer: p.theirWords ? `${input.first}’s answer: ${inQuotes(p.theirWords)}` : `${input.first} hasn’t answered this yet.`,
    });
    if (row.talkedAboutAt) {
      const who = !row.talkedAboutBy || row.talkedAboutBy === input.readerUserId ? 'You' : nameOf.get(row.talkedAboutBy) || 'Somebody who runs the check-in';
      const again = seenAgainAfterTalk(row);
      const after = again ? ` It came up again in ${plural(again, 'check-in', 'check-ins')} after that.` : ' It has not come up since.';
      talkedThrough.push(`${who} talked with ${input.first} about “${p.heading}” on ${said(row.talkedAboutAt)}.${after}`);
    }
  }
  return { patterns, talkedThrough };
}

/** How the person's earlier reviews were decided, before this one started. */
export async function theEarlierReviews(
  prisma: PrismaService,
  input: { organizationId: string; personExternalId: string; before: Date; first: string; readerUserId: string; nameOf: (userId: string | null) => Promise<string | null> },
): Promise<string[]> {
  const rows: any[] = ((await (prisma as any).performanceReview?.findMany?.({
    where: { organizationId: input.organizationId, personExternalId: input.personExternalId, decidedAt: { not: null }, startedAt: { lt: input.before } },
    orderBy: { decidedAt: 'desc' }, take: 2,
    select: { decision: true, decisionReasons: true, decidedAt: true, decidedById: true, startedAt: true },
  }).catch(() => [])) ?? []);
  const out: string[] = [];
  for (const r of rows) {
    if (!r?.decidedAt || !String(r.decision ?? '').trim()) continue;
    const by = r.decidedById === input.readerUserId ? 'You' : (await input.nameOf(r.decidedById)) || 'The person who wrote it';
    const why = String(r.decisionReasons ?? '').trim();
    out.push(`${by} decided ${input.first}’s review on ${said(r.decidedAt)}. The decision was ${inQuotes(String(r.decision))}${why ? ` The reason given was ${inQuotes(why)}` : ''}`);
  }
  return out;
}

/** What closes the briefing: Groundwork does not decide, a person does, with reasons. */
export function whoDecidesTheReview(readerWrites: boolean, first: string, writerFirst: string | null): string {
  if (readerWrites) return `There are no scores. Groundwork gives you the evidence and the patterns, and you decide. ${first} sees your reasons.`;
  return `There are no scores. Groundwork gives the evidence and the patterns, and ${writerFirst?.trim() || 'the person who writes this review'} decides. ${first} sees the reasons.`;
}

/**
 * WHO DECIDES, SAID THE WAY THE RIGHTS ARE (request 162, item 1). The name is the person the organisation's rule lets write
 * the review, or an admin when any admin may; never somebody who started it and can no longer write it.
 */
export function theOneWhoDecidesSaid(writerFirst: string | null, anyAdminMay: boolean): string | null {
  return writerFirst?.trim() || (anyAdminMay ? 'an admin' : null);
}

export function theBriefingsHeading(readerWrites: boolean, first: string): string {
  return readerWrites ? `Your briefing for ${first}’s review` : `The briefing for ${first}’s review`;
}

export const PATTERNS_NOTE = (first: string) =>
  `These only appear after three check-ins. ${capital(first)} sees them first and can answer, and they never go anywhere on their own.`;
