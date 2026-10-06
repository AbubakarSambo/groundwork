import type { PrismaService } from '../prisma/prisma.service';
import { EVALUATION_SCENARIOS, theSubjectOfAnEvaluationCheckIn } from '../reports/is-this-an-evaluation-check-in';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

/**
 * WHERE A REVIEW STANDS, IN ONE PLAIN SENTENCE (item 16; the prototype's #/suite/reviews, "Where it
 * stands"). The prototype's own words, copied from docs/prototype/screens/E-suites/suite-reviews.txt:
 *
 *   "Ready to start. 6 months of check-ins to draw on."
 *   "Ready to start."
 *   "After his 90 days are decided."  (with "Not yet" in place of "Start it")
 *
 * WAITING FOR ANOTHER DECISION. A review does not start while a check-in that decides something about
 * the same person is still open: a probation or first 90 days, a performance plan, a promotion or a
 * renewal (is-this-an-evaluation-check-in.ts, the one list). Two decisions about one person are never
 * made at once, and the review would be written before the other one is known.
 *
 * Who reads the check-in's title. Somebody who takes part in that check-in reads its title ("After
 * “Kwame, first 90 days” is decided."). Anybody else who may read the board (an admin, the lead of the
 * team) reads the kind of check-in in its own words ("After Kwame’s 90 days are decided."), by decision
 * 93, row 20; they used to read "After a check-in about Kwame is decided." and nothing more.
 */

export type Stands = 'ready' | 'started' | 'decided' | 'not-yet';

/** An open check-in that decides something about this person, as far as the board needs it. */
export interface WaitingFor { groundId: string; label: string; userIds: string[]; scenario?: string | null }

const CLOSED = ['RESOLVED', 'STALLED', 'CLOSED'];
const MONTH = 30.44 * 86_400_000;

/** The open evaluation check-ins about each of these people (by their sign-in). Nothing open, nothing in the map. */
export async function theOpenDecisionsAbout(prisma: PrismaService, organizationId: string, userIds: string[]): Promise<Map<string, WaitingFor>> {
  const out = new Map<string, WaitingFor>();
  const ids = userIds.filter(Boolean);
  if (!ids.length || !(prisma as any).ground?.findMany) return out;
  const grounds: any[] = await (prisma as any).ground.findMany({
    where: {
      organizationId, scenario: { in: EVALUATION_SCENARIOS }, status: { notIn: CLOSED },
      participants: { some: { userId: { in: ids } } },
    },
    select: { id: true, label: true, scenario: true, participants: { select: { id: true, userId: true, partyType: true, managingOnly: true, createdAt: true } } },
  }).catch(() => []);
  for (const g of grounds ?? []) {
    const subject = theSubjectOfAnEvaluationCheckIn(g.participants ?? []);
    const who = (g.participants ?? []).find((p: any) => p.id === subject)?.userId;
    if (!who || out.has(who)) continue;
    out.set(who, { groundId: g.id, label: String(g.label ?? '').trim(), scenario: g.scenario ?? null, userIds: (g.participants ?? []).map((p: any) => p.userId).filter(Boolean) });
  }
  return out;
}

/** When each of these people's first check-in here began, by their sign-in. */
export async function theFirstCheckInOf(prisma: PrismaService, organizationId: string, userIds: string[]): Promise<Map<string, Date>> {
  const out = new Map<string, Date>();
  const ids = userIds.filter(Boolean);
  if (!ids.length || !(prisma as any).groundParticipant?.findMany) return out;
  const rows: any[] = await (prisma as any).groundParticipant.findMany({
    where: { userId: { in: ids }, managingOnly: false, ground: { organizationId } },
    select: { userId: true, createdAt: true },
  }).catch(() => []);
  for (const r of rows ?? []) {
    if (!r.userId || !r.createdAt) continue;
    const at = new Date(r.createdAt);
    const had = out.get(r.userId);
    if (!had || at < had) out.set(r.userId, at);
  }
  return out;
}

