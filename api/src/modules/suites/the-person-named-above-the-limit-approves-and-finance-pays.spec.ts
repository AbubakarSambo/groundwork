import { aSpendingOrganisation, DIRECTORY, ORG, TODAY } from './a-spending-organisation-for-specs';
import { SpendingForFinanceService } from './the-spending-for-finance.service';
import { WhatNeedsYouService } from '../grounds/what-needs-you.service';
import { theStepsFor, whoDecidesNow } from './who-may-decide';
import { spendRulesFrom } from './the-spending-rules';

/**
 * THE PERSON NAMED ABOVE THE LIMIT APPROVES, AND FINANCE PAYS (use-case walk of 2 November, Muchemi; Hafsah's plan, step 0).
 *
 * The walk: the limit was KES 10,000 and "Who approves anything above that?" was Wanjiru. Brian, with no team and no manager, asked
 * for KES 65,000, and it went to Njeri in finance, because the built-in chain above the limit put the budget holder and finance in
 * front of the person named. Then Njeri's Today card opened an empty approvals queue.
 *
 * Here in Baridi Appliances: Grace saves the settings card with a limit of KES 10,000 and Fatuma above it. Omar looks after finance.
 * Kamau, with his team and manager taken out of the directory for this file, asks for KES 65,000. Each person reads where it is.
 */
const kamau = DIRECTORY.find((p) => p.linkedUserId === 'u-kamau')!;
kamau.department = null as any;
kamau.managerExternalId = null as any;

