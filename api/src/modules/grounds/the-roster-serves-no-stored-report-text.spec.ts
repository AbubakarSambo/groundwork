import { PartyType } from '@prisma/client';
import { GroundsService } from './grounds.service';

/**
 * THE ORGANISATION ROSTER SERVED STORED REPORT TEXT WITH LABELS IN IT (decision 115: names, never labels).
 * "Participant A's session 2 record states..." and "the initiator" reached an admin through
 * /grounds/org-roster. No screen reads that text and it is not part of the developer API, so the roster
 * says only whether a report is shared and how many agreements and differences it holds.
 */
describe('the organisation roster', () => {
  it('serves no stored report sentence, so no label can be in it', async () => {
    const prisma: any = {
      ground: {
        findMany: jest.fn(async () => [{
          id: 'g1', label: 'Sales team', scenario: 'NEW_PROJECT', status: 'ACTIVE', cadence: 'FORTNIGHTLY',
          createdByUserId: null, createdAt: new Date('2026-01-01'),
          initiator: { id: 'u1', firstName: 'Wairimu', lastName: 'Kamau', email: 'w@example.com' },
          participants: [{ id: 'p1', email: 'a@example.com', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, userId: 'u9', inviteDeliveryStatus: null, checkIns: [] }],
          report: {
            agreements: ["Participant A's session 2 record states the target is agreed."],
            divergences: [{ topic: 'The initiator says the plan is fixed.' }],
            releasedAt: new Date('2026-02-01'),
          },
        }]),
      },
    };
    const svc: any = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any);
    const [row] = await svc.getOrgRoster('org1');
    expect(JSON.stringify(row)).not.toMatch(/Participant [A-Z]|the initiator/i);
    expect(row.report).toEqual({ agreementsCount: 1, differencesCount: 1, releasedAt: new Date('2026-02-01') });
  });
});
