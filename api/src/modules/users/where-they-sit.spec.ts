import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { aLineOrNothing, wouldMakeALoop, CANNOT_REPORT_TO_THEMSELVES, THAT_WOULD_MAKE_A_LOOP, NOT_IN_THIS_ORGANISATION } from './where-they-sit';

/**
 * WHERE SOMEBODY SITS (U.4): level, team, and who they report to, set by an admin, per organisation.
 * It describes the organisation and grants nothing.
 */
describe('the rules', () => {
  it('a blank box means not set, and spaces are tidied', () => {
    expect(aLineOrNothing('  Sales   rep ')).toBe('Sales rep');
    expect(aLineOrNothing('   ')).toBeNull();
    expect(aLineOrNothing(null)).toBeNull();
  });

  it('nobody reports to themselves, and no line goes round in a circle', () => {
    const line = new Map<string, string | null>([['miriam', 'wairimu'], ['wairimu', 'amani'], ['amani', null]]);
    expect(wouldMakeALoop('miriam', 'miriam', line)).toBe(true);
    /* Amani reporting to Miriam: Miriam reports to Wairimu, who reports to Amani. */
    expect(wouldMakeALoop('amani', 'miriam', line)).toBe(true);
    expect(wouldMakeALoop('miriam', 'amani', line)).toBe(false);
    /* A loop already in the data cannot hang the check. */
    const broken = new Map<string, string | null>([['a', 'b'], ['b', 'a']]);
    expect(wouldMakeALoop('c', 'a', broken)).toBe(false);
  });
});

function aService(memberships: { userId: string; reportsToUserId: string | null; level?: string | null; team?: string | null }[]) {
  const writes: any[] = [];
  const prisma: any = {
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => {
        const m = memberships.find((r) => r.userId === where.userId_organizationId.userId && where.userId_organizationId.organizationId === 'baridi');
        return m ? { id: `m-${m.userId}` } : null;
      }),
      findMany: jest.fn(async ({ where }: any) => memberships
        .filter(() => where.organizationId === 'baridi')
        .filter((m) => !where.userId || where.userId.in.includes(m.userId))
        .map((m) => ({ userId: m.userId, reportsToUserId: m.reportsToUserId, level: m.level ?? null, team: m.team ?? null }))),
      update: jest.fn(async (args: any) => { writes.push(args); const m = memberships.find((r) => `m-${r.userId}` === args.where.id)!; Object.assign(m, args.data); return {}; }),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) => where.id.in.map((id: string) => ({ id, firstName: id === 'wairimu' ? 'Wairimu' : id, lastName: id === 'wairimu' ? 'Kamau' : '', email: `${id}@baridi.co.ke` }))),
    },
  };
  const service = new UsersService(prisma, {} as any, {} as any, {} as any, { emit: () => undefined } as any);
  return { service, writes };
}

describe('an admin sets where somebody sits', () => {
  const people = () => [
    { userId: 'miriam', reportsToUserId: null },
    { userId: 'wairimu', reportsToUserId: 'amani' },
    { userId: 'amani', reportsToUserId: null },
  ];

  it('saves the level, team and manager, and answers with the manager by name', async () => {
    const { service } = aService(people());
    const r = await service.setWhereTheySit('baridi', 'miriam', { level: ' Sales rep ', team: 'Sales', reportsToUserId: 'wairimu' });
    expect(r).toEqual({ level: 'Sales rep', team: 'Sales', reportsTo: { id: 'wairimu', name: 'Wairimu Kamau' } });
  });

  it('changes only what was sent, and a blank clears it', async () => {
    const { service, writes } = aService(people());
    await service.setWhereTheySit('baridi', 'miriam', { team: '' });
    expect(writes[0].data).toEqual({ team: null });
  });

  it('refuses, in a sentence, a manager who is the person, outside the organisation, or below them', async () => {
    const { service, writes } = aService(people());
    await expect(service.setWhereTheySit('baridi', 'miriam', { reportsToUserId: 'miriam' })).rejects.toThrow(new BadRequestException(CANNOT_REPORT_TO_THEMSELVES));
    await expect(service.setWhereTheySit('baridi', 'miriam', { reportsToUserId: 'someone-at-another-company' })).rejects.toThrow(new BadRequestException(NOT_IN_THIS_ORGANISATION));
    await expect(service.setWhereTheySit('baridi', 'amani', { reportsToUserId: 'wairimu' })).rejects.toThrow(new BadRequestException(THAT_WOULD_MAKE_A_LOOP));
    expect(writes).toHaveLength(0);
  });

  it('and nobody outside this organisation can be given a place in it', async () => {
    const { service } = aService(people());
    await expect(service.setWhereTheySit('baridi', 'a-stranger', { level: 'Boss' })).rejects.toThrow(NotFoundException);
  });
});

describe('the People list', () => {
  it('counts and names only this organisation\'s check-ins, and says where each person sits', async () => {
    const asked: any[] = [];
    const prisma: any = {
      user: {
        findMany: jest.fn(async (args: any) => args.where?.organizationId
          ? [{ id: 'miriam', email: 'miriam@baridi.co.ke', firstName: 'Miriam', lastName: 'Wanjiku', role: 'MEMBER', isActive: true, isEmailVerified: true, createdAt: new Date('2026-07-01'), phoneNumber: null }]
          : [{ id: 'wairimu', firstName: 'Wairimu', lastName: 'Kamau', email: 'w@baridi.co.ke' }]),
        count: jest.fn(async () => 1),
      },
      groundParticipant: {
        findMany: jest.fn(async (args: any) => {
          asked.push(args.where);
          return [{ userId: 'miriam', createdAt: new Date('2026-07-02'), partyType: 'PARTICIPANT', ground: { id: 'g1', label: 'Sales team, Q3' }, checkIns: [{ id: 'c1' }] }];
        }),
      },
      organizationMembership: {
        findMany: jest.fn(async () => [{ userId: 'miriam', level: 'Sales rep', team: 'Sales', reportsToUserId: 'wairimu' }]),
      },
    };
    const service = new UsersService(prisma, {} as any, {} as any, {} as any, { emit: () => undefined } as any);
    const { data } = await service.findAll('baridi', { page: 1, limit: 100 } as any);
    /* Another company's check-ins are never counted here: each person's load is private. */
    expect(asked[0]).toEqual({ userId: { in: ['miriam'] }, ground: { organizationId: 'baridi' } });
    expect(data[0]).toMatchObject({
      level: 'Sales rep', team: 'Sales', reportsTo: { id: 'wairimu', name: 'Wairimu Kamau' },
      checkIns: [{ id: 'g1', label: 'Sales team, Q3', runsIt: false }],
      checkInsOn: 1, checkInsAnswered: 1,
    });
  });
});
