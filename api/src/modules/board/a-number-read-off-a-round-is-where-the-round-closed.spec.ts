import { BoardListener } from './board.listener';

/**
 * A NUMBER READ OFF A ROUND IS WHERE THAT ROUND CLOSED (review of 1 October 2026, re-d, sales, session 2).
 *
 * The round's snapshot is taken as it closes, and the number said in it is read after. Bisi said "The
 * total amount disbursed for the team this quarter is N31 million." The count became 31 million naira
 * and the snapshot of round 2 stayed at 0, so the Movement tile read "No target moved this session."
 * while Since the last round said it had. The snapshot of the round now holds the number read off it.
 */
describe('a number read off a round updates that round’s snapshot', () => {
  it('lands 31 million naira on round 2 and on round 2’s snapshot', async () => {
    const updateMany = jest.fn(() => Promise.resolve({ count: 1 }));
    const update = jest.fn(() => Promise.resolve({}));
    const prisma: any = {
      groundObjective: {
        findMany: jest.fn(async () => [{ id: 'o-team', name: 'N120m disbursed', target: 120000000, count: 0, prevCount: 0, ownerParticipantId: null, suggestedCount: null, suggestedSaid: null }]),
        update,
      },
      recordEntry: {
        findMany: jest.fn(async (args: any) => (args?.where?.checkIn
          ? [{ text: 'The total amount disbursed for the team this quarter is N31 million.', participantId: 'p-bisi', participant: { partyType: 'INITIATOR' } }]
          : [])),
      },
      ground: { findUnique: jest.fn(async () => null), update: jest.fn(async () => ({})) },
      groundObjectiveSnapshot: { updateMany },
    };
    const model: any = {
      extract: jest.fn(async () => ({ numbers: [{ objectiveId: 'o-team', count: 31000000, said: 'The total amount disbursed for the team this quarter is N31 million.' }] })),
      respond: jest.fn(async () => null),
    };
    await new BoardListener(prisma, model).onRoundCompleted({ groundId: 'g-sales', sessionNumber: 2, participantCount: 3 } as any);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'o-team' }, data: expect.objectContaining({ count: 31000000 }) }));
    expect(updateMany).toHaveBeenCalledWith({ where: { groundId: 'g-sales', objectiveId: 'o-team', sessionNumber: 2 }, data: { count: 31000000 } });
  });
});
