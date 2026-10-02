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
 * Who reads the check-in's name. Only somebody who takes part in that check-in reads its name ("After
 * “Kwame, first 90 days” is decided."), because a name like "Kwame, performance plan" says what it is.
 * Anybody else who may read the board (an admin, the lead of the team) reads that a check-in about the
 * person comes first, and nothing more.
 */

export type Stands = 'ready' | 'started' | 'decided' | 'not-yet';

/** An open check-in that decides something about this person, as far as the board needs it. */
export interface WaitingFor { groundId: string; label: string; userIds: string[] }

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
    select: { id: true, label: true, participants: { select: { id: true, userId: true, partyType: true, managingOnly: true, createdAt: true } } },
  }).catch(() => []);
  for (const g of grounds ?? []) {
    const subject = theSubjectOfAnEvaluationCheckIn(g.participants ?? []);
    const who = (g.participants ?? []).find((p: any) => p.id === subject)?.userId;
    if (!who || out.has(who)) continue;
    out.set(who, { groundId: g.id, label: String(g.label ?? '').trim(), userIds: (g.participants ?? []).map((p: any) => p.userId).filter(Boolean) });
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

/** The sentence under "Where it stands", for this reader. */
export function whereItStandsSaid(input: {
  stands: Stands;
  firstName: string;
  months: number;
  startedAt?: Date | string | null;
  decidedAt?: Date | string | null;
  waitingFor?: WaitingFor | null;
  readerUserId: string;
}): string {
  const name = input.firstName.trim() || 'this person';
  if (input.stands === 'not-yet' && input.waitingFor) {
    const w = input.waitingFor;
    return w.label && w.userIds.includes(input.readerUserId)
      ? `After “${w.label}” is decided.`
      : `After a check-in about ${name} is decided.`;
  }
  if (input.stands === 'decided') {
    const on = input.decidedAt ? whenItWas(input.decidedAt, 'full', 'UTC') : null;
    return on ? `Decided on ${on}.` : 'Decided.';
  }
  if (input.stands === 'started') {
    const on = input.startedAt ? whenItWas(input.startedAt, 'full', 'UTC') : null;
    return on ? `Started on ${on}. ${name} can read it and add a view of their own.` : `Started. ${name} can read it and add a view of their own.`;
  }
  if (input.months >= 1) return `Ready to start. ${input.months} ${input.months === 1 ? 'month' : 'months'} of check-ins to draw on.`;
  return 'Ready to start.';
}
