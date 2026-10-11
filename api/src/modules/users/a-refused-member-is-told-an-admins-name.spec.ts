import { UsersService } from './users.service';

/**
 * REQUEST 225 (c): a member refused People or Plan and billing is told which admin can change it, by name.
 * GET /users/organization/owner is for admins only, so this is served on its own, with the name and nothing else.
 */
describe('one admin, by name only', () => {
  const people = [
    { id: 'u-baraka', firstName: 'Baraka', lastName: 'Mutua', email: 'baraka@x.test', role: 'ADMIN' },
    { id: 'u-wairimu', firstName: 'Wairimu', lastName: 'Njoroge', email: 'wairimu@x.test', role: 'ADMIN' },
  ];
  const service = (owner: string | null, admins = people) => {
    const prisma: any = {
      organization: { findUnique: jest.fn(async () => ({ ownerUserId: owner })) },
      user: { findMany: jest.fn(async (a: any) => {
        expect(a.where).toMatchObject({ organizationId: 'org1', role: 'ADMIN', deletedAt: null });
        return admins.map(({ id, firstName, lastName }) => ({ id, firstName, lastName }));
      }) },
    };
    return new UsersService(prisma, {} as any, {} as any, {} as any, { emit: () => undefined } as any);
  };

  it('the owner where the owner is an admin, and only the name', async () => {
    const r = await service('u-wairimu').anAdminByName('org1');
    expect(r).toEqual({ name: 'Wairimu Njoroge' });
    expect(Object.keys(r)).toEqual(['name']);
  });

  it('otherwise the admin who has been one longest', async () => {
    expect(await service('u-somebody-else').anAdminByName('org1')).toEqual({ name: 'Baraka Mutua' });
  });

  it('nobody, where there is no admin with a name', async () => {
    expect(await service(null, []).anAdminByName('org1')).toEqual({ name: null });
  });

  it('is open to any signed-in person, unlike the owner lookup', () => {
    const { UsersController } = require('./users.controller');
    const roles = Reflect.getMetadata('roles', UsersController.prototype.anAdmin);
    expect(roles).toBeUndefined();
    expect(Reflect.getMetadata('roles', UsersController.prototype.whoSetThisUp)).toBeDefined();
  });
});
