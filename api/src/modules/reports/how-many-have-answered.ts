import { CheckInStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AN_ANSWER, wasAQuietClose } from '../grounds/an-answer-includes-a-refusal';
import { checksInOnlyWhenTheyChoose, whoASessionCounts } from '../grounds/the-lead-checks-in-when-they-choose';
import { THE_LEAD_ONLY_ASKS } from '../grounds/the-lead-who-only-asks';
import { whoOnACheckInIsAway } from '../suites/who-is-away';
import { isHeldAtTheDoor, whoIsNotLetInYet } from '../grounds/who-an-admin-did-not-let-in';
import { whoHasNotJoinedYet } from '../grounds/invited-not-joined-yet';

/**
 * WHO HAS ANSWERED, COUNTED IN ONE PLACE (Hafsah, 1 November 2026: "'who has answered' is counted in one place, and every page reads
 * it"; she approved counting everyone on the check-in, as the prototype does: "5 of 6 have checked in today; Omar hasn't yet").
 *
 * WHY. On the assessment test one session read "2 of 4" on the board, "1 of 1" on the report index, "Two of the four people have
 * answered so far" in Ask, and "100% of check-ins made this week" in the weekly report, on the same day. This file exported three
 * populations (who a round waits on, who the header counts, and a query of its own), and the check-in page kept a fourth copy in the
 * browser. There is one now: `whoHasAnswered`. Everything else here is that function, with a query in front of it or a shape behind it.
 *
 * THE RULE. Everybody on the check-in is counted, including somebody invited who has not joined yet (named as not joined, so the page
 * can say so) and somebody whose invitation ran out. Left out, by decisions already made: the lead, who checks in when they choose and
 * counts only in a session they answered (decision 133); a lead who only asks, in the anchor's situations; somebody an admin has not
 * let in, who cannot answer (decision 77); and somebody on approved leave who has not answered (week 23), named as away. Whatever any of
 * them did answer counts. A decline is an answer; a session the clock closed with nothing said is not.
 */

/** What either half needs of a person to decide whether this session waits on them. */
export interface SomebodyWhoMightAnswer {
  id: string;
  managingOnly?: boolean | null;
  /** INITIATOR is the lead, who checks in only when they choose (decision 133). */
  partyType?: string | null;
  userId?: string | null;
  invitedAt?: Date | string | null;
  inviteTokenExpiresAt?: Date | string | null;
  /**
   * The last day of approved leave that covers today, when they are away (week 23). Somebody who is
   * away is not waited on, and is not counted as still to answer; if they answer anyway, they count.
   */
  awayUntil?: string | null;
  /**
   * Not let in by an admin yet (decision 77): `notLetIn`, or the user's own hold. They cannot answer,
   * so no count waits on them and they are not in "N of M". See who-an-admin-did-not-let-in.ts.
   */
  notLetIn?: boolean;
  /**
   * Invited and has not joined yet (accepted the invitation, or come in): see invited-not-joined-yet.ts. Not
   * waited on and not in "N of M", in every session alike, until they join (Hafsah, 13 October 2026).
   */
  notJoinedYet?: boolean;
  user?: { awaitingOrgApproval?: boolean | null } | null;
  /** This session's rows for them, whatever the state. With `closedReason` and their person turns, a session the clock closed with nothing said is told apart. */
  checkIns?: { status: string; sessionNumber?: number; closedReason?: string | null; turns?: unknown[] | null }[];
}

/* A session the clock closed where the person said nothing is not an answer (57e7f40e5): the same rule as the query below, over rows in hand. */
const theyAnswered = (p: SomebodyWhoMightAnswer, sessionNumber: number): boolean =>
  (p.checkIns ?? []).some((c) => (c.sessionNumber ?? sessionNumber) === sessionNumber && (AN_ANSWER as string[]).includes(c.status) && !wasAQuietClose(c));
/* ...and it is closed, so nobody waits on them for it either. */
const theClockClosedIt = (p: SomebodyWhoMightAnswer, sessionNumber: number): boolean =>
  (p.checkIns ?? []).some((c) => (c.sessionNumber ?? sessionNumber) === sessionNumber && (AN_ANSWER as string[]).includes(c.status) && wasAQuietClose(c));

export interface WhoHasAnswered {
  sessionNumber: number;
  /** Everybody this session counts, in row order: the "6" of "5 of 6". */
  onTheCheckIn: string[];
  /** Of them, who has answered (a decline included): the "5". */
  answered: string[];
  /** Of them, who has not answered yet and whose session is still open: "Omar hasn't yet". */
  notYet: string[];
  /** Of them, who was invited and has not joined yet, so a page can say that rather than "has not answered". */
  notJoined: string[];
  /** Of them, who answered by declining: an answer, and never counted as an account given. */
  declined: string[];
  /** Not counted: on approved leave and not answered, with the last day of it. */
  away: Record<string, string>;
  /** Not counted: an admin has not let them in, and they have not answered. */
  notLetIn: string[];
}

