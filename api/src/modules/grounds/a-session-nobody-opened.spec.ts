jest.mock('./round-completion', () => ({ recordRoundCompletion: jest.fn(async () => false) }));

import { Cadence, CheckInStatus } from '@prisma/client';
import { ConversationService } from '../conversation/conversation.service';
import { CLOSED_BY_THE_CLOCK } from '../../common/closed-by-the-clock';
import { theSessionsNobodyOpened } from './a-session-nobody-opened';
import { whoHasMissedCheckIns, whatThePersonIsToldAboutMissing, whatTheLeadReads, TOLD_THE_PERSON, TOLD_THE_LEAD } from './missed-check-ins';

/**
 * JOURNEY TEST, ROUND 3 (12 October 2026). Participant C answered session 1, then never opened session 2
 * while the clock moved through rounds 2 and 3. Her session 2 stayed "not started", no session 3 or 4 was
 * made, and she was never counted as missed: no notice for her, nothing for the lead.
 *
 * These tests drive the real closer and the real ensureNextSession over a fake database, moving the clock
 * through each round of a weekly check-in set to every Monday in Lagos, and read what each person is told.
 */

type Row = {
  id: string; participantId: string; groundId: string; sessionNumber: number; status: CheckInStatus; isSetup: boolean; optional: boolean;
  availableFrom: Date | null; createdAt: Date; completedAt: Date | null; closedReason: string | null; missedReason: string | null; isFinal?: boolean;
  turns: { role: string }[];
};
type Person = { id: string; userId: string; partyType: string; managingOnly: boolean; firstName: string; lastName: string; leftAt: null };

const lagosMidnight = (day: string) => new Date(`${day}T00:00:00+01:00`);
const START = lagosMidnight('2026-10-05'); // Monday 5 October: round 0. Rounds open on Mondays 12, 19, 26 and 2 November.

