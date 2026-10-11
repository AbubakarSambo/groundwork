import { Cadence } from '@prisma/client';
import { ConversationService } from './conversation.service';

/**
 * B-161, DECISION 135: EVERY NEXT SESSION OPENS ON THE CHECK-IN'S OWN SCHEDULE.
 *
 * Final evaluation, 11 October: a weekly check-in set to every Monday. Brian answered week 1 a day late,
 * on Tuesday 13 October at 13:02, and his week 2 was set to open on Monday 26 October, not Monday 19
 * October with everyone else. Wairimu finished at 07:32 on 12 October, so her next one opened at 07:32 a
 * week later, not at the start of the day. The next session was 7 days after the person FINISHED, rolled
 * forward to the set day.
 *
 * Now it opens on the check-in's set day, at the start of that day in the organisation's time zone, the
 * same for the whole team, whenever they finished. These tests drive the real ensureNextSession with a
 * fake database and read the `availableFrom` it writes.
 */

type Row = { participantId: string; sessionNumber: number; availableFrom: Date | null; createdAt: Date; isFinal?: boolean };

let orgCount = 0;

function aCheckIn(ground: { cadence: Cadence; cadenceAnchorDay?: number | null; startsAt?: Date | null; createdAt: Date; workingDays?: number[]; timeZone: string; endsAt?: Date | null }) {
  /* A fresh organisation each time: the organisation's zone is kept for ten minutes per organisation. */
  const organizationId = `org-${(orgCount += 1)}`;
  const rows: Row[] = [];
  const prisma: any = {
    organization: { findUnique: jest.fn(async () => ({ timeZone: ground.timeZone })) },
    user: { findMany: jest.fn(async () => []) },
    ground: {
      findUnique: jest.fn(async () => ({
        cadence: ground.cadence,
        cadenceAnchorDay: ground.cadenceAnchorDay ?? null,
        endsAt: ground.endsAt ?? null,
        status: 'ACTIVE',
        workingDays: ground.workingDays ?? [],
        timelineDays: 0,
        runsUntilEnded: true,
        startsAt: ground.startsAt ?? null,
        createdAt: ground.createdAt,
        organizationId,
      })),
    },
    groundParticipant: { findUnique: jest.fn(async () => ({ managingOnly: false, partyType: 'PARTICIPANT' })), findMany: jest.fn(async () => []) },
    checkIn: {
      findUnique: jest.fn(async (a: any) => {
        const k = a.where.participantId_sessionNumber;
        return rows.find((r) => r.participantId === k.participantId && r.sessionNumber === k.sessionNumber) ?? null;
      }),
      create: jest.fn(async (a: any) => {
        const row = { ...a.data, createdAt: new Date() };
        rows.push(row);
        return row;
      }),
      update: jest.fn(async () => undefined),
      findFirst: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
    },
  };
  const service = new ConversationService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  const opened = (participantId: string, sessionNumber: number, availableFrom: Date | null, createdAt = availableFrom ?? ground.createdAt) => {
    rows.push({ participantId, sessionNumber, availableFrom, createdAt });
  };
  /** The person finishes `sessionNumber` at `at`; returns the next session's availableFrom. */
  const finishes = async (participantId: string, sessionNumber: number, at: Date): Promise<Date | null | undefined> => {
    jest.setSystemTime(at);
    await (service as any).ensureNextSession('g1', participantId, sessionNumber);
    return rows.find((r) => r.participantId === participantId && r.sessionNumber === sessionNumber + 1)?.availableFrom;
  };
  return { opened, finishes, rows, prisma };
}

const at = (iso: string) => new Date(iso);
const MONDAY = 1;

beforeEach(() => jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }));
afterEach(() => jest.useRealTimers());

