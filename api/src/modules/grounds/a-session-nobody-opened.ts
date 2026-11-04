import { Cadence, CheckInStatus, GroundStatus } from '@prisma/client';
import { theOrganisationsZone } from '../../common/the-organisations-own-day';
import { A_GROUND_IS_HELD, A_GROUND_THE_JOBS_LEAVE_ALONE } from './a-ground-that-has-ended';
import { checksInOnlyWhenTheyChoose } from './the-lead-checks-in-when-they-choose';
import { whenTheRoundCloses } from './the-check-ins-own-schedule';
import { whoHasNotJoinedYet } from './invited-not-joined-yet';
import { isNotLetInYet } from './who-an-admin-did-not-let-in';

/**
 * A SESSION NOBODY OPENED IS CLOSED BY THE CLOCK WHEN ITS ROUND CLOSES (journey test, round 3, 12 October 2026).
 *
 * Participant C answered session 1, then never opened session 2 while the clock moved through rounds 2 and
 * 3. The clock only ever closed a session somebody had STARTED (autoCloseStaleCheckIns reads IN_PROGRESS),
 * and the next session is only made when one finishes, so her session 2 stayed "not started" for ever, no
 * session 3 or 4 was made, and she was never counted as missed: no notice for her, nothing for the lead.
 *
 * Now, on the check-in's own schedule (decision 135): a session that opened and was never opened by the
 * person is closed by the clock at the moment the next round begins, with nothing said, and their next
 * session is made for that round whether or not they answered (decision 136 then counts it as missed).
 *
 * Left alone, always:
 *   - the lead's own sessions and any managing-only row: they check in when they choose (decision 133);
 *   - optional rows and set-up conversations;
 *   - a check-in that is over, stalled or on hold;
 *   - SEQUENTIAL and ONE_TIME check-ins, which have no rounds on a clock;
 *   - a session somebody has opened: the stale-session sweep closes those, as before;
 *   - EXISTING CHECK-INS (decision 135: from the next session onwards): a session whose round had already
 *     closed before this version first started is never closed by this, so nobody's waiting session
 *     closes, and nobody gets a new one, on release night.
 *   - somebody invited who has not joined yet, or not let in yet by an admin (decision 8, night run 3): their
 *     session waits for them, unclosed and not missed, and they are in no count until they come in.
 *
 * A FIRST SESSION NOBODY OPENED (night quality run 4, 12 October 2026). Jared joined and never opened his
 * session 1. That row was made with no `availableFrom`, and this sweep only read rows that had one, so he was
 * never closed as missed, never given session 2, never counted and never told. A due session with no
 * opening day of its own now belongs to the round running when it was made, on the check-in's schedule, and
 * closes when that round closes, like everyone's. People who have not joined yet are still left alone.
 * Approved leave is not decided here: the session closes, and the count of missed check-ins leaves it out.
 */

export interface ASessionToClose {
  checkInId: string;
  groundId: string;
  participantId: string;
  sessionNumber: number;
  /** When its round closed: the start of the next round's day in the organisation's zone. */
  closesAt: Date;
}

const ON_A_CLOCK: Cadence[] = [Cadence.DAILY, Cadence.WEEKLY, Cadence.FORTNIGHTLY, Cadence.MONTHLY];
const LEFT_ALONE: GroundStatus[] = [...A_GROUND_THE_JOBS_LEAVE_ALONE, ...A_GROUND_IS_HELD];

/** The sessions nobody opened whose round has closed by `now`, oldest first. */
export async function theSessionsNobodyOpened(prisma: any, now: Date, releaseMoment: Date, only: { checkInId?: string } = {}): Promise<ASessionToClose[]> {
  const rows: any[] = await prisma.checkIn.findMany({
    where: {
      ...(only.checkInId ? { id: only.checkInId } : {}),
      status: CheckInStatus.NOT_STARTED,
      isSetup: false,
      optional: false,
      /* A first session made with no opening day of its own (Jared, night run 4) is due too: its round is read
         from the check-in's schedule below, from the day the row was made, the same rule as everyone's. */
      OR: [{ availableFrom: { lte: now } }, { availableFrom: null }],
      turns: { none: { role: 'PERSON' } },
      participant: { leftAt: null },
      ground: { status: { notIn: LEFT_ALONE }, cadence: { in: ON_A_CLOCK } },
    },
    select: {
      id: true, groundId: true, participantId: true, sessionNumber: true, availableFrom: true, createdAt: true,
      participant: { select: { id: true, userId: true, partyType: true, managingOnly: true, cameThroughTheLink: true, user: { select: { awaitingOrgApproval: true } } } },
      ground: { select: { cadence: true, cadenceDays: true, cadenceAnchorDay: true, workingDays: true, startsAt: true, createdAt: true, organizationId: true } },
    },
    orderBy: [{ sessionNumber: 'asc' }],
  });
  const out: ASessionToClose[] = [];
  const notJoined = await whoHasNotJoinedYet(prisma, (rows ?? []).map((r) => r.participant).filter(Boolean));
  const zones = new Map<string, string | null>();
  for (const r of rows ?? []) {
    if (checksInOnlyWhenTheyChoose(r.participant)) continue;
    if (notJoined.has(r.participant?.id) || isNotLetInYet(r.participant)) continue;
    const g = r.ground;
    if (!g || !ON_A_CLOCK.includes(g.cadence)) continue;
    const orgId = g.organizationId as string | null;
    if (orgId && !zones.has(orgId)) zones.set(orgId, await theOrganisationsZone(prisma, orgId).catch(() => null));
    /* No opening day of its own: the round it belongs to is the round running when it was made (a row made
       before the first round day is the first round), on the check-in's own schedule. */
    const openedAt: Date = r.availableFrom ?? r.createdAt;
    if (!openedAt) continue;
    const closesAt = whenTheRoundCloses(
      {
        cadence: g.cadence,
        anchorDay: g.cadenceAnchorDay ?? null,
        days: (g as any).cadenceDays ?? null,
        workingDays: g.workingDays ?? [],
        startedAt: g.startsAt ?? g.createdAt ?? openedAt,
        startsNow: !g.startsAt,
        zone: orgId ? zones.get(orgId) ?? null : null,
      },
      new Date(openedAt),
    );
    if (!closesAt || closesAt > now) continue;
    /* Existing check-ins: a round that closed before this version started is left as it was. */
    if (closesAt <= releaseMoment) continue;
    out.push({ checkInId: r.id, groundId: r.groundId, participantId: r.participantId, sessionNumber: r.sessionNumber, closesAt });
  }
  return out;
}

/**
 * ONE SESSION, AT THE MOMENT ITS PERSON OPENS IT (engine test, second run, Drop Access and Muchemi & Co). The sweep above runs every half
 * hour, so a session whose round had closed could still be opened and answered before the sweep reached it. Joseph left Thursday 15
 * October's session and opened it on Friday at 14:07; his Friday answer went into Thursday's session, Friday's opened the minute he
 * finished, he was told at 14:30 "your check-in for Sales team, Q4 is overdue", and Grace's board said he had not checked in, on a day
 * he had answered (David, who left Tuesday on the litigation daily, the same). Read with exactly the sweep's rules, for one session:
 * when its round closed, or null where it is still its round, somebody has said something in it, or the sweep would leave it alone.
 */
export async function whenThisSessionsRoundClosed(prisma: any, checkInId: string, now: Date, releaseMoment: Date): Promise<Date | null> {
  const due = await theSessionsNobodyOpened(prisma, now, releaseMoment, { checkInId });
  return due.find((s) => s.checkInId === checkInId)?.closesAt ?? null;
}
