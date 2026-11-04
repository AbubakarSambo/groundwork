import { FC, theCheckAsADatabase, THURSDAY_MORNING } from './the-final-check-bed';
import { fileTheProofOnItsItem } from '../documents/proof-filed-on-its-item';
import { theDirectMorningFor, theEmailParts, theMatterDirectMorning } from '../engagement/the-direct-morning';
import { withTheAmountSaid, theCollectionsBoardFor } from './the-collections-board.service';
import { whatALineDoesToABill } from './a-fee-note-due-on-an-event';

/**
 * WANJIRU'S FEE NOTES, AS THE FINAL REAL-MODEL CHECK LEFT THEM (item 9; Hafsah, 21 October 2026). The run's own rows (gw_final_check),
 * served with no database and no model. Her morning read "KES 70,000 is owed on 3 fee notes, and 2 of them have no amount on record.",
 * "Nothing is paid with proof yet.", "You marked FN-004 for Kasarani Foods paid, so file the bank slip or the M-Pesa message." (Njeri
 * said it, and filed the Equity slip), "Did fee note FN-005 for Kasarani Foods fall due on 13 October?" (the reply was filed on the 14th),
 * and "People said different things about this, so settle it with them."
 */
async function theFeeNotesWithTheSlipFiled() {
  const db: any = theCheckAsADatabase('fees', { directMorning: true, asOf: THURSDAY_MORNING, others: ['lit'] });
  const rows: any[] = [];
  db.itemEvidence = {
    create: jest.fn(async ({ data }: any) => { const r = { id: `e${rows.length}`, createdAt: new Date('2026-10-12T07:03:31Z'), ...data }; rows.push(r); return { id: r.id, itemName: r.itemName }; }),
    findMany: jest.fn(async ({ where }: any) => rows.filter((r) => r.countsAsProof && (!where?.workItemId?.in || where.workItemId.in.includes(r.workItemId)))),
    findFirst: jest.fn(async () => null),
  };
  const doc = FC.fees.documents[0];
  /* As the check-in that acknowledged it now files it (documentReceived), or a web upload from the check-in does. */
  const filed = await fileTheProofOnItsItem(db, { id: doc.id, groundId: doc.groundId, participantId: doc.participantId, fileName: doc.fileName, mimeType: doc.mimeType, uploaderNote: doc.uploaderNote, content: doc.content }, new Date(doc.createdAt));
  return { db, filed };
}

/* Expectations updated (Hafsah, 30 October 2026: plain language for an impatient first-time lead; a difference is said as what people said, with no "needs settling".) */
describe('the fee notes on record', () => {
  it('Njeri’s Equity slip, which names FN-004 by its number and Kasarani Foods by name, is filed on FN-004', async () => {
    const { filed } = await theFeeNotesWithTheSlipFiled();
    expect(filed?.itemName).toBe('FN-004');
  });
  it('a fee note with no amount kept takes the amount said straight after its number, from people’s own words', () => {
    const bills = FC.fees.items.filter((i: any) => i.kind === 'bill');
    const said = FC.fees.turns.filter((t: any) => t.role === 'PERSON').map((t: any) => t.content);
    const amount = (n: string) => withTheAmountSaid(bills.find((b: any) => b.fields?.Number === n), bills, said).Amount;
    expect(amount('FN-005')).toBe('KES 250,000');
    expect(amount('FN-008')).toBe('KES 90,000');
    expect(amount('FN-004')).toBe('KES 250,000');
  });
});

describe('Wanjiru’s Thursday morning', () => {
  it('says what is owed on every fee note not paid with proof, what is paid with proof, and nothing she did not say', async () => {
    const { db } = await theFeeNotesWithTheSlipFiled();
    const m: any = await theDirectMorningFor(db, { groundId: FC.fees.ground.id, leadUserId: FC.fees.ground.initiatorId, board: {}, now: THURSDAY_MORNING });
    const parts = theEmailParts([m]);
    expect(parts.find((p) => p.heading === 'What is owed, and what is paid')!.lines).toEqual([
      'KES 710,000 is owed on 5 fee notes. 2 of them are marked paid on somebody’s word, with no slip or message on file. KES 250,000 is paid with proof.',
    ]);
    const all = parts.flatMap((p) => p.lines).join(' ');
    expect(all).not.toMatch(/You marked FN-004/);
    expect(all).not.toMatch(/fall due on 13 October/);
    expect(all).not.toMatch(/KES 70,000 is owed/);
  });
  it('asks about FN-005 only from a line that says the reply was filed, on the day it was said', () => {
    const fn005 = { id: 'fn-005', groundId: FC.fees.ground.id, stage: 'Due', client: 'Kasarani Foods', matter: 'their case against Tumaini Traders', dueWhen: 'the reply is filed', notDueFrom: [] };
    const worry = FC.lit.lines.find((l: any) => /most likely thing to stop/.test(l.text));
    const filed = FC.lit.lines.find((l: any) => /^I filed the reply today/.test(l.text));
    expect(whatALineDoesToABill({ id: worry.id, text: worry.text, saidOn: '2026-10-13' }, fn005, [fn005])).toEqual({ does: 'nothing' });
    expect(whatALineDoesToABill({ id: filed.id, text: filed.text, saidOn: '2026-10-14' }, fn005, [fn005])).toEqual({ does: 'may make it due', day: '2026-10-14' });
  });
  it('never says "People said different things about this"', () => {
    const m = theMatterDirectMorning({
      groundId: 'g', label: 'Litigation team daily', board: { decisions: [{ source: 'divergence', owner: 'You', question: 'People in this check-in said different things about this.' }] },
      people: [], hers: new Set(), waits: [], items: [], lastCheckIn: {}, firstOpened: {}, workingDays: null, now: THURSDAY_MORNING, zone: 'Africa/Nairobi',
    });
    expect(JSON.stringify(m)).not.toMatch(/different things about this/);
  });
});

describe('a payment Aisha said in the litigation daily reaches the fee notes (item 7)', () => {
  it('Wanjiru reads beside FN-007 that Aisha also said it is paid in Litigation team daily, and it is still not paid with proof', async () => {
    const { db } = await theFeeNotesWithTheSlipFiled();
    const lead = FC.fees.participants.find((p: any) => p.userId === FC.fees.ground.initiatorId).id;
    const board: any = await theCollectionsBoardFor(db, FC.fees.ground.id, { runsIt: true, participantId: lead }, THURSDAY_MORNING);
    const fn007 = board.every.rows.find((r: any) => r.number === 'FN-007');
    expect(fn007.payment).toEqual({ says: 'Paid, as Aisha said here and in Litigation team daily on 14 October', mark: 'said' });
  });
});
