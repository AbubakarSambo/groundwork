import {
  whenItShouldBeRaised, theInvoicesToRaise, whatToRaise, whatIsLateToRaise, theRaisingPattern, whoRaisesInvoices,
  theInvoicesToRaiseBlock, aSaleWonIsAnInvoiceToRaise, whatThisPersonShouldRaise, theInvoicesLateToRaiseFor, FROM_A_SALE, type ABillToRead,
} from './raising-invoices-on-time';
import { buildTheCollectionsBoard, type ABillOnTheBoard } from './the-collections-board';
import { DUE_ON_AN_EVENT } from './a-fee-note-due-on-an-event';
import { NOT_YET_RAISED } from './the-collections-record';

/**
 * RELEASE 3, RAISING INVOICES ON TIME, AS EACH READER READS IT. Hand-written Muchemi & Co (test) and Drop Access (test) records, no
 * model: the sentence Njeri is given in her own check-in, the line Wanjiru reads in her morning and on the fee notes board, the
 * pattern when fee notes go out late, one never confirmed as raised, and a Drop Access sale won becoming an invoice to raise.
 */

const kept = (stage: string, on: string) => ({ _stages: [{ stage, on: `${on}T09:00:00.000Z`, by: 'check-in' }] });
const today = '2026-10-19';

/* Kasarani Foods' first fee note went out; its second waits for the reply, which Brian filed on Wednesday 14 October. */
const fn4: ABillToRead = { id: 'fn4', groundId: 'fees', name: 'FN-004', stage: 'Paid', dueAt: null, ownerParticipantId: 'njeri', createdAt: '2026-10-01', fields: { Client: 'Kasarani Foods', Number: 'FN-004', Amount: 'KES 120,000' } };
const fn5: ABillToRead = {
  id: 'fn5', groundId: 'fees', name: 'Kasarani Foods', stage: NOT_YET_RAISED, dueAt: null, ownerParticipantId: 'njeri', createdAt: '2026-10-05',
  fields: { Client: 'Kasarani Foods', Amount: 'KES 250,000', 'Due when': 'the reply is filed', [DUE_ON_AN_EVENT]: { lineId: 'l1', groundId: 'lit', label: 'Litigation team daily', saidBy: 'brian', text: 'The reply was filed today.', at: '2026-10-14T15:00:00Z', day: '2026-10-14' } },
};
/* Jamii Clinics' fee note was due to go out on a date, and nobody has said it is raised: never confirmed. */
const jamii: ABillToRead = { id: 'jamii', groundId: 'fees', name: 'Jamii Clinics', stage: NOT_YET_RAISED, dueAt: null, ownerParticipantId: 'njeri', createdAt: '2026-10-02', fields: { Client: 'Jamii Clinics', Amount: 'KES 90,000', 'Falls due': '2026-10-09' } };
/* Upendo's falls due next week: not due to raise yet. */
const upendo: ABillToRead = { id: 'upendo', groundId: 'fees', name: 'Upendo Schools', stage: NOT_YET_RAISED, dueAt: null, ownerParticipantId: 'njeri', createdAt: '2026-10-03', fields: { Client: 'Upendo Schools', 'Falls due': '2026-10-26' } };

/* Four raised before, three of them more than five days after they fell due. */
const raisedBefore = (id: string, client: string, fell: string, raised: string): ABillToRead => ({
  id, groundId: 'fees', name: client, stage: 'Invoiced', dueAt: null, ownerParticipantId: 'njeri', createdAt: '2026-09-01',
  fields: { Client: client, Number: id.toUpperCase(), 'Falls due': fell, ...kept('Invoiced', raised) },
});
const history = [
  raisedBefore('fn-001', 'Baraka Hardware', '2026-09-01', '2026-09-09'),
  raisedBefore('fn-002', 'Nyota Logistics', '2026-09-08', '2026-09-10'),
  raisedBefore('fn-003', 'Tumaini Traders', '2026-09-15', '2026-09-24'),
  raisedBefore('fn-006', 'Baraka Hardware', '2026-09-22', '2026-10-02'),
];

const people = [
  { id: 'wanjiru', role: 'Partner', isTheLead: true },
  { id: 'brian', role: 'Associate, litigation', isTheLead: false },
  { id: 'njeri', role: 'Accounts, raises the fee notes', isTheLead: false },
];

