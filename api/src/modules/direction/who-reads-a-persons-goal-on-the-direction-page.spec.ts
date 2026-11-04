import { DirectionService } from './direction.service';

/*
 * A PERSON'S GOAL, BY NAME AND WITH ITS NUMBER, IS READ ONLY BY AN ADMIN AND THE LEAD OF THAT GOAL'S TEAM (privacy, 25 October).
 * Found when carrying the night's work forward: the direction page named "Miriam's target, 20 new small shops a month" to everyone
 * in the organisation. Hand-written data: Baridi, the sales team led by Wairimu, Miriam's goal, and Kevin in another team.
 */
const DIRECTION = {
  organizationId: 'baridi', version: 1, setAt: new Date('2026-10-01'), setByUserId: null,
  now: { centre: 'Get paid on time.' }, whatChanged: {},
  teams: [{ groundId: 'g-sales', team: 'Sales', leadName: 'Wairimu Kamau', means: 'Look after the shops we have.', approvedAt: null, brief: { items: [{ verb: 'Stop', what: '20 new small shops a month' }] } }],
};
const GOALS = [{ id: 'o-miriam', groundId: 'g-sales', name: '20 new small shops a month', ownerParticipantId: 'p-miriam', target: 20, owner: { nameGiven: null, user: { firstName: 'Miriam', lastName: 'Wanjiku' } } }];

function aService() {
  const prisma: any = {
    organization: { findUnique: async () => ({ release6DirectionOn: true }) },
    directionVersion: { findFirst: async () => DIRECTION, findMany: async () => [] },
    groundObjective: { findMany: async () => GOALS },
    goalVersion: { findMany: async () => [] },
    user: { findUnique: async () => null },
    ground: { findMany: async ({ where }: any) => (where.initiatorId === 'u-wairimu' ? [{ id: 'g-sales' }] : []) },
  };
  return new DirectionService(prisma);
}

describe('who reads a person\'s goal on the direction page', () => {
  it('Kevin, in another team, reads the direction with nobody\'s goal in it', async () => {
    const read = JSON.stringify(await aService().read({ userId: 'u-kevin', organizationId: 'baridi', role: 'MEMBER' }));
    expect(read).toContain('Look after the shops we have.');
    expect(read).not.toContain('Miriam');
    expect(read).not.toContain('20 new small shops a month');
  });

  it('Wairimu, who leads the sales team, reads Miriam\'s goal', async () => {
    const read = JSON.stringify(await aService().read({ userId: 'u-wairimu', organizationId: 'baridi', role: 'MEMBER' }));
    expect(read).toContain('Miriam');
  });

  it('an admin reads it too', async () => {
    const read = JSON.stringify(await aService().read({ userId: 'u-grace', organizationId: 'baridi', role: 'ADMIN' }));
    expect(read).toContain('Miriam');
  });
});
