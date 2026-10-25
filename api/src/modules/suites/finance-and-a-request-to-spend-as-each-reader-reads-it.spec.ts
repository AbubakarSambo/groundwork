import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { aSpendingOrganisation, ORG, TODAY } from './a-spending-organisation-for-specs';
import { FINANCE_REFUSED, SpendingForFinanceService } from './the-spending-for-finance.service';
import { aRequestsHistory } from './a-request-is-recorded';
import { WhatNeedsYouService } from '../grounds/what-needs-you.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX = require('xlsx') as typeof import('xlsx');

/**
 * FINANCE'S PART OF A REQUEST TO SPEND (decision 85, item 2; build step 10), AS EACH PERSON READS IT.
 *
 * Baridi Appliances (a-spending-organisation-for-specs.ts), Monday 5 October 2026. Omar, a member,
 * looks after finance. Kamau asked to spend KES 12,000 on fuel for Kisumu deliveries; the rules ask
 * for a receipt for Fuel. Fatuma, his manager, approved it. Omar checks it, records it under "Operations
 * fuel", notes he has had the receipt, and marks it paid on Tuesday 6 October. Grace is the admin;
 * Joseph holds the Operations budget; Miriam is in Sales.
 */
const RULES = { categories: [{ name: 'Fuel', evidence: 'receipt' }, { name: 'Travel' }] };
const TUESDAY = new Date('2026-10-06T15:00:00Z');