describe('Release 3: raising invoices on time, as each reader reads it', () => {
  it('knows when each fee note should be raised: on the event, on a date, and not before the day comes', () => {
    expect(whenItShouldBeRaised(fn5, today)).toMatchObject({ day: '2026-10-14', source: 'event', what: 'the reply was filed' });
    expect(whenItShouldBeRaised(jamii, today)).toMatchObject({ day: '2026-10-09', source: 'date', what: null });
    expect(whenItShouldBeRaised(upendo, today)).toBeNull();
  });

  it('Njeri, who raises the fee notes, is told in her own check-in what to raise, the amount and why, most overdue first', () => {
    expect(whoRaisesInvoices(people, null)).toBe('njeri');
    const lines = theInvoicesToRaise([fn4, fn5, jamii, upendo], today).map((i) => whatToRaise(i, 'fee note'));
    expect(lines).toEqual([
      'Raise Jamii Clinics’ fee note now, because it is 10 days late. It is for KES 90,000. It was due to go out on Friday 9 October.',
      'Raise Kasarani Foods’ second fee note now, because it is 5 days late. It is for KES 250,000. It was due to go out on Wednesday 14 October, when the reply was filed.',
    ]);
    const block = theInvoicesToRaiseBlock(lines);
    expect(block).toContain('Ask them to tell you when it is raised, and to add the invoice or say its number, amount and the day it went out.');
    expect(block).toContain('Do not ask about one they have said is raised.');
  });

  it('on the day it falls due, it says today', () => {
    const [i] = theInvoicesToRaise([fn4, fn5], '2026-10-14');
    expect(whatToRaise(i, 'fee note')).toBe('Raise Kasarani Foods’ second fee note today. It is for KES 250,000. It was due to go out on Wednesday 14 October, when the reply was filed.');
  });

  it('a fee note already raised for the client makes this one the second, whenever its record was kept', () => {
    const fn4KeptLater = { ...fn4, createdAt: '2026-10-19' };
    const [i] = theInvoicesToRaise([fn5, fn4KeptLater], today);
    expect(i.ordinal).toBe('second');
  });

  it('once it is said to be raised, it is not asked about again', () => {
    const raised = { ...fn5, stage: 'Invoiced', fields: { ...fn5.fields, Number: 'FN-005', ...kept('Invoiced', '2026-10-16') } };
    expect(theInvoicesToRaise([raised], today)).toEqual([]);
  });

  it('Wanjiru reads the one late to raise, and who has not said it is raised', () => {
    const [jam] = theInvoicesToRaise([jamii], today);
    expect(whatIsLateToRaise(jam, 'fee note', 'Njeri')).toBe('Jamii Clinics’ fee note for KES 90,000 is 10 days late to raise. It was due to go out on Friday 9 October. Njeri has not said it is raised.');
  });

  it('names the pattern plainly once it has happened more than once, with each instance', () => {
    const p = theRaisingPattern(history, 'Njeri', 'fee note');
    expect(p?.says).toBe('Njeri raised 3 of the last 4 fee notes more than 5 days after they fell due.');
    expect(p?.instances[0]).toBe('FN-006 for Baraka Hardware fell due on Tuesday 22 September and was raised on Friday 2 October, 10 days later.');
    expect(theRaisingPattern(history.slice(1, 2), 'Njeri', 'fee note')).toBeNull();
    /* A bill first heard of as paid, with a due day years earlier on record, is never counted as raised 1,103 days late. */
    const wrongDate = { ...fn4, fields: { ...fn4.fields, 'Falls due': '2023-10-05', ...kept('Paid', '2026-10-12') } };
    expect(theRaisingPattern([...history, wrongDate], 'Njeri', 'fee note')?.instances.join(' ')).not.toContain('2023');
    expect(theRaisingPattern([...history, wrongDate], 'Njeri', 'fee note')?.says).toBe('Njeri raised 3 of the last 4 fee notes more than 5 days after they fell due.');
  });

  it('the fee notes board puts the one late to raise first under What needs you, with the pattern, for the partner', () => {
    const asRow = (b: ABillToRead): ABillOnTheBoard => ({ ...b, dueAt: null, fields: b.fields as any, createdAt: '2026-10-01', proof: [], saidIn: [] } as any);
    const board = buildTheCollectionsBoard({
      type: 'invoices or fee notes', billWord: 'fee note', rows: [fn4, fn5, jamii, upendo].map(asRow),
      people: [{ id: 'wanjiru', firstName: 'Wanjiru', isTheLead: true }, { id: 'njeri', firstName: 'Njeri', isTheLead: false }],
      lastCheckIn: {}, now: new Date(`${today}T08:00:00Z`), zone: 'Africa/Nairobi', reader: { runsIt: true, participantId: 'wanjiru' }, stallRuleSet: false,
      raising: { raiser: 'Njeri', pattern: theRaisingPattern(history, 'Njeri', 'fee note'), lateLines: theInvoicesToRaise([fn4, fn5, jamii, upendo], today).map((i) => ({ billId: i.billId, says: whatIsLateToRaise(i, 'fee note', 'Njeri') })) },
    });
    expect(board.needsYou.rows[0]).toEqual({
      title: 'A fee note for Jamii Clinics is 10 days late to raise',
      says: 'It was due to go out on Friday 9 October. It is for KES 90,000. Njeri raises it, and has not said it is raised.',
    });
    expect(board.needsYou.rows[1].title).toBe('A fee note for Kasarani Foods is 5 days late to raise');
    /* The morning's lines are the same sentences Today and the summary use. */
    /* Each served with the bill's row it is, so the lead's morning says it once (boards audit C1, 30 October). */
    expect(board.needsYou.lateToRaise?.[0]?.says).toBe('Jamii Clinics’ fee note for KES 90,000 is 10 days late to raise. It was due to go out on Friday 9 October. Njeri has not said it is raised.');
    expect(board.patterns.rows[0]).toMatchObject({ title: 'Njeri raised 3 of the last 4 fee notes more than 5 days after they fell due.', tag: 'Raised late' });
    expect(board.stand.groups.find((g) => g.group === 'not-raised')?.count).toBe(3);
  });

  it('with Release 3 off, the board reads exactly as before', () => {
    const asRow = (b: ABillToRead): ABillOnTheBoard => ({ ...b, dueAt: null, fields: b.fields as any, createdAt: '2026-10-01', proof: [], saidIn: [] } as any);
    const board = buildTheCollectionsBoard({
      type: 'invoices or fee notes', billWord: 'fee note', rows: [jamii].map(asRow), people: [], lastCheckIn: {},
      now: new Date(`${today}T08:00:00Z`), zone: 'Africa/Nairobi', reader: { runsIt: true, participantId: null }, stallRuleSet: false,
    });
    expect(board.needsYou.rows[0].title).toBe('A fee note for Jamii Clinics is not raised yet');
    expect(board.needsYou.lateToRaise).toBeUndefined();
  });
});

