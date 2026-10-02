import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SuitesService, REFUSED, DUTIES_USED_FOR } from './suites.service';
import { DUTIES_REFUSED, readDuties, whoHolds } from './who-holds-each-duty';

/**
 * WHO HOLDS EACH DUTY, AS EACH PERSON IS SERVED IT (decision 85; step 2 of the build list in
 * docs/suites-against-the-workflow-model.md).
 *
 * Baridi Appliances. Grace is an admin. Wairimu leads Sales. Miriam is a member in Sales. Omar is a
 * member who keeps the books. Tomas is a guest from another company. The staff directory has the teams
 * Sales, Operations and Product.
 *
 * The rules under test, each read from what the server actually hands each reader:
 *   - only an admin reads and sets who holds each duty; a lead, a member and a guest are refused;
 *   - a duty names only somebody in this organisation, never a guest, and a team duty only a team in
 *     the staff directory; null clears a duty and a duty left out is kept;
 *   - what is set is said back in full sentences, with names;
 *   - the duties are kept beside the suites but are not a suite: the Suites page never shows them and
 *     they cannot be switched on.
 */

const ORG = 'org-baridi';
const people: Record<string, { userId: string; role: string; firstName: string; lastName: string; department: string | null }> = {
  grace: { userId: 'u-grace', role: 'ADMIN', firstName: 'Grace', lastName: 'Achieng', department: null },
  wairimu: { userId: 'u-wairimu', role: 'LEAD', firstName: 'Wairimu', lastName: 'Kamau', department: 'Sales' },
  miriam: { userId: 'u-miriam', role: 'MEMBER', firstName: 'Miriam', lastName: 'Wanjiku', department: 'Sales' },
  kamau: { userId: 'u-kamau', role: 'MEMBER', firstName: 'Kamau', lastName: 'Njenga', department: 'Operations' },
  lina: { userId: 'u-lina', role: 'MEMBER', firstName: 'Lina', lastName: 'Mutua', department: 'Product' },
  omar: { userId: 'u-omar', role: 'MEMBER', firstName: 'Omar', lastName: 'Abdi', department: null },
  tomas: { userId: 'u-tomas', role: 'GUEST', firstName: 'Tomas', lastName: 'Guest', department: null },
};
type Who = keyof typeof people;

function setup() {
  const rows: any[] = [];
  const find = (k: any) => rows.find((x) => x.organizationId === k.organizationId && x.suite === k.suite) ?? null;
  const prisma: any = {
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => {
        const p = Object.values(people).find((x) => x.userId === where.userId_organizationId.userId);
        return p && where.userId_organizationId.organizationId === ORG ? { role: p.role } : null;
      }),
      findMany: jest.fn(async ({ where }: any) =>
        Object.values(people)
          .filter((p) => where.organizationId === ORG && p.role !== where.role.not)
          .map((p) => ({ userId: p.userId, user: { firstName: p.firstName, lastName: p.lastName } }))),
    },
    person: {
      findMany: jest.fn(async ({ where }: any) => (where.organizationId === ORG ? Object.values(people).filter((p) => p.role !== 'GUEST').map((p) => ({ department: p.department })) : [])),
    },
    organizationSuite: {
      findMany: jest.fn(async ({ where }: any) => rows.filter((r) => r.organizationId === where.organizationId)),
      findUnique: jest.fn(async ({ where }: any) => find(where.organizationId_suite)),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const r = find(where.organizationId_suite);
        if (r) return Object.assign(r, update);
        const n = { answers: {}, ...create };
        rows.push(n);
        return n;
      }),
    },
  };
  const svc = new SuitesService(prisma);
  const as = (who: Who) => ({ userId: people[who].userId, organizationId: ORG });
  return { svc, as, rows, prisma };
}

