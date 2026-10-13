import { ForbiddenException } from '@nestjs/common';
import { RoleMapService } from './the-role-map.service';
import { RoleInterviewService } from './the-role-interview.service';
import { correctTheirJob, NO_JOB_YET, NOT_NAMED_YET } from './correct-their-job';

/**
 * Decision 129, as each reader is served. Miriam told us about her job in her first check-in. She reads all of it. Grace, an admin, reads on the
 * role map only what Miriam agreed to show, and only what the job owns. Kwame, a colleague, reads none of it. Nobody but Miriam can change it.
 */
const ORG = 'org-baridi';
const people = [
  { externalId: 'p-grace', displayName: 'Grace Achieng', title: null, active: true, linkedUserId: 'u-grace', id: 'id-grace' },
  { externalId: 'p-miriam', displayName: 'Miriam Wanjiku', title: 'Sales representative', active: true, linkedUserId: 'u-miriam', id: 'id-miriam' },
  { externalId: 'p-kwame', displayName: 'Kwame Mensah', title: null, active: true, linkedUserId: 'u-kwame', id: 'id-kwame' },
];
const MIRIAM = {
  organizationId: ORG, personExternalId: 'p-miriam', roleName: 'Sales representative', owns: 'the Nairobi accounts', decides: null,
  dependsOn: 'finance to approve discounts', dependedOnBy: null, doingWell: 'no customer waits more than two days for a quote',
  inTheWay: 'waiting for the depot to confirm stock', source: 'first_check_in', sharedAt: null as Date | null, createdAt: new Date('2026-10-11'),
};

function world(rows: any[] = [{ ...MIRIAM }]) {
  const written: any[] = []; const users: Record<string, string | null> = { 'u-miriam': 'Sales representative', 'u-kwame': null, 'u-grace': null };
  const answerFilter = (where: any, r: any) =>
    (!where.organizationId || r.organizationId === where.organizationId) && (!where.personExternalId || (where.personExternalId.in ?? [where.personExternalId]).includes(r.personExternalId))
    && (!where.OR || where.OR.some((c: any) => (c.source ? r.source === c.source : c.sharedAt ? r.sharedAt !== null : true)));
  const prisma: any = {
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => ({ role: where.userId_organizationId.userId === 'u-grace' ? 'ADMIN' : 'MEMBER' })) },
    organizationSuite: { findUnique: jest.fn(async () => ({ isOn: true })) },
    role: { findMany: jest.fn(async () => [{ key: 'sales', name: 'Sales representative', description: null }]) },
    roleAssignment: { findMany: jest.fn(async () => []) },
    person: {
      findMany: jest.fn(async () => people),
      findFirst: jest.fn(async ({ where }: any) => people.find((p) => p.linkedUserId === where.linkedUserId) ?? null),
      update: jest.fn(async ({ where, data }: any) => { people.find((p) => p.id === where.id)!.title = data.title; return {}; }),
    },
    user: {
      findUnique: jest.fn(async ({ where }: any) => ({ jobTitle: users[where.id] ?? null })),
      update: jest.fn(async ({ where, data }: any) => { users[where.id] = data.jobTitle; return {}; }),
    },
    roleInterviewAnswer: {
      findMany: jest.fn(async ({ where }: any) => rows.filter((r) => answerFilter(where, r)).sort((a, b) => +b.createdAt - +a.createdAt)),
      findFirst: jest.fn(async ({ where }: any) => rows.filter((r) => answerFilter(where, r)).sort((a, b) => +b.createdAt - +a.createdAt)[0] ?? null),
      create: jest.fn(async ({ data }: any) => { const r = { createdAt: new Date('2026-10-12'), ...data }; rows.push(r); written.push(r); return r; }),
    },
    roleGapNote: { findMany: jest.fn(async () => []) },
    groundDependency: { findMany: jest.fn(async () => []) },
  };
  return { prisma, rows, written, users, interview: new RoleInterviewService(prisma), map: new RoleMapService(prisma), as: (userId: string) => ({ userId, organizationId: ORG }) };
}