/** How many whole months of check-ins there are to draw on, from the first one to today. */
export function monthsToDrawOn(first: Date | null | undefined, today: Date): number {
  if (!first) return 0;
  return Math.max(0, Math.floor((today.getTime() - first.getTime()) / MONTH));
}

/**
 * "AFTER KWAME’S 90 DAYS ARE DECIDED." (decision 93, row 20). The prototype says "After his 90 days are decided."; the product
 * does not guess a person's pronoun, so it says the name. The check-in is named by its kind's own words, which is what the
 * prototype does, and what Hafsah chose over "After a check-in about Kwame is decided." A person who takes part in that check-in
 * reads its own title instead (above).
 */
export function afterTheKindOfCheckInIsDecided(scenario: string | null | undefined, name: string): string {
  const whose = `${name}’s`;
  switch (scenario) {
    case 'NEW_HIRE': return `After ${whose} 90 days are decided.`;
    case 'PIP': return `After ${whose} performance plan is decided.`;
    case 'CONTRACT_RENEWAL': return `After ${whose} contract renewal is decided.`;
    case 'RECOGNITION': return `After the recognition round for ${name} is decided.`;
    default: return `After the check-in about ${name} is decided.`;
  }
}

/** The sentence under "Where it stands", for this reader. */
export function whereItStandsSaid(input: {
  stands: Stands;
  firstName: string;
  months: number;
  startedAt?: Date | string | null;
  decidedAt?: Date | string | null;
  waitingFor?: WaitingFor | null;
  readerUserId: string;
  /**
   * What has been written so far, so the sentence is true of THIS review (request 162, item 2). `wordsBy` is who wrote
   * the manager's words ("you" for the reader, else a first name), or null while none are written; `hasTheirView` is
   * whether the person has added a view of their own. Left out, the sentence is the one a review just started reads.
   */
  wordsBy?: string | null;
  hasTheirView?: boolean;
  /** Who writes and decides this review: "you" for the reader who does, a first name, or "an admin" when any admin may. Left out, the words' author is. */
  decider?: string | null;
}): string {
  const name = input.firstName.trim() || 'this person';
  if (input.stands === 'not-yet' && input.waitingFor) {
    const w = input.waitingFor;
    return w.label && w.userIds.includes(input.readerUserId)
      ? `After “${w.label}” is decided.`
      : afterTheKindOfCheckInIsDecided(w.scenario, name);
  }
  if (input.stands === 'decided') {
    const on = input.decidedAt ? whenItWas(input.decidedAt, 'full', 'UTC') : null;
    return on ? `Decided on ${on}.` : 'Decided.';
  }
  if (input.stands === 'started') {
    const on = input.startedAt ? whenItWas(input.startedAt, 'full', 'UTC') : null;
    const head = on ? `Started on ${on}.` : 'Started.';
    const by = input.wordsBy?.trim() || null;
    const decider = input.decider?.trim() || by;
    const written = by ? (by === 'you' ? 'You have written the review' : `${by} has written the review`) : null;
    const waitsFor = decider === 'you' ? 'your decision' : decider ? `${decider === 'an admin' ? 'an admin' : decider} to decide` : 'a decision';
    if (written && input.hasTheirView) return `${head} ${written}, and ${name} has added a view of their own. It now waits for ${waitsFor}.`;
    if (written) return `${head} ${written}, and ${name} can read it and add a view of their own.`;
    if (input.hasTheirView) {
      const notYet = decider === 'you' ? 'You have not written the review yet.' : decider && decider !== 'an admin' ? `${decider} has not written the review yet.` : 'Nobody has written the review yet.';
      return `${head} ${name} has added a view of their own. ${notYet}`;
    }
    return `${head} ${name} can read it and add a view of their own.`;
  }
  if (input.months >= 1) return `Ready to start. ${input.months} ${input.months === 1 ? 'month' : 'months'} of check-ins to draw on.`;
  return 'Ready to start.';
}