/** THE ONE COUNT. Pure, over rows the caller holds; `howManyHaveAnswered` puts the query in front of it. */
export function whoHasAnswered<T extends SomebodyWhoMightAnswer>(people: T[], sessionNumber: number, scenario?: string | null): WhoHasAnswered {
  const theLeadOnlyAsks = THE_LEAD_ONLY_ASKS.includes(scenario ?? '');
  const out: WhoHasAnswered = { sessionNumber, onTheCheckIn: [], answered: [], notYet: [], notJoined: [], declined: [], away: {}, notLetIn: [] };
  for (const p of people ?? []) {
    const did = theyAnswered(p, sessionNumber);
    if (p.managingOnly && theLeadOnlyAsks) continue;
    if (checksInOnlyWhenTheyChoose(p) && !did) continue;
    if (isHeldAtTheDoor(p) && !did) { out.notLetIn.push(p.id); continue; }
    if (p.awayUntil && !did) { out.away[p.id] = p.awayUntil; continue; }
    out.onTheCheckIn.push(p.id);
    if (p.notJoinedYet === true && !did) out.notJoined.push(p.id);
    if (did) {
      out.answered.push(p.id);
      if (!(p.checkIns ?? []).some((c) => (c.sessionNumber ?? sessionNumber) === sessionNumber && c.status === CheckInStatus.COMPLETED && !wasAQuietClose(c))) out.declined.push(p.id);
    } else if (!theClockClosedIt(p, sessionNumber)) out.notYet.push(p.id);
  }
  return out;
}

/** The people the one count counts, as rows: for a caller that goes on to read something of each. */
export function whoIsInTheRound<T extends SomebodyWhoMightAnswer>(people: T[], sessionNumber: number, scenario?: string | null): T[] {
  const on = new Set(whoHasAnswered(people, sessionNumber, scenario).onTheCheckIn);
  return (people ?? []).filter((p) => on.has(p.id));
}

/** "N of M", from the one count. */
export function howManyInTheRoundAnswered<T extends SomebodyWhoMightAnswer>(people: T[], sessionNumber: number, scenario?: string | null): { answered: number; ofPeople: number } {
  const c = whoHasAnswered(people, sessionNumber, scenario);
  return { answered: c.answered.length, ofPeople: c.onTheCheckIn.length };
}

export interface HowManyHaveAnswered {
  answered: number;
  expected: number;
  /** Everybody this session waits on, in row order. */
  expectedIds: string[];
  /** Participant ids of people who are away today, with the last day of it, and who are not waited on. */
  awayUntil: Record<string, string>;
  /** Participant ids still expected. Names are the caller's business; this file knows none. */
  waitingOn: string[];
  /** Of those who answered, how many gave an account (COMPLETED) rather than declining. */
  completed: number;
  /** Who said no. A decline is an answer and is never counted as an account given. */
  declinedIds: string[];
  /** Participant ids of people an admin has not let in yet, who are not counted (decision 77). */
  notLetInIds: string[];
  /** Participant ids of people invited who have not joined yet, who are not counted (Hafsah, 13 October). */
  notJoinedIds: string[];
}

export async function howManyHaveAnswered(prisma: PrismaService, groundId: string, sessionNumber: number): Promise<HowManyHaveAnswered> {
  const ground = await (prisma.ground?.findUnique?.({ where: { id: groundId }, select: { scenario: true } }) ?? Promise.resolve(null)).catch(() => null);
  const away = await whoOnACheckInIsAway(prisma, groundId);
  const rows = await prisma.groundParticipant.findMany({
    where: { groundId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, userId: true, partyType: true, managingOnly: true, cameThroughTheLink: true, acceptedAt: true,
      user: { select: { awaitingOrgApproval: true } },
      checkIns: {
        where: { sessionNumber, status: { in: AN_ANSWER } },
        select: { status: true, sessionNumber: true, closedReason: true, turns: { where: { role: 'PERSON' as any }, take: 1, select: { id: true } } },
      },
    },
  } as any) as any[];
  const notJoined = await whoHasNotJoinedYet(prisma, rows as any[]).catch(() => new Set<string>());
  const notLetIn = await whoIsNotLetInYet(prisma, rows as any[]);
  const people: SomebodyWhoMightAnswer[] = rows.map((p) => ({
    ...p, notLetIn: notLetIn.has(p.id), notJoinedYet: notJoined.has(p.id), awayUntil: away.get(p.id) ?? null,
  }));
  const c = whoHasAnswered(people, sessionNumber, ground?.scenario);
  return {
    answered: c.answered.length,
    expected: c.onTheCheckIn.length,
    expectedIds: c.onTheCheckIn,
    awayUntil: c.away,
    waitingOn: c.notYet,
    completed: c.answered.length - c.declined.length,
    declinedIds: c.declined,
    notLetInIds: c.notLetIn,
    notJoinedIds: c.notJoined,
  };
}

