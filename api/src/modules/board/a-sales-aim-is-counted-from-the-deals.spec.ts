import { boardAs, SALES_RUN, BISI, FEMI, NGOZI, KWAME, handoff, type Setup } from './the-switchboards-sections-harness';
import {
  whatASalesAimCounts, theCountFromTheDeals, theSalesAnswer, theUnitsOf, theMondayOf, type ADealOnRecord,
} from './a-sales-aim-is-counted-from-the-deals';
import { theShareSays } from './your-share';
import { theDealTheWaitIsOn, theWaitsOnCustomersApart } from './a-customers-reply-is-on-its-deal';

/**
 * DROP ACCESS, 16 OCTOBER 2026, AND HAFSAH'S ANSWERS OF 17 OCTOBER.
 *
 * Grace's board read "So far it is 25 of the 120 units sold" beside two won deals with proof (Kilele Hotel 40 units,
 * Greenfield Supermarket 25 units), every rep's "units sold" read 0, "New leads this week" read 0 beside eleven new
 * customers, and Blockers listed every customer the reps were waiting on. Hafsah decided:
 *  1. Proven won deals count into the target, unproven won deals count too, marked as their word ("21 sold, 17 with
 *     proof of payment", board-as-lead.txt).
 *  2. Leads are counted from deals at their first stage.
 *  3. A customer's reply updates its deal, going under Blockers only if it stops the deal.
 *
 * Here Bisi runs a sales check-in; Femi, Ngozi and Kwame are the reps. The clock is Wednesday 23 September.
 */
const NOW = new Date('2026-09-23T15:00:00Z');
const item = (id: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind: 'deal', name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: new Date('2026-09-22T09:00:00Z'), updatedAt: new Date('2026-09-22T09:00:00Z'), ...more,
});
const LINES = [
  { id: 'e-kilele', participantId: 'p-femi', type: 'PROGRESS', text: 'Kilele Hotel paid for all 40 units today.', recallBased: true, createdAt: new Date('2026-09-22T06:09:00Z') },
  { id: 'e-proof', participantId: 'p-femi', type: 'PROGRESS', text: 'Proof of payment. The M-Pesa message from Kilele.', recallBased: false, anchoredOrigin: 'photo', anchoredDocumentId: 'doc-mpesa', createdAt: new Date('2026-09-22T06:04:00Z') },
  { id: 'e-wema', participantId: 'p-femi', type: 'PROGRESS', text: 'Wema is won, 10 units, they will pay next week.', recallBased: true, createdAt: new Date('2026-09-22T06:10:00Z') },
  { id: 'e-green', participantId: 'p-ngozi', type: 'PROGRESS', text: 'Greenfield Supermarket paid for 25 units. Here is the receipt.', recallBased: false, anchoredOrigin: 'photo', anchoredDocumentId: 'doc-green', createdAt: new Date('2026-09-22T07:00:00Z') },
  { id: 'e-bahari', participantId: 'p-kwame', type: 'PROGRESS', text: 'I met the owner of Bahari Cafe. They want 3 units.', recallBased: true, createdAt: new Date('2026-09-22T08:00:00Z') },
  { id: 'e-old', participantId: 'p-kwame', type: 'PROGRESS', text: 'I called Soko Distributors again.', recallBased: true, createdAt: new Date('2026-09-10T08:00:00Z') },
];
const objective = (id: string, name: string, target: number, owner: string | null, count = 0) => ({
  id, groundId: 'g-1', name, target, count, prevCount: 0, ownerParticipantId: owner, setByParticipantId: null,
  direction: null, isADecisionAboutAPerson: false, sortOrder: 0, addedAtSession: null, assumes: [], suggestedCount: null, suggestedSaid: null,
});
const RUN: Setup = {
  ...SALES_RUN,
  kindOfWork: 'sales org',
  /* Release 1's sales board, which these specs read, is switched on per organisation (release-one-sales-board). */
  releaseOneSalesBoard: true,
  clock: { now: NOW, endsAt: new Date('2026-09-30T17:00:00Z') },
  recordLines: LINES,
  lines: LINES,
  documents: [
    { id: 'doc-mpesa', participantId: 'p-femi', fileName: 'mpesa.png', visibility: 'OWN' },
    { id: 'doc-green', participantId: 'p-ngozi', fileName: 'receipt.png', visibility: 'OWN' },
  ],
  items: [
    item('w-kilele', 'Kilele Hotel', { stage: 'Won', ownerParticipantId: 'p-femi', sourceEntryId: 'e-kilele', fields: { Units: '40', Value: 'KES 200,000' } }),
    item('w-wema', 'Wema', { stage: 'Won', ownerParticipantId: 'p-femi', sourceEntryId: 'e-wema', fields: { Units: 'ten', Contact: 'Jane' } }),
    item('w-green', 'Greenfield Supermarket', { stage: 'Won', ownerParticipantId: 'p-ngozi', sourceEntryId: 'e-green', fields: { Units: '25' } }),
    item('w-bahari', 'Bahari Cafe', { stage: 'Contacted', ownerParticipantId: 'p-kwame', sourceEntryId: 'e-bahari', fields: { Units: '3', Contact: 'Faith' } }),
    /* First on record the week before: not a new lead this week. */
    item('w-soko', 'Soko Distributors', { stage: 'Contacted', ownerParticipantId: 'p-kwame', sourceEntryId: 'e-old', createdAt: new Date('2026-09-10T08:00:00Z') }),
  ],
  objectives: [
    objective('o-team', 'Units sold by 30 September', 120, null, 25),
    objective('o-leads', 'New leads this week', 30, null),
    objective('o-femi', 'units sold by 30 September', 60, 'p-femi'),
    objective('o-ngozi', 'units sold by 30 September', 40, 'p-ngozi'),
    objective('o-kwame', 'Open 10 new leads weekly', 10, 'p-kwame'),
  ],
};
const aim = (b: any, id: string) => (b.objectives ?? []).find((o: any) => o.id === id);

