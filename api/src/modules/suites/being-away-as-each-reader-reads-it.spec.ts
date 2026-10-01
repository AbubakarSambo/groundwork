import { howManyHaveAnswered, whoIsExpected, whoIsInTheRound } from '../reports/how-many-have-answered';
import { recordRoundCompletion } from '../grounds/round-completion';
import { howACheckInIsGoing } from '../grounds/how-a-check-in-is-going';
import { keptLately } from '../grounds/your-board';
import { whetherToSend } from '../email/nothing-goes-out-that-was-turned-off';
import { theAwayLine, theAwayLinesFor, theirApprovedLeave, whoIsAwayOn } from './who-is-away';

/**
 * BEING AWAY (week 23, decision 31). The dates of approved leave, and nothing else, reach the engine.
 * While somebody is away today: the round does not wait for them, no reminder goes to them, and
 * nothing counts against them. Leave that is waiting, declined, not started or over changes nothing.
 * Every reader's sentence is asserted word for word, and none of them carries a reason or a kind.
 */

const TODAY = new Date('2026-09-30T09:00:00.000Z');
const day = (d: string) => new Date(`${d}T00:00:00.000Z`);

/** A small database of leave and a check-in with three people; enough to run the real queries. */
function world(leave: { userId: string; status: string; startsOn: string; endsOn: string }[]) {
  const people = [
    { id: 'pA', userId: 'uA', managingOnly: false, ground: { organizationId: 'org' } },
    { id: 'pB', userId: 'uB', managingOnly: false, ground: { organizationId: 'org' } },
    { id: 'pY', userId: 'uY', managingOnly: false, ground: { organizationId: 'org' } },
  ];
  const checkIns: any[] = [];
  const created: any[] = [];
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ scenario: 'GOAL_ALIGNMENT' })) },
    leaveRequest: {
      findMany: jest.fn(async ({ where }: any) =>
        leave
          .filter((l) => (!where.userId?.in || where.userId.in.includes(l.userId)) && (!where.status || l.status === where.status)
            && (!where.startsOn || day(l.startsOn) <= where.startsOn.lte) && (!where.endsOn || day(l.endsOn) >= where.endsOn.gte))
          .map((l) => ({ userId: l.userId, organizationId: 'org', startsOn: day(l.startsOn), endsOn: day(l.endsOn) }))),
    },
    groundParticipant: {
      findMany: jest.fn(async ({ where }: any) => {
        if (where.userId?.not === null && where.groundId) return people;
        return people.map((p) => ({ id: p.id, checkIns: checkIns.filter((c) => c.participantId === p.id && c.sessionNumber === 1) }));
      }),
    },
    checkIn: {
      count: jest.fn(async ({ where }: any) => checkIns.filter((c) => where.participantId.in.includes(c.participantId) && where.status.in ? where.status.in.includes(c.status) : where.status === c.status).length),
      findMany: jest.fn(async ({ where }: any) => checkIns.filter((c) => where.participantId.in.includes(c.participantId))),
    },
    roundCompletion: { create: jest.fn(async ({ data }: any) => { created.push(data); }) },
    groundObjective: { findMany: jest.fn(async () => []) },
  };
  return { prisma, checkIns, created };
}

const onLeave = (extra: Partial<{ status: string; startsOn: string; endsOn: string }> = {}) =>
  [{ userId: 'uY', status: 'approved', startsOn: '2026-09-28', endsOn: '2026-10-02', ...extra }];

describe('who is away today', () => {
  it('reads the last day of approved leave that covers today', async () => {
    const { prisma } = world(onLeave());
    expect([...(await whoIsAwayOn(prisma, ['uA', 'uY'], 'org', TODAY))]).toEqual([['uY', '2026-10-02']]);
  });
  it.each([
    ['not yet approved', { status: 'waiting' }],
    ['declined', { status: 'declined' }],
    ['not started yet', { startsOn: '2026-10-05', endsOn: '2026-10-09' }],
    ['already over', { startsOn: '2026-09-01', endsOn: '2026-09-05' }],
  ])('leave that is %s changes nothing', async (_why, extra) => {
    const { prisma } = world(onLeave(extra as any));
    expect((await whoIsAwayOn(prisma, ['uY'], 'org', TODAY)).size).toBe(0);
  });
});

