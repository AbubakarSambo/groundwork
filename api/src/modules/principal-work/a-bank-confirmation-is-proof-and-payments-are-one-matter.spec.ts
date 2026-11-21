import { aWorldForPrincipalWork, anXlsx, read } from './a-world-for-principal-work';
import { readTheTracker, readTheTrackerReadingItsHeadings } from './the-payments-tracker';
import { thePaymentCounts, thePaymentsNow } from './the-payments-work';
import { buildTheRegister } from '../outstanding/the-outstanding-register';
import { whatIsOutstandingSaid, whatNeedsTheDecisionSaid } from '../outstanding/the-register-in-plain-words';
import { herOwnDecisions, theMattersSheActsOn } from '../outstanding/what-an-assistant-acts-on';
import { ensureThePrincipalsJobs } from '../outstanding/the-persistent-jobs';

/**
 * DANGOTE STRESS TEST, D5 AND D11. The office's tracker has a "Bank confirmation" column, filled in for most paid lines. It was never read, so every paid line was
 * "said to be paid, with no proof yet", owners were asked for proof that was in the sheet, and every line the sheet marked Approved became "Did you approve the
 * payment ...?" for Fatima: Ask said "150 things need your decision", her assistant's Today said 141, and her own Today said "Nothing needs you right now".
 *
 * Now the bank's confirmation is proof; a line the sheet marks Approved is not a question; the payments with no proof are one matter on the record, saying who is
 * being asked, never a decision for her; and her Today, her assistant's Today and Ask read the one list.
 */
const HEAD = ['S/N', 'Payee', 'Reference', 'Description', 'Amount', 'Currency', 'Owner', 'Due date', 'Approval', 'Status', 'Bank confirmation'];
const SHEET: (string | number)[][] = [
  HEAD,
  [1, 'Lumen PR', 'LPR-0611', 'Press', '8,400,000', 'NGN', 'Ngozi Eze', '02/09/2026', 'Approved', 'Paid', 'BNK-40211'],
  [2, 'Kestrel Advisory', 'KA-2026-07', 'Retainer', '12,500,000', 'NGN', 'Ngozi Eze', '14/08/2026', 'Approved', 'Paid', ''],
  [3, 'Northern Haulage Ltd', 'NH-0412', 'Haulage', '6,750,000', 'NGN', 'Ngozi Eze', '20/08/2026', 'Approved', 'Paid', ''],
  [4, 'Transcorp Hilton', 'Q1-123', 'Venue', '1,126,000', 'NGN', 'Ngozi Eze', '10/03/2026', 'Approved', 'Paid', 'BNK-39001'],
  [5, 'Orchid Events', 'Q1-100', 'Events', '5,777,000', 'NGN', 'Ngozi Eze', '16/03/2026', 'Approved', 'Pending', ''],
];