beforeEach(() => jest.useFakeTimers({ now: TODAY, doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'nextTick', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate'] }));
afterEach(() => jest.useRealTimers());

async function approvedFuel() {
  const o = aSpendingOrganisation({ rules: RULES });
  await o.svc.ask(ORG, 'u-kamau', { amount: 12000, what: 'fuel for Kisumu deliveries', category: 'Fuel' });
  const id = o.requests[o.requests.length - 1].id;
  await o.svc.decide(o.as('u-fatuma'), id, 'approved', TODAY);
  /* decidedAt is "now" in the service; the day it was approved, for the sentences. */
  o.requests.find((r) => r.id === id).decidedAt = TODAY;
  const finance = new SpendingForFinanceService(o.prisma);
  return { ...o, id, finance };
}

describe('Omar, who looks after finance', () => {
  it('reads each approved request with only what is on it, in full sentences', async () => {
    const o = await approvedFuel();
    const v = await o.finance.view(o.as('u-omar'), TODAY);
    expect(v.reader).toBe('finance');
    const row = v.toPay.find((r) => r.id === o.id)!;
    expect(row).toEqual({
      id: o.id, name: 'Kamau Njenga', team: 'Operations', amount: 12000, what: 'fuel for Kisumu deliveries', category: 'Fuel',
      askedOn: '2026-10-05', approvedBy: ['Fatuma'], approvedOn: '2026-10-05',
      evidenceNeeded: ['receipt'], evidenceGiven: [], checked: null, code: null, paidOn: null,
      attached: null, /* nothing attached when Kamau asked (field added 25 October, polish round 1) */
      said: [
        'Kamau Njenga, in Operations, asked on 5 October to spend KES 12,000 for fuel for Kisumu deliveries.',
        'It is for Fuel.',
        'Fatuma approved it on 5 October.',
        'It needs a receipt, and finance has not had it yet.',
        'Nobody in finance has checked it yet.',
        'It has not been paid yet.',
      ],
    });
    expect(v.lines).toEqual(['Fuel', 'Operations', 'Sales', 'Travel']);
  });

  it('checks it, records the budget line and the receipt, and marks it paid; each step is recorded', async () => {
    const o = await approvedFuel();
    await o.finance.verify(o.as('u-omar'), o.id, TUESDAY);
    await o.finance.code(o.as('u-omar'), o.id, 'Operations fuel', TUESDAY);
    await o.finance.evidenceGiven(o.as('u-omar'), o.id, 'receipt', TUESDAY);
    const v = await o.finance.paid(o.as('u-omar'), o.id, '2026-10-06', TUESDAY);
    expect(v.toPay.map((r) => r.id)).not.toContain(o.id);
    const row = v.paid.find((r) => r.id === o.id)!;
    expect(row.said.slice(3)).toEqual([
      'It needs a receipt, and finance has had it.',
      'You checked it on 5 October.',
      'It is paid from Operations fuel.',
      'It was paid on 6 October.',
    ]);
    const { said } = await aRequestsHistory(o.prisma, ORG, 'spend', o.id, 'u-grace');
    expect(said.slice(-4)).toEqual([
      'Omar checked it for finance on 5 October.',
      'Omar recorded the budget line it is paid from on 5 October.',
      'Omar recorded that finance has the receipt on 5 October.',
      'Omar marked it paid on 5 October. It was paid on 6 October.',
    ]);
  });

  it('cannot mark it paid before checking it, twice, or on a day that has not come', async () => {
    const o = await approvedFuel();
    await expect(o.finance.paid(o.as('u-omar'), o.id, '2026-10-06', TUESDAY)).rejects.toThrow(new BadRequestException(FINANCE_REFUSED.checkFirst));
    await o.finance.verify(o.as('u-omar'), o.id, TUESDAY);
    await expect(o.finance.paid(o.as('u-omar'), o.id, '2026-10-09', TUESDAY)).rejects.toThrow(new BadRequestException(FINANCE_REFUSED.badDay));
    await o.finance.paid(o.as('u-omar'), o.id, '2026-10-06', TUESDAY);
    await expect(o.finance.paid(o.as('u-omar'), o.id, '2026-10-06', TUESDAY)).rejects.toThrow(new BadRequestException(FINANCE_REFUSED.alreadyPaid));
  });

  it('a request still waiting, or declined, does not come to finance', async () => {
    const o = await approvedFuel();
    await o.svc.ask(ORG, 'u-kamau', { amount: 3000, what: 'travel to Thika', category: 'Travel' });
    const waiting = o.requests[o.requests.length - 1].id;
    await expect(o.finance.verify(o.as('u-omar'), waiting, TUESDAY)).rejects.toThrow(new BadRequestException(FINANCE_REFUSED.notApproved));
    expect((await o.finance.view(o.as('u-omar'), TODAY)).toPay.map((r) => r.id)).not.toContain(waiting);
  });

  it('never checks or pays a request of his own', async () => {
    const o = await approvedFuel();
    await o.svc.ask(ORG, 'u-omar', { amount: 2000, what: 'travel to the bank', category: 'Travel' });
    const own = o.requests[o.requests.length - 1].id;
    await o.svc.decide(o.as('u-grace'), own, 'approved', TODAY);
    await expect(o.finance.verify(o.as('u-omar'), own, TUESDAY)).rejects.toThrow(new ForbiddenException(FINANCE_REFUSED.notYourOwn));
    await expect(o.finance.verify(o.as('u-grace'), own, TUESDAY)).resolves.toBeTruthy();
  });

  it('reads nothing else Groundwork knows about Kamau: only the fields on the request', async () => {
    const o = await approvedFuel();
    const v = await o.finance.view(o.as('u-omar'), TODAY);
    expect(Object.keys(v)).toEqual(['reader', 'currency', 'toPay', 'paid', 'lines']);
    /* 'attached' added 25 October (polish round 1): the receipt or proforma the person attached is a field on the request itself, so finance reads it; still nothing else Groundwork knows. */
    expect(Object.keys(v.toPay[0]).sort()).toEqual(['amount', 'approvedBy', 'approvedOn', 'askedOn', 'attached', 'category', 'checked', 'code', 'evidenceGiven', 'evidenceNeeded', 'id', 'name', 'paidOn', 'said', 'team', 'what']);
    /* No other table is read for it than the request, the people's names, the directory's team, the suite's rows and the budgets. */
    for (const t of ['leaveRequest', 'suiteQuestion', 'assistantProposal']) {
      for (const fn of Object.values(o.prisma[t] ?? {})) (fn as jest.Mock).mockClear?.();
    }
    await o.finance.view(o.as('u-omar'), TODAY);
    expect(o.prisma.suiteQuestion.findMany).not.toHaveBeenCalled();
    expect(o.prisma.assistantProposal.findFirst).not.toHaveBeenCalled();
  });

  it('reads the record of who did what on an approved request', async () => {
    const o = await approvedFuel();
    const { said } = await o.svc.history(o.as('u-omar'), o.id);
    expect(said).toContain('Fatuma approved it on 5 October.');
  });

  it('reads on Today how many wait for him, never whose', async () => {
    const o = await approvedFuel();
    const grounds: any = { list: async () => [], listAwaitingApproval: async () => [] };
    const today = new WhatNeedsYouService(o.prisma, grounds, undefined, undefined, o.svc, undefined, o.finance);
    const omar = JSON.stringify(await today.forReader('u-omar', 'omar@baridi.example', ORG, 'MEMBER'));
    /* Kamau's fuel, and Fatuma's freezer parts approved by Grace on 1 October. */
    expect(omar).toContain('Two approved requests to spend are waiting for you in finance.');
    expect(omar).toContain('Two have not been checked yet.');
    await o.finance.verify(o.as('u-omar'), o.id, TUESDAY);
    expect(JSON.stringify(await today.forReader('u-omar', 'omar@baridi.example', ORG, 'MEMBER'))).toContain('One has not been checked yet, and one is checked and waiting to be paid.');
    expect(omar).not.toContain('Kamau');
    const miriam = JSON.stringify(await today.forReader('u-miriam', 'miriam@baridi.example', ORG, 'MEMBER'));
    expect(miriam).not.toContain('in finance');
  });
});

describe('the file of approved requests to pay', () => {
  it('as CSV: every approved request not yet paid, with plain headers, and each one recorded as exported', async () => {
    const o = await approvedFuel();
    await o.finance.verify(o.as('u-omar'), o.id, TUESDAY);
    const file = await o.finance.export(o.as('u-omar'), 'csv', TUESDAY);
    expect(file.fileName).toBe('requests-to-pay-2026-10-06.csv');
    expect(file.contentType).toBe('text/csv; charset=utf-8');
    const lines = file.body.toString('utf8').trim().split('\n');
    expect(lines[0]).toBe('Request,Asked on,Asked by,Team,What it is for,Category,Amount,Currency,Approved by,Approved on,Checked by finance,Budget line,Receipt or quote needed,Receipt or quote given');
    expect(lines.slice(1)).toEqual([
      's-1,2026-10-01,Fatuma Hassan,Operations,freezer parts,,212000,KES,Grace,2026-10-01,No,,,',
      `${o.id},2026-10-05,Kamau Njenga,Operations,fuel for Kisumu deliveries,Fuel,12000,KES,Fatuma,2026-10-05,"Omar, 2026-10-05",,receipt,`,
    ]);
    const { said } = await aRequestsHistory(o.prisma, ORG, 'spend', o.id, 'u-kamau');
    expect(said).toContain('Omar put it in a file of requests to pay on 5 October.');
  });

  it('as Excel: the same rows, read back with the xlsx library already in the product', async () => {
    const o = await approvedFuel();
    const file = await o.finance.export(o.as('u-grace'), 'xlsx', TUESDAY);
    expect(file.fileName).toBe('requests-to-pay-2026-10-06.xlsx');
    const sheet = XLSX.read(file.body, { type: 'buffer' }).Sheets['To pay'];
    const rows = XLSX.utils.sheet_to_json<any>(sheet);
    expect(rows).toEqual([
      expect.objectContaining({ 'Asked by': 'Fatuma Hassan', Amount: 212000, Currency: 'KES', 'Checked by finance': 'No' }),
      expect.objectContaining({ 'Asked by': 'Kamau Njenga', Amount: 12000, Currency: 'KES', 'Checked by finance': 'No', Category: 'Fuel' }),
    ]);
  });

  it('a paid request is not in it, and any other format is refused', async () => {
    const o = await approvedFuel();
    await o.finance.verify(o.as('u-omar'), o.id, TUESDAY);
    await o.finance.paid(o.as('u-omar'), o.id, '2026-10-06', TUESDAY);
    expect((await o.finance.export(o.as('u-omar'), 'csv', TUESDAY)).body.toString('utf8')).not.toContain('Kamau');
    await expect(o.finance.export(o.as('u-omar'), 'pdf', TUESDAY)).rejects.toThrow(new BadRequestException(FINANCE_REFUSED.badFormat));
  });
});

describe('Kamau, who asked', () => {
  it('reads where his request stands at each step of finance', async () => {
    const o = await approvedFuel();
    const where = async () => (await o.svc.mine(o.as('u-kamau'))).requests.find((r) => r.id === o.id)!;
    expect((await where()).where).toBe('Your request to spend KES 12,000 for fuel for Kisumu deliveries is approved by Fatuma.');
    await o.finance.verify(o.as('u-omar'), o.id, TUESDAY);
    expect((await where()).where).toBe('Your request to spend KES 12,000 for fuel for Kisumu deliveries is approved by Fatuma. Omar in finance has checked it, and it is waiting to be paid.');
    await o.finance.paid(o.as('u-omar'), o.id, '2026-10-06', TUESDAY);
    expect(await where()).toMatchObject({ where: 'Your request to spend KES 12,000 for fuel for Kisumu deliveries was paid on 6 October.', paidOn: '2026-10-06' });
  });

  it('cannot open finance’s view', async () => {
    const o = await approvedFuel();
    await expect(o.finance.view(o.as('u-kamau'), TODAY)).rejects.toThrow(new ForbiddenException(FINANCE_REFUSED.onlyFinance));
  });
});

describe('everybody else', () => {
  it('Grace, the admin, reads it as an admin and may act', async () => {
    const o = await approvedFuel();
    const v = await o.finance.view(o.as('u-grace'), TODAY);
    expect(v.reader).toBe('admin');
    expect(v.toPay.find((r) => r.id === o.id)!.said[0]).toBe('Kamau Njenga, in Operations, asked on 5 October to spend KES 12,000 for fuel for Kisumu deliveries.');
  });

  for (const [who, u] of [['Fatuma, his manager', 'u-fatuma'], ['Joseph, who holds the Operations budget', 'u-joseph'], ['Miriam, a colleague', 'u-miriam'], ['a guest', 'u-tomas']]) {
    it(`${who} is refused finance’s view and every step`, async () => {
      const o = await approvedFuel();
      await expect(o.finance.view(o.as(u), TODAY)).rejects.toThrow(new ForbiddenException(FINANCE_REFUSED.onlyFinance));
      await expect(o.finance.verify(o.as(u), o.id, TODAY)).rejects.toThrow(ForbiddenException);
      await expect(o.finance.export(o.as(u), 'csv', TODAY)).rejects.toThrow(ForbiddenException);
    });
  }

  it('with nobody named for finance, only an admin opens it', async () => {
    const o = aSpendingOrganisation({ duties: {} });
    const finance = new SpendingForFinanceService(o.prisma);
    await expect(finance.view(o.as('u-omar'), TODAY)).rejects.toThrow(ForbiddenException);
    await expect(finance.view(o.as('u-grace'), TODAY)).resolves.toMatchObject({ reader: 'admin' });
  });

  it('no label on anybody', async () => {
    const o = await approvedFuel();
    expect(JSON.stringify(await o.finance.view(o.as('u-omar'), TODAY))).not.toMatch(/\b(PIP|exit|at[- ]risk|score|rating)\b/i);
  });
});