describe('B-161: a weekly check-in set to every Monday, in Nairobi', () => {
  const monday12 = at('2026-10-12T05:00:00Z'); // Monday 12 October, 08:00 in Nairobi
  const monday19 = at('2026-10-18T21:00:00Z'); // Monday 19 October, 00:00 in Nairobi
  const weekly = () => aCheckIn({ cadence: Cadence.WEEKLY, cadenceAnchorDay: MONDAY, startsAt: monday12, createdAt: at('2026-10-09T09:00:00Z'), timeZone: 'Africa/Nairobi' });

  it('someone answering a day late gets next week on the set day, at the start of the day in the organisation time zone', async () => {
    const c = weekly();
    c.opened('brian', 1, monday12);
    expect(await c.finishes('brian', 1, at('2026-10-13T13:02:41Z'))).toEqual(monday19);
  });

  it('someone answering on the day gets the start of next Monday, not the minute they finished', async () => {
    const c = weekly();
    c.opened('wairimu', 1, monday12);
    expect(await c.finishes('wairimu', 1, at('2026-10-12T07:32:00Z'))).toEqual(monday19);
  });

  it('the lead and two people who finish at different times all get the same day', async () => {
    const c = weekly();
    for (const p of ['lead', 'wairimu', 'brian']) c.opened(p, 1, monday12);
    const got = [
      await c.finishes('wairimu', 1, at('2026-10-12T07:32:00Z')),
      await c.finishes('lead', 1, at('2026-10-14T16:45:00Z')),
      await c.finishes('brian', 1, at('2026-10-13T13:02:41Z')),
    ];
    expect(got).toEqual([monday19, monday19, monday19]);
  });

  it('someone a whole round late gets the round running now, and the round after on the set day', async () => {
    const c = weekly();
    c.opened('brian', 1, monday12);
    const wednesday21 = at('2026-10-21T10:00:00Z');
    expect(await c.finishes('brian', 1, wednesday21)).toEqual(wednesday21); // open straight away
    expect(await c.finishes('brian', 2, at('2026-10-22T08:00:00Z'))).toEqual(at('2026-10-25T21:00:00Z')); // Monday 26 October
  });

  it('never opens two sessions in one week, however late or early each one is answered', async () => {
    const c = weekly();
    c.opened('p', 1, monday12);
    const lateBy = [0, 1, 3, 0.2, 6, 2]; // days after each session opened
    let open = monday12;
    const opens: Date[] = [];
    for (let n = 1; n <= lateBy.length; n += 1) {
      const next = (await c.finishes('p', n, new Date(Math.max(open.getTime(), monday12.getTime()) + lateBy[n - 1] * 86_400_000 + 3_600_000)))!;
      opens.push(next);
      open = next;
    }
    for (let i = 0; i < opens.length; i += 1) {
      expect(opens[i]).toEqual(new Date(monday19.getTime() + i * 7 * 86_400_000));
    }
  });

  it('an existing check-in whose next session was made the old way is neither moved back nor doubled', async () => {
    const c = weekly();
    c.opened('brian', 1, monday12);
    const madeTheOldWay = at('2026-10-26T13:02:41Z');
    c.opened('brian', 2, madeTheOldWay, at('2026-10-13T13:02:41Z'));
    await c.finishes('brian', 1, at('2026-10-13T13:02:41Z'));
    expect(c.prisma.checkIn.create).not.toHaveBeenCalled();
    expect(c.prisma.checkIn.update).not.toHaveBeenCalled();
    expect(c.rows.find((r) => r.sessionNumber === 2)!.availableFrom).toEqual(madeTheOldWay);
    /* Its own day is the round of 26 October, so the next is the Monday after: a week on, not back. */
    expect(await c.finishes('brian', 2, at('2026-10-26T15:00:00Z'))).toEqual(at('2026-11-01T21:00:00Z'));

    const d = weekly();
    d.opened('wairimu', 2, at('2026-10-19T07:32:00Z'));
    expect(await d.finishes('wairimu', 2, at('2026-10-19T08:10:00Z'))).toEqual(at('2026-10-25T21:00:00Z'));
  });
});