describe('the round does not wait for somebody who is away', () => {
  it('does not count them as still to answer', async () => {
    const { prisma, checkIns } = world(onLeave());
    checkIns.push({ participantId: 'pA', sessionNumber: 1, status: 'COMPLETED' }, { participantId: 'pB', sessionNumber: 1, status: 'COMPLETED' });
    jest.useFakeTimers().setSystemTime(TODAY);
    try {
      const r = await howManyHaveAnswered(prisma, 'g', 1);
      expect(r.expected).toBe(2);
      expect(r.waitingOn).toEqual([]);
      expect(r.awayUntil).toEqual({ pY: '2026-10-02' });
    } finally { jest.useRealTimers(); }
  });
  it('still waits for them when the leave is only waiting for approval', async () => {
    const { prisma, checkIns } = world(onLeave({ status: 'waiting' }));
    checkIns.push({ participantId: 'pA', sessionNumber: 1, status: 'COMPLETED' }, { participantId: 'pB', sessionNumber: 1, status: 'COMPLETED' });
    jest.useFakeTimers().setSystemTime(TODAY);
    try {
      const r = await howManyHaveAnswered(prisma, 'g', 1);
      expect(r.expected).toBe(3);
      expect(r.waitingOn).toEqual(['pY']);
    } finally { jest.useRealTimers(); }
  });
  it('counts them like anybody if they answer anyway', async () => {
    const { prisma, checkIns } = world(onLeave());
    checkIns.push({ participantId: 'pY', sessionNumber: 1, status: 'COMPLETED' });
    jest.useFakeTimers().setSystemTime(TODAY);
    try {
      const r = await howManyHaveAnswered(prisma, 'g', 1);
      expect(r.expected).toBe(3);
      expect(r.awayUntil).toEqual({});
    } finally { jest.useRealTimers(); }
  });
  it('releases the round without them, and records it as two people', async () => {
    const { prisma, checkIns, created } = world(onLeave());
    checkIns.push({ participantId: 'pA', sessionNumber: 1, status: 'COMPLETED' }, { participantId: 'pB', sessionNumber: 1, status: 'COMPLETED' });
    jest.useFakeTimers().setSystemTime(TODAY);
    try {
      const emit = jest.fn();
      expect(await recordRoundCompletion(prisma, { emit } as any, 'g', 1)).toBe(true);
      expect(created[0].participantCount).toBe(2);
      expect(emit).toHaveBeenCalled();
    } finally { jest.useRealTimers(); }
  });
  it('does not release the round without them when they are not away', async () => {
    const { prisma, checkIns } = world([]);
    checkIns.push({ participantId: 'pA', sessionNumber: 1, status: 'COMPLETED' }, { participantId: 'pB', sessionNumber: 1, status: 'COMPLETED' });
    expect(await recordRoundCompletion(prisma, { emit: jest.fn() } as any, 'g', 1)).toBe(false);
  });
  it('the count a person reads, and the one the round waits on, leave them out', () => {
    const people = [
      { id: 'a', userId: 'u', checkIns: [{ status: 'COMPLETED', sessionNumber: 1 }] },
      { id: 'y', userId: 'v', awayUntil: '2026-10-02', checkIns: [] },
    ];
    expect(whoIsExpected(people, 1).map((p) => p.id)).toEqual(['a']);
    expect(whoIsInTheRound(people, 1).map((p) => p.id)).toEqual(['a']);
    expect(whoIsInTheRound([{ ...people[1], checkIns: [{ status: 'COMPLETED', sessionNumber: 1 }] }], 1)).toHaveLength(1);
  });
  it('the list and the board do not hold a round open for them', () => {
    const rows = [
      { participantId: 'pA', sessionNumber: 1, status: 'COMPLETED' },
      { participantId: 'pY', sessionNumber: 1, status: 'NOT_STARTED' },
    ];
    const leave = new Map([['pY', [{ from: day('2026-09-28'), to: new Date(day('2026-10-02').getTime() + 86_399_999) }]]]);
    const going = (withLeave: boolean) => howACheckInIsGoing({
      checkIns: rows as any, participants: [{ id: 'pA', userId: 'uA' }, { id: 'pY', userId: 'uY' }], dependencies: [],
      timelineDays: 14, cadence: 'WEEKLY', sharedPicture: null, ...(withLeave ? { leave } : {}),
    }, TODAY).glance.progress;
    expect(going(true)).toMatchObject({ roundsDone: 1, answeredThisRound: 1, ofPeople: 1, waitingOn: [] });
    expect(going(false)).toMatchObject({ roundsDone: 0, ofPeople: 2, waitingOn: ['pY'] });
  });
});