describe('a sales aim is counted from the deals on record, as each reader reads it', () => {
  it('Bisi, who runs it, reads every won deal counted, proven and on their word, in the prototype\'s words', async () => {
    const b = await boardAs(RUN, ...BISI);
    /* Kilele 40 (M-Pesa) + Greenfield 25 (receipt) + Wema 10 (Femi's word): the stored 25 from what was said is not used. */
    expect(aim(b, 'o-team').count).toBe(75);
    expect(aim(b, 'o-team').fromTheDeals.says).toBe('75 sold, 65 with proof of payment.');
    /* Changed 18 October (Hafsah's quality pass, Q1): the answer names the deals the number is, and what proves each. */
    expect(b.headline.answer).toBe('Not yet. 75 of the 120 units are sold. 65 are paid (Kilele Hotel and Greenfield Supermarket) and 10 rest on what somebody said (Wema).');
    /* Each rep's own number is their own won deals. */
    expect(aim(b, 'o-femi').count).toBe(50);
    expect(aim(b, 'o-ngozi').count).toBe(25);
  });

  it('new leads are the deals first on record this working week, the team\'s and each person\'s', async () => {
    const b = await boardAs(RUN, ...BISI);
    /* Kilele, Wema, Greenfield and Bahari came onto the record on Tuesday; Soko the week before. */
    expect(aim(b, 'o-leads').count).toBe(4);
    expect(aim(b, 'o-leads').fromTheDeals.says).toBe('4 new leads came onto the record this week.');
    expect(aim(b, 'o-leads').stands.says).toBe('It is 4 so far this week, and the aim is 30 a week. It starts again each week, so it is not carried forward at a pace.');
    /* Changed 18 October (Hafsah's quality pass, B-1): one question, one target; new leads are their own line under it. */
    expect(b.headline.question).not.toContain('new leads');
    expect(b.headline.besides.map((x: any) => x.says)).toEqual(['4 new leads this week, of the 30 you asked for.']);
    expect(aim(b, 'o-kwame').count).toBe(1);
  });

  it('Femi reads his own share from his own deals, with what proof shows and what is his word', async () => {
    const b = await boardAs(RUN, ...FEMI);
    expect(b.yourShare.map((s: any) => s.says)).toEqual([
      /* Changed 18 October (Hafsah's quality pass, R-5): the share names the reader's own deals and what proves each. */ 'You have sold 50 of your 60 units so far, 40 paid (Kilele Hotel) and 10 on your word (Wema).',
    ]);
    /* Never Ngozi's deal or her number. */
    expect(JSON.stringify(b.yourShare)).not.toMatch(/25|Greenfield/);
    expect(JSON.stringify((b.workRecords ?? []).flatMap((s: any) => s.rows ?? []))).not.toMatch(/Greenfield/);
  });

  it('Ngozi reads hers, all of it with proof; Kwame reads his new leads', async () => {
    const n = await boardAs(RUN, ...NGOZI);
    expect(n.yourShare.map((s: any) => s.says)).toEqual([/* Changed 18 October (Hafsah's quality pass, R-5): the share names the reader's own deals and what proves each. */ 'You have sold 25 of your 40 units so far, all to Greenfield Supermarket, paid.']);
    const k = await boardAs(RUN, ...KWAME);
    expect(k.yourShare.map((s: any) => s.says)).toEqual(['You are aiming for 10 new leads weekly. You have 1 of the 10 so far.']);
    expect(JSON.stringify(k.yourShare)).not.toMatch(/Kilele|Wema|50/);
  });

  it('a check-in that is not about sales keeps the count it had', async () => {
    const b = await boardAs({ ...RUN, kindOfWork: null }, ...BISI);
    expect(aim(b, 'o-team').count).toBe(25);
    expect(aim(b, 'o-team').fromTheDeals).toBeNull();
  });
});

