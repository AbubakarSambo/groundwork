import { CheckInStatus } from '@prisma/client';
import { CLOSED_BY_THE_CLOCK } from '../../common/closed-by-the-clock';
import { countTheRecord, theCountsBehindThis, withTheCountsBehindIt } from './the-counts-behind-this';
import { theBoardsJudgementFor } from '../reports/the-judgement-is-the-leads';

/**
 * DECISION 141 (2): "The counts behind this" under the judgement on the lead's report, filled from the
 * record by code. Every number below is counted from the fixture, never from the model, and the counts
 * reach exactly the readers the judgement reaches.
 */
const answered = (n: number) => Array.from({ length: n }, () => ({ status: CheckInStatus.COMPLETED, isSetup: false, closedReason: null, turns: [{ id: 't' }] }));
const missed = (n: number) => Array.from({ length: n }, () => ({ status: CheckInStatus.COMPLETED, isSetup: false, closedReason: CLOSED_BY_THE_CLOCK, turns: [] }));

/** The record of a weekly sales check-in: 7 answered, 3 missed (one setup, one still open, neither counted). */
function aRecord() {
  return {
    checkIns: [
      ...answered(7), ...missed(3),
      { status: CheckInStatus.COMPLETED, isSetup: true, closedReason: null, turns: [{ id: 's' }] },
    ],
    commitments: [{ status: 'DONE' }, { status: 'DONE' }, { status: 'NOT_DONE' }, { status: 'UNKNOWN' }, { status: 'OPEN' }, { status: 'DROPPED' }],
    waits: [{ status: 'WAITING' }, { status: 'BLOCKING' }, { status: 'CLEARED' }],
    lines: [
      { anchoredDocumentId: 'doc-1', recallBased: false, disputedAt: null },
      { anchoredDocumentId: null, recallBased: true, disputedAt: null },
      { anchoredDocumentId: null, recallBased: true, disputedAt: null },
      { anchoredDocumentId: 'doc-2', recallBased: false, disputedAt: new Date() },
    ],
  };
}

function aPrisma(r = aRecord()) {
  return {
    checkIn: { findMany: jest.fn(async (a: any) => r.checkIns.filter((c) => c.isSetup === a.where.isSetup && c.status === a.where.status)) },
    groundCommitment: { findMany: jest.fn(async () => r.commitments) },
    groundDependency: { findMany: jest.fn(async () => r.waits) },
    recordEntry: { findMany: jest.fn(async () => r.lines) },
  };
}

const THE_STORED_REPORT = { theJudgement: { theGap: 'Two of five people count a price range as a budget.', whatToDo: [{ move: 'Agree what qualified means.', because: 'It changes how 4 sales are counted.' }] }, theTable: 'FIELD: ...' };

describe('the counts behind this, counted from the record', () => {
  it('counts sessions answered and missed, commitments made, kept, not kept and open, waits, and backed lines', async () => {
    const counts = await theCountsBehindThis(aPrisma(), 'g1');
    expect(counts).toMatchObject({
      answered: 7, missed: 3,
      commitmentsMade: 5, commitmentsKept: 2, commitmentsNotKept: 1, commitmentsOpen: 2,
      waitsOpen: 2, waitsCleared: 1,
      lines: 3, backedLines: 1,
    });
    expect(counts!.says).toEqual([
      '7 check-ins were answered and 3 were missed.',
      '5 commitments were made. Of these, 2 were kept, 1 was not kept and 2 are still open.',
      '2 waits are still open and 1 has been cleared.',
      '1 of the 3 lines on the record is backed by a document.',
    ]);
  });

  it('says plainly when there is nothing to count', () => {
    expect(countTheRecord({ sessions: [], commitments: [], waits: [], lines: [] }).says).toEqual([
      '0 check-ins were answered and 0 were missed.',
      'Nobody has made a commitment on the record yet.',
      'Nobody has said they are waiting on anyone.',
      'Nothing is on the record yet.',
    ]);
  });

  it('reads as full sentences, with no colons, dots between pieces, or ratings of a person', async () => {
    const counts = await theCountsBehindThis(aPrisma(), 'g1');
    for (const line of counts!.says) {
      expect(line).toMatch(/^[0-9A-Z].*\.$/);
      expect(line).not.toMatch(/[:·•→]|standing|THIN|rated|score/i);
    }
  });
});

describe('who reads the counts', () => {
  it('the lead reads them under the judgement', async () => {
    const served = await withTheCountsBehindIt(aPrisma(), 'g1', theBoardsJudgementFor(THE_STORED_REPORT, { isLead: true }));
    expect((served.theJudgement as any).theGap).toBe('Two of five people count a price range as a budget.');
    expect((served.theJudgement as any).theCountsBehindThis.says[0]).toBe('7 check-ins were answered and 3 were missed.');
    /* The engine's own table still reaches nobody. */
    expect(served.theTable).toBeNull();
  });

  it('a participant, who never has the judgement, never has the counts, and the record is not even read', async () => {
    const prisma = aPrisma();
    const served = await withTheCountsBehindIt(prisma, 'g1', theBoardsJudgementFor(THE_STORED_REPORT, { isLead: false }));
    expect(served).toEqual({ theJudgement: null, theTable: null });
    expect(prisma.checkIn.findMany).not.toHaveBeenCalled();
  });
});
