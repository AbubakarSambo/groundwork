import { ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * SWITCHING ORGANISATION MUST NOT HAND ANYBODY ANYTHING. W9-4.
 *
 * Somebody can belong to more than one organisation - their own company and a
 * client's, say. Every org-scoped query in the product reads `organizationId` off the
 * token, which is what makes the switch a new token rather than a rewrite of those
 * queries. It also makes the token the only thing standing between the two
 * organisations' data.
 *
 * So two rules, and both are here because getting either wrong is a data leak rather
 * than a bug:
 *
 * 1. The organisation id is never trusted. It arrives in a request body, and the only
 *    thing that makes it legitimate is a membership row for THIS user.
 * 2. The role comes from the MEMBERSHIP, not from the user row. Somebody who
 *    administers their own company and is an ordinary member of a client's would
 *    otherwise carry ADMIN into an organisation that never gave it to them.
 */
describe('switchOrganization', () => {
  function make(membership: any) {
    const prisma: any = {
      organizationMembership: { findUnique: jest.fn(async () => membership) },
      user: {
        update: jest.fn(async (args: any) => ({
          id: 'u1', email: 'her@x.test', firstName: 'Her', lastName: 'Name',
          isPlatformAdmin: false, ...args.data,
        })),
        findUnique: jest.fn(async () => ({ organizationId: 'org-own', role: 'ADMIN' })),
      },
      organization: { findUnique: jest.fn(async () => null) },
      organizationMembershipMany: undefined,
    };
    const jwt: any = { sign: jest.fn((claims: any) => JSON.stringify(claims)) };
    const service = new AuthService(
      prisma, jwt, { get: () => undefined } as any, {} as any, {} as any, {} as any,
    );
    return { service, prisma, jwt };
  }

  it('refuses an organisation the person is not a member of', async () => {
    const { service } = make(null);
    await expect(service.switchOrganization('u1', 'org-somebody-elses')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('and says they are being refused, not that the organisation does not exist', async () => {
    // The id came from the caller. "Not found" would tell somebody probing ids which
    // ones are real; being refused says nothing either way.
    const { service } = make(null);
    await expect(service.switchOrganization('u1', 'org-x')).rejects.toThrow(/not a member of that organisation/i);
  });

  it('takes the role from the membership, not from the person', async () => {
    /**
     * THE ONE THAT MATTERS. This user is ADMIN in their own organisation. They are a
     * MEMBER of the client's. Carrying the old role across would make them an admin of
     * a company that never made them one.
     */
    const { service, prisma, jwt } = make({
      role: 'MEMBER',
      organization: { id: 'org-client', name: 'Client Co', slug: 'client-co' },
    });
    const out = await service.switchOrganization('u1', 'org-client');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { organizationId: 'org-client', role: 'MEMBER' } }),
    );
    // The claims OBJECT is the argument; the mock's return is not what we inspect.
    expect(jwt.sign.mock.calls[0][0].role).toBe('MEMBER');
    expect(out.organization.name).toBe('Client Co');
  });

  it('and the new token is scoped to the new organisation', async () => {
    const { service, jwt } = make({
      role: 'ADMIN',
      organization: { id: 'org-client', name: 'Client Co', slug: 'client-co' },
    });
    await service.switchOrganization('u1', 'org-client');
    expect(jwt.sign.mock.calls[0][0].organizationId).toBe('org-client');
  });

  it('looks the membership up by the caller\'s own id, not by the id in the request', async () => {
    // A lookup keyed only on organizationId would find somebody else's membership and
    // happily switch into it.
    const { service, prisma } = make({
      role: 'MEMBER',
      organization: { id: 'org-client', name: 'Client Co', slug: 'client-co' },
    });
    await service.switchOrganization('u1', 'org-client');
    expect(prisma.organizationMembership.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_organizationId: { userId: 'u1', organizationId: 'org-client' } },
      }),
    );
  });
});

describe('myOrganizations', () => {
  it('always includes the organisation the person is currently in', async () => {
    /**
     * Self-healing rather than silently wrong. If the active org has no membership row
     * - a broken account, or one created before the table existed - a switcher that
     * does not list where you already are reads as data loss.
     */
    const prisma: any = {
      user: { findUnique: jest.fn(async () => ({ organizationId: 'org-own', role: 'ADMIN' })) },
      organizationMembership: { findMany: jest.fn(async () => []) },
      organization: { findUnique: jest.fn(async () => ({ id: 'org-own', name: 'Mine', slug: 'mine' })) },
    };
    const service = new AuthService(
      prisma, { sign: () => 't' } as any, { get: () => undefined } as any, {} as any, {} as any, {} as any,
    );
    const rows = await service.myOrganizations('u1');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'org-own', active: true, role: 'ADMIN' })
  });

  it('marks exactly one as active', async () => {
    const prisma: any = {
      user: { findUnique: jest.fn(async () => ({ organizationId: 'org-b', role: 'MEMBER' })) },
      organizationMembership: {
        findMany: jest.fn(async () => [
          { organizationId: 'org-a', role: 'ADMIN', organization: { id: 'org-a', name: 'A', slug: 'a' } },
          { organizationId: 'org-b', role: 'MEMBER', organization: { id: 'org-b', name: 'B', slug: 'b' } },
        ]),
      },
      organization: { findUnique: jest.fn(async () => null) },
    };
    const service = new AuthService(
      prisma, { sign: () => 't' } as any, { get: () => undefined } as any, {} as any, {} as any, {} as any,
    );
    const rows = await service.myOrganizations('u1');
    expect(rows.filter(r => r.active)).toHaveLength(1);
    expect(rows.find(r => r.active)!.id).toBe('org-b');
  });
});
