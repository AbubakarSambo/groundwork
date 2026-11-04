import { boardAs, SALES_RUN, BISI, FEMI, type Setup } from './the-switchboards-sections-harness';
import { theSameCustomer, theCustomerIn } from './one-deal-per-customer';

/**
 * PILOTS, 13 OCTOBER 2026, PROBLEM 2: PROOF REACHES THE PIPELINE, AND ONE CUSTOMER IS ONE DEAL.
 *
 * Kevin said "Kilele Hotel paid for all 40 units today." and, in the same check-in, sent the M-Pesa ("Proof of
 * payment. The M-Pesa message from Kilele.", backed by his own screenshot). The pipeline kept Kilele Hotel under
 * "Said to be won, not shown yet" for five days. Here Femi is the rep and Bisi runs it; the lines are Kevin's.
 */
const item = (id: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind: 'deal', name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: new Date('2026-09-16T17:00:00Z'), updatedAt: new Date('2026-09-16T17:00:00Z'), ...more,
});
const LINES = [
  { id: 'e-said', participantId: 'p-femi', type: 'PROGRESS', text: 'Kilele Hotel paid for all 40 units today.', recallBased: true, createdAt: new Date('2026-09-22T06:09:00Z') },
  { id: 'e-proof', participantId: 'p-femi', type: 'PROGRESS', text: 'Proof of payment. The M-Pesa message from Kilele.', recallBased: false, anchoredOrigin: 'photo', anchoredDocumentId: 'doc-mpesa', createdAt: new Date('2026-09-22T06:04:00Z') },
  { id: 'e-wema', participantId: 'p-femi', type: 'PROGRESS', text: 'Wema is won, they will pay next week.', recallBased: true, createdAt: new Date('2026-09-22T06:10:00Z') },
];
const RUN: Setup = {
  ...SALES_RUN,
  kindOfWork: 'sales org',
  clock: { now: new Date('2026-09-23T15:00:00Z'), endsAt: new Date('2026-09-30T17:00:00Z') },
  recordLines: LINES,
  lines: LINES,
  documents: [{ id: 'doc-mpesa', participantId: 'p-femi', fileName: 'image-wamid.in.1865877589d1a72c.png', visibility: 'OWN' }],
  items: [
    item('w-kilele', 'Kilele Hotel', { stage: 'Won', ownerParticipantId: 'p-femi', sourceEntryId: 'e-said' }),
    item('w-wema', 'Wema', { stage: 'Won', ownerParticipantId: 'p-femi', sourceEntryId: 'e-wema' }),
  ],
};
const grid = (b: any) => ((b.workRecords ?? []) as any[]).find((s) => s.section === 'Deal grid');
const row = (b: any, name: string) => grid(b)?.rows.find((r: any) => r.name === name);
const heading = (b: any, id: string) => grid(b)?.groups.find((g: any) => g.rowIds.includes(id))?.heading;

describe('proof on the record counts for the deal it names', () => {
  it.each([['Bisi, who runs it', BISI], ['Femi, the rep', FEMI]] as const)('%s reads Kilele Hotel as won, shown by proof', async (_who, reader) => {
    const b = await boardAs(RUN, reader[0], reader[1]);
    expect(heading(b, 'w-kilele')).toBe('Won');
    expect(row(b, 'Kilele Hotel').groupSays).toMatch(/^Proof shows it\./);
    expect(row(b, 'Kilele Hotel').knownSays).toBe('Proof shows it.');
  });

  it('a deal said to be won with nothing shown stays said to be won', async () => {
    const b = await boardAs(RUN, ...BISI);
    expect(heading(b, 'w-wema')).toBe('Said to be won, not shown yet');
    expect(row(b, 'Wema').groupSays).toMatch(/^There is no proof yet\./);
  });
});

describe('one customer is one deal, however it is said', () => {
  it('the four ways Kilele was said are one customer', () => {
    for (const n of ['Kilele', 'Kilele 40', 'Kilele M-Pesa']) expect(theSameCustomer('Kilele Hotel', n)).toBe(true);
    expect(theSameCustomer('Greenfield Supermarket', 'Greenfield')).toBe(true);
    expect(theSameCustomer('Wema Mini Mart', 'Wema')).toBe(true);
    expect(theCustomerIn('Kilele 40')).toEqual(['kilele']);
  });

  it('two different customers stay two deals', () => {
    expect(theSameCustomer('Wema Mini Mart', 'Baraka Stores')).toBe(false);
    expect(theSameCustomer('Java House Westlands', 'Java House Kilimani')).toBe(false);
    expect(theSameCustomer('Kilele Hotel', 'Bahari Cafe')).toBe(false);
  });
});

