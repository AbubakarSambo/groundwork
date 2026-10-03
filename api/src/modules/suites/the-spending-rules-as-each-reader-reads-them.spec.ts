import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { aSpendingOrganisation, ORG, TODAY } from './a-spending-organisation-for-specs';
import { spendingSaidBack } from './spend-said-in-chat';
import { SPEND_RULES_REFUSED } from './the-spending-rules';
import { SPEND_REFUSED } from './the-spending.service';

/**
 * THE SPENDING RULES (decision 85, item 2; build step 9), AS EACH PERSON IS SERVED THEM.
 *
 * Baridi Appliances (a-spending-organisation-for-specs.ts), Monday 5 October 2026. Grace, the admin,
 * sets: categories Fuel (a receipt, always), Travel, and Equipment (a quote above KES 50,000); a quote
 * for any request above KES 300,000; above KES 100,000, Kamau's manager and then finance (Omar); above
 * KES 500,000, whoever holds the team's budget (Joseph, for Operations) and then the chief executive
 * (Grace).
 *
 * And first, the before and after: with nothing set, every reader reads exactly what they read
 * before this change.
 */
const RULES = {
  categories: [
    { name: 'Fuel', evidence: 'receipt' },
    { name: 'Travel' },
    { name: 'Equipment', evidence: 'quote', evidenceAbove: 50000 },
  ],
  evidence: { what: 'quote', above: 300000 },
  thresholds: [
    { above: 500000, steps: [['budgetOwner'], ['chiefExecutive']] },
    { above: 100000, steps: [['manager'], ['finance']] },
  ],
};

