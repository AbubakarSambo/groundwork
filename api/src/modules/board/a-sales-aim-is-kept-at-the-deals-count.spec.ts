import { BoardListener } from './board.listener';

/**
 * WHEN SOMETHING NEW COMES IN, A SALES AIM IS KEPT AT WHAT THE DEALS HOLD (Drop Access, 16 October 2026; Hafsah's answers
 * of 17 October). The round's model read landed only Greenfield's 25 units on "Units sold by 30 October" and missed
 * Kilele's 40. Now the count kept on an aim the deals count, and that round's snapshot, are the deals' count, and the read
 * of numbers from what was said is never asked about it. An aim the deals do not count is read from what was said, as before.
 */
function aSalesGround(releaseOne = true, kindOfWork = 'sales org') {
  const update = jest.fn(() => Promise.resolve({}));
  const updateMany = jest.fn(() => Promise.resolve({ count: 1 }));
  const objectives = [
    { id: 'o-units', name: 'Units sold by 30 October', target: 120, count: 25, prevCount: 0, ownerParticipantId: null, suggestedCount: null, suggestedSaid: null },
    { id: 'o-visits', name: 'Shop visits this month', target: 50, count: 0, prevCount: 0, ownerParticipantId: null, suggestedCount: null, suggestedSaid: null },
  ];
  const prisma: any = {
    ground: {
      findUnique: jest.fn(async (args: any) => (args?.select?.objectives ? { kindOfWork, workStages: null, organizationId: 'org-1', objectives } : null)),
      update: jest.fn(async () => ({})),
    },
    /* With Release 1's sales board switched on for the organisation, unless a spec says otherwise (release-one-sales-board). */
    organization: { findUnique: jest.fn(async () => ({ timeZone: 'Africa/Nairobi', release1SalesBoardOn: releaseOne })) },
    groundObjective: { findMany: jest.fn(async () => objectives), update },
    groundObjectiveSnapshot: { updateMany },
    groundDocument: { findMany: jest.fn(async () => [{ id: 'doc-mpesa', participantId: 'p-kevin' }]) },
    workItem: {
      findMany: jest.fn(async () => [
        { id: 'w-kilele', kind: 'deal', name: 'Kilele Hotel', stage: 'Won', ownerParticipantId: 'p-kevin', fields: { Units: '40' }, sourceEntryId: 'e-kilele', createdAt: new Date('2026-10-12T15:00:00Z') },
        { id: 'w-green', kind: 'deal', name: 'Greenfield Supermarket', stage: 'Won', ownerParticipantId: 'p-mercy', fields: { Units: '25' }, sourceEntryId: null, createdAt: new Date('2026-10-12T15:00:00Z') },
      ]),
    },
    recordEntry: {
      findMany: jest.fn(async (args: any) => (args?.where?.checkIn
        ? [{ text: 'Greenfield took 25 units.', participantId: 'p-mercy', participant: { partyType: 'PARTICIPANT' } }, { text: 'I did 12 shop visits.', participantId: 'p-mercy', participant: { partyType: 'PARTICIPANT' } }]
        : [
          { id: 'e-kilele', text: 'Kilele Hotel paid for all 40 units.', type: 'PROGRESS', participantId: 'p-kevin', recallBased: false, anchoredOrigin: 'photo', anchoredDocumentId: 'doc-mpesa', createdAt: new Date('2026-10-12T15:00:00Z') },
        ])),
    },
  };
  return { prisma, update, updateMany };
}

describe('a sales aim is kept at what the deals hold', () => {
  it('when a round closes, the count and the round\'s snapshot are the deals\' count, and the model is not asked about it', async () => {
    const { prisma, update, updateMany } = aSalesGround();
    const model: any = { extract: jest.fn(async () => ({ numbers: [] })), respond: jest.fn(async () => null) };
    await new BoardListener(prisma, model).onRoundCompleted({ groundId: 'g-sales', sessionNumber: 4, participantCount: 3 } as any);
    /* Kilele 40 and Greenfield 25: 65, never the 25 read off what was said. */
    expect(update).toHaveBeenCalledWith({ where: { id: 'o-units' }, data: { count: 65 } });
    expect(updateMany).toHaveBeenCalledWith({ where: { groundId: 'g-sales', objectiveId: 'o-units', sessionNumber: 4 }, data: { count: 65 } });
    /* The read of numbers from what was said is asked only about the aim the deals do not count. */
    const asked = model.extract.mock.calls.map((c: any[]) => JSON.stringify(c[1])).join(' ');
    expect(asked).toMatch(/Shop visits this month/);
    expect(asked).not.toMatch(/Units sold by 30 October/);
  });

  it('when a check-in completes, the count is brought up to the deals', async () => {
    const { prisma, update } = aSalesGround();
    await new BoardListener(prisma, { extract: jest.fn(async () => ({})) } as any).countTheAimsFromTheDeals('g-sales', null);
    expect(update).toHaveBeenCalledWith({ where: { id: 'o-units' }, data: { count: 65 } });
    expect(update).not.toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'o-visits' } }));
  });

  it('a sales team is counted from its deals the same way', async () => {
    const { prisma, update } = aSalesGround(true, 'sales team');
    await new BoardListener(prisma, { extract: jest.fn(async () => ({})) } as any).countTheAimsFromTheDeals('g-sales', null);
    expect(update).toHaveBeenCalledWith({ where: { id: 'o-units' }, data: { count: 65 } });
  });

  it('with Release 1\'s sales board switched off, nothing is counted from the deals and the round reads the aim from what was said, as before', async () => {
    const { prisma, update, updateMany } = aSalesGround(false);
    const model: any = { extract: jest.fn(async () => ({ numbers: [] })), respond: jest.fn(async () => null) };
    await new BoardListener(prisma, model).onRoundCompleted({ groundId: 'g-sales', sessionNumber: 4, participantCount: 3 } as any);
    expect(update).not.toHaveBeenCalledWith({ where: { id: 'o-units' }, data: { count: 65 } });
    expect(updateMany).not.toHaveBeenCalledWith(expect.objectContaining({ data: { count: 65 } }));
    const asked = model.extract.mock.calls.map((c: any[]) => JSON.stringify(c[1])).join(' ');
    expect(asked).toMatch(/Units sold by 30 October/);
  });
});
