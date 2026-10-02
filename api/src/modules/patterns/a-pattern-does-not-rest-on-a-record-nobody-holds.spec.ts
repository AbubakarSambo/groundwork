import { restsOnARecordNobodyHolds, whatTheRecordRuleTookOut } from './a-pattern-does-not-rest-on-a-record-nobody-holds';
import { PatternsService } from './patterns.service';

/** The three observations stored in api/journey/all-24/re-a/loans.json, and what Chinedu and Grace actually said. */
describe('a pattern does not rest on a record nobody holds', () => {
  const CHINEDU = ["I haven't needed any support. Everything has been going well with the tricycle.", "I haven't fallen behind on repayments. I've repaid every installment on time.", 'I have been making my weekly repayments. There is nothing that has prevented me.'];
  const GRACE = ['Now I understand that repayments start immediately after receiving the asset.', 'I am making payments now. I am behind by seven payments, but I am paying.'];

  it.each([
    'Reported that all loan repayments were on time, while records showed the opposite.',
    'Repayments claimed to be on time, contrary to the payment record.',
  ])('drops, for Chinedu: %s', (o) => {
    expect(restsOnARecordNobodyHolds(o, CHINEDU)).toBe(true);
  });

  it('drops, for Grace: the system of record shows no payments', () => {
    expect(restsOnARecordNobodyHolds('Claims to be making payments, but the system of record shows no payments have been received.', GRACE)).toBe(true);
  });

  it('keeps a record claim the person gave themselves', () => {
    expect(restsOnARecordNobodyHolds('Said the work was finished, while the records showed otherwise.', ['My records are in the shared folder, you can read them.'])).toBe(false);
  });

  it('keeps an observation that makes no record claim', () => {
    expect(restsOnARecordNobodyHolds('Said the files have been with the credit committee for 34 days and chased four times.', CHINEDU)).toBe(false);
  });
});

describe('what the record rule took out, said once per check-in', () => {
  it('names a code some reads left out and that does not count, with how many reads left it out', () => {
    const leftOut = [[{ code: 'B1' }, { code: 'B1' }], [{ code: 'B1' }], [], [{ code: 'D1' }], []];
    expect(whatTheRecordRuleTookOut(leftOut, ['D1'])).toEqual([{ code: 'B1', reads: 2 }]);
  });

  it('says nothing when no read left anything out', () => {
    expect(whatTheRecordRuleTookOut([[], [], []], [])).toEqual([]);
  });

  it('analyzeCheckIn logs one line, with the code and the reason and no observation, when the rule keeps a code from counting', async () => {
    const prisma = {
      checkIn: {
        findUnique: jest.fn(async () => ({
          id: 'check-1', groundId: 'g1', participantId: 'p1', sessionNumber: 2, patternsAnalyzedAt: null, specificityDimensions: null,
          completedAt: new Date('2026-09-01'), startedAt: null, createdAt: new Date('2026-09-01'), ground: { cadence: 'WEEKLY' },
        })),
        update: jest.fn(async () => ({})),
      },
      conversationTurn: { findMany: jest.fn(async () => [{ role: 'PERSON', content: "I've repaid every installment on time.", createdAt: new Date('2026-09-01') }]) },
      recordEntry: { findMany: jest.fn(async () => [] as any[]) },
      patternDetection: { findMany: jest.fn(async () => [] as any[]) },
      groundDependency: { findMany: jest.fn(async () => [] as any[]) },
    };
    const model = {
      extract: jest.fn(async () => ({ detections: [{ code: 'B1', observation: 'Chinedu reported that all loan repayments were on time, while records showed the opposite.' }] })),
      respond: jest.fn(async () => 'YES'),
    };
    const svc: any = new PatternsService(prisma as any, model as any);
    svc.buildDetectionInputForParticipant = jest.fn(async () => ({ submissions: [] }));
    const written: string[] = [];
    svc.observe = jest.fn(async (_g: string, _p: string, code: string) => { written.push(code); });
    svc.observePositive = jest.fn(async () => undefined);
    const lines: string[] = [];
    jest.spyOn(svc.logger, 'log').mockImplementation((m: any) => { lines.push(String(m)); });
    await svc.analyzeCheckIn('check-1');
    expect(written).toEqual([]);
    const said = lines.filter((l) => l.includes('does not count'));
    expect(said).toEqual(['Check-in check-1: B1 does not count for period 2. In 5 of 5 reads it rested on a record this person never mentioned, so those reads left it out.']);
    expect(said[0]).not.toContain('Chinedu');
  });
});