beforeEach(() => jest.useFakeTimers({ now: TODAY, doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'nextTick', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate'] }));
afterEach(() => jest.useRealTimers());

/* ------------------------------------------- before and after ------------------------------------------- */

describe('with no spending rules set, every reader reads exactly what they read before', () => {
  for (const [label, rules] of [['no rules row at all', undefined], ['an empty rules row', {}]] as const) {
    it(`${label}: Kamau's say-back for fuel, within the limit`, async () => {
      const o = aSpendingOrganisation({ rules });
      expect(await o.says('u-kamau', 'Can I spend KES 18,000 on fuel for Kisumu deliveries?')).toBe(
        'You asked to spend KES 18,000 on fuel for Kisumu deliveries. Operations has KES 38,000 left for October, so that fits. Shall I send it to Fatuma to approve?',
      );
    });

    it(`${label}: Kamau's say-back over the limit names Joseph, who holds the budget, as before`, async () => {
      const o = aSpendingOrganisation({ rules });
      expect(await o.says('u-kamau', 'Can I spend KES 150,000 on a new freezer?')).toBe(
        'You asked to spend KES 150,000 on a new freezer. That is over the Operations budget left for October, which is KES 38,000. This is over KES 20,000, so Joseph must approve it. Shall I still send it to Joseph to approve?',
      );
    });

    it(`${label}: the request is kept with no category and no evidence, and the board row reads as before`, async () => {
      const o = aSpendingOrganisation({ rules });
      await o.says('u-kamau', 'Can I spend KES 18,000 on fuel for Kisumu deliveries?');
      await o.says('u-kamau', 'yes');
      expect(o.created).toEqual([{ organizationId: ORG, userId: 'u-kamau', amount: 18000, what: 'fuel for Kisumu deliveries', team: 'Operations' }]);
      const row = (await o.svc.board(o.as('u-fatuma'), TODAY)).waiting[0];
      expect(row).toMatchObject({ name: 'Kamau Njenga', amount: 18000, what: 'fuel for Kisumu deliveries', mayDecide: true, where: 'It is waiting for you.', category: null, needs: [] });
    });

    it(`${label}: Kamau's own request reads as before`, async () => {
      const o = aSpendingOrganisation({ rules });
      await o.svc.ask(ORG, 'u-kamau', { amount: 18000, what: 'fuel for Kisumu deliveries' });
      expect((await o.svc.mine(o.as('u-kamau'))).requests[0]).toMatchObject({
        where: 'Your request to spend KES 18,000 for fuel for Kisumu deliveries is waiting for Fatuma.', category: null,
      });
    });
  }

  it('Grace reads that nothing is set', async () => {
    const o = aSpendingOrganisation();
    expect(await o.suites.spendRules(o.as('u-grace'))).toEqual({ rules: {}, said: ['There are no categories set, so a request to spend is kept in the person’s own words.'] });
  });
});

/* ------------------------------------------- Grace, who sets them ------------------------------------------- */

describe('Grace, the admin, sets the rules', () => {
  it('reads them back in full sentences', async () => {
    const o = aSpendingOrganisation();
    const back = await o.suites.setSpendRules(o.as('u-grace'), RULES);
    expect(back.said).toEqual([
      'Each request to spend is for one category: Fuel, Travel and Equipment. When somebody does not say which, Groundwork asks “Which category is this for?” before it sends anything.',
      'Spending on Fuel needs a receipt.',
      'Spending on Equipment over KES 50,000 needs a quote.',
      'Any request over KES 300,000 needs a quote.',
      'Groundwork keeps only that a receipt or a quote is needed and whether finance has had it. It keeps no file. A rule about evidence never stops a request: the person is told before they send it, and so is whoever decides it.',
      'A request to spend over KES 100,000 goes first to the person’s manager, and then to whoever looks after finance.',
      'A request to spend over KES 500,000 goes first to whoever holds their team’s budget, and then to the chief executive.',
      'A request over more than one of these amounts follows the highest one. Below the lowest, it follows the approval steps as they are.',
    ]);
  });

  it('the change is kept in the rules history', async () => {
    const o = aSpendingOrganisation();
    await o.suites.setSpendRules(o.as('u-grace'), RULES);
    const h = await o.suites.rulesHistory(o.as('u-grace'));
    expect(h.changes[0].said).toBe('Grace changed the spending rules on 5 October.');
    expect(h.changes[0].details).toContain('This was added. Spending on Fuel needs a receipt.');
  });

  it('is refused rules that do not make sense, in full sentences', async () => {
    const o = aSpendingOrganisation();
    await expect(o.suites.setSpendRules(o.as('u-grace'), { categories: [{ name: 'Fuel' }, { name: 'fuel' }] })).rejects.toThrow(new BadRequestException(SPEND_RULES_REFUSED.sameCategoryTwice));
    await expect(o.suites.setSpendRules(o.as('u-grace'), { thresholds: [{ above: 100, steps: [['nobody']] }] })).rejects.toThrow(new BadRequestException(SPEND_RULES_REFUSED.badThresholds));
    await expect(o.suites.setSpendRules(o.as('u-grace'), { categories: [{ name: 'Fuel', evidence: 'photo' }] })).rejects.toThrow(new BadRequestException(SPEND_RULES_REFUSED.badEvidence));
  });

  it('a project can be what a category is called', async () => {
    const o = aSpendingOrganisation();
    const back = await o.suites.setSpendRules(o.as('u-grace'), { categories: [{ name: 'Atlas' }, { name: 'Kisumu depot' }], categoryCalled: 'Project' });
    expect(back.said[0]).toBe('Each request to spend is for one project: Atlas and Kisumu depot. When somebody does not say which, Groundwork asks “Which project is this for?” before it sends anything.');
  });
});

describe('Omar, who looks after finance, reads and sets the rules (decision 85)', () => {
  it('reads them, sets them, and the history keeps it as his change', async () => {
    const o = aSpendingOrganisation({ rules: RULES });
    expect((await o.suites.spendRules(o.as('u-omar'))).rules).toEqual((await o.suites.spendRules(o.as('u-grace'))).rules);
    await o.suites.setSpendRules(o.as('u-omar'), { categories: null });
    expect((await o.suites.rulesHistory(o.as('u-grace'))).changes[0].said).toMatch(/^Omar changed the spending rules on /);
  });
});

describe('nobody else reads or sets the rules', () => {
  for (const [who, u] of [['Fatuma, a lead', 'u-fatuma'], ['Kamau, a member', 'u-kamau'], ['a guest', 'u-tomas']]) {
    it(`${who} is refused`, async () => {
      const o = aSpendingOrganisation({ rules: RULES });
      await expect(o.suites.spendRules(o.as(u))).rejects.toThrow(new ForbiddenException(SPEND_RULES_REFUSED.onlyAnAdmin));
      await expect(o.suites.setSpendRules(o.as(u), { categories: null })).rejects.toThrow(ForbiddenException);
    });
  }
});

/* ------------------------------------------- Kamau, who asks ------------------------------------------- */

describe('Kamau asks to spend', () => {
  it('names the category in his words: he is told the receipt is needed before the yes', async () => {
    const o = aSpendingOrganisation({ rules: RULES });
    expect(await o.says('u-kamau', 'Can I spend KES 18,000 on fuel for Kisumu deliveries?')).toBe(
      'You asked to spend KES 18,000 on fuel for Kisumu deliveries. It is for the category Fuel. Operations has KES 38,000 left for October, so that fits. Spending on Fuel needs a receipt, so please keep it for finance. Shall I send it to Fatuma to approve?',
    );
    expect(await o.says('u-kamau', 'yes')).toBe('I have sent your request to spend KES 18,000 on fuel for Kisumu deliveries to Fatuma. It is not approved until they decide, and nothing is spent until then.');
    expect(o.created[0]).toMatchObject({ category: 'Fuel', evidenceNeeded: ['receipt'] });
  });

  it('names none: only the category is asked for, and then it is said back', async () => {
    const o = aSpendingOrganisation({ rules: RULES });
    expect(await o.says('u-kamau', 'Can I spend KES 12,000 on tyres for the van?')).toBe('Which category is this for? It can be Fuel, Travel or Equipment.');
    expect(o.created).toEqual([]);
    expect(await o.says('u-kamau', 'a holiday')).toBe('I could not find that among them. Which category is this for? It can be Fuel, Travel or Equipment. You can also say no, and I will not send it.');
    expect(await o.says('u-kamau', 'Equipment')).toBe(
      'You asked to spend KES 12,000 on tyres for the van. It is for the category Equipment. Operations has KES 38,000 left for October, so that fits. Shall I send it to Fatuma to approve?',
    );
    await o.says('u-kamau', 'yes');
    expect(o.created[0]).toMatchObject({ category: 'Equipment', amount: 12000 });
    expect(o.created[0].evidenceNeeded).toBeUndefined();
  });

  it('a project is asked for by its own name', async () => {
    const o = aSpendingOrganisation({ rules: { categories: [{ name: 'Atlas' }, { name: 'Kisumu depot' }], categoryCalled: 'project' } });
    expect(await o.says('u-kamau', 'Can I spend KES 12,000 on tyres?')).toBe('Which project is this for? It can be Atlas or Kisumu depot.');
    expect(await o.says('u-kamau', 'kisumu depot')).toContain('It is for the project Kisumu depot.');
  });

  it('a no to the category question sends nothing', async () => {
    const o = aSpendingOrganisation({ rules: RULES });
    await o.says('u-kamau', 'Can I spend KES 12,000 on tyres for the van?');
    expect(await o.says('u-kamau', 'no')).toBe('I have not sent it. Nothing was kept.');
    expect(o.created).toEqual([]);
  });

  it('above KES 100,000: Fatuma and then Omar in finance, and the quote, said before the yes', async () => {
    const o = aSpendingOrganisation({ rules: RULES });
    expect(await o.says('u-kamau', 'Can I spend KES 150,000 on equipment for the depot?')).toBe(
      'You asked to spend KES 150,000 on equipment for the depot. It is for the category Equipment. That is over the Operations budget left for October, which is KES 38,000. This is over KES 100,000, so Fatuma must approve it, and then Omar in finance. Spending on Equipment over KES 50,000 needs a quote, so please have one ready for finance. Shall I still send it to Fatuma to approve?',
    );
  });

  it('above KES 500,000: Joseph, who holds the budget, and then Grace, with both quotes said once', async () => {
    const o = aSpendingOrganisation({ rules: RULES });
    const say = await o.says('u-kamau', 'Can I spend KES 600,000 on equipment for the new cold room?');
    expect(say).toContain('This is over KES 500,000, so Joseph must approve it, and then Grace, the chief executive.');
    expect(say).toContain('Spending on Equipment over KES 50,000 needs a quote, so please have one ready for finance.');
    expect(say).not.toContain('Any request over KES 300,000');
    expect(say).toMatch(/Shall I still send it to Joseph to approve\?$/);
  });

  it('the say-back says nothing about anybody else’s spending', () => {
    const say = spendingSaidBack({ amount: 18000, what: 'fuel', currency: 'KES' }, {
      currency: 'KES', team: 'Operations', left: 38000, waiting: 0, limit: 20000, approver: 'manager', approverFirstName: 'Fatuma',
      evidence: ['Spending on Fuel needs a receipt, so please keep it for finance.'], category: { name: 'Fuel', called: 'category' },
    }, 'October');
    expect(say).not.toMatch(/Joseph|Miriam|freezer/);
  });
});

/* ------------------------------------------- who decides, and what they read ------------------------------------------- */

describe('whoever decides reads the category and the evidence, through the same steps', () => {
  async function asked(amount: number, what: string) {
    const o = aSpendingOrganisation({ rules: RULES });
    await o.says('u-kamau', `Can I spend KES ${amount.toLocaleString('en-US')} on ${what}?`);
    await o.says('u-kamau', 'yes');
    return o;
  }

  it('Fatuma, his manager, reads it and decides the first step above KES 100,000', async () => {
    const o = await asked(150000, 'equipment for the depot');
    const row = (await o.svc.board(o.as('u-fatuma'), TODAY)).waiting.find((w) => w.amount === 150000)!;
    expect(row).toMatchObject({ category: 'Equipment', needs: ['Spending on Equipment over KES 50,000 needs a quote.'], mayDecide: true, where: 'It is waiting for you.' });
  });

  it('after Fatuma approves, it waits for Omar in finance, who reads only what waits for him', async () => {
    const o = await asked(150000, 'equipment for the depot');
    const id = o.requests.find((r) => r.amount === 150000).id;
    await o.svc.decide(o.as('u-fatuma'), id, 'approved', TODAY);
    const omar = await o.svc.board(o.as('u-omar'), TODAY);
    expect(omar.reader).toBe('approver');
    expect(omar.waiting.map((w) => [w.what, w.where, w.mayDecide])).toEqual([['equipment for the depot', 'Fatuma has approved it, and it is now waiting for you.', true]]);
    expect(omar.budgets).toEqual([]);
    expect((await o.svc.mine(o.as('u-kamau'))).requests[0].where).toBe('Your request to spend KES 150,000 for equipment for the depot is approved by Fatuma and is now waiting for Omar in finance.');
  });

  it('Joseph, who holds the Operations budget, decides the first step above KES 500,000', async () => {
    const o = await asked(600000, 'equipment for the new cold room');
    const joseph = await o.svc.board(o.as('u-joseph'), TODAY);
    expect(joseph.waiting.map((w) => [w.what, w.mayDecide, w.needs])).toEqual([['equipment for the new cold room', true, ['Spending on Equipment over KES 50,000 needs a quote.']]]);
    await expect(o.svc.decide(o.as('u-fatuma'), joseph.waiting[0].id, 'approved', TODAY)).rejects.toThrow(new ForbiddenException(SPEND_REFUSED.notYours));
  });

  it('Grace, the admin, reads every request with its category; Miriam, a colleague, is refused the board', async () => {
    const o = await asked(18000, 'fuel for Kisumu deliveries');
    const grace = await o.svc.board(o.as('u-grace'), TODAY);
    expect(grace.waiting.map((w) => [w.name, w.category, w.needs])).toEqual([['Kamau Njenga', 'Fuel', ['Spending on Fuel needs a receipt.']]]);
    await expect(o.svc.board(o.as('u-miriam'), TODAY)).rejects.toThrow(ForbiddenException);
    expect((await o.svc.mine(o.as('u-miriam'))).requests).toEqual([]);
  });

  it('a category that is not one of the organisation’s is refused', async () => {
    const o = aSpendingOrganisation({ rules: RULES });
    await expect(o.svc.ask(ORG, 'u-kamau', { amount: 10, what: 'tea', category: 'Snacks' })).rejects.toThrow(new BadRequestException(SPEND_REFUSED.badCategory));
  });

  it('no label on anybody', async () => {
    const o = await asked(150000, 'equipment for the depot');
    const all = JSON.stringify([await o.svc.board(o.as('u-grace'), TODAY), await o.svc.mine(o.as('u-kamau'))]);
    expect(all).not.toMatch(/\b(PIP|exit|at[- ]risk|score|rating)\b/i);
  });
});