/* A tiny store, enough for the readers that touch the database. */
function aStore(orgOn: { release3InvoicesOn: boolean; invoicesAfterASaleOn?: boolean }, grounds: any[], items: any[], participants: any[] = []) {
  return {
    organization: { findUnique: async () => ({ release3InvoicesOn: orgOn.release3InvoicesOn, invoicesAfterASaleOn: !!orgOn.invoicesAfterASaleOn }) },
    ground: {
      findUnique: async ({ where }: any) => grounds.find((g) => g.id === where.id) ?? null,
      findMany: async ({ where }: any) => grounds.filter((g) => (!where.scenario || g.scenario === where.scenario) && (!where.organizationId || g.organizationId === where.organizationId)),
    },
    groundParticipant: { findMany: async ({ where }: any) => participants.filter((p) => p.groundId === where.groundId) },
    workItem: {
      findMany: async ({ where }: any) => items.filter((i) => (!where.kind || i.kind === where.kind) && (!where.stage || i.stage === where.stage) && (where.groundId?.in ? where.groundId.in.includes(i.groundId) : !where.groundId || i.groundId === where.groundId)),
      create: async ({ data }: any) => { const row = { id: `new-${items.length}`, createdAt: new Date(), ...data }; items.push(row); return row; },
    },
  };
}

