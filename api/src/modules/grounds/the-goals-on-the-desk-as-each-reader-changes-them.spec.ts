import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TheGoalsOnTheDeskService } from './the-goals-on-the-desk.service';
import { SubjectsService } from '../subjects/subjects.service';
import { ITS_WORDS_ARE_ELSEWHERE, NOT_YOURS_TO_CHANGE, NOT_YOURS_TO_TIE } from './a-goal-on-the-desk';

/**
 * THE GOALS ON THE DESK, AS EACH READER MAY CHANGE THEM (Hafsah, 21 November 2026: "For desk: adding strategy or goals and tying them
 * to a check-in"). Msingi Foods: Grace is the admin, Wairimu the Sales lead who runs "Sales team, Q4", Baraka the Operations lead who
 * runs "The new stock system", Amani a member. Everything here is decided on the server.
 */
const ORG = 'org-msingi';
const grace = { userId: 'u-grace', email: 'grace@msingi.test', organizationId: ORG, role: 'ADMIN' };
const wairimu = { userId: 'u-wairimu', email: 'wairimu@msingi.test', organizationId: ORG, role: 'LEAD' };
const baraka = { userId: 'u-baraka', email: 'baraka@msingi.test', organizationId: ORG, role: 'LEAD' };
const amani = { userId: 'u-amani', email: 'amani@msingi.test', organizationId: ORG, role: 'MEMBER' };

function world() {
  const subjects: any[] = [
    { id: 's-1', organizationId: ORG, externalId: 'priority-1', sourceSystem: 'seed', type: 'OBJECTIVE', title: 'Grow supermarket sales', measure: 'Monthly revenue', target: 'KES 3m', ownerExternalId: 'p-wairimu', parentExternalId: null, syncedAt: new Date(), sourceDeletedAt: null, createdAt: new Date('2026-11-01') },
    { id: 's-2', organizationId: ORG, externalId: 'priority-2', sourceSystem: 'seed', type: 'OBJECTIVE', title: 'Every depot on the new stock system', measure: null, target: null, ownerExternalId: 'p-baraka', parentExternalId: null, syncedAt: new Date(), sourceDeletedAt: null, createdAt: new Date('2026-11-02') },
  ];
  const grounds: any[] = [
    { id: 'g-sales', organizationId: ORG, label: 'Sales team, Q4', initiatorId: 'u-wairimu', subjectExternalId: null, status: 'ACTIVE', createdAt: new Date('2026-11-01') },
    { id: 'g-stock', organizationId: ORG, label: 'The new stock system', initiatorId: 'u-baraka', subjectExternalId: 'priority-2', status: 'ACTIVE', createdAt: new Date('2026-11-02') },
  ];
  const people: any[] = [
    { organizationId: ORG, externalId: 'p-grace', linkedUserId: 'u-grace', email: 'grace@msingi.test', displayName: 'Grace Achieng', active: true },
    { organizationId: ORG, externalId: 'p-wairimu', linkedUserId: 'u-wairimu', email: 'wairimu@msingi.test', displayName: 'Wairimu Njoroge', active: true },
    { organizationId: ORG, externalId: 'p-baraka', linkedUserId: 'u-baraka', email: 'baraka@msingi.test', displayName: 'Baraka Mutua', active: true },
  ];
  /* Everybody on People. Halima Noor joined today, so she has a sign-in and no entry in the directory yet. */
  const users: any[] = [
    { id: 'u-halima', firstName: 'Halima', lastName: 'Noor', email: 'halima@msingi.test', phoneNumber: null, awaitingOrgApproval: false },
  ];
  const members: any[] = [
    { organizationId: ORG, userId: 'u-grace', role: 'ADMIN', team: null, reportsToUserId: null, user: { firstName: 'Grace', lastName: 'Achieng' } },
    { organizationId: ORG, userId: 'u-wairimu', role: 'LEAD', team: null, reportsToUserId: null, user: { firstName: 'Wairimu', lastName: 'Njoroge' } },
    { organizationId: ORG, userId: 'u-baraka', role: 'LEAD', team: null, reportsToUserId: null, user: { firstName: 'Baraka', lastName: 'Mutua' } },
    { organizationId: ORG, userId: 'u-amani', role: 'MEMBER', team: null, reportsToUserId: null, user: { firstName: 'Amani', lastName: 'Wekesa' } },
    { organizationId: ORG, userId: 'u-halima', role: 'MEMBER', team: null, reportsToUserId: null, user: { firstName: 'Halima', lastName: 'Noor' } },
    { organizationId: ORG, userId: 'u-olu', role: 'GUEST', team: null, reportsToUserId: null, user: { firstName: 'Olu', lastName: 'Bankole' } },
  ];
  const matches = (row: any, where: any): boolean => Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
    if (k === 'OR') return (v as any[]).some((w) => matches(row, w));
    if (v && typeof v === 'object' && 'not' in v) return row[k] !== v.not;
    if (v && typeof v === 'object' && 'in' in v) return v.in.includes(row[k]);
    if (v && typeof v === 'object' && 'equals' in v) return String(row[k] ?? '').toLowerCase() === String(v.equals).toLowerCase();
    if (v === null) return row[k] == null;
    return row[k] === v;
  });
  const prisma: any = {
    user: {
      findUnique: jest.fn(async ({ where }: any) => users.find((u) => u.id === where?.id) ?? { awaitingOrgApproval: false }),
      findMany: jest.fn(async () => []),
    },
    organizationMembership: { findMany: jest.fn(async ({ where }: any) => members.filter((m) => m.organizationId === where.organizationId)) },
    subject: {
      findMany: jest.fn(async ({ where }: any) => subjects.filter((s) => matches(s, where))),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const k = where.organizationId_sourceSystem_externalId;
        const found = subjects.find((s) => s.organizationId === k.organizationId && s.sourceSystem === k.sourceSystem && s.externalId === k.externalId);
        if (found) { Object.assign(found, update); return found; }
        const row = { id: `s-${subjects.length + 1}`, parentExternalId: null, sourceDeletedAt: null, createdAt: new Date(), ...create };
        subjects.push(row); return row;
      }),
    },
    ground: {
      findMany: jest.fn(async ({ where }: any) => grounds.filter((g) => matches(g, where))),
      update: jest.fn(async ({ where, data }: any) => Object.assign(grounds.find((g) => g.id === where.id), data)),
    },
    person: {
      findFirst: jest.fn(async ({ where }: any) => people.find((p) => matches(p, where)) ?? null),
      findMany: jest.fn(async ({ where }: any) => people.filter((p) => matches(p, where))),
      create: jest.fn(async ({ data }: any) => { const row = { id: `person-${people.length + 1}`, ...data }; people.push(row); return row; }),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
    /* The strategy's next version is kept by SubjectsService.push; nothing about it is asserted here. */
    strategyVersion: { findFirst: jest.fn(async () => null), create: jest.fn(async () => ({})) },
    organization: { findUnique: jest.fn(async () => ({ name: 'Msingi Foods' })) },
  };
  const subjectsService = new SubjectsService(prisma);
  const picture = { rebuild: jest.fn(async () => 'built') };
  const svc = new TheGoalsOnTheDeskService(prisma, subjectsService, picture as any);
  return { svc, subjects, grounds, picture, people };
}

