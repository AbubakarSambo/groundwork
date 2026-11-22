import { boardAs, SALES_RUN, BISI, FEMI, type Setup } from './the-switchboards-sections-harness';
import { theMarkForTheDeal } from './a-deals-proof-is-about-that-deal';
import { A_DEAL_AND_ITS_DETAILS } from './the-kind-of-work';

/**
 * A DEAL'S OWN LINE PROVES ONLY THE DEAL ITS DOCUMENT NAMES (release test, 21 November 2026, bugs 28, 33 and 84).
 *
 * Amani said "2 signed up: Mama Njeri Duka and Kilimani Fresh." and added Mama Njeri Duka's signed order form behind the line. She also
 * said "Kilimani Fresh is verbal for now". Both deals were written from that line, and both took its mark: Kilimani Fresh read "Won,
 * Proven", My work "3 sold, 3 with proof", and "Every one of your 3 sales has proof". The order form is about Mama Njeri Duka alone, so
 * it proves her deal and not Kilimani Fresh's, which reads as said to be won and not shown yet. Here Femi is the rep and Bisi runs it.
 */
const item = (id: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind: 'deal', name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: new Date('2026-11-21T20:41:00Z'), updatedAt: new Date('2026-11-21T20:41:00Z'), ...more,
});
const LINES = [
  { id: 'e-two', participantId: 'p-femi', type: 'PROGRESS', text: '2 signed up: Mama Njeri Duka and Kilimani Fresh.', recallBased: false, anchoredOrigin: 'photo', anchoredDocumentId: 'doc-order', createdAt: new Date('2026-11-21T20:39:21Z') },
  { id: 'e-verbal', participantId: 'p-femi', type: 'PROGRESS', text: 'Kilimani Fresh is verbal for now', recallBased: true, createdAt: new Date('2026-11-21T20:39:21Z') },
];
const ORDER_FORM = 'MSINGI FOODS ORDER FORM\nShop: Mama Njeri Duka, Kilimani\nItem: Unga 2kg cartons x 20\nDate: 19 Nov 2026\nSigned: N. Wanjiru';
const RUN: Setup = {
  ...SALES_RUN,
  kindOfWork: 'sales org',
  clock: { now: new Date('2026-11-22T09:00:00Z'), endsAt: new Date('2027-01-29T17:00:00Z') },
  recordLines: LINES,
  lines: LINES,
  documents: [{ id: 'doc-order', participantId: 'p-femi', fileName: 'order.png', uploaderNote: "It proves Mama Njeri's first order of 20 cartons", content: ORDER_FORM, createdAt: new Date('2026-11-21T20:36:43Z'), visibility: 'OWN' } as any],
  items: [
    item('w-njeri', 'Mama Njeri Duka', { stage: 'Won', ownerParticipantId: 'p-femi', sourceEntryId: 'e-two' }),
    item('w-kilimani', 'Kilimani Fresh', { stage: 'Won', ownerParticipantId: 'p-femi', sourceEntryId: 'e-two' }),
  ],
};
const grid = (b: any) => ((b.workRecords ?? []) as any[]).find((s) => s.section === 'Deal grid');
const row = (b: any, name: string) => grid(b)?.rows.find((r: any) => r.name === name);
const heading = (b: any, id: string) => grid(b)?.groups.find((g: any) => g.rowIds.includes(id))?.heading;

describe('the order form proves Mama Njeri Duka, not Kilimani Fresh', () => {
  it.each([['Bisi, who runs it', BISI], ['Femi, the rep', FEMI]] as const)('%s reads Kilimani Fresh as said, and Mama Njeri Duka as shown', async (_who, reader) => {
    const b = await boardAs(RUN, reader[0], reader[1]);
    expect(row(b, 'Mama Njeri Duka').mark).toBe('proven');
    expect(row(b, 'Mama Njeri Duka').knownSays).toBe('Proof shows it.');
    expect(row(b, 'Kilimani Fresh').mark).not.toBe('proven');
    expect(row(b, 'Kilimani Fresh').knownSays).toBe('Someone said it.');
    expect(heading(b, 'w-kilimani')).toBe('Said to be won, not shown yet');
  });

  it('the rule, on its own', () => {
    expect(theMarkForTheDeal('proven', ORDER_FORM, { name: 'Kilimani Fresh' })).toBe('said');
    expect(theMarkForTheDeal('proven', ORDER_FORM, { name: 'Mama Njeri Duka' })).toBe('proven');
    /* A photo with no words to read is read by its line, as before. */
    expect(theMarkForTheDeal('proven', null, { name: 'Kilimani Fresh' })).toBe('proven');
    expect(theMarkForTheDeal('said', ORDER_FORM, { name: 'Mama Njeri Duka' })).toBe('said');
  });
});

describe('the records reading is told to read a customer\'s lines together, and one customer is one record', () => {
  it('says so in the prompt the model reads', () => {
    expect(A_DEAL_AND_ITS_DETAILS).toContain('where one line says the customer signed up and another says it is a verbal yes');
    expect(A_DEAL_AND_ITS_DETAILS).toContain('A customer said in two ways in these lines or on record');
  });
});
