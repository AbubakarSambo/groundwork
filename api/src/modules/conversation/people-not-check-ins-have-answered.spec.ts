import { ConversationService } from './conversation.service';

/** "Since then, 5 of the 4 people involved in this check-in have submitted" (week 3 re-runs, 28 Sep 2026). */
describe('how many have answered counts people, not check-ins', () => {
  it('says 4 of 4 when four people have each finished two rounds', async () => {
    const done = ['p1', 'p1', 'p2', 'p2', 'p3', 'p3', 'p4', 'p4'].map((participantId) => ({ participantId }));
    const self = {
      prisma: {
        checkIn: { findMany: async () => done, count: async () => done.length },
        groundParticipant: { count: async () => 4 },
      },
    };
    const said = await (ConversationService.prototype as any).buildGroundState.call(self, 'g-1', true);
    expect(said).toBe('4 of 4 parties have submitted their accounts.');
  });
});

describe('in the anchor the lead is not one of the people who answer (found on the test bed, 8 October)', () => {
  it('counts the team in plain words, and asks the database for the team only', async () => {
    const findMany = jest.fn(async () => [{ participantId: 'juma' }, { participantId: 'kofi' }, { participantId: 'juma' }]);
    const count = jest.fn(async () => 2);
    const self = { prisma: { checkIn: { findMany }, groundParticipant: { count } } };
    const said = await (ConversationService.prototype as any).buildGroundState.call(self, 'g-1', true, true);
    expect(said).toBe('2 of 2 people on the team have answered so far.');
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ participant: { managingOnly: false } }) }));
    expect(count).toHaveBeenCalledWith({ where: { groundId: 'g-1', managingOnly: false } });
  });
  it('says what it said for every other check-in', async () => {
    const self = { prisma: { checkIn: { findMany: async () => [{ participantId: 'a' }], count: async () => 1 }, groundParticipant: { count: async () => 3 } } };
    expect(await (ConversationService.prototype as any).buildGroundState.call(self, 'g-1', false)).toBe('1 of 3 parties have submitted so far. The other party has not yet submitted.');
  });
});
