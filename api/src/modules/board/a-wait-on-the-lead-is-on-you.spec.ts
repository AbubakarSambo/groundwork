import { readTheMonthRecord } from './the-anchor-month-record';
import { theEndOfMonthRead } from './the-anchor-end-of-month';

/**
 * Release check, 9 October. Baraka runs the anchor check-in and Lerato waits on him for labels. His own board, his end of the month and
 * his weekly insight read "Lerato is waiting on Baraka for labels with big dates." The month record is the lead's alone: it is "you".
 */
const person = (id: string, first: string) => ({ id, userId: `u-${id}`, managingOnly: false, nameGiven: null, createdAt: new Date('2026-10-01'), user: { firstName: first, lastName: 'Test', awaitingOrgApproval: false } });

function prismaWith(waits: any[]) {
  return {
    groundParticipant: { findMany: async () => [{ ...person('baraka', 'Baraka'), managingOnly: true }, person('lerato', 'Lerato'), person('kito', 'Kito')] },
    checkIn: { findMany: async () => [] },
    groundCommitment: { findMany: async () => [] },
    groundDependency: { findMany: async () => waits },
    recommendation: { findMany: async () => [] },
    ground: { findUnique: async () => ({ startsAt: null, createdAt: new Date('2026-10-01'), initiatorId: 'u-baraka' }) },
  } as any;
}

describe('a wait on the lead is said to her as a wait on "you"', () => {
  it('reads "Lerato is waiting on you", and a wait on a colleague keeps the name', async () => {
    const record = await readTheMonthRecord(prismaWith([
      { fromParticipantId: 'lerato', onParticipantId: 'baraka', onLabel: null, what: 'labels with big dates', status: 'WAITING' },
      { fromParticipantId: 'lerato', onParticipantId: 'kito', onLabel: null, what: 'the count sheet', status: 'WAITING' },
    ]), 'g1', 1);
    const read = theEndOfMonthRead({ herWords: 'x', record, differences: [], patterns: [] });
    expect(read.whatIsStillStuck).toEqual(['Lerato is waiting on you for labels with big dates.', 'Lerato is waiting on Kito for the count sheet.']);
  });
});