function aWeeklyCheckIn(releaseMoment = new Date('2026-10-01T00:00:00Z')) {
  const ground = {
    id: 'g1', label: 'Weekly sales', organizationId: `org-${Math.random()}`, status: 'ACTIVE', cadence: Cadence.WEEKLY, cadenceAnchorDay: 1,
    workingDays: [1, 2, 3, 4, 5], startsAt: START, createdAt: START, endsAt: null, timelineDays: 0, runsUntilEnded: true,
  };
  const people: Person[] = [
    { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', managingOnly: false, firstName: 'Amina', lastName: 'Bello', leftAt: null },
    { id: 'p-c', userId: 'u-c', partyType: 'PARTICIPANT', managingOnly: false, firstName: 'Chiamaka', lastName: 'Obi', leftAt: null },
    { id: 'p-d', userId: 'u-d', partyType: 'PARTICIPANT', managingOnly: false, firstName: 'Dayo', lastName: 'Ade', leftAt: null },
  ];
  const rows: Row[] = [];
  const notJoined = new Set<string>();
  let n = 0;
  const add = (r: Partial<Row> & { participantId: string; sessionNumber: number }): Row => {
    const row: Row = {
      id: `ci-${(n += 1)}`, groundId: 'g1', status: CheckInStatus.NOT_STARTED, isSetup: false, optional: false, availableFrom: null,
      createdAt: new Date(), completedAt: null, closedReason: null, missedReason: null, turns: [], ...r,
    };
    rows.push(row);
    return row;
  };
  const person = (id: string) => people.find((p) => p.id === id)!;
  const personTurns = (r: Row) => r.turns.filter((t) => t.role === 'PERSON');
  const prisma: any = {
    organization: { findUnique: jest.fn(async () => ({ timeZone: 'Africa/Lagos' })) },
    /* Everybody here has joined (can sign in), except anybody put in `notJoined`. */
    user: { findMany: jest.fn(async (a: any) => (a?.where?.id?.in ?? []).filter((id: string) => !notJoined.has(id)).map((id: string) => ({ id, passwordHash: 'set', googleId: null, welcomeCardSeenAt: null }))) },
    platformSetting: { findUnique: jest.fn(async () => ({ value: { at: releaseMoment.toISOString() } })) },
    ground: { findUnique: jest.fn(async () => ground) },
    groundDependency: { findMany: jest.fn(async () => []) },
    groundParticipant: {
      findUnique: jest.fn(async (a: any) => person(a.where.id)),
      findFirst: jest.fn(async (a: any) => {
        const p = people.find((x) => x.partyType === a.where.partyType);
        return p ? { nameGiven: null, user: { firstName: p.firstName, lastName: p.lastName } } : null;
      }),
      findMany: jest.fn(async (a: any) => {
        let list = people;
        if (a.where.userId) list = list.filter((p) => p.userId === a.where.userId && p.partyType !== 'INITIATOR' && !p.managingOnly);
        return list.map((p) => ({
          id: p.id, groundId: 'g1', userId: p.userId, partyType: p.partyType, managingOnly: p.managingOnly, nameGiven: null,
          /* Joined means accepted the invitation (Hafsah, 13 October): somebody not joined has not accepted. */
          acceptedAt: notJoined.has(p.userId) ? null : new Date('2026-10-01T09:00:00Z'), cameThroughTheLink: false,
          user: { firstName: p.firstName, lastName: p.lastName },
          checkIns: rows.filter((r) => r.participantId === p.id).map((r) => ({ ...r, turns: personTurns(r).slice(0, 1) })),
        }));
      }),
    },
    checkIn: {
      findMany: jest.fn(async (a: any) => {
        /* The sweep's read: due by its own opening day, or made with none (the round is then read from the schedule). */
        const byDay = a.where.availableFrom ?? a.where.OR?.find((o: any) => o.availableFrom?.lte)?.availableFrom;
        const noDayToo = !!a.where.OR?.some((o: any) => o.availableFrom === null);
        if (!byDay) return [];
        const now: Date = byDay.lte;
        return rows
          .filter((r) => r.status === CheckInStatus.NOT_STARTED && !r.isSetup && !r.optional && (r.availableFrom ? r.availableFrom <= now : noDayToo) && personTurns(r).length === 0)
          .sort((x, y) => x.sessionNumber - y.sessionNumber)
          .map((r) => ({ ...r, participant: { id: r.participantId, userId: person(r.participantId).userId, partyType: person(r.participantId).partyType, managingOnly: person(r.participantId).managingOnly }, ground }));
      }),
      findUnique: jest.fn(async (a: any) => {
        if (a.where.id) return rows.find((r) => r.id === a.where.id) ?? null;
        const k = a.where.participantId_sessionNumber;
        return rows.find((r) => r.participantId === k.participantId && r.sessionNumber === k.sessionNumber) ?? null;
      }),
      findFirst: jest.fn(async (a: any) => rows
        .filter((r) => r.participantId === a.where.participantId && !r.isSetup && ['NOT_STARTED', 'IN_PROGRESS'].includes(r.status) && (!r.availableFrom || r.availableFrom <= new Date()))
        .sort((x, y) => y.sessionNumber - x.sessionNumber)[0] ?? null),
      updateMany: jest.fn(async (a: any) => {
        const r = rows.find((x) => x.id === a.where.id);
        if (!r || r.status !== a.where.status || personTurns(r).length > 0) return { count: 0 };
        Object.assign(r, a.data);
        return { count: 1 };
      }),
      create: jest.fn(async (a: any) => add({ ...a.data, createdAt: new Date() })),
      update: jest.fn(async () => undefined),
    },
  };
  const events = { emit: jest.fn() };
  const service = new ConversationService(prisma, {} as any, {} as any, {} as any, events as any, {} as any, {} as any, {} as any, {} as any, {} as any);

  /** The half-hourly sweep at `now`: the cron's closeTheSessionsNobodyOpenedInner, step for step. */
  const theClockRunsAt = async (now: Date) => {
    jest.setSystemTime(now);
    const due = await theSessionsNobodyOpened(prisma, now, releaseMoment);
    for (const s of due) await service.closeAsMissed(s.checkInId, s.closesAt);
    return due;
  };
  /** The person answers a session at `at`, the way a completion leaves it. */
  const answers = async (participantId: string, sessionNumber: number, at: Date) => {
    jest.setSystemTime(at);
    const r = rows.find((x) => x.participantId === participantId && x.sessionNumber === sessionNumber)!;
    Object.assign(r, { status: CheckInStatus.COMPLETED, completedAt: at, turns: [{ role: 'AI' }, { role: 'PERSON' }] });
    await (service as any).ensureNextSession('g1', participantId, sessionNumber);
  };
  const sessionsOf = (participantId: string) => rows.filter((r) => r.participantId === participantId).sort((a, b) => a.sessionNumber - b.sessionNumber);
  return { prisma, rows, people, notJoined, add, service, events, theClockRunsAt, answers, sessionsOf };
}

beforeEach(() => jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }));
afterEach(() => jest.useRealTimers());