beforeEach(() => jest.useFakeTimers({ now: TODAY, doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'nextTick', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate'] }));
afterEach(() => jest.useRealTimers());

async function muchemi() {
  const o = aSpendingOrganisation();
  await o.suites.switch(o.as('u-grace'), 'spend', { on: true, answers: { currency: 'KES', limit: 10000, above: 'u-fatuma' } });
  const finance = new SpendingForFinanceService(o.prisma);
  const grounds: any = { list: async () => [], listAwaitingApproval: async () => [] };
  const today = new WhatNeedsYouService(o.prisma, grounds, undefined, undefined, o.svc, undefined, finance);
  return { ...o, finance, today };
}

describe('the settings card is the lowest of the steps by amount', () => {
  it('saving it writes the row, keeps no limit of its own, and serves the card its answers back', async () => {
    const o = await muchemi();
    expect(spendRulesFrom(o.suiteRows.spendRules.answers).thresholds).toEqual([{ above: 10000, steps: [[{ named: 'u-fatuma' }]] }]);
    expect(o.suiteRows.spend.answers).toEqual({ currency: 'KES' });
    const page: any = await o.suites.forReader(o.as('u-grace'));
    const card = page.groups.flatMap((g: any) => g.suites).find((s: any) => s.key === 'spend');
    expect(card.answers).toEqual({ currency: 'KES', limit: 10000, above: 'u-fatuma' });
  });

  it('Grace reads the whole route where it is set, with finance’s part after the last approval', async () => {
    const o = await muchemi();
    expect((await o.suites.spendRules(o.as('u-grace'))).said.slice(0, 3)).toEqual([
      /* Batch S, S2: the step below the limit names the manager's manager before an admin. */
      'Up to KES 10,000, the person’s manager approves, or else their manager’s manager, or else an admin.',
      'Over KES 10,000, Fatuma approves.',
      'Once it is approved, Omar in finance checks it, notes the receipt or quote, and records it paid.',
    ]);
  });
});

describe('Kamau asks for KES 65,000, with no team and no manager', () => {
  it('it waits for Fatuma, the person named, and never for Omar in finance', async () => {
    const o = await muchemi();
    await o.svc.ask(ORG, 'u-kamau', { amount: 65000, what: 'an expert witness report' });
    const id = o.requests[o.requests.length - 1].id;
    expect(await o.svc.nowWaitingFor(ORG, id)).toBe('Fatuma');
    expect(JSON.stringify(o.sent.map((m: any) => m.to))).not.toMatch(/u-omar|\+25471005/);

    const fatuma = (await o.svc.board(o.as('u-fatuma'), TODAY)).waiting.find((w) => w.id === id)!;
    expect(fatuma).toMatchObject({ mayDecide: true });
    expect(fatuma.where).toMatch(/waiting for you/);
    const grace = (await o.svc.board(o.as('u-grace'), TODAY)).waiting.find((w) => w.id === id)!;
    expect(grace).toMatchObject({ mayDecide: false });
    expect(grace.where).toMatch(/waiting for Fatuma/);

    const omar = JSON.stringify(await o.today.forReader('u-omar', 'omar@baridi.example', ORG, 'MEMBER'));
    expect(omar).not.toContain('waiting for you to approve');
  });

  it('Fatuma approves once, it is approved, and Omar’s Today item opens the requests for finance, where it is listed', async () => {
    const o = await muchemi();
    await o.svc.ask(ORG, 'u-kamau', { amount: 65000, what: 'an expert witness report' });
    const id = o.requests[o.requests.length - 1].id;
    await o.svc.decide(o.as('u-fatuma'), id, 'approved', TODAY);
    expect(o.requests.find((r) => r.id === id)).toMatchObject({ status: 'approved', approvedByIds: ['u-fatuma'] });

    const needs = (await o.today.forReader('u-omar', 'omar@baridi.example', ORG, 'MEMBER')) as any;
    const item = (needs.needs ?? needs).find((n: any) => n.key === 'spend-finance');
    expect(item.title).toBe('Two approved requests to spend are waiting for you in finance.');
    expect(item.action).toEqual({ label: 'Open them', to: '/suite/spend/finance' });
    const view = await o.finance.view(o.as('u-omar'), TODAY);
    expect(JSON.stringify(view)).toContain(id);
  });

  it('KES 5,000 goes to an admin, because Kamau has no manager', async () => {
    const o = await muchemi();
    const rules = spendRulesFrom(o.suiteRows.spendRules.answers);
    const now = await whoDecidesNow(o.prisma, theStepsFor('spend', rules, 5000), { organizationId: ORG, requesterUserId: 'u-kamau' });
    expect(now.who).toEqual({ kind: 'admin', rule: 'admin' });
  });
});

describe('one place says who approves: the settings, the say-back before the yes and the routing agree at the limit', () => {
  it('KES 9,999 and 10,000 go to an admin, as Kamau has no manager, and KES 10,001 goes to Fatuma', async () => {
    const o = await muchemi();
    const said = (await o.suites.spendRules(o.as('u-grace'))).said;
    expect(said).toContain('Over KES 10,000, Fatuma approves.');
    for (const [amount, first] of [[9999, null], [10000, null], [10001, 'Fatuma']] as const) {
      const c = await o.svc.checkForChat(ORG, 'u-kamau', amount, TODAY);
      expect([amount, c.approverFirstName]).toEqual([amount, first]);
    }
    /* Nothing about spending is read from the workflows any more. */
    o.suiteRows.workflows = { isOn: false, answers: { spend: { steps: [['finance']], stepsAbove: [['finance']] } } };
    expect((await o.svc.checkForChat(ORG, 'u-kamau', 65000, TODAY)).approverFirstName).toBe('Fatuma');
  });
});

describe('the same person approves once (use-case walk: Wanjiru, the only admin, approved twice)', () => {
  it('two steps that each name nobody fall to Grace, the only admin, and her one approval ends it', async () => {
    const o = await muchemi();
    await o.suites.setSpendRules(o.as('u-grace'), { thresholds: [{ above: 10000, steps: [['departmentHead'], ['manager']] }] });
    await o.svc.ask(ORG, 'u-kamau', { amount: 65000, what: 'an expert witness report' });
    const id = o.requests[o.requests.length - 1].id;
    await o.svc.decide(o.as('u-grace'), id, 'approved', TODAY);
    expect(o.requests.find((r) => r.id === id)).toMatchObject({ status: 'approved', approvedByIds: ['u-grace'] });
    expect((await o.svc.history(o.as('u-kamau'), id)).said).toContain('Grace had already approved it, so this step was passed.');
  });
});
