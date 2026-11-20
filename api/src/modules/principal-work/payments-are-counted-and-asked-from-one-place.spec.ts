import { aWorldForPrincipalWork, anXlsx, read, DAY } from './a-world-for-principal-work';
import { buildTheRegister } from '../outstanding/the-outstanding-register';
import { whatIsOutstandingSaid, whatNeedsTheDecisionSaid } from '../outstanding/the-register-in-plain-words';
import { thePaymentCounts, thePaymentsNow } from './the-payments-work';
import { theWeek } from './the-outputs';

/**
 * HER PAYMENTS ARE COUNTED AND ASKED ABOUT FROM ONE PLACE (Fatima round 2, C2). Round 2 said "5 payments ... 9 things do not agree" in one message, "2 payments ...
 * 5 things" in another, and "6 and 6" in a third, each counting its own sheet; and "Nothing needs your decision" while "Did you approve it?" waited in her mail,
 * and "nothing outstanding" with five open payment questions. Now one count (thePaymentCounts) and one list (the register, which reads the payments flow) feed
 * every message. Every text a person reads is printed.
 */
const HEAD = ['Payee', 'Reference', 'Amount', 'Currency', 'Owner', 'Due date', 'Approval', 'Status', 'Evidence'];
const FIRST: (string | number)[][] = [
  HEAD,
  ['Sahel Print', 'SP-1', '4,850,000', 'NGN', 'Ngozi Eze', '2026-11-20', 'Pending', 'Pending', ''],
  ['Northgate Vehicles', 'NV-2', '4,580,000', 'NGN', 'Ngozi Eze', '2026-11-18', 'Approved', 'Paid', ''],
  ['Capital Events', 'CE-31', '900,000', 'NGN', 'Ngozi Eze', '2026-11-15', 'Approved', 'Paid', ''],
];
const SECOND: (string | number)[][] = [
  HEAD,
  ['Northgate Vehicles', 'NV-2', '4,580,000', 'NGN', 'Ngozi Eze', '2026-11-18', 'Approved', 'Paid', ''],
  ['Kano Hotel', 'KH-9', '300,000', 'NGN', 'Ngozi Eze', '2026-11-25', 'Approved', 'Pending', ''],
];
const sheet = (name: string, rows: (string | number)[][]) => ({ fileName: name, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes: anXlsx(rows) });
const countOf = (t: string, re: RegExp, one: RegExp): number => { const m = re.exec(t); return m ? Number(m[1]) : one.test(t) ? 1 : 0; };
const numbers = (t: string) => ({ payments: countOf(t, /(\d+) payments are on the tracker/, /One payment is on the tracker/), things: countOf(t, /(\d+) things do not agree/, /One thing does not agree/) });

describe('one count of her payments in every message, and one list of what needs her', () => {
  async function twoSheets() {
    const w = aWorldForPrincipalWork();
    await w.forward({ from: 'ngozi', subject: 'Fwd: Payments tracker', files: [sheet('first.xlsx', FIRST)] });
    await w.work.readTheQuietBatches(w.afterQuiet());
    const later = new Date(w.now.getTime() + 1 * DAY);
    await w.forward({ from: 'ngozi', subject: 'Fwd: Another tracker', files: [sheet('second.xlsx', SECOND)], at: later });
    await w.work.readTheQuietBatches(w.afterQuiet(later));
    return { w, later };
  }

  it('the message about the second sheet, the weekly update and the record say the same number of payments and the same number that do not agree', async () => {
    const { w, later } = await twoSheets();
    const record = thePaymentCounts(await thePaymentsNow(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima' }));
    const toHer = w.sent.filter((m) => m.to === 'ngozi@example.com' && /payments tracker/i.test(m.subject ?? '')).map((m) => m.text);
    console.log(`WHAT THE SENDER READS\n\n${toHer.join('\n\n----\n\n')}`);
    const week = (await theWeek(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', first: 'Fatima', forADelegate: false, now: later })).full;
    console.log(`THE WEEKLY UPDATE\n\n${week.split('\n\n').filter((p) => /^Payments/.test(p)).join('\n')}`);
    const weekly = numbers(week);
    expect(record.payments).toBe(4);
    expect(weekly).toEqual({ payments: record.payments, things: record.discrepancies });
    /* The second sheet's message says the whole count, not only its own sheet's. */
    const second = toHer[toHer.length - 1];
    expect(second).toMatch(new RegExp(`With what you sent before, I now hold ${record.payments} payments in all\\.`));
    /* Round 6 took the count of disagreements out of the message (the questions below it are the disagreements), so only the count of payments is held to the record here. */
  });

  it('"What needs my decision?" lists the payment question put to her, and says nothing is waiting only when the payments flow has nothing for her', async () => {
    const { w, later } = await twoSheets();
    const register = await buildTheRegister(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: later, forADelegate: false });
    const decision = whatNeedsTheDecisionSaid(register, { forName: null, now: later });
    console.log(`"WHAT NEEDS MY DECISION?"\n${decision}`);
    expect(decision).not.toMatch(/^Nothing needs your decision/);
    expect(decision).toMatch(/Did you approve the payment of NGN 4,580,000 to Northgate Vehicles, reference NV-2\?/);
    /* Every approval the flow asked her about is on the list, and nothing else is: the two are one list. */
    const asked = (await thePaymentsNow(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima' })).discrepancies.filter((d) => d.kind === 'approval missing').length;
    expect(register.rows.filter((r) => r.status === 'awaiting decision' && /payments tracker/.test(r.sources[0]?.from)).length).toBe(asked);
    expect(asked).toBeGreaterThan(0);
  });

  it('"What is outstanding?" does not say there is nothing while payment questions are open, and says what each is', async () => {
    const { w, later } = await twoSheets();
    const register = await buildTheRegister(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: later, forADelegate: false });
    const said = whatIsOutstandingSaid(register, { forName: null, now: later });
    console.log(`"WHAT IS OUTSTANDING?"\n${said}`);
    expect(said).not.toMatch(/nothing outstanding/i);
    expect(said).toMatch(/Proof that the payment of NGN 4,580,000 to Northgate Vehicles, reference NV-2 was paid/);
  });
});
