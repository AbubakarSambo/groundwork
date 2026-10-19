import { BoardListener } from './board.listener';
import { theRecordsPrompt, onlyRecordsTheLinesSay } from './the-kind-of-work';
import { isAPriceRange, theCriteriaAsked, readsAsAPayment, withTheCriteriaSaid, CRITERIA_SAID, theRangeAnswerIn, theCriteriaInASentence, theFourTicks, theCriteriaOnRecord } from './a-deals-four-criteria';
import { theAnswerAsALine } from './what-needs-you-and-what-to-do';
import { whatEachOpenDealStillNeeds, whatThisSalesCheckInGathers, SALES_CHECK_IN_GATHERS_PROMPT, THE_SALES_REMINDER } from '../conversation/what-a-sales-check-in-gathers';

/**
 * A DEAL'S FOUR CRITERIA: WHAT THE CHECK-IN GATHERS, AND HOW IT IS FILED (Hafsah's answer to Needs Hafsah 7, 17 October).
 * "For each open deal, by name, only what's missing, the customer's need (in their words), the budget the customer stated, the
 * decision maker, and the buying date. Ask once per missing item; don't re-ask what's already on record."
 */
describe('filing: the deal-reading step files the four criteria on the deal, with which check-in said them', () => {
  it('the deal-reading prompt names the three new details, the budget kept as a range where it was said as one', () => {
    const p = theRecordsPrompt('sales team');
    expect(p).toContain('Need (what the customer needs, in the customer\'s own words');
    expect(p).toContain('Budget stated (the money the customer said they have or will spend, as said');
    expect(p).toContain('a range kept as the range, such as KES 10,000 to 15,000');
    expect(p).toContain('Decision maker (who at the customer decides, by name or by role');
    /* Mama Pima's "Need" was filed as "a discount" on the test run (18 October): a discount asked for is not a need. */
    expect(p).toContain('a discount or a lower price the customer asks for is never their need');
  });

  it('the filter keeps them as said', () => {
    const lines = [{ id: 'e1', participantId: 'p-kevin', text: 'Kasarani Gym: Faith said they need 3 units for the members\' area and have KES 15,000 for it, but the owner decides.' }];
    const kept = onlyRecordsTheLinesSay('sales team', [{ lineId: 'e1', kind: 'deal', name: 'Kasarani Gym', details: [
      { label: 'Need', value: '3 units for the members\' area' }, { label: 'Budget stated', value: 'KES 15,000' }, { label: 'Decision maker', value: 'the owner' },
    ] } as any], lines as any, null);
    expect(kept[0].fields).toMatchObject({ Need: '3 units for the members\' area', 'Budget stated': 'KES 15,000', 'Decision maker': 'the owner' });
  });

  it('when a check-in completes, the deal keeps each criterion said and which session said it, and an earlier one keeps its own session', async () => {
    const updated: any[] = [];
    const earlier = { [CRITERIA_SAID]: { Need: { checkInId: 'c1', sessionNumber: 1, on: '2026-10-12T15:00:00.000Z' } } };
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ kindOfWork: 'sales team', workStages: null, participants: [{ id: 'p-mercy', partyType: 'PARTICIPANT', user: { firstName: 'Mercy', lastName: 'Wairimu' } }] })) },
      recordEntry: { findMany: jest.fn(async () => [{ id: 'e3', participantId: 'p-mercy', text: 'At Tuskys Westgate, Peter the buyer decides.', createdAt: new Date('2026-10-14T15:00:00Z') }]) },
      workItem: {
        findMany: jest.fn(async () => [{ id: 'w-tuskys', kind: 'deal', name: 'Tuskys Westgate', stage: 'Contacted', ownerParticipantId: 'p-mercy', sourceEntryId: null, createdAt: new Date('2026-10-12T15:00:00Z'), fields: { Contact: 'Peter', Need: 'samples first', ...earlier } }]),
        create: jest.fn(async () => ({ id: 'w-new' })),
        update: jest.fn(async (a: any) => { updated.push(a); return a; }),
      },
      groundObjective: { findMany: jest.fn(async () => []) },
    };
    const anthropic: any = { extract: jest.fn(async () => ({ records: [{ lineId: 'e3', kind: 'deal', name: 'Tuskys Westgate', details: [{ label: 'Decision maker', value: 'Peter, the buyer' }] }] })) };
    await new BoardListener(prisma, anthropic).onCheckInCompleted({ checkInId: 'c3', groundId: 'g-1', participantId: 'p-mercy', sessionNumber: 3 });
    const fields = updated[0].data.fields;
    expect(fields['Decision maker']).toBe('Peter, the buyer');
    expect(fields.Need).toBe('samples first');
    expect(fields[CRITERIA_SAID]['Decision maker']).toMatchObject({ checkInId: 'c3', sessionNumber: 3 });
    expect(fields[CRITERIA_SAID].Need).toEqual({ checkInId: 'c1', sessionNumber: 1, on: '2026-10-12T15:00:00.000Z' });
  });

  it('"He has about KES 22,500 for the 5 units." goes on from Joseph\'s line just before it, which named Juja Hardware; a line naming its own business does not', () => {
    const lines = [
      { id: 'e1', participantId: 'p-joseph', text: 'Juja Hardware: I met Mr Kariuki again, he still wants 5 units.' },
      { id: 'e2', participantId: 'p-joseph', text: 'He has about KES 22,500 for the 5 units.' },
      { id: 'e3', participantId: 'p-mercy', text: 'She has KES 10,000 for it.' },
    ];
    const offered = [
      { lineId: 'e2', kind: 'deal', name: 'Juja Hardware', details: [{ label: 'Budget stated', value: 'KES 22,500' }] },
      { lineId: 'e3', kind: 'deal', name: 'Juja Hardware', details: [{ label: 'Budget stated', value: 'KES 10,000' }] },
    ];
    const kept = onlyRecordsTheLinesSay('sales team', offered as any, lines as any, null);
    expect(kept.map((k) => [k.sourceEntryId, k.fields['Budget stated']])).toEqual([['e2', 'KES 22,500']]);
  });

  it('a check-in never moves a deal back a stage: Juja Hardware stays at Pitched when a line reads as its need', async () => {
    const updated: any[] = [];
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ kindOfWork: 'sales team', workStages: null, participants: [] })) },
      recordEntry: { findMany: jest.fn(async () => [{ id: 'e1', participantId: 'p-joseph', text: 'Juja Hardware: I met Mr Kariuki again, he still wants 5 units.', createdAt: new Date('2026-10-17T15:00:00Z') }]) },
      workItem: {
        findMany: jest.fn(async () => [{ id: 'w-juja', kind: 'deal', name: 'Juja Hardware', stage: 'Pitched', ownerParticipantId: 'p-joseph', sourceEntryId: null, createdAt: new Date('2026-10-12T15:00:00Z'), fields: { Contact: 'Mr Kariuki' } }]),
        create: jest.fn(), update: jest.fn(async (a: any) => { updated.push(a); return a; }),
      },
      groundObjective: { findMany: jest.fn(async () => []) },
    };
    const anthropic: any = { extract: jest.fn(async () => ({ records: [{ lineId: 'e1', kind: 'deal', name: 'Juja Hardware', stage: 'Need established', details: [{ label: 'Need', value: '5 units' }] }] })) };
    await new BoardListener(prisma, anthropic).onCheckInCompleted({ checkInId: 'c5', groundId: 'g-1', participantId: 'p-joseph', sessionNumber: 5 });
    expect(updated[0].data.stage).toBeUndefined();
    expect(updated[0].data.fields.Need).toBe('5 units');
  });

  it('a criterion said again in the same words keeps the session that first said it', () => {
    const before = { Need: 'samples first', [CRITERIA_SAID]: { Need: { checkInId: 'c1', sessionNumber: 1, on: 'x' } } };
    expect((withTheCriteriaSaid(before, { ...before }, { checkInId: 'c4', sessionNumber: 4, on: new Date() }) as any)[CRITERIA_SAID].Need.checkInId).toBe('c1');
  });
});

