import { BoardListener } from './board.listener';
import {
  theCollectionsRecordsPrompt, onlyBillsTheLinesSay, theSameBill, theBillAfter, aBillIsNamed, fileTheBillsSaid,
  BILL, LOAN_OWED, NOT_YET_RAISED, FOLLOWS_UP_ID, PROMISES,
} from './the-collections-record';
import { theStagesKept } from './a-deals-stages-are-kept';
import { THE_RECORDS_SCHEMA } from './the-kind-of-work';
import { theItemItNames } from '../documents/proof-filed-on-its-item';
import { aCollectionsCheckInWithRelease2 } from '../grounds/release-2-collections';
import { aPromiseSomebodyElseMade } from '../conversation/a-promise-somebody-else-made';
import { theCollectionsWorld, thePrismaFor } from './__fixtures__/the-collections-record-for-specs';

/**
 * THE COLLECTIONS RECORD: ONE ROW PER BILL, WRITTEN FROM WHAT PEOPLE SAY (Release 2, pull request 2 of 3; release plan, Part 1A,
 * "Filing rules"). Every model answer here is written by hand, as the model would give it; no model is called.
 */
const PEOPLE = [
  { id: 'p-brian', firstName: 'Brian', lastName: 'Otieno' },
  { id: 'p-aisha', firstName: 'Aisha', lastName: 'Kamau' },
  { id: 'p-njeri', firstName: 'Njeri', lastName: 'Wambui' },
];

describe('what the model is asked, in the organisation\'s own word for the bill', () => {
  it('a fee notes check-in is asked for fee notes, a client\'s promise as the client\'s, and never to raise one', () => {
    const p = theCollectionsRecordsPrompt('invoices or fee notes', 'fee note');
    expect(p).toContain('People here call a bill a fee note.');
    expect(p).toContain('Promised by (the day the client promised to pay by, as YYYY-MM-DD: the client\'s promise, never the speaker\'s)');
    expect(p).toContain('A client\'s promise to pay goes on the fee note as Promised by. It is never something the speaker will do.');
    expect(p).toContain(`a fee note that should go out and has not is given at "${NOT_YET_RAISED}"`);
    expect(p).toContain('Proof said (the record they say shows the payment, such as a bank slip; it is never proof by itself)');
  });

  it('a loans check-in is asked about the speaker\'s own loan', () => {
    const p = theCollectionsRecordsPrompt('loans', 'invoice');
    expect(p).toContain('Each person checking in owes one loan of their own.');
    expect(p).toContain(`kind "${LOAN_OWED}"`);
  });
});

describe('only what the line says', () => {
  const lines = [
    { id: 'e1', participantId: 'p-aisha', text: 'Jamii Clinics promised to pay FN-007 by 10 October. Brian will take over Upendo Schools.' },
    { id: 'e2', participantId: 'p-brian', text: 'Kasarani Foods has a third fee note waiting for the hearing date.' },
  ];

  it('keeps a fee note named in its line, with a real date and a follower who is in the check-in', () => {
    const kept = onlyBillsTheLinesSay('invoices or fee notes', [
      { lineId: 'e1', kind: BILL, name: 'FN-007', stage: 'Promised', details: [{ label: 'Client', value: 'Jamii Clinics' }, { label: 'Promised by', value: '2026-10-10' }, { label: 'Next step by', value: 'next week' }] },
      { lineId: 'e1', kind: BILL, name: 'Upendo Schools', details: [{ label: 'Follows up', value: 'Brian' }] },
      { lineId: 'e2', kind: BILL, name: 'Kasarani Foods', stage: 'Not yet raised', details: [{ label: 'Due when', value: 'the hearing date is set' }] },
    ] as any, lines, PEOPLE);
    expect(kept).toHaveLength(3);
    expect(kept[0]).toMatchObject({ kind: BILL, name: 'FN-007', stage: 'Promised', ownerParticipantId: 'p-aisha', fields: { Client: 'Jamii Clinics', Number: 'FN-007', 'Promised by': '2026-10-10' } });
    /* "next week" is not a day, so it is not kept. */
    expect(kept[0].fields['Next step by']).toBeUndefined();
    /* Whose it is: the speaker's. Brian follows it up, and that is kept beside it. */
    expect(kept[1]).toMatchObject({ ownerParticipantId: 'p-aisha', fields: { 'Follows up': 'Brian', [FOLLOWS_UP_ID]: 'p-brian', Client: 'Upendo Schools' } });
    expect(kept[2]).toMatchObject({ stage: NOT_YET_RAISED, fields: { 'Due when': 'the hearing date is set' } });
  });

  it('drops a bill whose name is not in its line, a person named as a client, and another kind', () => {
    const kept = onlyBillsTheLinesSay('invoices or fee notes', [
      { lineId: 'e1', kind: BILL, name: 'FN-099' },
      { lineId: 'e1', kind: BILL, name: 'Brian' },
      { lineId: 'e1', kind: 'deal', name: 'Jamii Clinics' },
    ] as any, lines, PEOPLE);
    expect(kept).toEqual([]);
  });

  it('a loan is always the speaker\'s own loan', () => {
    const kept = onlyBillsTheLinesSay('loans', [{ lineId: 'l1', kind: LOAN_OWED, name: 'my freezer', stage: 'Promised', details: [{ label: 'Promised by', value: '2026-10-23' }, { label: 'Client', value: 'Musa' }] }] as any,
      [{ id: 'l1', participantId: 'p-musa', text: 'I will pay on Friday after market day.' }], []);
    expect(kept[0]).toMatchObject({ kind: LOAN_OWED, name: 'loan', ownerParticipantId: 'p-musa', fields: { 'Promised by': '2026-10-23' } });
    expect(kept[0].fields.Client).toBeUndefined();
  });
});

