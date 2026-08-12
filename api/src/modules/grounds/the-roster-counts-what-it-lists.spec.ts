import { PartyType } from '@prisma/client';
import { GroundsService } from './grounds.service';

/**
 * THE ROSTER'S COUNT AND ITS LIST MUST BE THE SAME LIST. W8-24.
 *
 * `memberCount` counted only PARTICIPANT rows while `members` maps every
 * participant, initiator included. So a ground with a lead and nobody else said
 * "0 members" on the line directly above a row naming that lead - two counts of
 * one list, in one object, disagreeing on screen.
 */
describe('getOrgRoster', () => {
  function serviceWith(participants: any[]) {
    const prisma: any = {
      ground: {
        findMany: jest.fn(async () => [
          {
            id: 'g1',
            label: 'A ground',
            scenario: 'NEW_PROJECT',
            status: 'ACTIVE',
            cadence: 'FORTNIGHTLY',
            createdByUserId: null,
            createdAt: new Date('2026-01-01'),
            initiator: { id: 'u1', firstName: 'Lead', lastName: 'Person', email: 'lead@example.com' },
            participants,
            report: null,
          },
        ]),
      },
    };
    return new GroundsService(
      prisma,
      {} as any, {} as any, {} as any, {} as any, {} as any,
    );
  }

  const party = (over: any = {}) => ({
    id: 'p1', email: 'a@example.com', partyType: PartyType.PARTICIPANT,
    roleAsDescribed: null, userId: 'u9', inviteDeliveryStatus: null, checkIns: [],
    ...over,
  });

  it('counts the lead, because the list shows the lead', async () => {
    const [row] = await serviceWith([party({ id: 'p0', partyType: PartyType.INITIATOR, email: 'lead@example.com' })]).getOrgRoster('org1');
    expect(row.members).toHaveLength(1);
    expect(row.memberCount).toBe(1);
  });

  it('and the two never disagree, whatever the mix', async () => {
    const [row] = await serviceWith([
      party({ id: 'p0', partyType: PartyType.INITIATOR }),
      party({ id: 'p1' }),
      party({ id: 'p2' }),
    ]).getOrgRoster('org1');
    expect(row.memberCount).toBe(row.members.length);
  });

  it('an empty ground is still zero', async () => {
    const [row] = await serviceWith([]).getOrgRoster('org1');
    expect(row.memberCount).toBe(0);
  });
});