describe('reading the record', () => {
  it('a range is a range, an amount is not', () => {
    expect(isAPriceRange('KES 120,000 to 150,000')).toBe(true);
    expect(isAPriceRange('between 10k and 15k')).toBe(true);
    expect(isAPriceRange('10,000-15,000 shillings')).toBe(true);
    expect(isAPriceRange('KES 15,000')).toBe(false);
    expect(isAPriceRange('about 20,000')).toBe(false);
  });

  it('an M-Pesa message or a receipt is a payment record; a purchase order with payment on delivery is not', () => {
    expect(readsAsAPayment('QJK4TL2MX9 Confirmed. Ksh200,000.00 received from KILELE HOTEL LTD')).toBe(true);
    expect(readsAsAPayment('Here is the receipt for the deposit.')).toBe(true);
    expect(readsAsAPayment('PURCHASE ORDER PO-4471. Payment on delivery. Signed: M. Njeri.')).toBe(false);
    expect(readsAsAPayment('The deposit will be paid on Friday.')).toBe(false);
  });

  it('the lead\'s answer is read from how we work, in the words the answer route writes', () => {
    const yes = theAnswerAsALine('Decide whether a price range counts as a budget', true);
    expect(yes).toBe('On whether a price range counts as a budget, the answer is yes.');
    expect(theRangeAnswerIn([{ text: 'We meet on Fridays.' }, { text: yes }])).toBe('yes');
    expect(theRangeAnswerIn([{ text: yes }, { text: theAnswerAsALine('Decide whether a price range counts as a budget', false) }])).toBe('no');
    expect(theRangeAnswerIn([{ text: 'We meet on Fridays.' }])).toBeNull();
  });

  it('the opened deal says what is missing in full sentences', () => {
    const c = theCriteriaOnRecord({ Need: '3 units', 'Decision maker': 'the owner' }, null);
    expect(theCriteriaInASentence(theFourTicks(c, null, 'You'))).toBe('Two of the four criteria are on record. The budget the customer stated and the buying date are not on record yet.');
  });

  it('a question Groundwork asked about a deal\'s criterion is read from its own turns; a sentence that only tells is not a question', () => {
    const asked = theCriteriaAsked([
      { content: 'Who makes the final decision at Kasarani Gym?', createdAt: '2026-10-14T15:00:00Z' },
      { content: 'When does Faith expect them to buy?', createdAt: '2026-10-15T15:00:00Z' },
      { content: 'Kasarani Gym said the owner decides. What else should I know?', createdAt: '2026-10-15T15:01:00Z' },
      { content: 'What budget does Savannah Cafe have?', createdAt: '2026-10-15T15:02:00Z' },
    ], { name: 'Kasarani Gym', fields: { Contact: 'Faith' } });
    expect([...asked.keys()].sort()).toEqual(['buying date', 'decision maker']);
  });
});

