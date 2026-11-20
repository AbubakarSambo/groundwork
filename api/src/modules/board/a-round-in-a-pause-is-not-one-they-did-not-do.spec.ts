import { readTheInputs } from './the-persons-record-store';
import { thePersonsRecord } from './the-persons-record';

/* The pause starts on 24 January. */
/* thePausesThatAreOver joined the same module in batch 2 (pauses kept per organisation); this spec is about the open pause, so there are no finished ones. */
jest.mock('../billing/the-trial-grace', () => ({ whenTheseOrganisationsPaused: async () => new Map([['org', new Date('2027-01-24T00:00:00Z')]]), thePausesThatAreOver: async () => new Map() }));

/**
 * RUN 7 (22 November): Joel's own page read "You did 2 of 11 check-ins", and the board "Joel has missed 4 of the last 4", with the rounds that opened while Groundwork
 * was paused in the count. The person's record is the one place those numbers come from, and it now asks the one owner of "could this round have been answered".
 */
const day = (d: string) => new Date(`${d}T21:00:00Z`);
const round = (n: number, opened: string, status: string) => ({ id: `c${n}`, participantId: 'joel', sessionNumber: n, status, availableFrom: day(opened), createdAt: day(opened), completedAt: status === 'COMPLETED' ? day(opened) : null, specificityLevel: null, specificityDimensions: null, _count: { turns: status === 'COMPLETED' && n <= 2 ? 3 : 0 } });
const rounds = [round(1, '2027-01-03', 'COMPLETED'), round(2, '2027-01-10', 'COMPLETED'), round(3, '2027-01-17', 'NOT_STARTED'), round(4, '2027-01-26', 'NOT_STARTED'), round(5, '2027-02-02', 'NOT_STARTED')];
const turn = (checkInId: string, at: string) => ({ role: 'PERSON', content: 'I sold 7 and signed 2 new shops.', createdAt: new Date(at), checkInId });

describe('the person\'s record counts only rounds that could have been answered', () => {
  it('leaves out the rounds that opened in the pause: 2 of 3, not 2 of 5', async () => {
    const prisma: any = {
      ground: { findUnique: async () => ({ id: 'g', organizationId: 'org', kindOfWork: null, initiatorId: 'lucy', cadence: 'WEEKLY', workingDays: null, organization: { timeZone: 'Africa/Nairobi' },
        participants: [{ id: 'joel', userId: 'u-joel', managingOnly: false, joinedAt: new Date('2026-12-30T08:00:00Z'), user: { firstName: 'Joel', lastName: 'Kimani' } }] }) },
      checkIn: { findMany: async () => rounds },
      conversationTurn: { findMany: async () => [turn('c1', '2027-01-03T22:00:00Z'), turn('c2', '2027-01-10T22:00:00Z')] },
    };
    const read: any = await readTheInputs(prisma, 'g', new Date('2027-02-15T08:00:00Z'));
    const input = read.inputs[0];
    expect(input.checkIns.map((c: any) => c.sessionNumber)).toEqual([1, 2, 3]);
    const record = thePersonsRecord(input);
    expect(record.summary.checkInsDue).toBe(3);
    expect(record.summary.checkInsDone).toBe(2);
  });
});
