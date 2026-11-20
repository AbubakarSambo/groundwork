import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SuitesService, REFUSED, type ForAnAdmin } from './suites.service';
import { SUITES } from './the-ten-suites';

/**
 * THE SUITES PAGE, AS EACH PERSON IS SERVED IT (E, U.17).
 *
 * Baridi Appliances. Grace is an admin. Wairimu is a lead. Miriam is a member. Tomas is a guest
 * from another company, added to one check-in. Nobody has switched anything on yet.
 *
 * The rules under test, each read from what the server actually hands each reader:
 *   - only an admin switches a suite on or off; a lead, a member and a guest are refused;
 *   - an admin reads all ten suites in three groups, People, Money and Work, in the prototype's words;
 *   - a suite with first questions switches on only once every one is answered, with a real answer;
 *   - a lead reads only which suites are on, of the seven for leads: no switches, no answers, and
 *     never the three that are for admins only; a member and a guest read nothing;
 *   - a "person" question can name only somebody in this organisation, never a guest.
 */

const ORG = 'org-baridi';
const people: Record<string, { userId: string; role: string; firstName: string; lastName: string }> = {
  grace: { userId: 'u-grace', role: 'ADMIN', firstName: 'Grace', lastName: 'Achieng' },
  wairimu: { userId: 'u-wairimu', role: 'LEAD', firstName: 'Wairimu', lastName: 'Kamau' },
  miriam: { userId: 'u-miriam', role: 'MEMBER', firstName: 'Miriam', lastName: 'Wanjiku' },
  kamau: { userId: 'u-kamau', role: 'MEMBER', firstName: 'Kamau', lastName: 'Njenga' },
  tomas: { userId: 'u-tomas', role: 'GUEST', firstName: 'Tomas', lastName: 'Guest' },
};
type Who = keyof typeof people;

function setup() {
  const rows: any[] = [];
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
    organizationSuite: {
      findMany: jest.fn(async ({ where }: any) => rows.filter((r) => r.organizationId === where.organizationId)),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const k = where.organizationId_suite;
        const r = rows.find((x) => x.organizationId === k.organizationId && x.suite === k.suite);
        if (r) return Object.assign(r, update);
        const n = { answers: {}, ...create };
        rows.push(n);
        return n;
      }),
    },
  };
  const svc = new SuitesService(prisma);
  const as = (who: Who) => ({ userId: people[who].userId, organizationId: ORG });
  return { svc, as, rows };
}

const served = (x: unknown) => JSON.stringify(x);

describe('switching a suite on or off', () => {
  it('an admin may switch a suite with no questions on straight away, and off again', async () => {
    const { svc, as } = setup();
    const page = (await svc.switch(as('grace'), 'todos', { on: true })) as ForAnAdmin;
    const todos = page.groups.flatMap((g) => g.suites).find((s) => s.key === 'todos')!;
    expect(todos.on).toBe(true);
    const off = (await svc.switch(as('grace'), 'todos', { on: false })) as ForAnAdmin;
    expect(off.groups.flatMap((g) => g.suites).find((s) => s.key === 'todos')!.on).toBe(false);
  });

  for (const who of ['wairimu', 'miriam', 'tomas'] as Who[]) {
    it(`${people[who].role.toLowerCase()} ${people[who].firstName} is refused, in a plain sentence, and nothing changes`, async () => {
      const { svc, as, rows } = setup();
      await expect(svc.switch(as(who), 'todos', { on: true })).rejects.toThrow(new ForbiddenException(REFUSED.onlyAnAdmin));
      expect(rows).toHaveLength(0);
    });
  }

  it('somebody from another organisation is refused', async () => {
    const { svc } = setup();
    await expect(svc.switch({ userId: 'u-grace', organizationId: 'org-other' }, 'todos', { on: true })).rejects.toThrow(ForbiddenException);
  });

  it('a suite that does not exist is not found', async () => {
    const { svc, as } = setup();
    await expect(svc.switch(as('grace'), 'payroll', { on: true })).rejects.toThrow(new NotFoundException(REFUSED.noSuchSuite));
  });

  it('a suite with questions stays off until every one is answered', async () => {
    const { svc, as, rows } = setup();
    await expect(svc.switch(as('grace'), 'leave', { on: true })).rejects.toThrow(new BadRequestException(REFUSED.answerFirst));
    /* Batch S, S1: "Who approves?" is no longer asked for leave (it was kept and never read); the days a year are the one question. */
    await expect(svc.switch(as('grace'), 'leave', { on: true, answers: { days: -3 } })).rejects.toThrow(BadRequestException);
    expect(rows).toHaveLength(0);
    const page = (await svc.switch(as('grace'), 'leave', { on: true, answers: { days: '21', extra: 'dropped' } })) as ForAnAdmin;
    const leave = page.groups.flatMap((g) => g.suites).find((s) => s.key === 'leave')!;
    expect(leave.on).toBe(true);
    expect(leave.answers).toEqual({ days: 21 });
  });

  it('a person question names only somebody in this organisation, never a guest', async () => {
    const { svc, as } = setup();
    await expect(svc.switch(as('grace'), 'equipment', { on: true, answers: { keeper: 'u-tomas' } })).rejects.toThrow(BadRequestException);
    await expect(svc.switch(as('grace'), 'equipment', { on: true, answers: { keeper: 'u-nobody' } })).rejects.toThrow(BadRequestException);
    const page = (await svc.switch(as('grace'), 'equipment', { on: true, answers: { keeper: 'u-kamau' } })) as ForAnAdmin;
    expect(page.groups.flatMap((g) => g.suites).find((s) => s.key === 'equipment')!.answers).toEqual({ keeper: 'u-kamau' });
    expect(page.people.map((p) => p.name)).not.toContain('Tomas Guest');
  });

  it('a list answer keeps one line each, and is refused when empty', async () => {
    const { svc, as } = setup();
    await expect(svc.switch(as('grace'), 'time', { on: true, answers: { clients: '  \n ', approver: 'An admin' } })).rejects.toThrow(BadRequestException);
    const page = (await svc.switch(as('grace'), 'time', { on: true, answers: { clients: 'Naivas\n Lakeside \n\nGreen Mart', approver: 'An admin' } })) as ForAnAdmin;
    expect(page.groups.flatMap((g) => g.suites).find((s) => s.key === 'time')!.answers.clients).toEqual(['Naivas', 'Lakeside', 'Green Mart']);
  });

  it('switching off keeps the answers, so switching on again starts from them', async () => {
    const { svc, as } = setup();
    await svc.switch(as('grace'), 'reviews', { on: true, answers: { every: 'Every 6 months', writer: 'Their manager' } });
    const off = (await svc.switch(as('grace'), 'reviews', { on: false })) as ForAnAdmin;
    const reviews = off.groups.flatMap((g) => g.suites).find((s) => s.key === 'reviews')!;
    expect(reviews.on).toBe(false);
    expect(reviews.answers).toEqual({ every: 'Every 6 months', writer: 'Their manager' });
  });
});

