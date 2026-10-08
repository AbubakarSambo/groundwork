import { CheckInStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AN_ANSWER, wasAQuietClose } from '../grounds/an-answer-includes-a-refusal';
import { waitsOnAManagingOnlyLead } from '../grounds/the-lead-who-only-asks';
import { whoOnACheckInIsAway } from '../suites/who-is-away';
import { isNotLetInYet, whoIsNotLetInYet } from '../grounds/who-an-admin-did-not-let-in';

/**
 * "N OF M ANSWERED", COMPUTED ONCE.
 *
 * It was computed independently in eight places over four different denominators - everybody, the
 * non-managing-only, raw COMPLETED rows against a head count, and so on - so the same session read
 * "3 of 4" on one screen and "3 of 5" on the next. This is the one definition: the population is the
 * one the release rule waits on (isSessionReadyForReport - everybody gives a first check-in, and from
 * session two a managing-only lead is not waited on; somebody still holding a live invitation is
 * expected), and "answered" is what an-answer-includes-a-refusal.ts says it is.
 *
 * AND IT HAPPENED AGAIN, BECAUSE THE RULE ONLY EXISTED AS A QUERY. Read on one live check-in, 22
 * September 2026: the board's header said "4 of 8 answered this round", the session report's masthead
 * said "7 of 8 answered", the finding under it said "2 of 5 people have answered this session", and
 * the lead's own page said "0 of 5 checked in". Four numbers, one session. The two counters that got
 * it wrong were pure functions that could not run a query, so they counted what they had - every row
 * on the roster, and only the COMPLETED ones.
 *
 * So the rule is a PREDICATE as well as a query. `whoIsExpected` decides the population from rows
 * somebody already holds; `howManyHaveAnswered` is that predicate with the query in front of it.
 * Nothing counts for itself any more.
 */

/** What either half needs of a person to decide whether this session waits on them. */
export interface SomebodyWhoMightAnswer {
  id: string;
  managingOnly?: boolean | null;
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
  user?: { awaitingOrgApproval?: boolean | null } | null;
  /** This session's rows for them, whatever the state. */
  checkIns?: { status: string; sessionNumber?: number }[];
}

const theyAnswered = (p: SomebodyWhoMightAnswer, sessionNumber: number): boolean =>
  (p.checkIns ?? []).some((c) => (c.sessionNumber ?? sessionNumber) === sessionNumber && (AN_ANSWER as string[]).includes(c.status));

/**
 * WHO THIS SESSION WAITS ON. The release rule, as a predicate over rows.
 *
 * Joined, or has answered, or is still holding a live invitation. A managing-only lead answers the
 * first session like everybody else and is not waited on after it. Somebody whose invitation ran out
 * without ever being opened drops out, which is what stops one unopened mail holding a round for ever.
 */
export function whoIsExpected<T extends SomebodyWhoMightAnswer>(
  people: T[],
  sessionNumber: number,
  scenario?: string | null,
  now: Date = new Date(),
): T[] {
  const waitsOnTheLead = waitsOnAManagingOnlyLead(scenario, sessionNumber);
  return (people ?? []).filter((p) => {
    if (p.managingOnly && !waitsOnTheLead) return false;
    if (p.awayUntil && !theyAnswered(p, sessionNumber)) return false;
    /* Not let in yet (decision 77): not waited on. Anything they did answer still counts. */
    if (isNotLetInYet(p) && !theyAnswered(p, sessionNumber)) return false;
    if (p.userId) return true;
    if (theyAnswered(p, sessionNumber)) return true;
    /*
     * INVITED AND NOT YET LAPSED. Where the expiry is not in hand - the roster the ground page is
     * served from does not carry it, and must not: it sits beside the invite token on the list of
     * things that never leave the server - an invitation counts as live. Being waited on until
     * proved lapsed is the honest way round: the cost is one screen holding a round open a little
     * longer, and the other way round is telling a lead everybody answered when somebody never did.
     */
    if (!p.invitedAt) return false;
    if (p.inviteTokenExpiresAt === undefined) return true;
    const until = p.inviteTokenExpiresAt ? new Date(p.inviteTokenExpiresAt) : null;
    return !!until && until.getTime() > now.getTime();
  });
}

/**
 * WHO IS IN THE ROUND, BY THE RULE THE CHECK-IN'S OWN HEADER USES. Hafsah, 28 September 2026: the
 * count a person reads ("Four of the six people have answered") counts the same people as the
 * screens' header, which is `whoIsInRound` in client/src/lib/who-is-in-this-round.ts: everybody,
 * and a lead who only asks in the first round only. `whoIsExpected` above is the round-closing rule,
 * which also leaves out an invitation that lapsed; that stays for deciding when a round is done and
 * who is still waited on, but it is not the number people read.
 */