describe('B-161: the other rhythms', () => {
  it('fortnightly: a late answer keeps the fortnight, it does not lose one', async () => {
    const c = aCheckIn({ cadence: Cadence.FORTNIGHTLY, cadenceAnchorDay: MONDAY, startsAt: at('2026-10-12T05:00:00Z'), createdAt: at('2026-10-09T09:00:00Z'), timeZone: 'Africa/Nairobi' });
    c.opened('p', 1, at('2026-10-12T05:00:00Z'));
    expect(await c.finishes('p', 1, at('2026-10-14T11:00:00Z'))).toEqual(at('2026-10-25T21:00:00Z')); // Monday 26 October
  });

  it('monthly on the 5th: on time and a month late both get the 5th of the next month', async () => {
    const make = () => aCheckIn({ cadence: Cadence.MONTHLY, cadenceAnchorDay: 5, startsAt: at('2026-10-05T06:00:00Z'), createdAt: at('2026-10-01T09:00:00Z'), timeZone: 'Africa/Nairobi' });
    const onTime = make();
    onTime.opened('p', 1, at('2026-10-05T06:00:00Z'));
    expect(await onTime.finishes('p', 1, at('2026-10-06T14:20:00Z'))).toEqual(at('2026-11-04T21:00:00Z')); // 5 November, 00:00 in Nairobi
    const late = make();
    late.opened('p', 1, at('2026-10-05T06:00:00Z'));
    expect(await late.finishes('p', 1, at('2026-11-02T09:00:00Z'))).toEqual(at('2026-11-04T21:00:00Z'));
  });

  it('daily on weekdays: Friday opens Monday at the start of the day', async () => {
    const c = aCheckIn({ cadence: Cadence.DAILY, startsAt: at('2026-10-12T06:00:00Z'), createdAt: at('2026-10-09T09:00:00Z'), workingDays: [1, 2, 3, 4, 5], timeZone: 'Africa/Nairobi' });
    c.opened('p', 5, at('2026-10-15T21:00:00Z')); // Friday 16 October
    expect(await c.finishes('p', 5, at('2026-10-16T15:00:00Z'))).toEqual(at('2026-10-18T21:00:00Z'));
  });

  it('with no set day, the day comes from when the check-in started', async () => {
    const c = aCheckIn({ cadence: Cadence.WEEKLY, startsAt: at('2026-10-14T06:00:00Z'), createdAt: at('2026-10-09T09:00:00Z'), timeZone: 'Africa/Nairobi' });
    c.opened('p', 1, at('2026-10-14T06:00:00Z')); // Wednesday 14 October
    expect(await c.finishes('p', 1, at('2026-10-16T12:00:00Z'))).toEqual(at('2026-10-20T21:00:00Z')); // Wednesday 21 October
  });

  it('west of UTC: the day is the organisation’s day, even when it is already Tuesday in UTC', async () => {
    const c = aCheckIn({ cadence: Cadence.WEEKLY, cadenceAnchorDay: MONDAY, startsAt: at('2026-10-12T14:00:00Z'), createdAt: at('2026-10-09T09:00:00Z'), timeZone: 'America/Bogota' });
    c.opened('a', 1, at('2026-10-12T14:00:00Z'));
    c.opened('b', 1, at('2026-10-12T14:00:00Z'));
    /* 22:00 on Monday 12 October in Bogota is 03:00 on Tuesday in UTC. */
    expect(await c.finishes('a', 1, at('2026-10-13T03:00:00Z'))).toEqual(at('2026-10-19T05:00:00Z')); // Monday 19 October, 00:00 in Bogota
    expect(await c.finishes('b', 1, at('2026-10-14T20:00:00Z'))).toEqual(at('2026-10-19T05:00:00Z'));
  });

  it('a check-in made on a Thursday, set to Mondays: an early answer and a late one land on the same Monday', async () => {
    const c = aCheckIn({ cadence: Cadence.WEEKLY, cadenceAnchorDay: MONDAY, createdAt: at('2026-10-08T09:00:00Z'), timeZone: 'Africa/Nairobi' });
    c.opened('early', 1, null, at('2026-10-08T09:00:00Z'));
    c.opened('late', 1, null, at('2026-10-08T09:00:00Z'));
    const a = await c.finishes('early', 1, at('2026-10-09T08:00:00Z'));
    const b = await c.finishes('late', 1, at('2026-10-13T17:00:00Z'));
    expect(a).toEqual(at('2026-10-18T21:00:00Z'));
    expect(b).toEqual(a);
  });

  it('still makes nothing on or past the end date', async () => {
    const c = aCheckIn({ cadence: Cadence.WEEKLY, cadenceAnchorDay: MONDAY, startsAt: at('2026-10-12T05:00:00Z'), createdAt: at('2026-10-09T09:00:00Z'), timeZone: 'Africa/Nairobi', endsAt: at('2026-10-18T21:00:00Z') });
    c.opened('p', 1, at('2026-10-12T05:00:00Z'));
    expect(await c.finishes('p', 1, at('2026-10-13T10:00:00Z'))).toBeUndefined();
  });
});
