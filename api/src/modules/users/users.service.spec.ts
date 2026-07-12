import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';

/**
 * GW-03: GDPR erasure must anonymise all identifying fields without touching
 * other parties' ground data. Export must return the user's own data only.
 */
describe('UsersService - GW-03 GDPR erasure', () => {
  const USER_ID = 'u1';
  const LINK_ID = 'p1';

  function makePrisma(user: any, links: any[]) {
    const updates: any[] = [];
    const deleted: any[] = [];
    return {
      updates,
      deleted,
      prisma: {
        user: {
          findUnique: jest.fn(async () => user),
          update: jest.fn(async (args: any) => { updates.push({ model: 'user', data: args.data }); return {}; }),
        },
        emailVerificationToken: {
          deleteMany: jest.fn(async (args: any) => { deleted.push(args); return {}; }),
        },
        groundParticipant: {
          findMany: jest.fn(async () => links),
          update: jest.fn(async (args: any) => { updates.push({ model: 'groundParticipant', id: args.where.id, data: args.data }); return {}; }),
        },
        $transaction: jest.fn(async (ops: any[]) => {
          for (const op of ops) await op;
          return [];
        }),
      } as any,
    };
  }

  it('anonymises email, name, and credential fields on the user row', async () => {
    const user = { id: USER_ID, email: 'alice@example.com', firstName: 'Alice', lastName: 'Smith' };
    const { prisma, updates } = makePrisma(user, []);
    const service = new UsersService(prisma, {} as any);

    await service.eraseAccount(USER_ID);

    const userUpdate = updates.find((u) => u.model === 'user');
    expect(userUpdate).toBeDefined();
    expect(userUpdate.data.email).toMatch(`deleted-${USER_ID}@deleted`);
    expect(userUpdate.data.firstName).toBe('Deleted');
    expect(userUpdate.data.lastName).toBe('User');
    expect(userUpdate.data.passwordHash).toBeNull();
    expect(userUpdate.data.googleId).toBeNull();
    expect(userUpdate.data.isActive).toBe(false);
  });

  it('anonymises each participant link with a per-row unique email', async () => {
    const user = { id: USER_ID, email: 'alice@example.com' };
    const { prisma, updates } = makePrisma(user, [{ id: LINK_ID }]);
    const service = new UsersService(prisma, {} as any);

    await service.eraseAccount(USER_ID);

    const linkUpdate = updates.find((u) => u.model === 'groundParticipant' && u.id === LINK_ID);
    expect(linkUpdate).toBeDefined();
    expect(linkUpdate.data.email).toBe(`deleted-${LINK_ID}@deleted`);
    expect(linkUpdate.data.roleAsDescribed).toBeNull();
  });

  it('revokes all auth tokens', async () => {
    const user = { id: USER_ID, email: 'alice@example.com' };
    const { prisma, deleted } = makePrisma(user, []);
    const service = new UsersService(prisma, {} as any);

    await service.eraseAccount(USER_ID);

    expect(deleted.some((d) => d.where?.userId === USER_ID)).toBe(true);
  });

  it('throws NotFoundException when the user does not exist', async () => {
    const { prisma } = makePrisma(null, []);
    const service = new UsersService(prisma, {} as any);
    await expect(service.eraseAccount('nonexistent')).rejects.toBeInstanceOf(NotFoundException);
  });
});
