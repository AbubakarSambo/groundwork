import { fileProofThatWasFiledOnNothing } from './proof-filed-on-its-item';

/** Kevin's Kilele Hotel slip, sent at 11:03 on Monday 12 October, three minutes before the check-in put the deal on record (polish round 1). */
describe('proof sent before its deal was on record is filed on it once it is', () => {
  const slip = 'QJK4TL2MX9 Confirmed. Ksh200,000.00 received from KILELE HOTEL LTD on 12/10/26 at 3:41 PM. Account: DROP ACCESS LTD. Ref: 40 water dispensers.';
  const setup = (items: any[]) => {
    const evidence = [{ id: 'e1', groundId: 'g', documentId: 'd1', participantId: 'p-kevin', workItemId: null as string | null, itemName: null as string | null, countsAsProof: true }];
    const prisma: any = {
      itemEvidence: {
        findMany: jest.fn(async ({ where }: any) => evidence.filter((e) => e.groundId === where.groundId && e.workItemId === null && e.countsAsProof)),
        update: jest.fn(async ({ where, data }: any) => Object.assign(evidence.find((e) => e.id === where.id)!, data)),
      },
      workItem: { findMany: jest.fn(async () => items) },
      groundDocument: { findUnique: jest.fn(async () => ({ fileName: 'mpesa-kilele-hotel.pdf', uploaderNote: null, content: slip })) },
    };
    return { prisma, evidence };
  };
  it('the slip goes on Kilele Hotel once the deal is there', async () => {
    const { prisma, evidence } = setup([
      { id: 'w-kilele', kind: 'deal', name: 'Kilele Hotel', ownerParticipantId: 'p-kevin', fields: { Units: '40' } },
      { id: 'w-green', kind: 'deal', name: 'Greenfield Supermarket', ownerParticipantId: 'p-mercy', fields: {} },
    ]);
    expect(await fileProofThatWasFiledOnNothing(prisma, 'g')).toBe(1);
    expect(evidence[0]).toMatchObject({ workItemId: 'w-kilele', itemName: 'Kilele Hotel' });
  });
  it('with no deal its words name, it stays on nothing', async () => {
    const { prisma, evidence } = setup([{ id: 'w-green', kind: 'deal', name: 'Greenfield Supermarket', ownerParticipantId: 'p-mercy', fields: {} }]);
    expect(await fileProofThatWasFiledOnNothing(prisma, 'g')).toBe(0);
    expect(evidence[0].workItemId).toBeNull();
  });
});
