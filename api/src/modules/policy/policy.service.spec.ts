import { PolicyService } from './policy.service';

/* Hand-written: Baridi Appliances (test), an in-memory record, and the model's stored answer for each document. */
function aBed(on = true, amaniIsChief = true) {
  const docs: any[] = [];
  let rules: any[] = [];
  let id = 0;
  const prisma: any = {
    organization: { findUnique: async ({ select }: any) => (select.release9PolicyOn ? { release9PolicyOn: on } : { name: 'Baridi Appliances' }) },
    policyDocument: {
      create: async ({ data }: any) => { const d = { id: `d${++id}`, ...data }; docs.push(d); return d; },
      findMany: async () => docs.map((d) => ({ name: d.name })),
    },
    organizationSuite: { findUnique: async () => ({ answers: { finance: 'u-grace', chiefExecutive: amaniIsChief ? 'u-amani' : undefined } }) },
    organizationMembership: { findMany: async () => [{ userId: 'u-grace', user: { firstName: 'Grace' } }, { userId: 'u-amani', user: { firstName: 'Amani' } }] },
    policyRule: {
      create: async ({ data }: any) => { const r = { id: `r${++id}`, createdAt: new Date(Date.now() + id), changedOn: null, ...data }; rules.push(r); return r; },
      findMany: async () => [...rules],
      updateMany: async ({ where, data }: any) => { rules = rules.map((r) => (where.id.in.includes(r.id) ? { ...r, ...data } : r)); return { count: where.id.in.length }; },
    },
  };
  const answers: Record<string, any> = {
    'Staff handbook': { rules: [{ area: 'leave', says: 'Staff get 20 days of paid leave a year.', where: 'page 6', measure: 'leave.days', value: '20' }] },
    'Leave policy': { rules: [
      { area: 'leave', says: '21 days of paid leave a year.', where: 'section 2', exceptionsBy: 'Grace', appliesTo: 'leave requests', measure: 'leave.days', value: '21' },
      { area: 'leave', says: 'Ask at least 5 working days ahead.', where: 'section 3', appliesTo: 'leave requests', measure: 'leave.noticeDays', value: '5' },
    ] },
    'Expense policy': { rules: [
      { area: 'spending', says: 'Anything over KES 20,000 needs a proforma before it’s approved.', where: 'page 1', appliesTo: 'spending requests', measure: 'spend.quoteAbove', value: '20000' },
      { area: 'spending', says: 'Spending over KES 50,000 needs Grace’s approval, then Amani’s.', where: 'page 2', appliesTo: 'spending requests', measure: 'spend.approvalAbove', value: '50000' },
    ] },
    'Staff handbook, time': { rules: [
      { area: 'timesheets', says: 'No more than 9 hours a day on any project without approval.', where: 'page 11', measure: 'time.hoursADay', value: '9' },
      { area: 'timesheets', says: 'A week locks on Monday. Grace can reopen it.', where: 'page 11', measure: 'time.locksOn', value: 'Monday' },
    ] },
  };
  const anthropic: any = { extract: async (_p: string, msgs: any[]) => answers[String(msgs[0].content).split('\n')[0]] };
  const knowledge: any = { ingested: [] as any[], ingestDocument: async (_o: string, input: any) => { knowledge.ingested.push(input); } };
  const suites: any = { calls: [] as any[], setLeaveDaysFromPolicy: async (_r: any, d: number) => suites.calls.push(['leave days', d]), setLeaveRules: async (_r: any, x: any) => suites.calls.push(['leave rules', x]), setSpendRules: async (_r: any, x: any) => suites.calls.push(['spend rules', x]), setTimeRules: async (_r: any, x: any) => suites.calls.push(['time rules', x]), spendRules: async () => ({ rules: { thresholds: [] } }) };
  return { svc: new PolicyService(prisma, anthropic, knowledge, suites), suites, knowledge, rules: () => rules };
}
const GRACE = { userId: 'grace', organizationId: 'baridi', role: 'ADMIN' };
const KEVIN = { userId: 'kevin', organizationId: 'baridi', role: 'MEMBER' };

