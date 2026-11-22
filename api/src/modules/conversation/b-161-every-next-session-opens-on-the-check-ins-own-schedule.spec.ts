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
 * Now it opens on the check-in's set day, at 8 in the morning of that day in the organisation's time zone (every rhythm since 20 November
 * 2026), the same for the whole team, whenever they finished. These tests drive the real ensureNextSession with a
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
  const monday19 = at('2026-10-19T05:00:00Z'); // Monday 19 October, 08:00 in Nairobi
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
    expect(await c.finishes('brian', 2, at('2026-10-22T08:00:00Z'))).toEqual(at('2026-10-26T05:00:00Z')); // Monday 26 October
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
    expect(await c.finishes('brian', 2, at('2026-10-26T15:00:00Z'))).toEqual(at('2026-11-02T05:00:00Z'));

    const d = weekly();
    d.opened('wairimu', 2, at('2026-10-19T07:32:00Z'));
    expect(await d.finishes('wairimu', 2, at('2026-10-19T08:10:00Z'))).toEqual(at('2026-10-26T05:00:00Z'));
  });
});

describe('B-161: the other rhythms', () => {
  it('fortnightly: a late answer keeps the fortnight, it does not lose one', async () => {
    const c = aCheckIn({ cadence: Cadence.FORTNIGHTLY, cadenceAnchorDay: MONDAY, startsAt: at('2026-10-12T05:00:00Z'), createdAt: at('2026-10-09T09:00:00Z'), timeZone: 'Africa/Nairobi' });
    c.opened('p', 1, at('2026-10-12T05:00:00Z'));
    expect(await c.finishes('p', 1, at('2026-10-14T11:00:00Z'))).toEqual(at('2026-10-26T05:00:00Z')); // Monday 26 October
  });

  it('monthly on the 5th: on time and a month late both get the 5th of the next month', async () => {
    const make = () => aCheckIn({ cadence: Cadence.MONTHLY, cadenceAnchorDay: 5, startsAt: at('2026-10-05T06:00:00Z'), createdAt: at('2026-10-01T09:00:00Z'), timeZone: 'Africa/Nairobi' });
    const onTime = make();
    onTime.opened('p', 1, at('2026-10-05T06:00:00Z'));
    expect(await onTime.finishes('p', 1, at('2026-10-06T14:20:00Z'))).toEqual(at('2026-11-05T05:00:00Z')); // 5 November, 08:00 in Nairobi
    const late = make();
    late.opened('p', 1, at('2026-10-05T06:00:00Z'));
    expect(await late.finishes('p', 1, at('2026-11-02T09:00:00Z'))).toEqual(at('2026-11-05T05:00:00Z'));
  });

  /* Hafsah's decision D4 (13 October 2026, evening): a daily check-in opens at 8am in the organisation's zone, no longer at the start of the day. */
  it('daily on weekdays: Friday opens Monday at 8 in the morning', async () => {
    const c = aCheckIn({ cadence: Cadence.DAILY, startsAt: at('2026-10-12T06:00:00Z'), createdAt: at('2026-10-09T09:00:00Z'), workingDays: [1, 2, 3, 4, 5], timeZone: 'Africa/Nairobi' });
    c.opened('p', 5, at('2026-10-16T05:00:00Z')); // Friday 16 October
    expect(await c.finishes('p', 5, at('2026-10-16T15:00:00Z'))).toEqual(at('2026-10-19T05:00:00Z'));
  });

  it('with no set day, the day comes from when the check-in started', async () => {
    const c = aCheckIn({ cadence: Cadence.WEEKLY, startsAt: at('2026-10-14T06:00:00Z'), createdAt: at('2026-10-09T09:00:00Z'), timeZone: 'Africa/Nairobi' });
    c.opened('p', 1, at('2026-10-14T06:00:00Z')); // Wednesday 14 October
    expect(await c.finishes('p', 1, at('2026-10-16T12:00:00Z'))).toEqual(at('2026-10-21T05:00:00Z')); // Wednesday 21 October
  });

  it('west of UTC: the day is the organisation’s day, even when it is already Tuesday in UTC', async () => {
    const c = aCheckIn({ cadence: Cadence.WEEKLY, cadenceAnchorDay: MONDAY, startsAt: at('2026-10-12T14:00:00Z'), createdAt: at('2026-10-09T09:00:00Z'), timeZone: 'America/Bogota' });
    c.opened('a', 1, at('2026-10-12T14:00:00Z'));
    c.opened('b', 1, at('2026-10-12T14:00:00Z'));
    /* 22:00 on Monday 12 October in Bogota is 03:00 on Tuesday in UTC. */
    expect(await c.finishes('a', 1, at('2026-10-13T03:00:00Z'))).toEqual(at('2026-10-19T13:00:00Z')); // Monday 19 October, 08:00 in Bogota
    expect(await c.finishes('b', 1, at('2026-10-14T20:00:00Z'))).toEqual(at('2026-10-19T13:00:00Z'));
  });

  it('a check-in made on a Thursday, set to Mondays: an early answer and a late one land on the same Monday', async () => {
    const c = aCheckIn({ cadence: Cadence.WEEKLY, cadenceAnchorDay: MONDAY, createdAt: at('2026-10-08T09:00:00Z'), timeZone: 'Africa/Nairobi' });
    c.opened('early', 1, null, at('2026-10-08T09:00:00Z'));
    c.opened('late', 1, null, at('2026-10-08T09:00:00Z'));
    /* No start date of its own is "Now" (Hafsah, 11 October 2026): the first session stays open until
       the first Monday at least half a week after the Thursday start. Monday 12 is 4 days on, so it is
       that Monday; the "late" answer is a Sunday one, still before it. */
    const a = await c.finishes('early', 1, at('2026-10-09T08:00:00Z'));
    const b = await c.finishes('late', 1, at('2026-10-11T17:00:00Z'));
    expect(a).toEqual(at('2026-10-12T05:00:00Z'));
    expect(b).toEqual(a);
  });

  it('still makes nothing on or past the end date', async () => {
    const c = aCheckIn({ cadence: Cadence.WEEKLY, cadenceAnchorDay: MONDAY, startsAt: at('2026-10-12T05:00:00Z'), createdAt: at('2026-10-09T09:00:00Z'), timeZone: 'Africa/Nairobi', endsAt: at('2026-10-19T05:00:00Z') });
    c.opened('p', 1, at('2026-10-12T05:00:00Z'));
    expect(await c.finishes('p', 1, at('2026-10-13T10:00:00Z'))).toBeUndefined();
  });
});

