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
  /*
   * Built from the memberships (U.4). Miriam belongs to Baridi but is looking at another
   * organisation right now, so her account's organisationId and role are that one's. Peter is a
   * guest from Ouma Agencies who has switched in to look. And Sam belongs only to Ouma.
   */
  const accounts: any = {
    miriam: { id: 'miriam', email: 'miriam@baridi.co.ke', firstName: 'Miriam', lastName: 'Wanjiku', organizationId: 'ouma', role: 'ADMIN', isActive: true, isEmailVerified: true, createdAt: new Date('2026-07-01'), phoneNumber: null, awaitingOrgApproval: false, deletedAt: null },
    peter: { id: 'peter', email: 'peter@ouma-agencies.co.ke', firstName: 'Peter', lastName: 'Ouma', organizationId: 'baridi', role: 'GUEST', isActive: true, isEmailVerified: true, createdAt: new Date('2026-09-22'), phoneNumber: null, awaitingOrgApproval: false, deletedAt: null },
    sam: { id: 'sam', email: 'sam@ouma.co', firstName: 'Sam', lastName: 'O', organizationId: 'baridi', role: 'ADMIN', isActive: true, isEmailVerified: true, createdAt: new Date('2026-06-01'), phoneNumber: null, awaitingOrgApproval: false, deletedAt: null },
    /* Pendo left Baridi: her account is inactive, her membership row is still there. */
    pendo: { id: 'pendo', email: 'pendo@baridi.co.ke', firstName: 'Pendo', lastName: 'Mwita', organizationId: 'baridi', role: 'MEMBER', isActive: false, isEmailVerified: true, createdAt: new Date('2026-08-01'), phoneNumber: null, awaitingOrgApproval: false, deletedAt: null },
  };
  const memberships = [
    { userId: 'miriam', organizationId: 'baridi', role: 'MEMBER', level: 'Sales rep', team: 'Sales', reportsToUserId: 'wairimu' },
    { userId: 'miriam', organizationId: 'ouma', role: 'ADMIN', level: null, team: null, reportsToUserId: null },
    { userId: 'peter', organizationId: 'baridi', role: 'GUEST', level: null, team: null, reportsToUserId: null },
    { userId: 'peter', organizationId: 'ouma', role: 'ADMIN', level: null, team: null, reportsToUserId: null },
    { userId: 'sam', organizationId: 'ouma', role: 'MEMBER', level: null, team: null, reportsToUserId: null },
    { userId: 'pendo', organizationId: 'baridi', role: 'MEMBER', level: null, team: null, reportsToUserId: null },
  ];
  /* The user filter the real query sends, applied to the account. */
  const accountOk = (id: string, w: any) => !w || ((w.isActive === undefined || accounts[id].isActive === w.isActive) && (w.deletedAt === undefined || accounts[id].deletedAt === w.deletedAt));
  function aList() {
    const asked: any[] = [];
    const prisma: any = {
      organizationMembership: {
        findMany: jest.fn(async (args: any) => {
          const mine = memberships.filter((m) => m.organizationId === args.where.organizationId && (!args.where.userId || args.where.userId.in.includes(m.userId)) && accountOk(m.userId, args.where.user));
          if (args.select?.user) return mine.map((m) => ({ role: m.role, user: accounts[m.userId] }));
          return mine;
        }),
        count: jest.fn(async (args: any) => memberships.filter((m) => m.organizationId === args.where.organizationId && accountOk(m.userId, args.where.user)).length),
      },
      user: {
        findMany: jest.fn(async () => [{ id: 'wairimu', firstName: 'Wairimu', lastName: 'Kamau', email: 'w@baridi.co.ke' }]),
      },
      groundParticipant: {
        findMany: jest.fn(async (args: any) => {
          asked.push(args.where);
          return [{ userId: 'miriam', createdAt: new Date('2026-07-02'), partyType: 'PARTICIPANT', ground: { id: 'g1', label: 'Sales team, Q3' }, checkIns: [{ id: 'c1' }] }];
        }),
      },
      membershipRequest: {
        findMany: jest.fn(async () => []),
      },
      /* Changed (request 179): the list names only the check-ins the reader may open, so the reader's own list of them is part of the set-up. */
      ground: { findMany: jest.fn(async () => [{ id: 'g1' }]) },
    };
    return { service: new UsersService(prisma, {} as any, {} as any, {} as any, { emit: () => undefined } as any), asked };
  }

  it('lists everyone who belongs here, whichever organisation they are looking at, with their role here', async () => {
    const { service } = aList();
    const { data, meta } = await service.findAll('baridi', { page: 1, limit: 100 } as any, 'grace');
    const miriam = data.find((p: any) => p.id === 'miriam')!;
    /* Her account says Ouma and ADMIN; here she takes part. */
    expect(miriam.role).toBe('MEMBER');
    expect(data.map((p: any) => p.id)).not.toContain('sam');
    expect(meta.total).toBe(2);
  });

  it('somebody who left is not listed, and the total agrees with the rows (U.4 fourth review)', async () => {
    const { service } = aList();
    const { data, meta } = await service.findAll('baridi', { page: 1, limit: 100 } as any, 'grace');
    expect(data.map((p: any) => p.id)).not.toContain('pendo');
    expect(meta.total).toBe(data.length);
  });

  it('a guest who switched in to look is listed as a guest, never as one of this organisation\'s people', async () => {
    const { service } = aList();
    const { data } = await service.findAll('baridi', { page: 1, limit: 100 } as any, 'grace');
    expect(data.find((p: any) => p.id === 'peter')!.role).toBe('GUEST');
    /* And at Ouma, where he is an admin, he is one. */
    const ouma = await aList().service.findAll('ouma', { page: 1, limit: 100 } as any);
    expect(ouma.data.find((p: any) => p.id === 'peter')!.role).toBe('ADMIN');
  });

  it('somebody added by name who has not opened the invitation is on that check-in, not on none', async () => {
    const { service } = aList();
    (service as any).prisma.groundParticipant.findMany = jest.fn(async () => [
      /* Added by name: the row has no account yet, only the address the invitation went to. */
      { userId: null, email: 'Peter@Ouma-Agencies.co.ke', createdAt: new Date('2026-09-22'), partyType: 'PARTICIPANT', ground: { id: 'g1', label: 'Sales team, Q3' }, checkIns: [] },
    ]);
    const { data } = await service.findAll('baridi', { page: 1, limit: 100 } as any, 'grace');
    expect(data.find((p: any) => p.id === 'peter')).toMatchObject({
      checkIns: [{ id: 'g1', label: 'Sales team, Q3', runsIt: false }], checkInsOn: 1, checkInsAnswered: 0, checkInsNotOpened: 1,
    });
  });

  it('counts and names only this organisation\'s check-ins, and says where each person sits', async () => {
    const { service, asked } = aList();
    const { data } = await service.findAll('baridi', { page: 1, limit: 100 } as any, 'grace');
    /* Another company's check-ins are never counted here: each person's load is private. */
    expect(asked[0]).toEqual({
      ground: { organizationId: 'baridi' },
      OR: [{ userId: { in: ['miriam', 'peter'] } }, { userId: null, email: { in: ['miriam@baridi.co.ke', 'peter@ouma-agencies.co.ke'] } }],
    });
    expect(data.find((p: any) => p.id === 'miriam')).toMatchObject({
      level: 'Sales rep', team: 'Sales', reportsTo: { id: 'wairimu', name: 'Wairimu Kamau' },
      checkIns: [{ id: 'g1', label: 'Sales team, Q3', runsIt: false }],
      checkInsOn: 1, checkInsAnswered: 1,
    });
  });
});