describe('Release 3, read from the record', () => {
  const muchemi = [{ id: 'fees', organizationId: 'm', scenario: 'COLLECTIONS', initiatorId: 'u-wanjiru', label: 'Fee notes', brief: {} }];
  const muchemiPeople = [
    { id: 'wanjiru', groundId: 'fees', userId: 'u-wanjiru', roleAsDescribed: 'Partner', user: { firstName: 'Wanjiru', jobTitle: 'Partner' } },
    { id: 'njeri', groundId: 'fees', userId: 'u-njeri', roleAsDescribed: 'Accounts', user: { firstName: 'Njeri', jobTitle: 'Accounts' } },
  ];

  it('Njeri’s check-in carries what to raise; Wanjiru’s own check-in there does not', async () => {
    const store = aStore({ release3InvoicesOn: true }, muchemi, [{ ...fn5, kind: 'bill' }, { ...jamii, kind: 'bill' }], muchemiPeople);
    const now = new Date(`${today}T08:00:00Z`);
    const hers = await whatThisPersonShouldRaise(store, { groundId: 'fees', participantId: 'njeri' }, now);
    expect(hers.lines).toHaveLength(2);
    expect(hers.block.startsWith('INVOICES THIS PERSON SHOULD RAISE NOW')).toBe(true);
    expect((await whatThisPersonShouldRaise(store, { groundId: 'fees', participantId: 'wanjiru' }, now)).block).toBe('');
  });

  it('the lead’s morning gets each one late to raise, and nothing with Release 3 off', async () => {
    const items = [{ ...fn4, kind: 'bill' }, { ...fn5, kind: 'bill' }, { ...jamii, kind: 'bill' }];
    const now = new Date(`${today}T08:00:00Z`);
    /* This little store keeps no word for the bill, so the organisation's default, "invoice", is used. */
    const on = await theInvoicesLateToRaiseFor(aStore({ release3InvoicesOn: true }, muchemi, items, muchemiPeople), 'm', ['fees'], now);
    expect(on.map((l) => l.text)).toEqual([
      'Jamii Clinics’ invoice for KES 90,000 is 10 days late to raise. It was due to go out on Friday 9 October. Njeri has not said it is raised.',
      'Kasarani Foods’ second invoice for KES 250,000 is 5 days late to raise. It was due to go out on Wednesday 14 October, when the reply was filed. Njeri has not said it is raised.',
    ]);
    expect(await theInvoicesLateToRaiseFor(aStore({ release3InvoicesOn: false }, muchemi, items, muchemiPeople), 'm', ['fees'], now)).toEqual([]);
  });

  it('Drop Access: a sale won becomes an invoice to raise once, from the day it was won, only where it invoices after a sale', async () => {
    const drop = [
      { id: 'sales', organizationId: 'd', scenario: 'OKR_ALIGNMENT', initiatorId: 'u-grace', label: 'Sales team, Q4' },
      { id: 'invoices', organizationId: 'd', scenario: 'COLLECTIONS', initiatorId: 'u-grace', label: 'Invoices', createdAt: new Date('2026-10-12') },
    ];
    const deal = { id: 'kilele', groundId: 'sales', kind: 'deal', name: 'Kilele Hotel', stage: 'Won', fields: { Value: 'KES 200,000', ...kept('Won', '2026-10-12') } };
    const items: any[] = [deal];
    const off = aStore({ release3InvoicesOn: true, invoicesAfterASaleOn: false }, drop, items);
    expect(await aSaleWonIsAnInvoiceToRaise(off, 'sales', new Date('2026-10-13T08:00:00Z'))).toBe(0);
    const on = aStore({ release3InvoicesOn: true, invoicesAfterASaleOn: true }, drop, items);
    expect(await aSaleWonIsAnInvoiceToRaise(on, 'sales', new Date('2026-10-13T08:00:00Z'))).toBe(1);
    expect(await aSaleWonIsAnInvoiceToRaise(on, 'sales', new Date('2026-10-14T08:00:00Z'))).toBe(0);
    const bill = items.find((i) => i.kind === 'bill');
    expect(bill).toMatchObject({ groundId: 'invoices', name: 'Kilele Hotel', stage: NOT_YET_RAISED, fields: { Client: 'Kilele Hotel', Amount: 'KES 200,000' } });
    expect(bill.fields[FROM_A_SALE]).toMatchObject({ dealId: 'kilele', day: '2026-10-12' });
    const [i] = theInvoicesToRaise([bill], '2026-10-13');
    expect(whatToRaise(i, 'invoice')).toBe('Raise Kilele Hotel’s invoice now, because it is one day late. It is for KES 200,000. It was due to go out on Monday 12 October, when the sale to Kilele Hotel was won.');
  });
});
