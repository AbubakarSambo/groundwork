import { ReportsService } from './reports.service';

/**
 * THE READER'S OWN THIN SPOTS REACH THE READER, AND NOBODY ELSE'S DO.
 *
 * G34 scoped `softSpots` to the lead, per participant, behind CONFIDENCE_ENABLED. That was about not
 * showing one person's spots to another. Showing yours to you is the opposite case: it is not behind
 * the admin flag, and it is never anybody else's.
 */
function service(prisma: any, confidenceEnabled = false) {
  const config: any = { get: (k: string) => (k === 'app.confidenceEnabled' ? confidenceEnabled : undefined) };
  return new ReportsService(prisma, {} as any, {} as any, config, {} as any, {} as any, {} as any, { tell: async () => [] } as any);
}

const rows = (pid: string) => [
  { participantId: pid, type: 'COMMITMENT', text: '[VERIFIABILITY:HIGH] ship the rota', checkIn: { sessionNumber: 1 } },
  { participantId: pid, type: 'COMMITMENT', text: '[VERIFIABILITY:HIGH] ship the rota again', checkIn: { sessionNumber: 2 } },
  { participantId: pid, type: 'COMMITMENT', text: '[VERIFIABILITY:HIGH] ship the rota once more', checkIn: { sessionNumber: 3 } },
  { participantId: 'other', type: 'INTENT', text: 'working on billing', checkIn: { sessionNumber: 1 } },
];

describe('your own soft spots', () => {
  it('are computed for the participant reading, with the fix attached, flag or no flag', async () => {
    const prisma: any = {
      recordEntry: { findMany: jest.fn(async () => rows('me')) },
      groundDocument: { findMany: jest.fn(async () => [{ participantId: 'me', fileName: 'rota.pdf' }]) },
      checkIn: { count: jest.fn(async () => 3) },
    };
    const out = await (service(prisma, false) as any).myOwnSoftSpots('g1', 'me');
    expect(out.length).toBeGreaterThan(0);
    for (const s of out) {
      expect(typeof s.line).toBe('string');
      expect(typeof s.wouldRaiseIt).toBe('string');
      expect(s.wouldRaiseIt.length).toBeGreaterThan(0);
    }
  });

  it('are empty, not an error, for a one-session account with nothing to read', async () => {
    const prisma: any = {
      recordEntry: { findMany: jest.fn(async () => rows('me').slice(0, 1)) },
      groundDocument: { findMany: jest.fn(async () => []) },
      checkIn: { count: jest.fn(async () => 1) },
    };
    expect(await (service(prisma) as any).myOwnSoftSpots('g1', 'me')).toEqual([]);
  });

  it('never take the report down when a read fails', async () => {
    /* A missing method throws synchronously while the array is built. Each read starts inside a
       promise so the sibling that already rejected is not left without a handler. */
    const prisma: any = {
      recordEntry: { findMany: jest.fn(async () => { throw new Error('database went away'); }) },
      groundDocument: { findMany: jest.fn(async () => []) },
    };
    await expect((service(prisma) as any).myOwnSoftSpots('g1', 'me').catch(() => [])).resolves.toEqual([]);
  });
});
