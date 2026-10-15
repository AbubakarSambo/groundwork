import { ForbiddenException } from '@nestjs/common';
import { CompanyService, NOT_YOUR_COMPANY } from './company.service';
import { SubjectsService } from '../subjects/subjects.service';
import { recordTheStrategy, versionOn } from '../subjects/the-strategy-over-time';

/**
 * THE STRATEGY KEEPS ITS VERSIONS, AS EACH READER MEETS THEM (decision 80, item 68).
 *
 * Baridi's own system pushes priorities. Each change to the set begins a new version, written when the priority is pushed or dropped and
 * never when the page opens. Everybody in the organisation who reads the priorities reads the history (it holds only their titles); a guest
 * is refused. An organisation that has never changed its priorities since this was built reads the page exactly as it did.
 */
const ORG = 'org-baridi';
const day = (d: string) => new Date(`${d}T09:00:00Z`);

const matches = (row: any, where: any): boolean => Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
  if (k === 'organizationId_sourceSystem_externalId') return row.organizationId === v.organizationId && row.sourceSystem === v.sourceSystem && row.externalId === v.externalId;
  if (v && typeof v === 'object' && 'in' in v) return v.in.includes(row[k]);
  if (v && typeof v === 'object' && 'not' in v) return row[k] !== v.not && !(v.not === null && row[k] == null);
  return row[k] === v;
});

function setup() {
  const db = { subject: [] as any[], strategyVersion: [] as any[] };
  const prisma: any = {
    organization: { findUnique: async () => ({ name: 'Baridi Appliances' }) },
    subject: {
      findMany: jest.fn(async ({ where, orderBy }: any) => db.subject.filter((r) => matches(r, where)).sort((a, b) => (orderBy?.createdAt === 'asc' ? a.createdAt - b.createdAt : 0))),
      findFirst: async ({ where }: any) => db.subject.find((r) => matches(r, where)) ?? null,
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const found = db.subject.find((r) => matches(r, where));
        if (found) return Object.assign(found, update);
        const made = { id: `s${db.subject.length + 1}`, createdAt: new Date(), sourceDeletedAt: null, parentExternalId: null, ...create };
        db.subject.push(made);
        return made;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => { const hit = db.subject.filter((r) => matches(r, where)); hit.forEach((r) => Object.assign(r, data)); return { count: hit.length }; }),
    },
    strategyVersion: {
      findFirst: async ({ where }: any) => db.strategyVersion.filter((r) => matches(r, where)).sort((a, b) => b.number - a.number)[0] ?? null,
      findMany: async ({ where }: any) => db.strategyVersion.filter((r) => matches(r, where)).sort((a, b) => a.number - b.number),
      create: jest.fn(async ({ data }: any) => {
        if (db.strategyVersion.some((r) => r.organizationId === data.organizationId && r.number === data.number)) throw Object.assign(new Error('unique'), { code: 'P2002' });
        const made = { id: `v${db.strategyVersion.length + 1}`, ...data };
        db.strategyVersion.push(made);
        return made;
      }),
    },
    person: { findMany: async () => [] },
    organizationMembership: { findMany: async () => [{ team: null }] },
    ground: { findMany: async () => [] },
    companyPicture: { findUnique: async () => null },
    organizationMemory: { findMany: async () => [] },
  };
  const grounds: any = { list: async () => [] };
  const subjects = new SubjectsService(prisma);
  const company = new CompanyService(prisma, grounds);
  const push = (externalId: string, title: string, extra: any = {}) => subjects.push(ORG, { sourceSystem: 'okr-tool', externalId, type: 'objective', title, ...extra } as any);
  const read = (role: string) => company.forReader({ userId: `u-${role}`, email: `${role}@baridi.test`, organizationId: ORG, role });
  return { db, prisma, subjects, push, read };
}

