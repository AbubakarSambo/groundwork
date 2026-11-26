import { aWorldForPrincipalWork, anXlsx, read, DAY } from './a-world-for-principal-work';
import { readMoney, sayMoney, totalsByCurrency } from './the-money';
import { isAPaymentTracker, readDate, readTheTracker } from './the-payments-tracker';
import { thePaymentsNow } from './the-payments-work';
import { isPaidWithProof } from './the-payments-reconcile';

/**
 * THE PAYMENTS TRACKER (plan section 12). A coordinator or Fatima forwards an Excel sheet with the approval email. What the sheet says is kept as what it
 * said; the discrepancies are asked once of the right person with the context in the message; nothing is recorded as paid without proof; nothing is
 * approved or paid; and every figure is added in code.
 */
const HEAD = ['Payee', 'Reference', 'Amount', 'Currency', 'Owner', 'Due date', 'Approval', 'Status', 'Evidence'];
const SHEET: (string | number)[][] = [
  HEAD,
  ['Kilele Logistics Ltd', 'INV-0042', '1,250,000', 'NGN', 'Ngozi Eze', '2026-11-20', 'Approved', 'Paid', ''],
  ['Abuja Printing Press', 'INV-0108', '480,000', 'NGN', 'Ngozi Eze', '2026-11-25', 'Approved', 'Pending', ''],
  ['Abuja Printing Press', 'INV-0108', '520,000', 'NGN', 'Ngozi Eze', '2026-11-25', 'Approved', 'Pending', ''],
  ['Savannah Hotels', 'INV-0201', '300,000', 'NGN', 'Ngozi Eze', '2026-11-05', 'Approved', 'Paid', 'Receipt SH-201.pdf'],
  ['Global Couriers', 'INV-9', '75,000', 'NGN', 'Ngozi Eze', '2026-12-01', 'Approved', 'Pending', ''],
  ['Zenith Cleaners', 'INV-77', '90,000', 'NGN', 'Ngozi Eze', '2026-11-12', 'Approved', 'Paid', 'Bank advice 77'],
  ['Wuse Security Ltd', 'WS-5', '60,000', 'NGN', 'Ngozi Eze', '2026-11-15', 'Approved', 'Pending', ''],
  ['Wuse Security Ltd', 'WS-5', '60,000', 'NGN', 'Ngozi Eze', '2026-11-15', 'Approved', 'Paid', ''],
  ['Total', '', '2,835,000', '', '', '', '', '', ''],
];
const bytes = (s: string) => Buffer.from(s, 'utf8');