describe('gathering: what the check-in is told about each open deal of theirs', () => {
  const kasarani = { name: 'Kasarani Gym', stage: 'Need established', fields: { Contact: 'Faith', Need: '3 units for the members\' area', 'Decision maker': 'the owner' } };
  const tuskys = { name: 'Tuskys Westgate', stage: 'Contacted', fields: { Contact: 'Peter', 'Budget stated': 'KES 120,000 to 150,000' } };
  const won = { name: 'Kilele Hotel', stage: 'Won', fields: {} };

  it('for each open deal, by name, what is on record, what is missing and not asked, and what was asked and not answered', () => {
    const block = whatEachOpenDealStillNeeds([kasarani, tuskys, won], [
      { content: 'How much does Kasarani Gym have set aside for the dispensers?', createdAt: new Date('2026-10-14T15:00:00Z') },
    ]);
    expect(block).toContain('WHAT EACH OF THEIR OPEN DEALS STILL NEEDS TO BE QUALIFIED, from the record (only theirs):');
    expect(block).toContain('- Kasarani Gym. On record, so not to be asked: the customer\'s need, in the customer\'s words ("3 units for the members\' area"); who decides ("the owner"). Missing, not asked yet, so ask each once: the day the customer will buy. Asked before and not answered, so do not ask again: the budget the customer stated (asked on Wednesday 14 October).');
    expect(block).toContain('- Tuskys Westgate. On record, so not to be asked: the budget the customer stated ("KES 120,000 to 150,000", a range). Missing, not asked yet, so ask each once: the customer\'s need, in the customer\'s words; who decides; the day the customer will buy.');
    /* A won deal needs none of the four asked. */
    expect(block).not.toContain('Kilele Hotel');
  });

  it('the stored words say ask each missing one once and never again, and the reminder read last says the same', () => {
    expect(SALES_CHECK_IN_GATHERS_PROMPT).toContain('Ask for each missing one of the four once, by the deal\'s name');
    expect(SALES_CHECK_IN_GATHERS_PROMPT).toContain('never ask again for one that was already asked, even if it was not answered');
    expect(SALES_CHECK_IN_GATHERS_PROMPT).toContain('Qualified (the customer\'s need, a budget the customer stated, who decides, and the day the customer will buy: all four)');
    /* Hafsah, 18 October, answer 2: Won is a signed order or a payment. */
    expect(SALES_CHECK_IN_GATHERS_PROMPT).toContain('Won (a signed order or a payment, with the document that shows it)');
    expect(THE_SALES_REMINDER).toContain('any of its four criteria the list says is missing and not asked yet');
    /* The finish now waits for the proof too, asked once (Drop Access run 1, item 32). */
    expect(SALES_CHECK_IN_GATHERS_PROMPT).toContain('each of its four that the list says is missing and not asked yet has been asked once, and, for a deal called won or quoted, its proof is on record or has been asked for once, you have what you need, so finish.');
    expect(THE_SALES_REMINDER).toContain('Before you finish, ask once for each of those that is still not asked, naming the deal.');
  });

  it('a rep\'s turn reads Groundwork\'s own turns in their own check-ins only, and the block carries their deals\' missing criteria', async () => {
    const asked: any[] = [];
    const prisma: any = {
      ground: { findUnique: async () => ({ kindOfWork: 'sales team' }) },
      groundParticipant: { findUnique: async () => ({ partyType: 'PARTICIPANT' }) },
      workItem: { findMany: async () => [kasarani] },
      checkIn: { findMany: async (q: any) => { asked.push(q); return [{ id: 'c1' }, { id: 'c2' }]; } },
      conversationTurn: { findMany: async (q: any) => { asked.push(q); return [{ content: 'When will Kasarani Gym buy?', createdAt: new Date('2026-10-14T15:00:00Z') }]; } },
    };
    const r = await whatThisSalesCheckInGathers({ prisma, prompts: { getActive: async () => ({ id: 'pv-2', content: 'STORED' }) } }, { groundId: 'g', participantId: 'p-kevin' });
    expect(asked[0].where).toEqual({ groundId: 'g', participantId: 'p-kevin' });
    expect(asked[1].where).toEqual({ checkInId: { in: ['c1', 'c2'] }, role: 'AI' });
    expect(r.promptVersionId).toBe('pv-2');
    expect(r.block).toContain('Asked before and not answered, so do not ask again: the day the customer will buy (asked on Wednesday 14 October).');
    expect(r.block).toContain('Missing, not asked yet, so ask each once: the budget the customer stated.');
  });
});