describe('the same bill, moved on', () => {
  const onFile = [
    { id: 'a', kind: BILL, name: 'FN-004', stage: 'Promised', ownerParticipantId: 'p-brian', fields: { Number: 'FN-004', Client: 'Kasarani Foods' } },
    { id: 'b', kind: BILL, name: 'FN-005', stage: 'Invoiced', ownerParticipantId: 'p-brian', fields: { Number: 'FN-005', Client: 'Kasarani Foods' } },
    { id: 'c', kind: BILL, name: 'Kasarani Foods', stage: NOT_YET_RAISED, ownerParticipantId: 'p-brian', fields: { Client: 'Kasarani Foods' } },
    { id: 'd', kind: BILL, name: 'FN-009', stage: 'Reminded', ownerParticipantId: 'p-aisha', fields: { Number: 'FN-009', Client: 'Upendo Schools' } },
  ];
  const kept = (over: any) => ({ kind: BILL, name: 'x', stage: null, dueAt: null, fields: {}, sourceEntryId: 'e', ownerParticipantId: 'p-njeri', ...over });

  it('by its number; by its client where only one is open; the one not yet raised when it is said not raised', () => {
    expect(theSameBill(onFile, kept({ name: 'FN 004', fields: { Number: 'FN 004' } }))?.id).toBe('a');
    expect(theSameBill(onFile, kept({ name: 'Upendo Schools', fields: { Client: 'Upendo Schools' } }))?.id).toBe('d');
    expect(theSameBill(onFile, kept({ name: 'Kasarani Foods', stage: NOT_YET_RAISED, fields: { Client: 'Kasarani Foods' } }))?.id).toBe('c');
    /* A new number for a client whose fee note was not yet raised raises that one. */
    expect(theSameBill(onFile, kept({ name: 'FN-011', fields: { Number: 'FN-011', Client: 'Kasarani Foods' } }))?.id).toBe('c');
    expect(theSameBill(onFile, kept({ name: 'Nyota Logistics', fields: { Client: 'Nyota Logistics' } }))).toBeNull();
  });

  it('a client\'s promise is filed on the bill as theirs, with the day it was said, and is last contact with the client', () => {
    const after = theBillAfter(onFile[3] as any, kept({ stage: 'Promised', fields: { 'Promised by': '2026-10-30' } }), 'invoices or fee notes', new Date('2026-10-19T09:00:00Z'));
    expect(after.stage).toBe('Promised');
    expect(after.fields['Promised by']).toBe('2026-10-30');
    expect(after.fields[PROMISES]).toEqual([{ by: '2026-10-30', said: '2026-10-19T09:00:00.000Z' }]);
    expect(after.fields['Last contact']).toBe('2026-10-19');
    expect(theStagesKept(after.fields).map((s) => s.stage)).toEqual(['Reminded', 'Promised']);
  });

  it('a stage never moves back from a check-in, and paid stays paid', () => {
    const paid = { ...onFile[0], stage: 'Paid' };
    expect(theBillAfter(paid as any, kept({ stage: 'Reminded' }), 'invoices or fee notes', new Date()).stage).toBe('Paid');
  });
});

