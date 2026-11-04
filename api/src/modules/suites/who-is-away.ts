import { PrismaService } from '../prisma/prisma.service';
import { theOrganisationsZone } from '../../common/the-organisations-own-day';
import { theStartOfTheDayIn } from '../grounds/the-check-ins-own-schedule';
import { theDayIn } from '../grounds/when-a-handoff-is-due';

/**
 * WHO IS AWAY ON A DAY, FROM APPROVED LEAVE, BY DATES ONLY (week 23, decision 31).
 *
 * This is the one read the engine uses to ask "is this person away today". It reads the dates of
 * leave that has been APPROVED and nothing else: not the kind of leave, not a reason (none is kept),
 * and never a request that is still waiting or was declined. Leave that has not started yet changes
 * nothing today, and leave that has ended changes nothing either.
 *
 * It is a plain function rather than a method on the leave board so that the round counts, the
 * reminder senders and the sweeps can ask it without importing the board's module.
 */

/** A day as a person reads it, with no time of day: "2026-10-02". */
export type LeaveDay = string;

const dayOf = (d: Date): LeaveDay => d.toISOString().slice(0, 10);

/** The last day of each person's approved leave that covers the day asked about, by user id. */
export async function whoIsAwayOn(
  prisma: PrismaService,
  userIds: string[],
  organizationId: string | null,
  on: Date = new Date(),
): Promise<Map<string, LeaveDay>> {
  const away = new Map<string, LeaveDay>();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length || !(prisma as any).leaveRequest?.findMany) return away;
  /* The day in the organisation's own zone, not in UTC: at 1am in Nairobi it is already the first day of leave (pilots, problem 14). */
  const zone = organizationId ? await theOrganisationsZone(prisma as any, organizationId).catch(() => null) : null;
  const today = zone ? theDayIn(zone, on) : new Date(`${dayOf(on)}T00:00:00.000Z`);
  const rows = await prisma.leaveRequest
    .findMany({
      where: {
        userId: { in: ids },
        ...(organizationId ? { organizationId } : {}),
        status: 'approved',
        startsOn: { lte: today },
        endsOn: { gte: today },
      },
      select: { userId: true, endsOn: true },
    })
    .catch(() => [] as { userId: string; endsOn: Date }[]);
  for (const r of rows) {
    const until = dayOf(r.endsOn);
    if (!away.get(r.userId) || until > (away.get(r.userId) as string)) away.set(r.userId, until);
  }
  return away;
}

/** A stretch of approved leave: the whole of the first day to the end of the last. */
export interface Stretch { from: Date; to: Date; /** The last day as the leave gives it, so a zone behind UTC still says the right day. */ lastDay?: LeaveDay }

/**
 * Each person's approved leave, for the people on these check-ins, by participant id. One read for
 * any number of check-ins, so a list of fifty does not ask fifty times. People with no approved
 * leave are not in the map.
 */