describe('Release 9: setting up from documents, as Grace (an admin) and Kevin (a member) do it', () => {
  it('is off for every organisation until it is switched on', async () => {
    const { svc } = aBed(false);
    expect(await svc.board(GRACE)).toEqual({ on: false });
    await expect(svc.addDocument(GRACE, { name: 'Leave policy', text: 'x' })).rejects.toThrow('That could not be found.');
  });

  it('lets only an admin add a document or approve, while anyone reads the board', async () => {
    const { svc } = aBed();
    await expect(svc.addDocument(KEVIN, { name: 'Leave policy', text: 'words' })).rejects.toThrow('Only an admin can set up from documents or approve a rule.');
    await expect(svc.approve(KEVIN, { area: 'leave' })).rejects.toThrow('Only an admin');
    expect(await svc.board(KEVIN)).toMatchObject({ on: true, mayChange: false });
  });

  it('proposes rules and applies nothing until the area is approved, and asks first where two documents disagree', async () => {
    const { svc, suites } = aBed();
    await svc.addDocument(GRACE, { name: 'Staff handbook.pdf', text: 'The handbook.' });
    const page: any = await svc.addDocument(GRACE, { name: 'Leave policy', text: 'The leave policy.' });
    expect(page.setup.added).toBe('Added the staff handbook and the leave policy.');
    expect(page.setup.decideFirst[0].says).toBe('The staff handbook says 20 days a year (page 6). The leave policy says 21 days a year (section 2). Which is right?');
    expect(suites.calls).toEqual([]);
    expect((await svc.board(KEVIN) as any).board.areas).toEqual([]);
    await expect(svc.approve(GRACE, { area: 'leave' })).rejects.toThrow('Two documents disagree in this area. Decide that first, then approve it.');
  });

  it('once decided and approved, writes the leave days and the notice into the leave suite, and gives Ask the board', async () => {
    const { svc, suites, knowledge, rules } = aBed();
    await svc.addDocument(GRACE, { name: 'Staff handbook', text: 'The handbook.' });
    await svc.addDocument(GRACE, { name: 'Leave policy', text: 'The leave policy.' });
    const twentyOne = rules().find((r) => r.value === '21');
    await svc.decide(GRACE, { ruleId: twentyOne.id });
    expect(rules().find((r) => r.value === '20').state).toBe('set aside');
    await svc.approve(GRACE, { area: 'leave' });
    expect(suites.calls).toEqual([['leave days', 21], ['leave rules', { noticeDays: 5 }]]);
    expect(knowledge.ingested[0]).toMatchObject({ key: 'policy-board', title: 'Baridi Appliances’ policy board', kind: 'handbook' });
    const board: any = (await svc.board(KEVIN)).board;
    expect(board.areas[0].rules.map((r: any) => r.says)).toEqual(['21 days of paid leave a year.', 'Ask at least 5 working days ahead.']);
    expect(board.undecided).toEqual([]);
  });

  it('writes the proforma limit, and "Grace, then Amani" as the roles they hold, into the spending suite', async () => {
    const { svc, suites } = aBed();
    await svc.addDocument(GRACE, { name: 'Expense policy', text: 'The expense policy.' });
    await svc.approve(GRACE, { area: 'spending' });
    expect(suites.calls).toEqual([
      ['spend rules', { evidence: { what: 'quote', above: 20000 } }],
      ['spend rules', { thresholds: [{ above: 50000, steps: [['finance'], ['chiefExecutive']] }] }],
    ]);
  });

  it('writes nothing for a named approver who holds no role, and says what to do', async () => {
    const { svc, suites } = aBed(true, false);
    await svc.addDocument(GRACE, { name: 'Expense policy', text: 'The expense policy.' });
    const page: any = await svc.approve(GRACE, { area: 'spending' });
    expect(suites.calls).toEqual([['spend rules', { evidence: { what: 'quote', above: 20000 } }]]);
    expect(page.setup.cannotBeSetYet).toEqual(['Amani holds no role on record, so “Spending over KES 50,000 needs Grace’s approval, then Amani’s” is not a setting yet. Give them the finance, HR or chief executive role under Suites, then approve again.']);
  });

  it('writes the most hours a day and the day a week locks into the time sheets suite', async () => {
    const { svc, suites } = aBed();
    await svc.addDocument(GRACE, { name: 'Staff handbook, time', text: 'Hours.' });
    await svc.approve(GRACE, { area: 'timesheets' });
    expect(suites.calls).toEqual([['time rules', { mostHoursADay: 9, weekLocksOn: 'monday' }]]);
  });
});