describe('Grace, an admin', () => {
  it('reads every duty with nobody named yet, in plain questions, for each team in the staff directory', async () => {
    const { svc, as } = setup();
    const d = await svc.duties(as('grace'));
    expect(d.organisation).toEqual([
      { key: 'finance', ask: 'Who looks after finance?', holder: null },
      { key: 'hr', ask: 'Who looks after HR?', holder: null },
      { key: 'chiefExecutive', ask: 'Who is the chief executive?', holder: null },
    ]);
    expect(d.teams).toEqual([
      { team: 'Operations', budgetOwner: null, head: null },
      { team: 'Product', budgetOwner: null, head: null },
      { team: 'Sales', budgetOwner: null, head: null },
    ]);
    expect(d.teamAsks).toEqual({ budgetOwners: 'Who holds each team’s budget?', departmentHeads: 'Who heads each team?' });
    expect(d.said).toEqual(['Nobody has been named for any duty yet.']);
    expect(d.usedFor).toBe(DUTIES_USED_FOR);
    expect(d.people.map((p) => p.name)).not.toContain('Tomas Guest');
  });

  it('says who holds each duty, and reads it back in full sentences with names', async () => {
    const { svc, as, rows } = setup();
    const d = await svc.setDuties(as('grace'), {
      finance: 'u-omar', chiefExecutive: 'u-grace',
      budgetOwners: { Sales: 'u-wairimu', Product: 'u-lina' }, departmentHeads: { Sales: 'u-wairimu' },
    });
    expect(d.said).toEqual([
      'Omar Abdi looks after finance.',
      'Grace Achieng is the chief executive.',
      'Lina Mutua holds the Product budget.',
      'Wairimu Kamau holds the Sales budget.',
      'Wairimu Kamau heads Sales.',
    ]);
    expect(d.organisation[0].holder).toEqual({ id: 'u-omar', name: 'Omar Abdi' });
    expect(d.teams.find((t) => t.team === 'Sales')).toEqual({ team: 'Sales', budgetOwner: { id: 'u-wairimu', name: 'Wairimu Kamau' }, head: { id: 'u-wairimu', name: 'Wairimu Kamau' } });
    /* Kept in one row beside the suites, with who changed it, and never switched on. */
    expect(rows).toEqual([expect.objectContaining({ suite: 'duties', isOn: false, changedById: 'u-grace' })]);
  });

  it('clears a duty with null and keeps the ones left out', async () => {
    const { svc, as } = setup();
    await svc.setDuties(as('grace'), { finance: 'u-omar', budgetOwners: { Sales: 'u-wairimu', Product: 'u-lina' } });
    const d = await svc.setDuties(as('grace'), { finance: null, budgetOwners: { Product: null } });
    expect(d.said).toEqual(['Wairimu Kamau holds the Sales budget.']);
  });

  it('cannot name a guest, somebody outside, or a team that is not in the staff directory, and nothing changes', async () => {
    const { svc, as, rows } = setup();
    await expect(svc.setDuties(as('grace'), { finance: 'u-tomas' })).rejects.toThrow(new BadRequestException(DUTIES_REFUSED.notAPerson));
    await expect(svc.setDuties(as('grace'), { hr: 'u-nobody' })).rejects.toThrow(new BadRequestException(DUTIES_REFUSED.notAPerson));
    await expect(svc.setDuties(as('grace'), { budgetOwners: { Marketing: 'u-omar' } })).rejects.toThrow(new BadRequestException(DUTIES_REFUSED.notATeam));
    expect(rows).toEqual([]);
  });
});

describe('everybody else', () => {
  for (const who of ['wairimu', 'miriam', 'omar', 'tomas'] as Who[]) {
    it(`${people[who].firstName} is refused, in a plain sentence, and changes nothing`, async () => {
      const { svc, as, rows } = setup();
      await expect(svc.duties(as(who))).rejects.toThrow(new ForbiddenException('Only an admin can say who holds each duty.'));
      await expect(svc.setDuties(as(who), { finance: 'u-omar' })).rejects.toThrow(new ForbiddenException(DUTIES_REFUSED.onlyAnAdmin));
      expect(rows).toEqual([]);
    });
  }
});

describe('the duties are not a suite', () => {
  it('the Suites page never shows them, and they cannot be switched on', async () => {
    const { svc, as } = setup();
    await svc.setDuties(as('grace'), { finance: 'u-omar' });
    const page: any = await svc.forReader(as('grace'));
    expect(JSON.stringify(page.groups)).not.toContain('duties');
    await expect(svc.switch(as('grace'), 'duties', { on: true, answers: {} })).rejects.toThrow(new NotFoundException(REFUSED.noSuchSuite));
  });

  it('the engine reads who holds a duty, for a team or for the whole organisation', async () => {
    const { svc, as, prisma } = setup();
    await svc.setDuties(as('grace'), { finance: 'u-omar', budgetOwners: { Sales: 'u-wairimu' } });
    const d = await readDuties(prisma, ORG);
    expect(whoHolds(d, 'finance')).toBe('u-omar');
    expect(whoHolds(d, 'budgetOwners', 'Sales')).toBe('u-wairimu');
    expect(whoHolds(d, 'budgetOwners', 'Product')).toBeNull();
    expect(whoHolds(d, 'hr')).toBeNull();
  });
});