async function aTrackerWithItsApprovalEmail(from: 'principal' | 'ngozi' = 'principal') {
  const w = aWorldForPrincipalWork();
  /* The approval email and the receipt, forwarded earlier, and a request finance approved. */
  await w.forward({ from: 'principal', subject: 'Fwd: Approval for the November payments', body: 'I approve the payments to Kilele Logistics, Savannah Hotels and Wuse Security as discussed.', at: new Date(w.now.getTime() - 2 * DAY) });
  await w.forward({ from: 'principal', files: [{ fileName: 'Receipt SH-201.pdf', mimeType: 'text/plain', bytes: bytes('Remittance advice. Savannah Hotels, NGN 300,000, paid on 5 November.') }], at: new Date(w.now.getTime() - 2 * DAY + 600_000) });
  w.t.spendRequest.rows.push({ id: 'sr-global', organizationId: w.ORG, userId: 'u-amina', amount: '75000.00', what: 'Global Couriers INV-9', status: 'approved', paidOn: null, evidenceGiven: [], createdAt: w.now });
  await w.forward({ from, subject: 'Fwd: Payments tracker', files: [{ fileName: 'Payments tracker Nov.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes: anXlsx(SHEET) }] });
  w.t.intakeBatch.rows.forEach((b: any) => { if (b.lastItemAt < w.now) b.acknowledgedAt = w.now; });
  return w;
}

describe('reading a tracker, and the arithmetic', () => {
  it('amounts are whole minor units, added in code, and a total is only ever within one currency', () => {
    expect(readMoney('₦1,250,000.50')).toEqual({ minor: 125_000_050, currency: 'NGN' });
    expect(readMoney('1,250,000', 'NGN')).toEqual({ minor: 125_000_000, currency: 'NGN' });
    expect(readMoney('$0.10 + 0.20')).toEqual({ minor: 10, currency: 'USD' });
    expect(readMoney('USD 1.5m')).toEqual({ minor: 150_000_000, currency: 'USD' });
    expect(readMoney('about a million')).toBeNull();
    const totals = totalsByCurrency([readMoney('0.10', 'USD'), readMoney('0.20', 'USD'), readMoney('500,000', 'NGN'), null]);
    expect(totals).toEqual([{ currency: 'USD', minor: 30, count: 2 }, { currency: 'NGN', minor: 50_000_000, count: 1 }]);
    expect(sayMoney({ minor: 30, currency: 'USD' })).toBe('USD 0.30');
    expect(sayMoney({ minor: 283_500_000, currency: 'NGN' })).toBe('NGN 2,835,000');
  });

  it('finds the columns by their headings, skips the total row, reads dates day first, and says a row it could not read', () => {
    const text = `--- Sheet: Payments ---\n${HEAD.join(',')}\nKilele Logistics Ltd,INV-0042,"1,250,000",NGN,Ngozi Eze,20/11/2026,Approved,Paid,\nNobody,INV-1,,NGN,,,,,\nTotal,,"1,250,000",,,,,,`;
    expect(isAPaymentTracker(text)).toBe(true);
    expect(isAPaymentTracker('Minutes of the committee meeting of 4 March.\nAttendance was good.')).toBe(false);
    const r = readTheTracker(text);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0]).toMatchObject({ payee: 'Kilele Logistics Ltd', reference: 'INV-0042', statedStatus: 'paid', statedApproval: 'approved', evidence: null });
    expect(r.lines[0].dueOn?.toISOString().slice(0, 10)).toBe('2026-11-20');
    expect(r.unreadable).toEqual([{ rowNumber: 3, because: 'I could not read an amount for Nobody' }]);
    expect(readDate('5 December 2026')?.toISOString().slice(0, 10)).toBe('2026-12-05');
    expect(readDate('31/02/2026')).toBeNull();
  });
});

describe('a tracker forwarded with its approval email', () => {
  it('tells the sender once what was read, how much, and what is NOT recorded as paid, and asks each person only what they can answer', async () => {
    const w = await aTrackerWithItsApprovalEmail();
    expect(await w.work.readTheQuietBatches(w.afterQuiet())).toBe(1);
    const fatimaGot = w.sent.filter((m) => m.to === 'fatima@example.com');
    const ngoziGot = w.sent.filter((m) => m.to === 'ngozi@example.com');
    console.log(`WHAT THE SENDER READS, AND WHAT EACH PERSON IS ASKED\n\n${read(w.sent)}`);

    expect(fatimaGot).toHaveLength(1);
    const reply = fatimaGot[0];
    expect(reply.via).toBe('reply');
    expect(reply.subject).toBe('The payments tracker');
    /* Changed for the Dangote stress test (D5): every line of this sheet is marked Approved in the office's own sheet, so none is put to Fatima as "Did you approve it?". */
    expect(reply.text).toBe('I have read Payments tracker Nov.xlsx. It lists 8 payments, NGN 2,835,000 in all. One is paid, with proof. 3 payments are said to be paid, with no proof yet. I have asked Ngozi Eze about their own lines, once each. I have not approved or paid anything.');

    expect(ngoziGot).toHaveLength(1);
    expect(ngoziGot[0].subject).toBe('A question about a payment');
    expect(ngoziGot[0].text).toBe([
      'Ngozi, I read Payments tracker Nov.xlsx. I need your help with 4 payments.',
      '1. The tracker says the payment of NGN 1,250,000 to Kilele Logistics Ltd, reference INV-0042, due on 20 November 2026 was paid. I have not been sent a receipt or a bank confirmation, so I have not recorded it as paid. Can you send the proof, or tell me if it has not been paid?',
      '2. The payment to Abuja Printing Press, reference INV-0108, appears with two different amounts: NGN 480,000 (Payments tracker Nov.xlsx, sheet Payments, row 3) and NGN 520,000 (Payments tracker Nov.xlsx, sheet Payments, row 4). Which amount is right?',
      '3. The tracker says the payment of NGN 90,000 to Zenith Cleaners, reference INV-77, due on 12 November 2026 was paid, and it names "Bank advice 77" as the proof. I have not been sent that document, so I have not recorded it as paid. Can you send the proof, or tell me if it has not been paid?',
      '4. The payment of NGN 60,000 to Wuse Security Ltd, reference WS-5, is shown in two different ways: pending (Payments tracker Nov.xlsx, sheet Payments, row 8) and paid (Payments tracker Nov.xlsx, sheet Payments, row 9). I have not been sent a receipt or a bank confirmation, so I have not recorded it as paid. Which one is right, and if it was paid, can you send the proof?',
      'Please reply to this message. I have not approved or paid anything.',
    ].join('\n\n'));
    /* the approval is hers to answer, and is not put to Ngozi */
    expect(ngoziGot[0].text).not.toMatch(/approved, and I have not seen an approval/);
    /* nobody outside was written to */
    expect(w.sent.map((m) => m.to).filter((t) => !['fatima@example.com', 'ngozi@example.com'].includes(t))).toEqual([]);
  });

  it('never writes "paid" without proof: a sheet that says paid is paid only where a receipt or a finance record is in the record', async () => {
    const w = await aTrackerWithItsApprovalEmail();
    await w.work.readTheQuietBatches(w.afterQuiet());
    const now = await thePaymentsNow(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima' });
    const statedPaid = new Map<string, boolean>();
    for (const l of now.lines.filter((x) => x.statedStatus === 'paid')) statedPaid.set(l.payee, isPaidWithProof(l, now.linksOf(l.paymentKey)));
    expect([...statedPaid.entries()].sort()).toEqual([['Kilele Logistics Ltd', false], ['Savannah Hotels', true], ['Wuse Security Ltd', false], ['Zenith Cleaners', false]]);
    /* nothing in the schema or the lines says paid: the tracker's word is kept as the tracker's word */
    expect(w.t.paymentTrackerLine.rows.every((r: any) => !('paid' in r) && !('verifiedPaid' in r))).toBe(true);
    /* a spend request finance marked paid, with its evidence, is proof too */
    w.t.spendRequest.rows.push({ id: 'sr-zenith', organizationId: w.ORG, userId: 'u-amina', amount: '90000.00', what: 'Zenith Cleaners INV-77', status: 'approved', paidOn: new Date('2026-11-12'), evidenceGiven: ['receipt'], createdAt: w.now });
    const later = await thePaymentsNow(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima' });
    const zenith = later.lines.find((l) => l.payee === 'Zenith Cleaners')!;
    expect(isPaidWithProof(zenith, later.linksOf(zenith.paymentKey))).toBe(true);
  });

  it('asks each thing once: the same sheet again, or a second sheet with the same trouble, adds no question and no second line', async () => {
    const w = await aTrackerWithItsApprovalEmail();
    await w.work.readTheQuietBatches(w.afterQuiet());
    const askedBefore = w.sent.length;
    const linesBefore = w.t.paymentTrackerLine.rows.length;
    /* the same file forwarded again is a duplicate of the first copy, so it has no words to read */
    await w.forward({ from: 'principal', subject: 'Fwd: Payments tracker again', files: [{ fileName: 'Payments tracker Nov.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes: anXlsx(SHEET) }], at: new Date(w.now.getTime() + 3_600_000) });
    expect(await w.work.readTheQuietBatches(new Date(w.now.getTime() + 3_600_000 + 4 * 60_000))).toBe(0);
    expect(w.t.paymentTrackerLine.rows).toHaveLength(linesBefore);
    /* a re-saved copy (different bytes, same lines) is read, adds its own lines, and the questions already asked are not asked again */
    const resaved = SHEET.map((r, i) => (i === 1 ? [...r.slice(0, 8), ''] : r)).concat([['A note', '', '', '', '', '', '', '', '']]);
    await w.forward({ from: 'principal', subject: 'Fwd: Payments tracker v2', files: [{ fileName: 'Payments tracker Nov v2.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes: anXlsx(resaved) }], at: new Date(w.now.getTime() + 7_200_000) });
    await w.work.readTheQuietBatches(new Date(w.now.getTime() + 7_200_000 + 4 * 60_000));
    const after = w.sent.slice(askedBefore);
    expect(after.filter((m) => m.subject === 'A question about a payment')).toEqual([]);
    expect(after).toHaveLength(1);
    expect(after[0].text).toContain('I have asked about them before.');
    expect(after[0].text).not.toContain('Which amount is right?');
  });

  it('a coordinator forwards it: she is told what was read, the questions about proof go to the owner, and the approval goes to Fatima', async () => {
    const w = await aTrackerWithItsApprovalEmail('ngozi');
    await w.work.readTheQuietBatches(w.afterQuiet());
    const toNgozi = w.sent.filter((m) => m.to === 'ngozi@example.com');
    /* Ngozi sent it, so what she is asked is in the one reply she gets, with what was read */
    expect(toNgozi.map((m) => m.via)).toEqual(['reply']);
    expect(toNgozi[0].text).toMatch(/^I have read Payments tracker Nov.xlsx\. It lists 8 payments, NGN 2,835,000 in all\./);
    expect(toNgozi[0].text).toContain('4 questions are for you, below.');
    expect(toNgozi[0].text).toContain('Can you send the proof, or tell me if it has not been paid?');
    /* Changed for the Dangote stress test (D5): the sheet marks every line Approved, so Fatima is not asked to approve any of them. */
    expect(w.sent.filter((m) => m.to === 'fatima@example.com')).toEqual([]);
  });
});