describe('a customer\'s reply is on its deal, and under Blockers only if it stops the deal', () => {
  const WAITS: Setup = {
    ...RUN,
    dependencies: [
      handoff('d-jane', 'p-femi', 'a deposit', { onLabel: 'Jane', status: 'WAITING', createdAt: new Date('2026-09-22T10:00:00Z') }),
      handoff('d-bahari', 'p-kwame', 'a decision on 3 units', { onLabel: 'the owner of Bahari Cafe', status: 'WAITING', createdAt: new Date('2026-09-22T11:00:00Z') }),
      handoff('d-stock', 'p-ngozi', 'the stock of 600L freezers', { onLabel: 'Operations', status: 'WAITING', createdAt: new Date('2026-09-21T10:00:00Z') }),
      handoff('d-order', 'p-femi', 'the signed order for Wema', { onLabel: 'Jane', status: 'BLOCKING', createdAt: new Date('2026-09-22T12:00:00Z') }),
      handoff('d-price', 'p-kwame', 'an answer about the price for Bahari Cafe', { onParticipantId: 'p-bisi', status: 'WAITING', createdAt: new Date('2026-09-22T13:00:00Z') }),
    ],
  };
  const dealRow = (b: any, id: string) => ((b.workRecords ?? []) as any[]).flatMap((s) => s.rows ?? []).find((r: any) => r.id === id);
  const blockerText = (b: any) => ((b.blockers ?? []) as any[]).map((x) => x.says).join(' | ');

  it('Bisi reads the team\'s own waits under Blockers, and each customer\'s on its deal', async () => {
    const b = await boardAs(WAITS, ...BISI);
    expect(blockerText(b)).toMatch(/600L freezers/);
    expect(blockerText(b)).toMatch(/signed order for Wema/);
    expect(blockerText(b)).toMatch(/price for Bahari Cafe/);
    expect(blockerText(b)).not.toMatch(/a deposit|a decision on 3 units/);
    expect(JSON.stringify(b.whoWaitedOnWhom ?? [])).not.toMatch(/a deposit|a decision on 3 units/);
    expect((b.blockers ?? []).length).toBe(3);
    expect(dealRow(b, 'w-wema').waitingOnTheCustomer.map((w: any) => w.says)).toEqual([
      'Femi Okonkwo has been waiting on Jane for a deposit since 22 September, and it has not been cleared.',
    ]);
    expect(dealRow(b, 'w-bahari').waitingOnTheCustomer.map((w: any) => w.says)).toEqual([
      'Kwame Mensah has been waiting on the owner of Bahari Cafe for a decision on 3 units since 22 September, and it has not been cleared.',
    ]);
    /*
     * Changed 18 October (Hafsah's quality pass, Q3 and B-5): a deal's step says what it still needs and from whom, and Kwame's wait
     * on Bisi about Bahari Cafe's price comes first: the customer's decision cannot come before Bisi's answer.
     */
    expect(dealRow(b, 'w-bahari').nextStep).toBe('Your answer on the price, then a buying date from Faith.');
  });

  it('Femi reads his own wait on his own deal, said to him; Kwame never reads it', async () => {
    const f = await boardAs(WAITS, ...FEMI);
    expect(dealRow(f, 'w-wema').waitingOnTheCustomer.map((w: any) => w.says)).toEqual([
      'You have been waiting on Jane for a deposit since 22 September, and it has not been cleared.',
    ]);
    expect(blockerText(f)).not.toMatch(/a deposit/);
    const k = await boardAs(WAITS, ...KWAME);
    expect(JSON.stringify(k)).not.toMatch(/a deposit/);
    expect(dealRow(k, 'w-bahari').waitingOnTheCustomer.map((w: any) => w.says)).toEqual([
      'You have been waiting on the owner of Bahari Cafe for a decision on 3 units since 22 September, and it has not been cleared.',
    ]);
  });
});

