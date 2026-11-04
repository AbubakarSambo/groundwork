import { ReportsListener } from './reports.listener';
/* Changed 1 November 2026: the report is written when the check-in's assessment is ready (onTheAssessmentReady), not on the completion itself; the same release logic, checked the same way. */

/**
 * FOUND IN THE ANCHOR WALK (8 October 2026). The lead's set-up, saved as finished, announced a session. The report was written from nothing and the
 * model invented two differences (bank statements, a credit committee, a person called "Participant"); the lead's board showed them until the first
 * real answers came in. A set-up with nothing on the record has no report written from it. A check-in with words on the record, and an ordinary check-in, still do.
 */
describe('a lead\'s set-up on its own is not written up as a report', () => {
  const run = async (opts: { isSetup: boolean; onTheRecord: number }) => {
    const synthesize = jest.fn(async () => ({}));
    const prisma: any = {
      checkIn: { findUnique: jest.fn(async () => ({ isSetup: opts.isSetup })) },
      recordEntry: { count: jest.fn(async () => opts.onTheRecord) },
      ground: { findUnique: jest.fn(async () => null) },
    };
    const listener: any = new ReportsListener(prisma, { isSessionReadyForReport: jest.fn(async () => false) } as any, { synthesize, tellThemTheReportIsReady: jest.fn() } as any, {} as any, { get: () => 'http://x' } as any);
    listener.notifyAdminOnCheckIn = jest.fn(async () => undefined);
    listener.notifyOnLateCorrection = jest.fn(async () => undefined);
    listener.warmTheReads = jest.fn(async () => undefined);
    await listener.onTheAssessmentReady({ checkInId: 'c1', groundId: 'g1', participantId: 'p1', sessionNumber: 1, howItEnded: 'finished by the person' });
    return synthesize;
  };

  it('writes none when the set-up is all there is and nothing is on the record', async () => {
    expect(await run({ isSetup: true, onTheRecord: 0 })).not.toHaveBeenCalled();
  });
  it('still writes one once anything is on the record, and for a check-in that is not a set-up', async () => {
    expect(await run({ isSetup: true, onTheRecord: 3 })).toHaveBeenCalledTimes(1);
    expect(await run({ isSetup: false, onTheRecord: 0 })).toHaveBeenCalledTimes(1);
  });
});