describe('"Not let in" (Hafsah, 29 September)', () => {
  /*
   * decline() (who-is-waiting-at-the-door.service.ts) leaves awaitingOrgApproval set on purpose,
   * because the account may still belong somewhere else. So this organisation's own answer has to
   * be read from ITS OWN latest request, not from that flag alone: declined reads "not let in";
   * still pending reads "waiting".
   */
  const accounts: any = {
    grace: { id: 'grace', email: 'grace@outside.co.ke', firstName: 'Grace', lastName: 'N', organizationId: 'baridi', role: 'MEMBER', isActive: true, isEmailVerified: true, createdAt: new Date('2026-09-20'), phoneNumber: null, awaitingOrgApproval: true, deletedAt: null },
    faraji: { id: 'faraji', email: 'faraji@outside.co.ke', firstName: 'Faraji', lastName: 'M', organizationId: 'baridi', role: 'MEMBER', isActive: true, isEmailVerified: true, createdAt: new Date('2026-09-21'), phoneNumber: null, awaitingOrgApproval: true, deletedAt: null },
  };
  const memberships = [
    { userId: 'grace', organizationId: 'baridi', role: 'MEMBER', level: null, team: null, reportsToUserId: null },
    { userId: 'faraji', organizationId: 'baridi', role: 'MEMBER', level: null, team: null, reportsToUserId: null },
  ];
  function aService(requests: { userId: string; status: string; createdAt: Date }[]) {
    const prisma: any = {
      organizationMembership: {
        findMany: jest.fn(async (args: any) => {
          const mine = memberships.filter((m) => m.organizationId === args.where.organizationId);
          if (args.select?.user) return mine.map((m) => ({ role: m.role, user: accounts[m.userId] }));
          return mine;
        }),
        count: jest.fn(async () => memberships.length),
      },
      user: { findMany: jest.fn(async () => []) },
      groundParticipant: { findMany: jest.fn(async () => []) },
      membershipRequest: {
        /* Latest first, as the real query orders it; the service keeps only the first it sees per person. */
        findMany: jest.fn(async (args: any) => requests
          .filter((r) => args.where.userId.in.includes(r.userId))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())),
      },
    };
    return new UsersService(prisma, {} as any, {} as any, {} as any, { emit: () => undefined } as any);
  }

  it('a declined person comes back as not let in', async () => {
    const service = aService([{ userId: 'grace', status: 'DECLINED', createdAt: new Date('2026-09-20') }]);
    const { data } = await service.findAll('baridi', { page: 1, limit: 100 } as any, 'grace');
    expect(data.find((p: any) => p.id === 'grace')).toMatchObject({ notLetIn: true });
  });

  it('a person still waiting on an answer comes back as waiting, not not-let-in', async () => {
    const service = aService([{ userId: 'faraji', status: 'PENDING', createdAt: new Date('2026-09-21') }]);
    const { data } = await service.findAll('baridi', { page: 1, limit: 100 } as any, 'grace');
    expect(data.find((p: any) => p.id === 'faraji')).toMatchObject({ notLetIn: false, awaitingOrgApproval: true });
  });

  it('only their latest request to this organisation decides it, not an older declined one', async () => {
    const service = aService([
      { userId: 'grace', status: 'DECLINED', createdAt: new Date('2026-09-10') },
      { userId: 'grace', status: 'PENDING', createdAt: new Date('2026-09-20') },
    ]);
    const { data } = await service.findAll('baridi', { page: 1, limit: 100 } as any, 'grace');
    expect(data.find((p: any) => p.id === 'grace')).toMatchObject({ notLetIn: false });
  });
});