describe('the goals on the Desk, as each reader may change them', () => {
  it('Amani, a member, is told she may change nothing, and is refused a change made anyway', async () => {
    const { svc, subjects, grounds, picture } = world();
    expect(await svc.read(amani)).toEqual({ mayChange: false });
    await expect(svc.add(amani, { title: 'Sell more', checkInIds: ['g-sales'] })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.change(amani, 's-1', { checkInIds: ['g-sales'] })).rejects.toBeInstanceOf(ForbiddenException);
    expect(picture.rebuild).not.toHaveBeenCalled();
    expect(subjects).toHaveLength(2);
    expect(grounds.find((g) => g.id === 'g-sales')!.subjectExternalId).toBeNull();
  });

  it('Wairimu, a lead, is offered only the goal she owns and only the check-in she runs, and her measure and target are not served', async () => {
    const { svc } = world();
    const served = await svc.read(wairimu);
    expect(served.mayChooseOwner).toBe(false);
    expect(served.goals!.map((g) => g.title)).toEqual(['Grow supermarket sales']);
    expect(served.goals![0]).not.toHaveProperty('measure');
    expect(served.checkIns!.map((c) => c.label)).toEqual(['Sales team, Q4']);
    expect(served).not.toHaveProperty('people');
  });

  it('Wairimu ties Sales team, Q4 to her goal, the Desk reads it as fed by it, and the company picture is written again', async () => {
    const { svc, grounds, picture } = world();
    const served = await svc.change(wairimu, 's-1', { checkInIds: ['g-sales'] });
    expect(grounds.find((g) => g.id === 'g-sales')!.subjectExternalId).toBe('priority-1');
    expect(served.goals![0].fedBy).toBe('Fed by Sales team, Q4.');
    expect(picture.rebuild).toHaveBeenCalledWith(ORG);
  });

  it('reads only check-ins by a status that exists, so a real database never refuses the read', async () => {
    const { svc } = world();
    await svc.read(grace);
    const asked = (svc as any).prisma.ground.findMany.mock.calls.map((c: any[]) => c[0].where.status).filter(Boolean);
    expect(asked.length).toBeGreaterThan(0);
    /* GroundStatus has no DECLINED: asking for it made Postgres refuse the whole read (400 on GET /company/goals). */
    expect(JSON.stringify(asked)).not.toContain('DECLINED');
    expect(asked.every((st: any) => st.not === 'AWAITING_APPROVAL')).toBe(true);
  });

  it('Wairimu is refused Baraka’s goal, and refused tying a check-in she does not run', async () => {
    const { svc, grounds } = world();
    await expect(svc.change(wairimu, 's-2', { checkInIds: ['g-sales'] })).rejects.toThrow(NOT_YOURS_TO_CHANGE);
    await expect(svc.change(wairimu, 's-1', { checkInIds: ['g-stock'] })).rejects.toThrow(NOT_YOURS_TO_TIE);
    expect(grounds.find((g) => g.id === 'g-stock')!.subjectExternalId).toBe('priority-2');
  });

  it('a goal Wairimu adds is in her own name, whoever she names, and its words can be changed on the Desk', async () => {
    const { svc, subjects } = world();
    const served = await svc.add(wairimu, { title: '  Win  three new supermarkets ', ownerId: 'p-grace', measure: 'x', checkInIds: ['g-sales'] });
    const added = subjects.find((s) => s.sourceSystem === 'desk')!;
    expect(added.title).toBe('Win three new supermarkets');
    expect(added.ownerExternalId).toBe('p-wairimu');
    expect(added.measure).toBeNull();
    expect(served.goals!.find((g) => g.title === 'Win three new supermarkets')!.wordsChangedHere).toBe(true);
  });

  it('the words of a goal from the organisation’s own system are not changed here, but its check-ins are', async () => {
    const { svc, grounds } = world();
    await expect(svc.change(grace, 's-1', { title: 'Something else' })).rejects.toThrow(ITS_WORDS_ARE_ELSEWHERE);
    await svc.change(grace, 's-1', { checkInIds: ['g-sales', 'g-stock'] });
    expect(grounds.map((g) => g.subjectExternalId)).toEqual(['priority-1', 'priority-1']);
  });

  it('Grace, the admin, may change any goal, choose who owns it, and untie a check-in', async () => {
    const { svc, grounds } = world();
    const served = await svc.read(grace);
    expect(served.goals!.map((g) => g.title)).toEqual(['Grow supermarket sales', 'Every depot on the new stock system']);
    expect(served.goals![0].measure).toBe('Monthly revenue');
    /* Everybody here who is not a guest: the directory's three, and Amani and Halima, who have no entry in it yet (bug 53). */
    expect(served.people!.map((p) => p.name)).toEqual(['Amani Wekesa', 'Baraka Mutua', 'Grace Achieng', 'Halima Noor', 'Wairimu Njoroge']);
    await svc.add(grace, { title: 'Hire two drivers', ownerId: 'p-baraka', target: 'By January', checkInIds: [] });
    await svc.change(grace, 's-2', { checkInIds: [] });
    expect(grounds.find((g) => g.id === 'g-stock')!.subjectExternalId).toBeNull();
    await expect(svc.add(grace, { title: '   ' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('Grace puts a goal in the name of Halima Noor, who joined today, and the Desk reads "Halima Noor is responsible for this"', async () => {
    const { svc, people } = world();
    const halima = (await svc.read(grace)).people!.find((p) => p.name === 'Halima Noor')!;
    const served = await svc.add(grace, { title: 'Open ten new shops in Kisumu', ownerId: halima.id, checkInIds: [] });
    const goal = served.goals!.find((g) => g.title === 'Open ten new shops in Kisumu')!;
    expect(goal.owner).toBe('Halima Noor');
    /* Her entry in the directory is made once, linked to her sign-in, and she is listed once from then on. */
    expect(people.filter((p) => p.linkedUserId === 'u-halima')).toHaveLength(1);
    expect(served.people!.filter((p) => p.name === 'Halima Noor')).toHaveLength(1);
    expect(goal.ownerId).toBe(served.people!.find((p) => p.name === 'Halima Noor')!.id);
  });

  it('a guest is never offered, and a sign-in that is not here is refused', async () => {
    const { svc } = world();
    expect((await svc.read(grace)).people!.map((p) => p.name)).not.toContain('Olu Bankole');
    await expect(svc.add(grace, { title: 'Something', ownerId: 'member:u-olu' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.add(grace, { title: 'Something', ownerId: 'member:u-nobody' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