describe('the rules, one at a time', () => {
  it('what a sales aim counts is read from its own words', () => {
    expect(whatASalesAimCounts('Units sold by 30 October')).toMatchObject({ counts: 'units', thing: 'units' });
    expect(whatASalesAimCounts('The team is aiming to sell 120 water dispensers')).toMatchObject({ counts: 'units', thing: 'water dispensers' });
    expect(whatASalesAimCounts('Reach 25 sales by 30 September')).toMatchObject({ counts: 'sales' });
    expect(whatASalesAimCounts('KES 2,000,000 in sales this quarter')).toMatchObject({ counts: 'value' });
    expect(whatASalesAimCounts('New leads this week')).toEqual({ counts: 'new leads', window: 'week', thing: 'new leads' });
    expect(whatASalesAimCounts('Open 10 new leads weekly')).toMatchObject({ counts: 'new leads', window: 'week' });
    expect(whatASalesAimCounts('hit my target of 120 by the end of October')).toBeNull();
    /* Money that is not said to be sold is not a sale: a loan book keeps the count it had. */
    expect(whatASalesAimCounts('Naira disbursed this quarter')).toBeNull();
    expect(whatASalesAimCounts('Customer satisfaction above 90%')).toBeNull();
  });

  it('units are read as said, in digits or in words', () => {
    expect(theUnitsOf({ Units: '40' })).toBe(40);
    expect(theUnitsOf({ Units: 'two' })).toBe(2);
    expect(theUnitsOf({ Units: '1,200 units' })).toBe(1200);
    expect(theUnitsOf({ Value: 'KES 30,000' })).toBeNull();
  });

  it('a won deal with no units said is left out, and the sentence says so', () => {
    const deals: ADealOnRecord[] = [
      { id: '1', name: 'A', stage: 'Won', ownerParticipantId: 'p', fields: { Units: '5' }, firstOnRecordAt: NOW, proven: true, paid: true },
      { id: '2', name: 'B', stage: 'Won', ownerParticipantId: 'p', fields: {}, firstOnRecordAt: NOW, proven: false, paid: false },
    ];
    const c = theCountFromTheDeals({ name: 'Sell 40 units' }, deals, ['Contacted', 'Won'], NOW, 'Africa/Nairobi')!;
    expect(c.says).toBe('5 sold, 5 with proof of payment. 1 won deal has no record of how many units, so it is not counted.');
  });

  it('the headline answer has the prototype\'s shape', () => {
    const c = { counts: 'units' as const, count: 21, proven: 17, leftOut: 0, thing: 'freezers', currency: null, says: '' };
    expect(theSalesAnswer(c, 25, 2)).toBe('Not yet. 21 freezers are sold and 2 more are likely. That makes 23 of the 25 needed.');
    expect(theSalesAnswer({ ...c, count: 26 }, 25, 0)).toBe('Yes. 26 freezers are sold, and 25 were needed.');
  });

  it('the working week starts on Monday in the organisation\'s own day', () => {
    expect(theMondayOf(new Date('2026-10-16T08:00:00Z'), 'Africa/Nairobi')).toBe('2026-10-12');
    /* Late on Sunday in Lagos is already Monday in Nairobi. */
    expect(theMondayOf(new Date('2026-10-18T22:30:00Z'), 'Africa/Nairobi')).toBe('2026-10-19');
    expect(theMondayOf(new Date('2026-10-18T22:30:00Z'), 'Africa/Lagos')).toBe('2026-10-12');
  });

  it('your share says what proof shows and what is your word', () => {
    expect(theShareSays('You are aiming for 40 units.', 25, 40, null, { counts: 'units', proven: 0 }))
      .toBe('You are aiming for 40 units. You have sold 25 of the 40 so far. None of them has proof of payment yet, so they rest on your word.');
  });

  it('a wait is on a customer of a deal by the deal\'s contact or its business, never on a colleague or a decision', () => {
    const deals = [
      { id: 'w-sav', name: 'Savannah Cafe', ownerParticipantId: 'p-kevin', fields: { Contact: 'Jane Mwende' } },
      { id: 'w-gym', name: 'Kasarani Gym', ownerParticipantId: 'p-kevin', fields: { Contact: 'Faith' } },
    ];
    expect(theDealTheWaitIsOn({ fromParticipantId: 'p-kevin', onLabel: 'Jane' }, deals)?.id).toBe('w-sav');
    expect(theDealTheWaitIsOn({ fromParticipantId: 'p-kevin', onLabel: 'the owner of Kasarani Gym' }, deals)?.id).toBe('w-gym');
    expect(theDealTheWaitIsOn({ fromParticipantId: 'p-kevin', onLabel: 'the discount decision' }, deals)).toBeNull();
    expect(theDealTheWaitIsOn({ fromParticipantId: 'p-kevin', onParticipantId: 'p-grace', onLabel: 'Jane' }, deals)).toBeNull();
    const apart = theWaitsOnCustomersApart([
      { fromParticipantId: 'p-kevin', onLabel: 'Jane', status: 'WAITING' },
      { fromParticipantId: 'p-kevin', onLabel: 'Jane', status: 'BLOCKING' },
      { fromParticipantId: 'p-kevin', onLabel: 'Jane', status: 'CLEARED', clearedAt: NOW },
    ], deals);
    expect(apart.onDeals.map((w) => w.status)).toEqual(['WAITING']);
    expect(apart.team.map((w) => w.status)).toEqual(['BLOCKING', 'CLEARED']);
  });
});
