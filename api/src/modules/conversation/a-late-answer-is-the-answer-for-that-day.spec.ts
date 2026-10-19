import { ConversationService } from './conversation.service';
import { whenThisSessionsRoundClosed } from '../grounds/a-session-nobody-opened';

/**
 * A LATE ANSWER IS THE ANSWER FOR THE DAY IT IS GIVEN (engine test, second run, Drop Access, Joseph).
 *
 * "Sales team, Q4" runs daily, Monday to Friday, in Nairobi. Joseph's session 4 opened on Thursday 15 October at 08:00 (05:00 UTC) and
 * he did not answer it. He opened it on Friday 16 October at 14:07 (11:07:01 UTC), before the half-hourly sweep had closed it. His Friday
 * answer went into Thursday's session; Friday's session 5 opened at 11:09:24, the minute he finished; at 11:30 he was sent "Hi Joseph,
 * your check-in for Sales team, Q4 is overdue. It's still open, so you can answer here now."; and Grace's board said "Joseph Kariuki has
 * not checked in for this session yet". The rows are his, from the run's database.
 */
const JOSEPH = '2274e6af-8d37-4388-bd39-8a7aeb582d7b';
const GROUND = 'a0cdc357-32d0-4df4-bece-692b27e5511f';
const ORG = 'e58e5288-17f4-4cf0-bbd8-6156e57c2f31';
const thursdaysSession = {
  id: 'ci-joseph-4', groundId: GROUND, participantId: JOSEPH, sessionNumber: 4, status: 'NOT_STARTED',
  availableFrom: new Date('2026-10-15T05:00:00Z'), createdAt: new Date('2026-10-14T11:08:50.459Z'),
  participant: { id: JOSEPH, userId: 'u-joseph', partyType: 'PARTICIPANT', managingOnly: false, cameThroughTheLink: false, user: { awaitingOrgApproval: false } },
  ground: { cadence: 'DAILY', cadenceAnchorDay: null, workingDays: [1, 2, 3, 4, 5], startsAt: null, createdAt: new Date('2026-10-12T05:00:01.398Z'), organizationId: ORG },
};
const fridayAt1407 = new Date('2026-10-16T11:07:01.040Z');
const released = new Date('2026-10-01T00:00:00Z');

const prismaWith = (rows: any[]) => ({
  checkIn: {
    findMany: jest.fn(async ({ where }: any) => rows.filter((r) => (!where.id || r.id === where.id) && r.status === where.status)),
    findUnique: jest.fn(async ({ where }: any) => rows.find((r) => r.participantId === where.participantId_sessionNumber?.participantId && r.sessionNumber === where.participantId_sessionNumber?.sessionNumber) ?? null),
  },
  organization: { findUnique: jest.fn(async () => ({ timeZone: 'Africa/Nairobi' })) },
  groundParticipant: { findMany: jest.fn(async () => []) },
  platformSetting: { findUnique: jest.fn(async () => ({ value: { at: released.toISOString() } })) },
});

describe("Joseph opens Thursday's session on Friday afternoon", () => {
  it('its round closed on Friday at 08:00 in Nairobi', async () => {
    expect(await whenThisSessionsRoundClosed(prismaWith([thursdaysSession]), thursdaysSession.id, fridayAt1407, released)).toEqual(new Date('2026-10-16T05:00:00Z'));
  });

  it('on Thursday afternoon it is still Thursday\'s, and is left open', async () => {
    expect(await whenThisSessionsRoundClosed(prismaWith([thursdaysSession]), thursdaysSession.id, new Date('2026-10-15T11:00:00Z'), released)).toBeNull();
  });

  it("is closed as missed at that time, and Friday's session is the one opened, so his answer is Friday's", async () => {
    const fridaysSession = { ...thursdaysSession, id: 'ci-joseph-5', sessionNumber: 5, availableFrom: fridayAt1407 };
    const rows = [thursdaysSession];
    const svc: any = Object.create(ConversationService.prototype);
    svc.prisma = prismaWith(rows);
    svc.logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    svc.openTheDoor = jest.fn(async () => thursdaysSession);
    svc.closeAsMissed = jest.fn(async () => { rows.push(fridaysSession); return true; });
    svc.openOnce = jest.fn(async (id: string) => ({ reply: `the opening of ${id}` }));
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }).setSystemTime(fridayAt1407);
    try {
      const opened = await (ConversationService.prototype as any).openOnce.call(svc, thursdaysSession.id, 'u-joseph');
      expect(svc.closeAsMissed).toHaveBeenCalledWith('ci-joseph-4', new Date('2026-10-16T05:00:00Z'));
      expect(svc.openOnce).toHaveBeenCalledWith('ci-joseph-5', 'u-joseph', undefined);
      expect(opened).toEqual({ reply: 'the opening of ci-joseph-5', checkInId: 'ci-joseph-5' });
    } finally {
      jest.useRealTimers();
    }
  });
});