export async function leaveOfThePeopleOn(
  prisma: PrismaService,
  groundIds: string[],
): Promise<Map<string, Stretch[]>> {
  const out = new Map<string, Stretch[]>();
  if (!groundIds.length || !(prisma as any).groundParticipant?.findMany || !(prisma as any).leaveRequest?.findMany) return out;
  const people = await prisma.groundParticipant
    .findMany({ where: { groundId: { in: groundIds }, userId: { not: null } }, select: { id: true, userId: true, ground: { select: { organizationId: true } } } })
    .catch(() => [] as any[]);
  const real = (people as any[]).filter((p) => p?.userId);
  if (!real.length) return out;
  const rows = await prisma.leaveRequest
    .findMany({
      where: { userId: { in: [...new Set(real.map((p) => p.userId as string))] }, status: 'approved' },
      select: { userId: true, organizationId: true, startsOn: true, endsOn: true },
    })
    .catch(() => [] as { userId: string; organizationId: string; startsOn: Date; endsOn: Date }[]);
  /*
   * A DAY OF LEAVE IS A DAY WHERE THE PERSON IS (pilots, 13 October 2026, problem 14). The stretch ran from midnight to
   * midnight in UTC, so Brian's Friday off in Nairobi began at 3am his time: the "opens in an hour" at 11pm on Thursday
   * and the "is open" for Friday's session, both stamped before 3am, reached him on his approved day off. Each day now
   * starts and ends in the organisation's own zone.
   */
  const zones = new Map<string, string>();
  for (const orgId of [...new Set(rows.map((r) => r.organizationId).filter(Boolean))]) {
    const z = await theOrganisationsZone(prisma as any, orgId).catch(() => null);
    if (z) zones.set(orgId, z);
  }
  const startOf = (orgId: string, d: Date) => {
    const z = zones.get(orgId);
    return z ? theStartOfTheDayIn(z, Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  };
  for (const p of real) {
    const mine = rows
      .filter((r) => r.userId === p.userId && (!p.ground?.organizationId || r.organizationId === p.ground.organizationId))
      .map((r) => ({ from: startOf(r.organizationId, r.startsOn), to: new Date(startOf(r.organizationId, new Date(r.endsOn.getTime() + 86_400_000)).getTime() - 1), lastDay: dayOf(r.endsOn) }));
    if (mine.length) out.set(p.id, mine);
  }
  return out;
}

/** The last day of the leave that covers this moment, or null when it covers none. */
export function awayUntilOn(stretches: Stretch[] | undefined, on: Date = new Date()): LeaveDay | null {
  const covering = (stretches ?? []).filter((s) => on >= s.from && on <= s.to);
  if (!covering.length) return null;
  /* The last day, as a day: the end of a stretch is a millisecond before the next day starts where the person is. */
  return covering.map((s) => s.lastDay ?? dayOf(s.to)).sort().pop() as LeaveDay;
}

/** The same, for the people on one check-in who are away today, by participant id. */
export async function whoOnACheckInIsAway(
  prisma: PrismaService,
  groundId: string,
  on: Date = new Date(),
): Promise<Map<string, LeaveDay>> {
  const out = new Map<string, LeaveDay>();
  for (const [id, stretches] of await leaveOfThePeopleOn(prisma, [groundId])) {
    const until = awayUntilOn(stretches, on);
    if (until) out.set(id, until);
  }
  return out;
}

/** Every approved stretch of leave a person has had, as whole days, for counting what they missed. */
export async function theirApprovedLeave(
  prisma: PrismaService,
  userId: string,
  organizationId: string | null,
): Promise<{ from: Date; to: Date }[]> {
  if (!userId || !(prisma as any).leaveRequest?.findMany) return [];
  const rows = await prisma.leaveRequest
    .findMany({
      where: { userId, status: 'approved', ...(organizationId ? { organizationId } : {}) },
      select: { startsOn: true, endsOn: true },
    })
    .catch(() => [] as { startsOn: Date; endsOn: Date }[]);
  return rows.map((r) => ({ from: r.startsOn, to: new Date(r.endsOn.getTime() + 86_400_000 - 1) }));
}

/** Whether a moment falls inside any of those stretches. */
export const fallsInLeave = (at: Date, stretches: { from: Date; to: Date }[]): boolean =>
  stretches.some((s) => at >= s.from && at <= s.to);

/** "Friday 2 October", the day as a person says it. */
export function saidAsADay(day: LeaveDay): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getUTCDay()];
  const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getUTCMonth()];
  return `${weekday} ${d.getUTCDate()} ${month}`;
}

export type WhoReadsIt = 'the lead' | 'a colleague' | 'the person';

/**
 * THE SENTENCE EACH READER GETS ABOUT SOMEBODY WHO IS AWAY. Dates only, never the reason or the
 * kind of leave, and always the name rather than a pronoun.
 *   the lead         "Yemi is on leave until Friday 2 October, so this round does not wait for Yemi."
 *   a colleague      "Yemi is away until Friday 2 October."
 *   the person       "You are on leave until Friday 2 October, so this round does not wait for you."
 * A colleague reads it only where the board already names the person to them; the caller decides
 * that and passes no name otherwise, and then nothing is said.
 */