describe('what the admin, Grace, reads', () => {
  it('every suite, in three groups, in the prototype’s words, all off to begin with', async () => {
    const { svc, as } = setup();
    const page: any = await svc.forReader(as('grace'));
    expect(page.reader).toBe('admin');
    expect(page.groups.map((g: any) => [g.name, g.suites.map((s: any) => s.name)])).toEqual([
      ['People', ['Onboarding', 'Leave requests', 'Time sheets', 'Performance reviews', 'When someone leaves', 'Role map']],
      ['Money', ['Spending and budgets']],
      ['Work', ['To-dos', 'Customers and deals', 'Equipment']],
    ]);
    expect(page.groups[0].suites[1].line).toBe('People ask for time off in a check-in or chat. Groundwork checks their days left and who else is off.');
    expect(page.groups.flatMap((g: any) => g.suites).every((s: any) => s.on === false)).toBe(true);
  });

  it('the organisation’s own people by name, for the person questions, with no addresses', async () => {
    const { svc, as } = setup();
    const page: any = await svc.forReader(as('grace'));
    expect(page.people).toEqual([
      { id: 'u-grace', name: 'Grace Achieng' },
      { id: 'u-kamau', name: 'Kamau Njenga' },
      { id: 'u-miriam', name: 'Miriam Wanjiku' },
      { id: 'u-wairimu', name: 'Wairimu Kamau' },
    ]);
    expect(served(page)).not.toMatch(/@/);
  });
});

describe('what the lead, Wairimu, reads', () => {
  it('nothing, while nothing is on', async () => {
    const { svc, as } = setup();
    expect(await svc.forReader(as('wairimu'))).toEqual({ reader: 'lead', suites: [] });
  });

  it('only the suites that are on, of those for leads: never the admin-only ones, and no answers or switches', async () => {
    const { svc, as } = setup();
    await svc.switch(as('grace'), 'time', { on: true, answers: { clients: 'Naivas', approver: 'An admin' } });
    await svc.switch(as('grace'), 'todos', { on: true });
    await svc.switch(as('grace'), 'roles', { on: true });
    await svc.switch(as('grace'), 'equipment', { on: true, answers: { keeper: 'u-kamau' } });
    await svc.switch(as('grace'), 'customers', { on: true });
    await svc.switch(as('grace'), 'customers', { on: false });
    const page: any = await svc.forReader(as('wairimu'));
    expect(page).toEqual({
      reader: 'lead',
      suites: [
        { key: 'time', name: 'Time sheets', line: 'People say how many hours they spent, and on which client or project. Used for billing only.' },
        { key: 'todos', name: 'To-dos', line: 'Everything people said they will do, in each check-in.' /* Changed (request 181 item 1, decision 110): to-dos are served by check-in, not as one list from every check-in and chat. */ },
      ],
    });
    expect(served(page)).not.toMatch(/Naivas|u-kamau|"answers"|"questions"|"people"|"on"/);
  });
});

describe('a member and a guest', () => {
  for (const who of ['miriam', 'tomas'] as Who[]) {
    it(`${people[who].firstName} is refused the page, in a plain sentence`, async () => {
      const { svc, as } = setup();
      await expect(svc.forReader(as(who))).rejects.toThrow(new ForbiddenException(REFUSED.onlyAdminsAndLeads));
    });
  }
});

describe('the ten suites', () => {
  it('three are for admins only, as docs/modules.md has it', () => {
    expect(SUITES.filter((s) => !s.forLeads).map((s) => s.key)).toEqual(['leaving', 'roles', 'equipment']);
  });
  it('no suite asks more than three questions first', () => {
    for (const s of SUITES) expect(s.questions.length).toBeLessThanOrEqual(3);
  });
  it('nothing a person reads carries a label on a person', () => {
    expect(served(SUITES)).not.toMatch(/\b(PIP|at[- ]risk|exit|low[- ]performer|score)\b/i);
  });
});
