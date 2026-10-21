import { whenTheBoardLastChanged } from './when-the-board-last-changed';

/**
 * A CHECK-IN NOBODY HAS ANSWERED YET STILL CHANGED WHEN WHAT WAS AGREED AT THE START WAS CONFIRMED (faith90-board.jpg:
 * "Last updated on Wednesday 23 September at 6pm" over "What Faith and Wairimu agreed on day 1"). Only what the person
 * has seen counts: a goal the lead has not told them yet would move the line for something they cannot read.
 */
describe('when the board last changed, with what was agreed at the start', () => {
  it('counts an agreement the person has seen', () => {
    expect(whenTheBoardLastChanged({ checkIns: [], agreedWithThePerson: [{ createdAt: '2026-09-21T09:00:00Z', seenBySubject: true }] })).toBe('2026-09-21T09:00:00.000Z');
  });
  it('does not count a goal the person has not been told', () => {
    expect(whenTheBoardLastChanged({ checkIns: [], agreedWithThePerson: [{ createdAt: '2026-09-22T09:00:00Z', seenBySubject: false }] })).toBeNull();
  });
  it('leaves a newer check-in as the newest thing', () => {
    expect(whenTheBoardLastChanged({ checkIns: [{ completedAt: '2026-09-23T15:00:00Z' }], agreedWithThePerson: [{ createdAt: '2026-09-21T09:00:00Z', seenBySubject: true }] })).toBe('2026-09-23T15:00:00.000Z');
  });
});