describe('Miriam reads all she told us, and nobody else does', () => {
  it('Miriam reads every part, with where it came from', async () => {
    const w = world();
    const mine: any = await w.interview.mine(w.as('u-miriam'));
    expect(mine.answers[0]).toMatchObject({ owns: 'the Nairobi accounts', doingWell: 'no customer waits more than two days for a quote', inTheWay: 'waiting for the depot to confirm stock', source: 'first_check_in' });
    expect(mine.current).toMatchObject({ roleName: 'Sales representative', roleMapShowsWhatYouOwn: false });
  });
  it('Kwame, a colleague, reads none of it, and neither does Grace through this route', async () => {
    const w = world();
    expect(((await w.interview.mine(w.as('u-kwame'))) as any).answers).toEqual([]);
    expect(((await w.interview.mine(w.as('u-grace'))) as any).answers).toEqual([]);
  });
});

describe('the role map, which only an admin opens', () => {
  it('shows nothing of what Miriam said until she says yes', async () => {
    const w = world();
    const board = JSON.stringify(await w.map.board(w.as('u-grace')));
    expect(board).not.toContain('the Nairobi accounts');
    expect(board).not.toContain('waiting for the depot');
  });
  it('after her yes shows what the job owns and nothing else she said', async () => {
    const w = world([{ ...MIRIAM, sharedAt: new Date('2026-10-12') }]);
    const board = JSON.stringify(await w.map.board(w.as('u-grace')));
    expect(board).toContain('the Nairobi accounts');
    for (const private_ of ['finance to approve discounts', 'no customer waits', 'waiting for the depot']) expect(board).not.toContain(private_);
  });
  it('still shows an interview an admin sent and the person answered', async () => {
    const w = world([{ ...MIRIAM, source: 'interview', owns: 'The sales target' }]);
    expect(JSON.stringify(await w.map.board(w.as('u-grace')))).toContain('The sales target');
  });
  it('a member cannot open it', async () => {
    await expect(world().map.board(world().as('u-miriam'))).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('correcting it', () => {
  it('writes a new row for the person who is correcting, keeps the rest, and never starts an agreement to show it', async () => {
    const w = world();
    const done = await w.interview.correctMine(w.as('u-miriam'), { inTheWay: 'late approvals from finance' });
    expect(done.changed).toEqual(['inTheWay']);
    expect(w.written[0]).toMatchObject({ personExternalId: 'p-miriam', owns: 'the Nairobi accounts', inTheWay: 'late approvals from finance', source: 'correction', sharedAt: null });
    expect(w.rows).toHaveLength(2);
  });
  it('keeps the agreement the earlier row had', async () => {
    const w = world([{ ...MIRIAM, sharedAt: new Date('2026-10-12') }]);
    await w.interview.correctMine(w.as('u-miriam'), { owns: 'the Nairobi and Mombasa accounts' });
    expect(w.written[0].sharedAt).toBeInstanceOf(Date);
  });
  it('naming the job sets the title on the account and the roster, which is the one way an existing title changes', async () => {
    const w = world();
    await w.interview.correctMine(w.as('u-miriam'), { roleName: 'Account manager' });
    expect(w.users['u-miriam']).toBe('Account manager');
    expect(people.find((p) => p.externalId === 'p-miriam')!.title).toBe('Account manager');
    people.find((p) => p.externalId === 'p-miriam')!.title = 'Sales representative';
  });
  it('Kwame changes only his own, and has to name his job first', async () => {
    const w = world();
    await expect(correctTheirJob(w.prisma, { userId: 'u-kwame', organizationId: ORG }, { owns: 'stock planning' })).rejects.toThrow(NO_JOB_YET);
    await correctTheirJob(w.prisma, { userId: 'u-kwame', organizationId: ORG }, { roleName: 'Stock planner', owns: 'stock planning' });
    expect(w.written[0].personExternalId).toBe('p-kwame');
    expect(w.rows.filter((r) => r.personExternalId === 'p-miriam')).toHaveLength(1);
  });
  it('a placeholder name is never read as a job', async () => {
    const w = world([{ ...MIRIAM, roleName: NOT_NAMED_YET }]);
    expect(((await w.interview.mine(w.as('u-miriam'))) as any).current.roleName).toBe('Sales representative');
  });
  it('says plainly when a part is too long or nothing is sent', async () => {
    const w = world();
    await expect(w.interview.correctMine(w.as('u-miriam'), { owns: 'x'.repeat(1001) })).rejects.toThrow(/fewer than 1000 characters/);
    await expect(w.interview.correctMine(w.as('u-miriam'), {})).rejects.toThrow('Say what you would like to change about your job.');
  });
});
