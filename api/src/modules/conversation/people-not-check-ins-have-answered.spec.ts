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