async function aTrackerForwarded() {
  const w = aWorldForPrincipalWork();
  await ensureThePrincipalsJobs(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: w.now });
  await w.forward({ from: 'principal', subject: 'Fwd: Payments August', files: [{ fileName: '2026_Payments_Final_v3_REVISED.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes: anXlsx(SHEET) }] });
  await w.work.readTheQuietBatches(w.afterQuiet());
  return w;
}

describe('the bank confirmation column', () => {
  it('is read as proof that the money went; a blank one is not', async () => {
    const w = await aTrackerForwarded();
    const counts = thePaymentCounts(await thePaymentsNow(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima' }));
    expect(counts.payments).toBe(5);
    expect(counts.paidWithProof).toBe(2);
    expect(counts.saidPaidNoProof).toBe(2);
    console.log(`WHAT THE SENDER AND THE OWNER READ\n\n${read(w.sent)}`);
    const told = w.sent.map((m) => m.text).join('\n');
    expect(told).toContain('2 are paid, with proof.');
    expect(told).toContain('2 payments are said to be paid, with no proof yet.');
    /* The owner is asked only about the two lines with no bank confirmation, and never about one the sheet already shows. */
    const toNgozi = w.sent.filter((m) => m.to === 'ngozi@example.com').map((m) => m.text).join('\n');
    expect(toNgozi).toContain('Kestrel Advisory');
    expect(toNgozi).toContain('Northern Haulage Ltd');
    expect(toNgozi).not.toContain('Lumen PR');
    expect(toNgozi).not.toContain('Transcorp Hilton');
    /* Nothing the sheet marks Approved is put to Fatima as "Did you approve". */
    expect(told).not.toContain('Did you approve');
  });

  it('is found under other headings when the model reads what the headings mean', async () => {
    const text = `--- Sheet: Payments ---\nPaid to,Sum (NGN),Paid?,Transfer confirmed by bank (ref)\nLumen PR,"8,400,000",Yes,BNK-40211`;
    /* With no model, a heading nobody listed is not guessed. */
    expect(readTheTracker(text).lines[0]?.confirmation ?? null).toBeNull();
    const reader = async (rows: string[][]) => ({ row: 0, columns: { payee: 0, amount: 1, status: 2, confirmation: rows[0].findIndex((h) => /bank/i.test(h)) } });
    const read = await readTheTrackerReadingItsHeadings(text, reader);
    expect(read.lines[0]).toMatchObject({ payee: 'Lumen PR', statedStatus: 'paid', confirmation: 'BNK-40211' });
  });
});

describe('payments with no proof are one matter, and never a decision for her', () => {
  it('the register holds one line for them, saying who is being asked, and nothing needs her decision', async () => {
    const w = await aTrackerForwarded();
    const register = await buildTheRegister(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: w.now, forADelegate: false });
    const payments = register.rows.filter((r) => r.workstream === 'Payments');
    expect(payments.map((r) => r.item)).toEqual(['2 payments are said to be paid with no proof yet. I am asking Ngozi Eze for the bank confirmations.']);
    expect(payments.every((r) => r.status !== 'awaiting decision')).toBe(true);
    const decision = whatNeedsTheDecisionSaid(register, { forName: null, now: w.now });
    console.log(`WHAT FATIMA READS IN ASK\n${decision}\n\n${whatIsOutstandingSaid(register, { forName: null, now: w.now })}`);
    expect(decision).toBe('Nothing needs your decision right now.');
  });

  it('a question that has not gone out yet is not said to be asked', async () => {
    const w = aWorldForPrincipalWork();
    w.mode.mail = 'held';
    await w.forward({ from: 'principal', subject: 'Fwd: Payments August', files: [{ fileName: 'tracker.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes: anXlsx(SHEET) }] });
    await w.work.readTheQuietBatches(w.afterQuiet());
    const register = await buildTheRegister(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: w.now, forADelegate: false });
    expect(register.rows.find((r) => r.workstream === 'Payments')!.item).toBe('2 payments are said to be paid with no proof yet. My question to Ngozi Eze about them has not gone out yet.');
  });

  it('her Today, her assistant\'s Today and Ask say the same number of decisions', async () => {
    const w = await aTrackerForwarded();
    await w.withAmina();
    /* One real decision on her record, beside the payments. */
    w.t.groundCommitment.rows.push({ id: 'c-levy', groundId: 'g-ministry', participantId: 'gp-amina', text: 'Agree our position on the export levy memo', action: 'Agree our position on the export levy memo.', whenSaid: null, status: 'UNKNOWN', source: 'CHECK_IN', settledBy: null, settledAt: null, createdAt: w.now, updatedAt: w.now });
    w.t.registerNote = w.t.registerNote ?? w.aTable([], 'rn');
    const register = await buildTheRegister(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: w.now, forADelegate: false });
    const asked = register.rows.filter((r) => r.status === 'awaiting decision' && r.decision).length;
    const hers = await herOwnDecisions(w.prisma, { organizationId: w.ORG, userId: 'u-fatima', now: w.now });
    const maryams = await theMattersSheActsOn(w.prisma, { organizationId: w.ORG, userId: 'u-amina', now: w.now });
    const ask = whatNeedsTheDecisionSaid(register, { forName: null, now: w.now });
    console.log(`ASK\n${ask}\n\nHER TODAY\n${hers.map((h) => `${h.title} ${h.detail ?? ''}`).join('\n')}\n\nHER ASSISTANT'S TODAY\n${maryams.map((m) => `${m.title} ${m.detail ?? ''}`).join('\n')}`);
    if (asked) {
      expect(hers[0].title).toBe(ask.split('\n')[0]);
      expect(maryams[0].detail).toContain(`${asked} ${asked === 1 ? 'needs' : 'need'} Fatima's decision`);
    } else {
      expect(hers).toEqual([]);
      expect(maryams[0]?.detail ?? '').not.toMatch(/need Fatima's decision/);
    }
  });
});