describe('when a check-in completes', () => {
  const answer = {
    records: [
      { lineId: 'n1', kind: BILL, name: 'FN-012', stage: 'Invoiced', due: '2026-11-05', details: [{ label: 'Client', value: 'Tumaini Traders' }, { label: 'Amount', value: 'KES 75,000' }, { label: 'Follows up', value: 'Aisha' }] },
      { lineId: 'n1', kind: BILL, name: 'FN-009', stage: 'Promised', details: [{ label: 'Promised by', value: '2026-10-30' }] },
    ],
  };
  const lineToday = { id: 'n1', participantId: 'p-njeri', checkInId: 'c-njeri-4', groundId: 'g-muchemi-fee-notes', text: 'I raised FN-012 for Tumaini Traders, KES 75,000, due 5 November; Aisha follows it up. Upendo Schools called: they promised to pay FN-009 by 30 October.', createdAt: new Date('2026-10-26T09:00:00Z') };

  it('with Release 2 on, each fee note said is one row: a new one created, an old one moved on, nobody else\'s owner changed', async () => {
    const world = theCollectionsWorld();
    world.lines.push(lineToday);
    const prisma = thePrismaFor(world);
    const anthropic = { extract: jest.fn(async () => answer) };
    await new BoardListener(prisma, anthropic as any).onCheckInCompleted({ checkInId: 'c-njeri-4', groundId: 'g-muchemi-fee-notes', participantId: 'p-njeri', sessionNumber: 4 });
    expect(anthropic.extract).toHaveBeenCalledTimes(1);
    expect((anthropic.extract.mock.calls[0] as any[])[0]).toContain('People here call a bill a fee note.');
    const fn012 = world.items.find((i) => i.name === 'FN-012');
    expect(fn012).toMatchObject({ kind: BILL, stage: 'Invoiced', ownerParticipantId: 'p-njeri', fields: expect.objectContaining({ Amount: 'KES 75,000', [FOLLOWS_UP_ID]: 'p-aisha', 'Falls due': '2026-11-05' }) });
    const fn009 = world.items.find((i) => i.id === 'w-fn009');
    expect(fn009.stage).toBe('Promised');
    expect(fn009.ownerParticipantId).toBe('p-aisha');
    expect(fn009.fields['Promised by']).toBe('2026-10-30');
  });

  it('with Release 2 off, nothing is read for bills and no bill is written', async () => {
    const world = theCollectionsWorld({ release2On: false });
    world.lines.push(lineToday);
    const before = world.items.length;
    const prisma = thePrismaFor(world);
    const anthropic = { extract: jest.fn(async () => answer) };
    expect(await fileTheBillsSaid({ prisma, anthropic: anthropic as any }, { groundId: 'g-muchemi-fee-notes', checkInId: 'c-njeri-4' }, THE_RECORDS_SCHEMA)).toBeNull();
    await new BoardListener(prisma, anthropic as any).onCheckInCompleted({ checkInId: 'c-njeri-4', groundId: 'g-muchemi-fee-notes', participantId: 'p-njeri', sessionNumber: 4 });
    expect(world.items.length).toBe(before);
    expect(anthropic.extract).not.toHaveBeenCalled();
  });

  it('a client\'s promise is never the person\'s commitment where Release 2 is on for a collections check-in', async () => {
    expect(aPromiseSomebodyElseMade('Jamii Clinics promised to pay FN-007 by 10 October.')).toBe(true);
    expect(aPromiseSomebodyElseMade('I will call Jamii Clinics on Thursday.')).toBe(false);
    expect(await aCollectionsCheckInWithRelease2(thePrismaFor(theCollectionsWorld()), 'g-muchemi-fee-notes')).toBe(true);
    expect(await aCollectionsCheckInWithRelease2(thePrismaFor(theCollectionsWorld({ release2On: false })), 'g-muchemi-fee-notes')).toBe(false);
  });
});

describe('a slip or a message is filed on the bill it names', () => {
  const items = [
    { id: 'w4', kind: BILL, name: 'FN-004', ownerParticipantId: 'p-brian', fields: { Number: 'FN-004', Client: 'Kasarani Foods' } },
    { id: 'w5', kind: BILL, name: 'FN-005', ownerParticipantId: 'p-brian', fields: { Number: 'FN-005', Client: 'Kasarani Foods' } },
    { id: 'w9', kind: BILL, name: 'FN-009', ownerParticipantId: 'p-aisha', fields: { Number: 'FN-009', Client: 'Upendo Schools' } },
  ];
  it('by its number, whole; never by a client with two fee notes; a borrower\'s message on their one loan', () => {
    expect(aBillIsNamed('Remittance advice: KES 250,000 from Kasarani Foods for FN 004.', items[0])).toBe(true);
    expect(aBillIsNamed('Payment for FN-0041', items[0])).toBe(false);
    expect(theItemItNames('Remittance advice: KES 250,000 for fn-004', items as any, 'p-njeri')?.id).toBe('w4');
    expect(theItemItNames('Bank slip from Kasarani Foods', items as any, 'p-njeri')).toBeNull();
    const loans = [{ id: 'l1', kind: LOAN_OWED, name: 'loan', ownerParticipantId: 'p-musa' }, { id: 'l2', kind: LOAN_OWED, name: 'loan', ownerParticipantId: 'p-peter' }];
    expect(theItemItNames('M-Pesa confirmed. KES 6,000 sent.', loans as any, 'p-musa')?.id).toBe('l1');
  });
});