const theDayInLagos = (d: Date | null) => (d ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(d) : null);

describe('C answers once, then never opens another session, while the clock moves through three rounds', () => {
  it('makes her a session each round, closes each unopened one as missed, tells her after two and the lead after three of four', async () => {
    const t = aWeeklyCheckIn();
    t.add({ participantId: 'p-c', sessionNumber: 1, availableFrom: START, createdAt: START });
    t.add({ participantId: 'p-lead', sessionNumber: 1, availableFrom: START, createdAt: START });
    await t.answers('p-c', 1, new Date('2026-10-06T10:00:00+01:00'));
    await t.answers('p-lead', 1, new Date('2026-10-06T11:00:00+01:00'));
    /* The lead checks in when they choose: an on-demand session they never opened is never closed or counted. */
    t.add({ participantId: 'p-lead', sessionNumber: 2, availableFrom: lagosMidnight('2026-10-12'), createdAt: lagosMidnight('2026-10-12') });
    expect(theDayInLagos(t.sessionsOf('p-c')[1].availableFrom)).toBe('2026-10-12');

    /* Round 2 is running: her session 2 is open, nothing is closed. */
    expect(await t.theClockRunsAt(new Date('2026-10-16T12:00:00+01:00'))).toEqual([]);

    /* Round 3 begins: session 2 closes as missed at the start of Monday 19, and session 3 is made for that day. */
    await t.theClockRunsAt(new Date('2026-10-19T00:30:00+01:00'));
    let c = t.sessionsOf('p-c');
    expect(c[1]).toMatchObject({ status: CheckInStatus.COMPLETED, closedReason: CLOSED_BY_THE_CLOCK, turns: [] });
    expect(c[1].completedAt).toEqual(lagosMidnight('2026-10-19'));
    expect(c).toHaveLength(3);
    expect(theDayInLagos(c[2].availableFrom)).toBe('2026-10-19');
    expect(t.events.emit).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ checkInId: c[1].id, source: 'auto-close' }));
    /* One missed: nobody is told yet. */
    expect(await whoHasMissedCheckIns(t.prisma, ['g1'], new Date('2026-10-19T09:00:00+01:00'))).toEqual([]);

    /* Round 4 begins: session 3 closes as missed, session 4 is made. Two in a row: she is told, first. */
    await t.theClockRunsAt(new Date('2026-10-26T00:30:00+01:00'));
    c = t.sessionsOf('p-c');
    expect(c[2]).toMatchObject({ status: CheckInStatus.COMPLETED, closedReason: CLOSED_BY_THE_CLOCK });
    expect(c).toHaveLength(4);
    expect(theDayInLagos(c[3].availableFrom)).toBe('2026-10-26');
    let found = await whoHasMissedCheckIns(t.prisma, ['g1'], new Date('2026-10-26T09:00:00+01:00'));
    expect(found.map((f) => [f.name, f.stand.stage, f.stand.inARow])).toEqual([['Chiamaka', TOLD_THE_PERSON, 2]]);
    const told = await whatThePersonIsToldAboutMissing(t.prisma, 'u-c', null, new Date('2026-10-26T09:00:00+01:00'));
    expect(told.map((x) => x.text)).toEqual([
      "You've missed your last two check-ins. When you miss them, your team works without your view. Things you know about surface late and Amina has to chase instead of help. Amina will see this. About ten minutes now puts your view back in the picture.",
    ]);
    expect(told[0].openCheckInId).toBe(c[3].id);

    /* Round 5 begins: session 4 closes as missed. Three of the last four: the lead is told, as facts. */
    await t.theClockRunsAt(new Date('2026-11-02T00:30:00+01:00'));
    c = t.sessionsOf('p-c');
    expect(c.map((r) => r.status)).toEqual(['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'NOT_STARTED']);
    expect(c.slice(1, 4).every((r) => r.closedReason === CLOSED_BY_THE_CLOCK && r.turns.length === 0)).toBe(true);
    found = await whoHasMissedCheckIns(t.prisma, ['g1'], new Date('2026-11-02T09:00:00+01:00'));
    expect(found).toHaveLength(1);
    expect(found[0].stand).toMatchObject({ stage: TOLD_THE_LEAD, inARow: 3, ofTheLastFour: 3, lastFour: 4 });
    expect(whatTheLeadReads(found[0].name, found[0].stand, 'Weekly sales')).toBe(
      'Chiamaka has missed 3 of the last 4 check-ins on "Weekly sales". When someone stops checking in, the team loses their view, problems surface late, and the effort to keep everyone in step falls on you and the rest of the team. Speak to Chiamaka this week.',
    );

    /* The lead's own session was never closed, and the lead is never counted. */
    expect(t.sessionsOf('p-lead')[1].status).toBe(CheckInStatus.NOT_STARTED);
    expect(found.some((f) => f.participantId === 'p-lead')).toBe(false);
  });

  it('never closes the same session twice, and a second sweep in the same round does nothing', async () => {
    const t = aWeeklyCheckIn();
    t.add({ participantId: 'p-c', sessionNumber: 1, availableFrom: lagosMidnight('2026-10-12'), createdAt: START });
    expect(await t.theClockRunsAt(new Date('2026-10-19T00:30:00+01:00'))).toHaveLength(1);
    expect(await t.theClockRunsAt(new Date('2026-10-19T01:00:00+01:00'))).toEqual([]);
    expect(t.sessionsOf('p-c')).toHaveLength(2);
  });
});

