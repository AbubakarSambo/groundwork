import { readTheMonthRecord } from './the-anchor-month-record';
import { theEndOfMonthRead } from './the-anchor-end-of-month';
import { theSameWaitInOtherWords } from './reads';

/**
 * "WHAT'S STILL STUCK" LISTED THE SAME WAIT TWICE IN DIFFERENT WORDS. Juma waits on Wanjiru for permission to call dispatch; the same wait was also kept as
 * "confirmation that it's fine to call dispatch". It is one wait, and it is listed once. A different thing from the same person is still listed.
 */
const person = (id: string, first: string) => ({ id, userId: `u-${id}`, managingOnly: false, nameGiven: null, createdAt: new Date('2026-10-01'), user: { firstName: first, lastName: 'Test', awaitingOrgApproval: false } });
const wait = (what: string, over: any = {}) => ({ fromParticipantId: 'juma', onParticipantId: 'wanjiru', onLabel: null, what, status: 'WAITING', ...over });

function prismaWith(waits: any[]) {
  return {
    groundParticipant: { findMany: async () => [person('juma', 'Juma'), person('wanjiru', 'Wanjiru')] },
    checkIn: { findMany: async () => [] },
    groundCommitment: { findMany: async () => [] },
    groundDependency: { findMany: async () => waits },
    recommendation: { findMany: async () => [] },
    ground: { findUnique: async () => ({ startsAt: null, createdAt: new Date('2026-10-01') }) },
    groundIdea: { findMany: async () => [] },
    groundObjective: { findMany: async () => [] },
  } as any;
}

describe('the same wait is listed once', () => {
  it('on "What\'s still stuck", one line for the two ways Juma said it', async () => {
    const record = await readTheMonthRecord(prismaWith([wait('permission to call dispatch'), wait("confirmation that it's fine to call dispatch")]), 'g1', 1).catch(() => null);
    expect(record).not.toBeNull();
    const read = theEndOfMonthRead({ herWords: 'x', record: record!, differences: [], patterns: [] });
    expect(read.whatIsStillStuck).toEqual(['Juma is waiting on Wanjiru for permission to call dispatch.']);
  });
  it('a different thing from the same person is still there', () => {
    expect(theSameWaitInOtherWords(wait('permission to call dispatch'), wait('the new price list'))).toBe(false);
  });
  it('the same words waited on from a different person are two waits', () => {
    expect(theSameWaitInOtherWords(wait('permission to call dispatch'), wait('permission to call dispatch', { onParticipantId: 'other' }))).toBe(false);
  });
  it('one word left after the asking words is not enough to say they are the same', () => {
    expect(theSameWaitInOtherWords(wait('approval of the budget'), wait('the budget review for the north region'))).toBe(false);
  });
});
