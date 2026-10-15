import { BadRequestException } from '@nestjs/common';
import { aSignInsNumberChanged, aRosterNumberChanged, refuseANumberOnSomebodyElse, aSignInWithNoNumberTakesTheRosters, A_NUMBER_ON_SOMEBODY_ELSE } from './one-number-for-a-person';

/**
 * ONE NUMBER FOR ONE PERSON (decision 106 item 3), read on a small database: Amani's sign-in and her
 * roster entry, and Chidi's sign-in.
 */
function aDatabase() {
  const users = [
    { id: 'u-amani', email: 'amani@kito.test', organizationId: 'org-1', phoneNumber: null as string | null, deletedAt: null },
    { id: 'u-chidi', email: 'chidi@kito.test', organizationId: 'org-1', phoneNumber: '+254700000002', deletedAt: null },
  ];
  const people = [{ id: 'p-amani', organizationId: 'org-1', linkedUserId: 'u-amani', email: 'amani@kito.test', phone: '+254700000001' as string | null }];
  const matches = (u: any, w: any) => (!w.phoneNumber || w.phoneNumber.in.includes(u.phoneNumber)) && (!w.NOT || u.id !== w.NOT.id) && (!w.email || u.email === w.email) && (!w.organizationId || u.organizationId === w.organizationId);
  const prisma: any = {
    user: {
      findUnique: async ({ where }: any) => users.find((u) => u.id === where.id) ?? null,
      findFirst: async ({ where }: any) => users.find((u) => matches(u, where)) ?? null,
      update: async ({ where, data }: any) => Object.assign(users.find((u) => u.id === where.id)!, data),
    },
    person: {
      findUnique: async ({ where }: any) => people.find((p) => p.id === where.id) ?? null,
      findMany: async ({ where }: any) => people.filter((p) => p.organizationId === where.organizationId && where.OR.some((o: any) => (o.linkedUserId && p.linkedUserId === o.linkedUserId) || (o.email && p.email === o.email))),
      update: async ({ where, data }: any) => Object.assign(people.find((p) => p.id === where.id)!, data),
    },
  };
  return { prisma, users, people };
}

describe('one number for one person', () => {
  it('the sign-in with no number takes the roster\'s', async () => {
    const { prisma, users } = aDatabase();
    await aSignInWithNoNumberTakesTheRosters(prisma, 'u-amani', '+254700000001');
    expect(users[0].phoneNumber).toBe('+254700000001');
  });

  it('Amani changes her number in Settings, and her roster entry follows', async () => {
    const { prisma, people } = aDatabase();
    await aSignInsNumberChanged(prisma, 'u-amani', '+254711111111');
    expect(people[0].phone).toBe('+254711111111');
  });

  it('an admin changes her roster entry, and her sign-in follows', async () => {
    const { prisma, users } = aDatabase();
    await aRosterNumberChanged(prisma, 'p-amani', '+254722222222');
    expect(users[0].phoneNumber).toBe('+254722222222');
  });

  it('a number on Chidi\'s sign-in is refused for Amani, in a sentence, and her own number is not', async () => {
    const { prisma } = aDatabase();
    const err: any = await refuseANumberOnSomebodyElse(prisma, '+254700000002', 'u-amani').catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.message).toBe(A_NUMBER_ON_SOMEBODY_ELSE);
    expect(A_NUMBER_ON_SOMEBODY_ELSE).toBe('This number is already used by another Groundwork sign-in, so it cannot be saved here. Check the number, or ask that person to remove it from their Settings first.');
    await expect(refuseANumberOnSomebodyElse(prisma, '+254700000002', 'u-chidi')).resolves.toBeUndefined();
  });

  it('a roster number that is on somebody else\'s sign-in is never carried across to hers', async () => {
    const { prisma, users } = aDatabase();
    await aRosterNumberChanged(prisma, 'p-amani', '+254700000002');
    expect(users[0].phoneNumber).toBeNull();
  });
});