/*
 * ITEM 5 (Hafsah, 11 October 2026): the team's first session opens at the start the lead chose, and
 * every session after it follows the schedule. The walk: a lead in Lagos set up "every Monday" on
 * Sunday 11 October and left the start on "Now". Session 1 opened that Sunday, as chosen. Hafsah then
 * decided (11 October): with "Now" it stays open until Monday 19, the next Monday at least half a
 * week away, so the team never gets Sunday 11 and Monday 12 a day apart. Tomorrow and a date are below. The lead's own first check-in is session 1,
 * closed at setup, so her session 2 must land on the same day as the team's session 2.
 * Lagos is UTC+1, and every rhythm opens at 8 in the morning where the team is (20 November 2026), so 8:00 there on Monday 12 is 07:00 UTC.
 */
describe('item 5: the start the lead chose, then the schedule (Lagos, every Monday, set up on Sunday 11 October)', () => {
  const setUp = at('2026-10-11T15:00:00Z');
  const MON12 = at('2026-10-12T07:00:00Z');
  const MON19 = at('2026-10-19T07:00:00Z');
  const MON26 = at('2026-10-26T07:00:00Z');

  /* "Now" (Hafsah, 11 October 2026): the first session opens at once and stays open until the next set
     day at least half a cycle away (4 days for weekly, 7 for fortnightly, half the month for monthly),
     so the team never gets two sessions a day apart. */
  it('Now on Sunday 11: session 1 opens at once and stays open until Monday 19, then Monday 26', async () => {
    const c = aCheckIn({ cadence: Cadence.WEEKLY, cadenceAnchorDay: MONDAY, createdAt: setUp, timeZone: 'Africa/Lagos' });
    c.opened('lead', 1, null, setUp);
    c.opened('amina', 1, null, setUp);
    expect(await c.finishes('lead', 1, setUp)).toEqual(MON19);
    expect(await c.finishes('amina', 1, at('2026-10-12T10:00:00Z'))).toEqual(MON19);
    expect(await c.finishes('amina', 2, at('2026-10-19T10:00:00Z'))).toEqual(MON26);
  });

  it('Now on Monday 12, the set day itself: session 1 is Monday 12 and the next is Monday 19', async () => {
    const mon = at('2026-10-12T09:00:00Z');
    const c = aCheckIn({ cadence: Cadence.WEEKLY, cadenceAnchorDay: MONDAY, createdAt: mon, timeZone: 'Africa/Lagos' });
    c.opened('amina', 1, null, mon);
    expect(await c.finishes('amina', 1, at('2026-10-12T15:00:00Z'))).toEqual(MON19);
  });

  it('Now on Thursday 15: Monday 19 is 4 days away, at least half a week, so the next is Monday 19', async () => {
    const thu = at('2026-10-15T09:00:00Z');
    const c = aCheckIn({ cadence: Cadence.WEEKLY, cadenceAnchorDay: MONDAY, createdAt: thu, timeZone: 'Africa/Lagos' });
    c.opened('amina', 1, null, thu);
    expect(await c.finishes('amina', 1, at('2026-10-16T10:00:00Z'))).toEqual(MON19);
    expect(await c.finishes('amina', 2, at('2026-10-19T10:00:00Z'))).toEqual(MON26);
  });

  it('Now on Saturday 17: Monday 19 is two days away, less than half a week, so the next is Monday 26', async () => {
    const sat = at('2026-10-17T09:00:00Z');
    const c = aCheckIn({ cadence: Cadence.WEEKLY, cadenceAnchorDay: MONDAY, createdAt: sat, timeZone: 'Africa/Lagos' });
    c.opened('amina', 1, null, sat);
    expect(await c.finishes('amina', 1, at('2026-10-18T10:00:00Z'))).toEqual(MON26);
  });

  it('Now, fortnightly on Mondays, on Sunday 11: Monday 12 is a day away, so the next is Monday 19, a week or more away, then Monday 2 November', async () => {
    const c = aCheckIn({ cadence: Cadence.FORTNIGHTLY, cadenceAnchorDay: MONDAY, createdAt: setUp, timeZone: 'Africa/Lagos' });
    c.opened('amina', 1, null, setUp);
    expect(await c.finishes('amina', 1, at('2026-10-12T10:00:00Z'))).toEqual(MON19);
    expect(await c.finishes('amina', 2, at('2026-10-19T10:00:00Z'))).toEqual(at('2026-11-02T07:00:00Z'));
  });

  it('Now, fortnightly on Mondays, on Wednesday 14: Monday 19 is 5 days away, less than a week, so the next is Monday 26', async () => {
    const wed = at('2026-10-14T09:00:00Z');
    const c = aCheckIn({ cadence: Cadence.FORTNIGHTLY, cadenceAnchorDay: MONDAY, createdAt: wed, timeZone: 'Africa/Lagos' });
    c.opened('amina', 1, null, wed);
    expect(await c.finishes('amina', 1, at('2026-10-15T10:00:00Z'))).toEqual(MON26);
  });

  it('Tomorrow: session 1 opens on Monday 12, the lead\'s setup check-in counts in it, and session 2 is Monday 19 for everyone', async () => {
    const startsAt = at('2026-10-12T00:00:00Z');
    const c = aCheckIn({ cadence: Cadence.WEEKLY, cadenceAnchorDay: MONDAY, startsAt, createdAt: setUp, timeZone: 'Africa/Lagos' });
    c.opened('lead', 1, startsAt, setUp);
    c.opened('amina', 1, startsAt, setUp);
    /* The lead finishes session 1 at setup, the day before it opens for the team. */
    expect(await c.finishes('lead', 1, setUp)).toEqual(MON19);
    expect(await c.finishes('amina', 1, at('2026-10-12T09:00:00Z'))).toEqual(MON19);
  });

  it('On a date, Wednesday 21: session 1 opens on Wednesday 21, and session 2 is the Monday after, 26, for everyone', async () => {
    const startsAt = at('2026-10-21T00:00:00Z');
    const c = aCheckIn({ cadence: Cadence.WEEKLY, cadenceAnchorDay: MONDAY, startsAt, createdAt: setUp, timeZone: 'Africa/Lagos' });
    c.opened('lead', 1, startsAt, setUp);
    c.opened('amina', 1, startsAt, setUp);
    expect(await c.finishes('lead', 1, setUp)).toEqual(MON26);
    expect(await c.finishes('amina', 1, at('2026-10-21T09:00:00Z'))).toEqual(MON26);
  });

  it('Now, monthly on the 20th, on the 11th: 20 October is 9 days away, less than half a month, so the next is 20 November', async () => {
    const c = aCheckIn({ cadence: Cadence.MONTHLY, cadenceAnchorDay: 20, createdAt: setUp, timeZone: 'Africa/Lagos' });
    c.opened('amina', 1, null, setUp);
    expect(await c.finishes('amina', 1, at('2026-10-12T09:00:00Z'))).toEqual(at('2026-11-20T07:00:00Z'));
    /* 20 December 2026 is a Sunday: since one calendar for each check-in (29 October), Monday to Friday unless the lead says, it opens Monday 21. */
    expect(await c.finishes('amina', 2, at('2026-11-20T09:00:00Z'))).toEqual(at('2026-12-21T07:00:00Z'));
  });

  it('Now, monthly on the 20th, on the 25th: 20 November is 26 days away, at least half a month, so the next is 20 November', async () => {
    const the25th = at('2026-10-25T09:00:00Z');
    const c = aCheckIn({ cadence: Cadence.MONTHLY, cadenceAnchorDay: 20, createdAt: the25th, timeZone: 'Africa/Lagos' });
    c.opened('amina', 1, null, the25th);
    expect(await c.finishes('amina', 1, at('2026-10-26T09:00:00Z'))).toEqual(at('2026-11-20T07:00:00Z'));
    /* 20 December 2026 is a Sunday: since one calendar for each check-in (29 October), Monday to Friday unless the lead says, it opens Monday 21. */
    expect(await c.finishes('amina', 2, at('2026-11-20T09:00:00Z'))).toEqual(at('2026-12-21T07:00:00Z'));
  });

  it('On a date, monthly on the 20th, starting Monday 12: the next one is the 20th of the same month', async () => {
    const startsAt = at('2026-10-12T00:00:00Z');
    const c = aCheckIn({ cadence: Cadence.MONTHLY, cadenceAnchorDay: 20, startsAt, createdAt: setUp, timeZone: 'Africa/Lagos' });
    c.opened('amina', 1, startsAt, setUp);
    expect(await c.finishes('amina', 1, at('2026-10-12T09:00:00Z'))).toEqual(at('2026-10-20T07:00:00Z'));
    expect(await c.finishes('amina', 2, at('2026-10-20T09:00:00Z'))).toEqual(at('2026-11-20T07:00:00Z'));
  });

  it('a check-in that started on its set day keeps the same dates as before', async () => {
    const startsAt = at('2026-10-12T00:00:00Z');
    const c = aCheckIn({ cadence: Cadence.WEEKLY, cadenceAnchorDay: MONDAY, startsAt, createdAt: setUp, timeZone: 'Africa/Lagos' });
    c.opened('amina', 1, startsAt);
    expect(await c.finishes('amina', 1, at('2026-10-12T09:00:00Z'))).toEqual(MON19);
  });
});
