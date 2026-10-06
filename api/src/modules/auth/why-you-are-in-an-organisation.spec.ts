import { AuthService } from './auth.service';

/**
 * WHY YOU ARE IN AN ORGANISATION, WHERE THE SERVER KNOWS (U.3 review, finding 4).
 *
 * The sidebar told everybody in one organisation they had not made "You are in Coamana because your
 * email address was on its list of people.", true only for people on its staff list. myOrganizations
 * now says, for each organisation, how they came to be in it when that is known: "list" (their own
 * staff record there is linked to them), "domain" or "link" (recorded when they joined), and null
 * otherwise, when the screen gives no reason.
 */
function service(memberships: any[], listedIn: string[], active = 'o1') {
  const prisma: any = {
    user: { findUnique: jest.fn(async () => ({ organizationId: active, role: 'MEMBER' })) },
    organizationMembership: { findMany: jest.fn(async () => memberships) },
    organization: { findUnique: jest.fn(async () => ({ id: active, name: 'Coamana', slug: 'coamana' })) },
    person: { findMany: jest.fn(async ({ where }: any) => (where.linkedUserId === 'u1' ? listedIn.map((organizationId) => ({ organizationId })) : [])) },
  };
  return { svc: new AuthService(prisma, {} as any, { get: () => undefined } as any, {} as any, {} as any, {} as any, { emit: () => undefined } as any), prisma };
}
const row = (organizationId: string, joinedHow: string | null) => ({ organizationId, role: 'MEMBER', joinedHow, organization: { id: organizationId, name: organizationId, slug: organizationId } });

describe('myOrganizations says how they came to be in each', () => {
  it('by email domain, and by the invite link, as recorded', async () => {
    const rows = await service([row('o1', 'domain'), row('o2', 'link')], []).svc.myOrganizations('u1');
    expect(rows.map((r) => r.joinedHow)).toEqual(['domain', 'link']);
  });

  it('on its list of people, when their own staff record there is linked to them', async () => {
    const rows = await service([row('o1', null)], ['o1']).svc.myOrganizations('u1');
    expect(rows[0].joinedHow).toBe('list');
  });

  it('also for the organisation they are in with no membership row, the roster case', async () => {
    const rows = await service([], ['o1']).svc.myOrganizations('u1');
    expect(rows[0]).toMatchObject({ id: 'o1', active: true, joinedHow: 'list' });
  });

  it('nothing known: null, and no reason is given', async () => {
    const rows = await service([row('o1', null)], []).svc.myOrganizations('u1');
    expect(rows[0].joinedHow).toBeNull();
  });

  it('only their own staff records are read', async () => {
    const { svc, prisma } = service([row('o1', null)], ['o1']);
    await svc.myOrganizations('u1');
    expect(prisma.person.findMany).toHaveBeenCalledWith({ where: { linkedUserId: 'u1' }, select: { organizationId: true } });
  });
});
