import { WhatNeedsYouService } from './what-needs-you.service';

/**
 * B-097. While Halima waited to be let into Msingi Foods, and had been emailed about, Grace's Today said "Nothing needs you right now."
 * The person waiting is now the first thing that needs her, said to the admins of that organisation only.
 */
function setup(waiting: any[]) {
  const grounds: any = { list: jest.fn(async () => []), listAwaitingApproval: jest.fn(async () => []) };
  const prisma: any = {
    user: {
      findUnique: jest.fn(async () => ({ awaitingOrgApproval: false })),
      findMany: jest.fn(async () => [{ id: 'u-baraka', firstName: 'Baraka' }]),
    },
    membershipRequest: { findMany: jest.fn(async () => waiting) },
    organization: { findUnique: jest.fn(async () => ({ name: 'Msingi Foods' })) },
    ground: { findMany: jest.fn(async () => [{ id: 'g1', label: 'Help my team understand' }]) },
  };
  return new WhatNeedsYouService(prisma, grounds);
}
const HALIMA = { id: 'r1', email: 'halima@msingi.test', groundId: 'g1', requestedByUserId: 'u-baraka', user: { firstName: 'Halima', lastName: 'Yusuf' } };

describe('B-097: Today for the people who may let somebody in', () => {
  it('Grace, an admin, reads that Halima is waiting, who invited her, and where to go', async () => {
    const r = await setup([HALIMA]).forReader('u-grace', 'grace@msingi.test', 'org1', 'ADMIN');
    expect(r.count).toBe(1);
    expect(r.needs[0]).toMatchObject({
      title: 'Halima Yusuf is waiting for you to let them into Msingi Foods.',
      detail: 'Baraka invited Halima to Help my team understand.',
      action: { label: 'Look at who is waiting', to: '/org/members' },
    });
  });
  it('three or more are said once, with the count', async () => {
    const r = await setup([HALIMA, { ...HALIMA, id: 'r2' }, { ...HALIMA, id: 'r3' }]).forReader('u-grace', 'grace@msingi.test', 'org1', 'ADMIN');
    expect(r.needs.map((n) => n.title)).toEqual(['3 people are waiting for you to let them into Msingi Foods.']);
  });
  it('Baraka and a colleague, who are not admins, are told nothing of it', async () => {
    for (const role of ['MEMBER', 'LEAD']) {
      const r = await setup([HALIMA]).forReader('u-baraka', 'baraka@msingi.test', 'org1', role);
      expect(r.needs).toEqual([]);
      expect(JSON.stringify(r)).not.toContain('Halima');
    }
  });
});