describe('somebody who answers late is not missed', () => {
  it('a session answered on the Sunday before the next round is answered, and the clock leaves it alone', async () => {
    const t = aWeeklyCheckIn();
    t.add({ participantId: 'p-d', sessionNumber: 2, availableFrom: lagosMidnight('2026-10-12'), createdAt: START });
    await t.answers('p-d', 2, new Date('2026-10-18T22:00:00+01:00'));
    await t.theClockRunsAt(new Date('2026-10-19T00:30:00+01:00'));
    const d = t.sessionsOf('p-d');
    expect(d[0]).toMatchObject({ status: CheckInStatus.COMPLETED, closedReason: null });
    expect(theDayInLagos(d[1].availableFrom)).toBe('2026-10-19');
    expect(await whoHasMissedCheckIns(t.prisma, ['g1'], new Date('2026-10-19T09:00:00+01:00'))).toEqual([]);
  });

  it('a session they opened and are still in when the round ends is not closed by this (the stale-session sweep does that)', async () => {
    const t = aWeeklyCheckIn();
    t.add({ participantId: 'p-d', sessionNumber: 2, availableFrom: lagosMidnight('2026-10-12'), createdAt: START, status: CheckInStatus.IN_PROGRESS, turns: [{ role: 'PERSON' }] });
    expect(await t.theClockRunsAt(new Date('2026-10-19T00:30:00+01:00'))).toEqual([]);
    expect(t.sessionsOf('p-d')[0].status).toBe(CheckInStatus.IN_PROGRESS);
  });
});

describe('existing check-ins carry on', () => {
  it('a session whose round closed before this version started is left waiting, and nothing new is made', async () => {
    const t = aWeeklyCheckIn(new Date('2026-10-20T12:00:00Z'));
    t.add({ participantId: 'p-c', sessionNumber: 2, availableFrom: lagosMidnight('2026-10-12'), createdAt: START });
    expect(await t.theClockRunsAt(new Date('2026-10-21T12:00:00+01:00'))).toEqual([]);
    expect(t.sessionsOf('p-c')).toHaveLength(1);
    expect(t.sessionsOf('p-c')[0].status).toBe(CheckInStatus.NOT_STARTED);
  });

  it('optional rows and set-up conversations are never closed', async () => {
    const t = aWeeklyCheckIn();
    t.add({ participantId: 'p-c', sessionNumber: 2, availableFrom: lagosMidnight('2026-10-12'), createdAt: START, optional: true });
    t.add({ participantId: 'p-d', sessionNumber: 0, availableFrom: lagosMidnight('2026-10-12'), createdAt: START, isSetup: true });
    expect(await t.theClockRunsAt(new Date('2026-10-19T00:30:00+01:00'))).toEqual([]);
  });
});

