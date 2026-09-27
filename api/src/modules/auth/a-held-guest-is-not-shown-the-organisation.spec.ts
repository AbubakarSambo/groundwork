import { ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * A GUEST HELD FOR A SEAT IS NOT SHOWN THE ORGANISATION (U.4 third review). Baraka, held on Mto's
 * check-in, saw "Mto Test Supplies / Guest" in "Choose an organisation", while Mto's admin read
 * "They have not been told any of this." A held membership is left out of the person's own list and
 * switcher, and switching into it is refused as if there were none, until the hold is cleared.
 */
function make(memberships: any[]) {
  const prisma: any = {
    user: {
      findUnique: jest.fn(async () => ({ organizationId: 'pembe', role: 'ADMIN' })),
      update: jest.fn(async (a: any) => ({ id: 'baraka', email: 'b@pembe.test', firstName: 'Baraka', lastName: '', isPlatformAdmin: false, ...a.data })),
    },
    organizationMembership: {
      findMany: jest.fn(async ({ where }: any) => memberships
        .filter((m) => where.heldForASeat === undefined || m.heldForASeat === where.heldForASeat)
        .map((m) => ({ organizationId: m.organizationId, role: m.role, joinedHow: null, organization: { id: m.organizationId, name: m.name, slug: m.organizationId } }))),
      findUnique: jest.fn(async ({ where }: any) => {
        const m = memberships.find((x) => x.organizationId === where.userId_organizationId.organizationId);
        return m ? { role: m.role, heldForASeat: m.heldForASeat, organization: { id: m.organizationId, name: m.name, slug: m.organizationId } } : null;
      }),
    },
    person: { findMany: jest.fn(async () => []) },
    organization: { findUnique: jest.fn(async () => null) },
  };
  return new AuthService(prisma, { sign: () => 'tok' } as any, { get: () => undefined } as any, {} as any, {} as any, {} as any, { emit: () => undefined } as any);
}
const baraka = [
  { organizationId: 'pembe', name: 'Pembe Test Co', role: 'ADMIN', heldForASeat: false },
  { organizationId: 'mto', name: 'Mto Test Supplies', role: 'GUEST', heldForASeat: true },
];

describe('while held', () => {
  it('"Choose an organisation" lists only their own', async () => {
    const list: any[] = await make(baraka).myOrganizations('baraka') as any;
    expect(list.map((o) => o.name)).toEqual(['Pembe Test Co']);
  });
  it('and switching into it is refused, as if they were not a member', async () => {
    await expect(make(baraka).switchOrganization('baraka', 'mto')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('once the hold is cleared', () => {
  const cleared = baraka.map((m) => ({ ...m, heldForASeat: false }));
  it('it is listed as a guest one, and they can switch to it', async () => {
    const list: any[] = await make(cleared).myOrganizations('baraka') as any;
    expect(list.map((o) => [o.name, o.role])).toEqual([['Pembe Test Co', 'ADMIN'], ['Mto Test Supplies', 'GUEST']]);
    await expect(make(cleared).switchOrganization('baraka', 'mto')).resolves.toBeTruthy();
  });
});