describe('a line names a customer said short', () => {
  const { aLineNamesTheCustomer } = require('./one-deal-per-customer');
  it('names Kilele Hotel by "Kilele", and not a different customer', () => {
    expect(aLineNamesTheCustomer('Proof of payment. The M-Pesa message from Kilele.', 'Kilele Hotel')).toBe(true);
    expect(aLineNamesTheCustomer('New order today. Bahari Cafe, 10 units, paid by M-Pesa.', 'Kilele Hotel')).toBe(false);
    expect(aLineNamesTheCustomer('I went to the hotel.', 'Kilele Hotel')).toBe(false);
  });
});

describe('the deal is written once per customer, and stays with its owner', () => {
  const { BoardListener } = require('./board.listener');
  const PEOPLE = [{ id: 'p-kevin', nameGiven: null, user: { firstName: 'Kevin', lastName: 'Omondi' } }, { id: 'p-grace', nameGiven: null, user: { firstName: 'Grace', lastName: 'Wanjiku' } }];
  function run(lines: any[], offered: any[], already: any[]) {
    const created: any[] = [];
    const updated: any[] = [];
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ kindOfWork: 'sales org', workStages: ['Contacted', 'Quoted', 'Won'], participants: PEOPLE })) },
      recordEntry: { findMany: jest.fn(async () => lines) },
      workItem: {
        findMany: jest.fn(async () => already),
        create: jest.fn(async (a: any) => { created.push(a.data); return { id: `w-${created.length}` }; }),
        update: jest.fn(async (a: any) => { updated.push(a); return {}; }),
      },
    };
    return { listener: new BoardListener(prisma, { extract: jest.fn(async () => ({ records: offered })) } as any), created, updated };
  }

  it('"Kilele 40" and "Kilele M-Pesa" move the Kilele Hotel deal on, and make no new deal', async () => {
    const { listener, created, updated } = run(
      [{ id: 'e-1', participantId: 'p-kevin', text: 'Kilele 40 paid and delivered.' }, { id: 'e-2', participantId: 'p-kevin', text: 'Kilele M-Pesa came in, 496,000.' }],
      /* Updated 29 October (understand, don't match): the model is shown the items on record by id and says which one a line is about. */
      [{ lineId: 'e-1', kind: 'deal', name: 'Kilele 40', stage: 'Won', sameAs: 'w-kilele' }, { lineId: 'e-2', kind: 'deal', name: 'Kilele M-Pesa', stage: 'Won', sameAs: 'w-kilele' }],
      [{ id: 'w-kilele', kind: 'deal', name: 'Kilele Hotel', fields: {}, ownerParticipantId: 'p-kevin' }],
    );
    await listener.onCheckInCompleted({ checkInId: 'c1', groundId: 'g-1', participantId: 'p-kevin', sessionNumber: 3 });
    expect(created).toEqual([]);
    expect(updated.map((u) => u.where.id)).toEqual(['w-kilele', 'w-kilele']);
  });

  it("the lead saying Kevin's deal again does not move it under her name", async () => {
    const { listener, updated } = run(
      [{ id: 'e-g', participantId: 'p-grace', text: 'Kevin also sold 10 units to Bahari Cafe.' }],
      [{ lineId: 'e-g', kind: 'deal', name: 'Bahari Cafe', stage: 'Won' }],
      [{ id: 'w-bahari', kind: 'deal', name: 'Bahari Cafe', fields: {}, ownerParticipantId: 'p-kevin' }],
    );
    await listener.onCheckInCompleted({ checkInId: 'c2', groundId: 'g-1', participantId: 'p-grace', sessionNumber: 3 });
    expect(updated).toHaveLength(1);
    expect(updated[0].data.sourceEntryId).toBeUndefined();
    expect(updated[0].data.stage).toBe('Won');
  });
});