/**
 * WHO ANSWERS THIS CHECK-IN, AS A CHECK-IN DESCRIBES ITSELF (fix plan, pattern 1; quarter test). People and setup said "7 people
 * answer every weekday" while Today said "1 of 5 have checked in": it counted the lead, who checks in when she chooses, and Samuel, who
 * was invited and had not joined. This is the round's own rule (whoIsInTheRound) for a round nobody has answered yet, without the
 * leave of the day: everybody a session waits on.
 */
export function whoAnswersThisCheckIn<T extends { managingOnly?: boolean | null; partyType?: string | null; userId?: string | null; notJoinedYet?: boolean | null }>(people: T[], scenario?: string | null): T[] {
  const asARound = (people ?? []).map((p, i) => ({ ...p, id: String(i), awayUntil: null, notJoinedYet: p.notJoinedYet === true, checkIns: [] }));
  const on = new Set(whoHasAnswered(asARound, Number.MAX_SAFE_INTEGER, scenario).onTheCheckIn);
  return (people ?? []).filter((_, i) => on.has(String(i)));
}

/**
 * THE ONE COUNT AS IT IS SERVED: who is counted and who has answered, and nothing of anybody's leave. Somebody on leave is simply not
 * counted, with no reason given. Who is away, and until when, is served once, shaped for each reader (awayUntilAsServed,
 * suites/who-is-away.ts): a guest from another organisation is never told anybody's leave but their own (1 October 2026), and the
 * count carried every date to every reader until 2 November 2026.
 */
export type TheServedCount = Omit<WhoHasAnswered, 'away'>;
const asServed = ({ away: _leaveIsNotServedHere, ...c }: WhoHasAnswered): TheServedCount => c;

/**
 * THE ONE COUNT FOR EVERY SESSION OF A CHECK-IN, IN ONE READ, as the pages are served it (the check-in page, the session rows, the
 * reports' headers and the list's attention line read this, never a rule of their own; client/src/lib/the-one-count.ts). `onlyThese`
 * keeps it to the people the reader may see, as the served roster is.
 */
export async function whoHasAnsweredInEachSession(prisma: any, groundId: string, onlyThese?: ReadonlySet<string> | null): Promise<Record<number, TheServedCount>> {
  const ground = await Promise.resolve(prisma.ground?.findUnique?.({ where: { id: groundId }, select: { scenario: true } })).catch(() => null);
  const away = await whoOnACheckInIsAway(prisma, groundId).catch(() => new Map<string, string>());
  const rows = ((await Promise.resolve(prisma.groundParticipant?.findMany?.({
    where: { groundId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, userId: true, partyType: true, managingOnly: true, cameThroughTheLink: true, acceptedAt: true,
      user: { select: { awaitingOrgApproval: true } },
      checkIns: { select: { status: true, sessionNumber: true, closedReason: true, turns: { where: { role: 'PERSON' }, take: 1, select: { id: true } } } },
    },
  })).catch(() => [])) ?? []) as any[];
  const notJoined = await whoHasNotJoinedYet(prisma, rows).catch(() => new Set<string>());
  const notLetIn = await whoIsNotLetInYet(prisma, rows).catch(() => new Map());
  const people: SomebodyWhoMightAnswer[] = rows
    .filter((p) => !onlyThese || onlyThese.has(p.id))
    .map((p) => ({ ...p, notLetIn: notLetIn.has(p.id), notJoinedYet: notJoined.has(p.id), awayUntil: away.get(p.id) ?? null }));
  /* Every session so far, and the next, so a page asking about a round nobody has a row for yet reads it too. */
  const last = Math.max(0, ...rows.flatMap((p) => (p.checkIns ?? []).map((c: any) => Number(c.sessionNumber) || 0)));
  const sessions = Array.from({ length: last + 1 }, (_, i) => i + 1);
  return Object.fromEntries(sessions.map((n) => [n, asServed(whoHasAnswered(people, n, ground?.scenario))]));
}

/** The one count of each session kept to the people a reader may see: the same as counting only them, since each person counts alone. */
export function forThesePeople(counts: Record<number, TheServedCount> | undefined, ids: ReadonlySet<string>): Record<number, TheServedCount> {
  const keep = (xs: string[]) => xs.filter((x) => ids.has(x));
  return Object.fromEntries(Object.entries(counts ?? {}).map(([n, c]) => [n, {
    ...c, onTheCheckIn: keep(c.onTheCheckIn), answered: keep(c.answered), notYet: keep(c.notYet), notJoined: keep(c.notJoined), declined: keep(c.declined),
    notLetIn: keep(c.notLetIn),
  }]));
}