describe('A FIRST SESSION NOBODY OPENED (night quality run 4): Jared joined and never opened his session 1', () => {
  it('closes his session 1 at its round\'s close, makes each next session on schedule, tells him after two and the lead after three of four', async () => {
    const t = aWeeklyCheckIn();
    t.people.push({ id: 'p-j', userId: 'u-j', partyType: 'PARTICIPANT', managingOnly: false, firstName: 'Jared', lastName: 'Okoth', leftAt: null });
    t.people.push({ id: 'p-a', userId: 'u-a', partyType: 'PARTICIPANT', managingOnly: false, firstName: 'Amina', lastName: 'Otieno', leftAt: null });
    t.notJoined.add('u-a');
    /* Both session 1 rows were made when the check-in was set up, with no opening day of their own. */
    t.add({ participantId: 'p-j', sessionNumber: 1, availableFrom: null, createdAt: START });
    t.add({ participantId: 'p-a', sessionNumber: 1, availableFrom: null, createdAt: START });

    /* Round 1 is running: nothing is closed yet. */
    expect(await t.theClockRunsAt(new Date('2026-10-09T12:00:00+01:00'))).toEqual([]);

    /* Round 2 begins on Monday 12: his session 1 closes as missed at its start, and session 2 is made for that round. */
    await t.theClockRunsAt(new Date('2026-10-12T00:30:00+01:00'));
    let j = t.sessionsOf('p-j');
    expect(j[0]).toMatchObject({ status: CheckInStatus.COMPLETED, closedReason: CLOSED_BY_THE_CLOCK, turns: [] });
    expect(j[0].completedAt).toEqual(lagosMidnight('2026-10-12'));
    expect(j).toHaveLength(2);
    expect(theDayInLagos(j[1].availableFrom)).toBe('2026-10-12');
    expect(await whoHasMissedCheckIns(t.prisma, ['g1'], new Date('2026-10-12T09:00:00+01:00'))).toEqual([]);

    /* Round 3: two in a row. Jared is told first. */
    await t.theClockRunsAt(new Date('2026-10-19T00:30:00+01:00'));
    j = t.sessionsOf('p-j');
    expect(j).toHaveLength(3);
    expect(theDayInLagos(j[2].availableFrom)).toBe('2026-10-19');
    let found = await whoHasMissedCheckIns(t.prisma, ['g1'], new Date('2026-10-19T09:00:00+01:00'));
    expect(found.map((f) => [f.name, f.stand.stage, f.stand.inARow])).toEqual([['Jared', TOLD_THE_PERSON, 2]]);
    const told = await whatThePersonIsToldAboutMissing(t.prisma, 'u-j', null, new Date('2026-10-19T09:00:00+01:00'));
    expect(told.map((x) => x.text)).toEqual([
      "You've missed your last two check-ins. When you miss them, your team works without your view. Things you know about surface late and Amina has to chase instead of help. Amina will see this. About ten minutes now puts your view back in the picture.",
    ]);
    expect(told[0].openCheckInId).toBe(j[2].id);

    /* Round 4: three missed. The lead is told, as facts. */
    await t.theClockRunsAt(new Date('2026-10-26T00:30:00+01:00'));
    j = t.sessionsOf('p-j');
    expect(j.map((r) => r.status)).toEqual(['COMPLETED', 'COMPLETED', 'COMPLETED', 'NOT_STARTED']);
    found = await whoHasMissedCheckIns(t.prisma, ['g1'], new Date('2026-10-26T09:00:00+01:00'));
    expect(found).toHaveLength(1);
    expect(found[0].stand).toMatchObject({ stage: TOLD_THE_LEAD, inARow: 3 });
    expect(whatTheLeadReads(found[0].name, found[0].stand, 'Weekly sales')).toBe(
      'Jared has missed 3 of the last 3 check-ins on "Weekly sales". When someone stops checking in, the team loses their view, problems surface late, and the effort to keep everyone in step falls on you and the rest of the team. Speak to Jared this week.',
    );

    /* Amina was invited and has not joined: her session 1 waits, is never closed, and she is never counted. */
    expect(t.sessionsOf('p-a')).toHaveLength(1);
    expect(t.sessionsOf('p-a')[0].status).toBe(CheckInStatus.NOT_STARTED);
    expect(found.some((f) => f.participantId === 'p-a')).toBe(false);
  });
});