export function whoIsInTheRound<T extends { managingOnly?: boolean | null; awayUntil?: string | null; checkIns?: { status: string; sessionNumber?: number }[] }>(people: T[], sessionNumber: number, scenario?: string | null): T[] {
  const waitsOnTheLead = waitsOnAManagingOnlyLead(scenario, sessionNumber);
  /* Somebody away, who has not answered, is not in the count this round waits on (week 23). */
  /* And somebody an admin has not let in yet, who has not answered, is not in it either (decision 77). */
  return (people ?? []).filter((p) => (!p.managingOnly || waitsOnTheLead)
    && !((p as unknown as SomebodyWhoMightAnswer).awayUntil && !theyAnswered(p as unknown as SomebodyWhoMightAnswer, sessionNumber))
    && !(isNotLetInYet(p) && !theyAnswered(p as unknown as SomebodyWhoMightAnswer, sessionNumber)));
}

/** Of the people in the round, by the header's rule, how many have answered this round. */
export function howManyInTheRoundAnswered<T extends SomebodyWhoMightAnswer>(people: T[], sessionNumber: number, scenario?: string | null): { answered: number; ofPeople: number } {
  const inRound = whoIsInTheRound(people, sessionNumber, scenario);
  return { answered: inRound.filter((p) => theyAnswered(p, sessionNumber)).length, ofPeople: inRound.length };
}

/** Of the people this session waits on, how many have answered - a decline being an answer. */
export function howManyOfThemAnswered<T extends SomebodyWhoMightAnswer>(
  people: T[],
  sessionNumber: number,
  scenario?: string | null,
  now: Date = new Date(),
): { answered: number; expected: number; waitingOn: string[] } {
  const expected = whoIsExpected(people, sessionNumber, scenario, now);
  const answered = expected.filter((p) => theyAnswered(p, sessionNumber));
  return {
    answered: answered.length,
    expected: expected.length,
    waitingOn: expected.filter((p) => !theyAnswered(p, sessionNumber)).map((p) => p.id),
  };
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
}

export async function howManyHaveAnswered(prisma: PrismaService, groundId: string, sessionNumber: number): Promise<HowManyHaveAnswered> {
  /* And a lead who only asks is not waited on at all - see the-lead-who-only-asks. */
  /* Optional-chained the way the rest of this codebase reaches a model a test double may not carry:
     with no ground read, the rule falls back to what it did before - managing-only leads are out. */
  const ground = await (prisma.ground?.findUnique?.({ where: { id: groundId }, select: { scenario: true } }) ?? Promise.resolve(null)).catch(() => null);
  const away = await whoOnACheckInIsAway(prisma, groundId);
  const everyone = await prisma.groundParticipant.findMany({
    where: {
      groundId,
      ...(waitsOnAManagingOnlyLead(ground?.scenario, sessionNumber) ? {} : { managingOnly: false }),
      OR: [
        { userId: { not: null } },
        { checkIns: { some: { sessionNumber, status: { in: AN_ANSWER } } } },
        { userId: null, invitedAt: { not: null }, inviteTokenExpiresAt: { gt: new Date() } },
      ],
    },
    select: {
      id: true, userId: true,
      checkIns: {
        where: { sessionNumber, status: { in: AN_ANSWER } },
        select: { status: true, closedReason: true, turns: { where: { role: 'PERSON' as any }, take: 1, select: { id: true } } },
      },
    },
  }).then((rows: any[]) => rows.map((p) => {
    /* A session the clock closed with nothing said is not an answer: not counted, and not waited on either (it is closed). */
    const real = p.checkIns.filter((c: any) => !wasAQuietClose(c));
    return { id: p.id, userId: p.userId, checkIns: real as { status: string }[], quiet: real.length === 0 && p.checkIns.length > 0 };
  }));
  /* Not let in yet and not answered: not waited on, and not in the count (decision 77). */
  const notLetIn = await whoIsNotLetInYet(prisma, everyone as any[]);
  const heldOut = (p: { id: string; checkIns: unknown[] }) => notLetIn.has(p.id) && p.checkIns.length === 0;
  /* Away and not answered: not waited on. Away and answered anyway: counted like anybody. */
  const expected = everyone.filter((p) => !(away.has(p.id) && p.checkIns.length === 0) && !heldOut(p));
  const answeredRows = expected.filter((p) => p.checkIns.length > 0);
  return {
    answered: answeredRows.length,
    expected: expected.length,
    expectedIds: expected.map((p) => p.id),
    awayUntil: Object.fromEntries(everyone.filter((p) => away.has(p.id) && p.checkIns.length === 0 && !heldOut(p)).map((p) => [p.id, away.get(p.id) as string])),
    waitingOn: expected.filter((p) => p.checkIns.length === 0 && !p.quiet).map((p) => p.id),
    completed: answeredRows.filter((p) => p.checkIns.some((c) => c.status === CheckInStatus.COMPLETED)).length,
    declinedIds: expected
      .filter((p) => p.checkIns.length > 0 && !p.checkIns.some((c) => c.status === CheckInStatus.COMPLETED))
      .map((p) => p.id),
    notLetInIds: everyone.filter(heldOut).map((p) => p.id),
  };
}
