import { SuitesService, type ForAnAdmin } from './suites.service';
import { answersUnderTheQuestionsOwnIds } from './the-answers-under-the-questions-own-ids';
import { suiteOf } from './the-ten-suites';

/**
 * B-124: an admin could not set the days of leave a year, how often people are reviewed or a budget, because the settings were stored as `daysAYear`, an approver
 * who is a person's id and a `workflow`, while the suite's questions are `days`, a choice of approver, and so on. The settings page refused to open them.
 */
const ORG = 'org-kijani';
const people = {
  naomi: { userId: 'u-naomi', role: 'ADMIN', firstName: 'Naomi', lastName: 'Achieng' },
  tendai: { userId: 'u-tendai', role: 'LEAD', firstName: 'Tendai', lastName: 'Moyo' },
  esther: { userId: 'u-esther', role: 'MEMBER', firstName: 'Esther', lastName: 'Adeyemi' },
};

function setup(stored: Record<string, { isOn: boolean; answers: unknown }>) {
  const rows: any[] = Object.entries(stored).map(([suite, v]) => ({ organizationId: ORG, suite, isOn: v.isOn, answers: v.answers }));
  const prisma: any = {
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => {
        const p = Object.values(people).find((x) => x.userId === where.userId_organizationId.userId);
        return p ? { role: p.role } : null;
      }),
      findMany: jest.fn(async ({ where }: any) =>
        Object.values(people)
          .filter((p) => (where.role && typeof where.role === 'string' ? p.role === where.role : where.role?.not ? p.role !== where.role.not : true))
          .map((p) => ({ userId: p.userId, user: { firstName: p.firstName, lastName: p.lastName } }))),
    },
    organizationSuite: {
      findMany: jest.fn(async ({ where }: any) => rows.filter((r) => r.organizationId === where.organizationId)),
      findUnique: jest.fn(async ({ where }: any) => rows.find((r) => r.organizationId === where.organizationId_suite.organizationId && r.suite === where.organizationId_suite.suite) ?? null),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const k = where.organizationId_suite;
        const r = rows.find((x) => x.organizationId === k.organizationId && x.suite === k.suite);
        if (r) return Object.assign(r, update);
        rows.push({ answers: {}, ...create });
        return create;
      }),
    },
  };
  const svc = new SuitesService(prisma);
  return { svc, rows, admin: { userId: 'u-naomi', organizationId: ORG } };
}
const suitePage = (page: any, key: string) => (page as ForAnAdmin).groups.flatMap((g) => g.suites).find((s) => s.key === key)!;
const everyQuestionHasAnId = (s: any) => s.questions.every((q: any) => q.id in s.answers);

describe('B-124: an admin reads the settings of leave, reviews and spending under the questions\' own ids', () => {
  const legacy = {
    leave: { isOn: true, answers: { approver: 'u-naomi', workflow: 'one_approver', daysAYear: 21 } },
    /* Spending's limit and who approves above it are kept as the lowest of its steps by amount (Hafsah's plan of 2 November, step 0). */
    spend: { isOn: true, answers: { approver: 'u-naomi', workflow: 'one_approver', categories: ['Fuel'] } },
    spendRules: { isOn: false, answers: { thresholds: [{ above: 100000, steps: [[{ named: 'u-naomi' }]] }] } },
    reviews: { isOn: true, answers: { approver: 'u-naomi', workflow: 'one_approver' } },
  };
  it('leave: the days a year read back as 21 and the approver as "An admin"', async () => {
    const { svc, admin } = setup(legacy);
    const s = suitePage(await svc.forReader(admin), 'leave');
    expect(s.answers).toMatchObject({ days: 21, approver: 'An admin' });
    expect(everyQuestionHasAnId(s)).toBe(true);
    expect(JSON.stringify(s.answers)).not.toMatch(/daysAYear/);
  });
  it('reviews: the person kept as the one who approves reads as the one who writes, and how often is asked for', async () => {
    const { svc, admin } = setup(legacy);
    const s = suitePage(await svc.forReader(admin), 'reviews');
    expect(s.answers).toMatchObject({ writer: 'An admin', every: '' });
    expect(everyQuestionHasAnId(s)).toBe(true);
  });
  it('spending: the limit and who approves above it are read from the steps by amount, and the currency is asked for', async () => {
    const { svc, admin } = setup(legacy);
    const s = suitePage(await svc.forReader(admin), 'spend');
    expect(s.answers).toMatchObject({ limit: 100000, above: 'u-naomi', currency: '' });
    expect(everyQuestionHasAnId(s)).toBe(true);
  });
  it('saving writes the questions\' own ids, keeps what else was set, and drops only the old name it replaces', async () => {
    const { svc, rows, admin } = setup(legacy);
    await svc.switch(admin, 'leave', { on: true, answers: { days: 25, approver: 'Their manager' } });
    const row = rows.find((r) => r.suite === 'leave');
    expect(row.answers).toEqual({ workflow: 'one_approver', days: 25, approver: 'Their manager' });
    await svc.switch(admin, 'spend', { on: true, answers: { currency: 'KES', limit: 150000, above: 'u-naomi' } });
    /* The limit and the person above it go to the steps by amount, and nowhere else. */
    expect(rows.find((r) => r.suite === 'spend').answers).toEqual({ workflow: 'one_approver', categories: ['Fuel'], currency: 'KES' });
    expect(rows.find((r) => r.suite === 'spendRules').answers).toEqual({ thresholds: [{ above: 150000, steps: [[{ named: 'u-naomi' }]] }] });
    const after = suitePage(await svc.forReader(admin), 'spend');
    expect(after.answers).toMatchObject({ currency: 'KES', limit: 150000 });
  });
  it('a lead is not served any of it', async () => {
    const { svc } = setup(legacy);
    const page: any = await svc.forReader({ userId: 'u-tendai', organizationId: ORG });
    expect(page.reader).toBe('lead');
    expect(JSON.stringify(page)).not.toMatch(/21|100000|answers/);
  });
});

describe('B-124: answers already under the questions\' ids are read as they were', () => {
  it('leaves them exactly alone', () => {
    const stored = { days: 18, approver: 'Their manager' };
    expect(answersUnderTheQuestionsOwnIds(suiteOf('leave')!, stored)).toEqual(stored);
  });
  it('reads the old review cadence into the choice', () => {
    expect(answersUnderTheQuestionsOwnIds(suiteOf('reviews')!, { cadence: 'every 12 months', writer: 'Their manager' })).toEqual({ every: 'Every 12 months', writer: 'Their manager' });
  });
  it('a suite with nothing stored serves nothing, so the form is empty and the page does not say it was set up another way', () => {
    expect(answersUnderTheQuestionsOwnIds(suiteOf('leave')!, {})).toEqual({});
    expect(answersUnderTheQuestionsOwnIds(suiteOf('leave')!, null)).toEqual({});
  });
});