export function theAwayLine(who: WhoReadsIt, name: string | null, until: LeaveDay): string | null {
  const date = saidAsADay(until);
  if (who === 'the person') return `You are on leave until ${date}, so this round does not wait for you.`;
  const n = (name ?? '').trim();
  if (!n) return null;
  if (who === 'the lead') return `${n} is on leave until ${date}, so this round does not wait for ${n}.`;
  return `${n} is away until ${date}.`;
}

/**
 * THE AWAY LINES ONE READER GETS FOR A CHECK-IN: one per person who is away and not waited on.
 * `served` is the people this reader is shown on the check-in; a colleague reads a line only for
 * someone in it who is shown by name. Nothing here names a reason or a kind of leave.
 */
/**
 * WHETHER THIS READER IS FROM OUTSIDE THE ORGANISATION THAT RUNS THE CHECK-IN: a guest (decision 36),
 * or anybody with no membership in it. Somebody from outside is never told a colleague's leave or
 * absence dates (the more private choice, 1 October 2026); only their own, which they already know.
 */
export async function isFromOutside(prisma: PrismaService, userId: string | null | undefined, organizationId: string | null | undefined): Promise<boolean> {
  if (!userId || !organizationId) return true;
  if (!(prisma as any).organizationMembership?.findUnique) return false;
  const m = await prisma.organizationMembership
    .findUnique({ where: { userId_organizationId: { userId, organizationId } }, select: { role: true } })
    .catch(() => null);
  return !m || m.role === 'GUEST';
}

/** The days each person is away, kept to the reader's own when the reader is from outside the organisation. */
export function awayUntilAsServed(awayUntil: Record<string, string>, reader: { fromOutside?: boolean; myParticipantId: string | null }): Record<string, string> {
  if (!reader.fromOutside) return awayUntil ?? {};
  return Object.fromEntries(Object.entries(awayUntil ?? {}).filter(([id]) => id === reader.myParticipantId));
}

/**
 * THE ROUND'S PROGRESS AS ONE READER IS SERVED IT: the check-in page and the report both serve it from here (2 November 2026; the
 * report served every date to every reader, a guest included). Who is away is kept to what this reader may be told; the count
 * itself already leaves them out without saying why.
 */
export async function theRoundAsServed<P extends { awayUntil?: Record<string, string>; missingParticipantIds: string[] }>(
  prisma: PrismaService,
  progress: P | null,
  reader: { userId: string | null | undefined; organizationId: string | null | undefined; myParticipantId: string | null },
): Promise<(P & { awayUntil: Record<string, string>; requestingUserIsMissing: boolean }) | null> {
  if (!progress) return null;
  const fromOutside = Object.keys(progress.awayUntil ?? {}).length ? await isFromOutside(prisma, reader.userId, reader.organizationId) : false;
  return {
    ...progress,
    awayUntil: awayUntilAsServed(progress.awayUntil ?? {}, { fromOutside, myParticipantId: reader.myParticipantId }),
    requestingUserIsMissing: !!reader.myParticipantId && progress.missingParticipantIds.includes(reader.myParticipantId),
  };
}

export function theAwayLinesFor(
  awayUntil: Record<string, string>,
  served: { id: string; nameGiven?: string | null; user?: { firstName?: string | null } | null }[],
  /** `fromOutside`: a guest from another organisation reads nobody's leave but their own. */
  reader: { viewerRunsThisGround: boolean; myParticipantId: string | null; fromOutside?: boolean },
  /** True where the name is already the one this reader is shown, and must not be cut to a first word. */
  nameIsAsShown = false,
): { participantId: string; until: LeaveDay; says: string }[] {
  const out: { participantId: string; until: LeaveDay; says: string }[] = [];
  for (const [participantId, until] of Object.entries(awayUntilAsServed(awayUntil, reader))) {
    const shown = served.find((p) => p.id === participantId);
    if (!shown) continue;
    const said = (shown.user?.firstName ?? shown.nameGiven ?? '').trim();
    const first = (nameIsAsShown ? said : said.split(/\s+/)[0]) || null;
    const who: WhoReadsIt = reader.myParticipantId === participantId ? 'the person' : reader.viewerRunsThisGround ? 'the lead' : 'a colleague';
    const says = theAwayLine(who, first, until);
    if (says) out.push({ participantId, until, says });
  }
  return out;
}