describe('no reminder goes to somebody who is away', () => {
  const they = { awayUntil: '2026-10-02', emailNotifications: true };
  it.each(['sendNudge', 'sendAbsenceReminder', 'sendSessionReady'])('%s is not sent', (sender) => {
    expect(whetherToSend('we decided to send it', they, sender)).toMatchObject({ send: false });
  });
  it('is sent again once they are back, and is unchanged for mail they asked for', () => {
    expect(whetherToSend('we decided to send it', { ...they, awayUntil: null }, 'sendNudge')).toEqual({ send: true });
    expect(whetherToSend('asked for', they, 'sendReportReady')).toEqual({ send: true });
    expect(whetherToSend('the way back in', they, 'sendMagicLinkEmail')).toEqual({ send: true });
  });
});

describe('nothing counts against somebody for days spent on leave', () => {
  const leave = [{ from: day('2026-09-28'), to: new Date(day('2026-10-02').getTime() + 86_399_999) }];
  const rows = [
    { status: 'DONE', createdAt: '2026-09-20T09:00:00Z' },
    { status: 'NOT_DONE', createdAt: '2026-09-29T09:00:00Z' },
    { status: 'NOT_DONE', createdAt: '2026-09-21T09:00:00Z' },
  ];
  it('a promise not kept on a day of leave is not counted as a miss', () => {
    expect(keptLately(rows, TODAY, leave)).toMatchObject({ kept: 1, of: 2 });
    expect(keptLately(rows, TODAY)).toMatchObject({ kept: 1, of: 3 });
  });
  it('reads approved leave only, as whole days', async () => {
    const { prisma } = world([...onLeave(), { userId: 'uY', status: 'waiting', startsOn: '2026-11-01', endsOn: '2026-11-05' }]);
    const stretches = await theirApprovedLeave(prisma, 'uY', 'org');
    expect(stretches).toHaveLength(1);
    expect(stretches[0].to.toISOString()).toBe('2026-10-02T23:59:59.999Z');
  });
});

describe('what each person reads', () => {
  const served = [{ id: 'pY', user: { firstName: 'Yemi' } }, { id: 'pA', user: { firstName: 'Ade' } }];
  const away = { pY: '2026-10-02' };

  it('the lead reads the decided sentence', () => {
    expect(theAwayLinesFor(away, served, { viewerRunsThisGround: true, myParticipantId: 'pA' })).toEqual([
      { participantId: 'pY', until: '2026-10-02', says: 'Yemi is on leave until Friday 2 October, so this round does not wait for Yemi.' },
    ]);
  });
  it('a colleague reads only that the person is away until a date', () => {
    expect(theAwayLinesFor(away, served, { viewerRunsThisGround: false, myParticipantId: 'pA' }).map((l) => l.says))
      .toEqual(['Yemi is away until Friday 2 October.']);
  });
  it('a colleague reads nothing about a person they are not shown by name', () => {
    expect(theAwayLinesFor(away, [{ id: 'pY', user: null }], { viewerRunsThisGround: false, myParticipantId: 'pA' })).toEqual([]);
    expect(theAwayLinesFor(away, [], { viewerRunsThisGround: false, myParticipantId: 'pA' })).toEqual([]);
  });
  it('the person reads their own', () => {
    expect(theAwayLinesFor(away, served, { viewerRunsThisGround: false, myParticipantId: 'pY' }).map((l) => l.says))
      .toEqual(['You are on leave until Friday 2 October, so this round does not wait for you.']);
  });
  it('never carries a reason, a kind of leave, or a pronoun', () => {
    for (const who of ['the lead', 'a colleague', 'the person'] as const) {
      const said = theAwayLine(who, 'Yemi', '2026-10-02') ?? '';
      expect(said).not.toMatch(/\b(annual|sick|medical|parental|maternity|holiday|vacation|she|he|her|his|him|they|their)\b/i);
    }
  });
});