describe('the strategy keeps its versions', () => {
  it('a new organisation reads no history, then "Strategy v1" once a priority is set, then v2 when one is added', async () => {
    const { push, read } = setup();
    expect((await read('ADMIN')).strategy).toBeNull();
    await push('p1', 'Grow revenue 50%, enterprise first');
    const one = (await read('ADMIN')).strategy!;
    expect(one.number).toBe(1);
    expect(one.says).toMatch(/^Strategy v1, since \d+ \w+( \d{4})?\.$/);
    await push('p2', 'Improve delivery');
    const two = (await read('ADMIN')).strategy!;
    expect(two.number).toBe(2);
    expect(two.history.map((h) => h.number)).toEqual([2, 1]);
    expect(two.history[0].whatChanged).toBe('This version added “Improve delivery”.');
    expect(two.history[0].priorities).toEqual(['Grow revenue 50%, enterprise first', 'Improve delivery']);
    expect(two.history[1].whatChanged).toBeNull();
  });

  it('pushing the same priorities again, or a project, or something under a priority, makes no new version', async () => {
    const { push, read, db } = setup();
    await push('p1', 'Grow revenue');
    await push('p1', 'Grow revenue', { measure: 'Deals' });
    await push('proj', 'A project', { type: 'project' });
    await push('o2', 'Under it', { parentExternalId: 'p1' });
    expect(db.strategyVersion).toHaveLength(1);
    expect((await read('MEMBER')).strategy!.number).toBe(1);
  });

  it('dropping a priority, or renaming one, begins a new version that says so in full sentences', async () => {
    const { push, read, subjects } = setup();
    await push('p1', 'Grow revenue');
    await push('p2', 'Improve delivery');
    await subjects.markSourceDeleted(ORG, 'okr-tool', 'p2');
    const dropped = (await read('LEAD')).strategy!;
    expect(dropped.number).toBe(3);
    expect(dropped.history[0].whatChanged).toBe('This version removed “Improve delivery”.');
    await push('p1', 'Grow revenue by half');
    const renamed = (await read('LEAD')).strategy!;
    expect(renamed.history[0].whatChanged).toBe('This version added “Grow revenue by half” and removed “Grow revenue”.');
  });

  it('opening the page writes nothing, and two writers at once make one version', async () => {
    const { push, read, db, prisma } = setup();
    await push('p1', 'Grow revenue');
    prisma.strategyVersion.create.mockClear();
    await read('ADMIN'); await read('MEMBER'); await read('LEAD');
    expect(prisma.strategyVersion.create).not.toHaveBeenCalled();
    await push('p2', 'Improve delivery');
    await Promise.all([recordTheStrategy(prisma, ORG), recordTheStrategy(prisma, ORG)]);
    expect(db.strategyVersion.map((v) => v.number)).toEqual([1, 2]);
  });

  it('an organisation that had priorities from before: they become version 1 from the day the earliest was set, and the change begins version 2', async () => {
    const { db, push, read } = setup();
    db.subject.push({ id: 'old1', organizationId: ORG, sourceSystem: 'okr-tool', externalId: 'a', type: 'OBJECTIVE', title: 'Grow revenue', parentExternalId: null, sourceDeletedAt: null, createdAt: day('2026-09-01'), syncedAt: new Date() });
    db.subject.push({ id: 'old2', organizationId: ORG, sourceSystem: 'okr-tool', externalId: 'b', type: 'OBJECTIVE', title: 'Improve delivery', parentExternalId: null, sourceDeletedAt: null, createdAt: day('2026-09-10'), syncedAt: new Date() });
    expect((await read('ADMIN')).strategy).toBeNull();
    await push('c', 'Build a stronger organisation');
    const page = (await read('ADMIN')).strategy!;
    expect(page.history.map((h) => h.number)).toEqual([2, 1]);
    expect(page.history[1].says).toBe('Strategy v1, since 1 September.');
    expect(page.history[1].priorities).toEqual(['Grow revenue', 'Improve delivery']);
    expect(page.history[0].whatChanged).toBe('This version added “Build a stronger organisation”.');
  });

  it('which version a check-in ran under is found from the dates', async () => {
    const { db } = setup();
    const v = (number: number, d: string) => ({ number, startedAt: day(d), priorities: [] });
    const versions = [v(1, '2026-09-01'), v(2, '2026-10-01')];
    expect(versionOn(versions, day('2026-08-20'))).toBeNull();
    expect(versionOn(versions, day('2026-09-20'))!.number).toBe(1);
    expect(versionOn(versions, day('2026-10-05'))!.number).toBe(2);
    expect(db.strategyVersion).toEqual([]);
  });
});

describe('what each reader is served', () => {
  it('an admin, a lead and a member read the same history, with only priority titles in it; a guest is refused', async () => {
    const { push, read } = setup();
    await push('p1', 'Grow revenue', { measure: 'THE-MEASURE', target: 'THE-TARGET', ownerExternalId: 'x-wairimu' });
    await push('p2', 'Improve delivery');
    const [admin, lead, member] = await Promise.all([read('ADMIN'), read('LEAD'), read('MEMBER')]);
    expect(lead.strategy).toEqual(admin.strategy);
    expect(member.strategy).toEqual(admin.strategy);
    expect(JSON.stringify(member.strategy)).not.toMatch(/THE-MEASURE|THE-TARGET|x-wairimu|Wairimu/);
    await expect(read('GUEST')).rejects.toThrow(new ForbiddenException(NOT_YOUR_COMPANY));
  });

  it('the page that always was is the same: the line, the priorities and what success looks like are untouched', async () => {
    const { push, read } = setup();
    await push('p1', 'Grow revenue', { measure: 'Deals', target: '12' });
    const admin = await read('ADMIN');
    const member = await read('MEMBER');
    expect(admin.priorities[0]).toMatchObject({ title: 'Grow revenue', measure: 'Deals', target: '12' });
    expect(member.priorities[0].measure).toBeUndefined();
    expect(admin.line).toMatch(/work here/);
  });
});
