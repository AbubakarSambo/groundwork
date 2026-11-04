import { EmailService } from './email.service';
import { theFirstInsight } from '../engagement/the-first-insight';
import * as herRule from '../engagement/a-question-her-own-rule-answers';
import { withWhatHerRuleSays } from '../engagement/a-question-her-own-rule-answers';

/**
 * EMAILS TO THE LEAD ARE WRITTEN FOR THE LEAD (Hafsah, 19 October, point 5: "Never 'including your manager' or 'your account states' to
 * the person who runs it. Use the lead's confirmed definitions (for Drop Access, Won = a signed order or a payment) instead of asking her
 * whether something meets them.").
 *
 * Drop Access (test). What Grace Achieng, who runs "Sales team, Q4", read in her shared-picture emails in the messages test:
 *   Monday 12 October: "Here is a conversation worth having. The status of the Kilele Hotel sale is described differently. Confirm if
 *     the payment confirmation for the Kilele Hotel sale meets the team's definition of a completed deal." and "The people in this
 *     check-in, including your manager, can see what you say in it."
 *   Tuesday 13 October: "Your account states that no sales have been confirmed with proof of payment, while Kevin Omondi's account states
 *     that a 40-unit sale has been closed and paid for, and one more difference is still open."
 * Grace set on Monday "A sale counts only with proof of payment or a signed order.", and Kevin gave Kilele Hotel's M-Pesa code that day.
 */
const GRACE = 'grace@dropaccess.test';
const KEVIN = 'kevin@dropaccess.test';
const MONDAY = { whereThingsStand: { settled: ['a', 'b'], differences: ['The status of the Kilele Hotel sale is described differently', 'There is no shared, standard price for a water dispenser unit'], openWithReasons: [] }, theConversationWorthHaving: "The status of the Kilele Hotel sale is described differently. Confirm if the payment confirmation for the Kilele Hotel sale meets the team's definition of a completed deal." };
const TUESDAY = { whereThingsStand: { settled: ['a', 'b', 'c'], differences: ["Your account states that no sales have been confirmed with proof of payment, while Kevin Omondi's account states that a 40-unit sale has been closed and paid for", 'Another'], openWithReasons: [{ settledBy: 'Agree on what the definitive record of a sale is and who is responsible for updating it.' }] } };

function theMailer() {
  const mails: { to: string; text: string }[] = [];
  const mailer: any = Object.create(EmailService.prototype);
  mailer.prisma = new Proxy({
    ground: { findUnique: jest.fn(async () => ({ scenario: 'PULSE_CHECK', peersVisibleToEachOther: true, organization: { name: 'Drop Access (test)' }, initiatorId: 'u-grace', initiator: { email: GRACE }, participants: [{ id: 'gp-grace', userId: 'u-grace', partyType: 'INITIATOR' }] })) },
    groundObjective: { findMany: jest.fn(async () => [{ id: 'o-120', assumes: ['Each of the three reps sells about 40 units.', 'A sale counts only with proof of payment or a signed order.'] }]) },
    recordEntry: { findMany: jest.fn(async () => []) },
    workItem: { findMany: jest.fn(async () => []) },
  }, { get: (t: any, k: string) => t[k] ?? new Proxy({}, { get: (_x: any, m: string) => jest.fn(async () => (m === 'findMany' ? [] : null)) }) });
  mailer.sendEmail = async (m: any) => { mails.push({ to: m.to, text: String(m.html).replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ') }); };
  mailer.layout = (h: string) => h;
  return { mailer, read: (to: string) => mails.find((m) => m.to === to)?.text ?? '' };
}

describe('the shared-picture email Grace reads is written for her', () => {
  it('never "including your manager" to the person who runs it; the people in it still read the invitation\'s sentence', async () => {
    const { mailer, read } = theMailer();
    const lines = theFirstInsight(MONDAY, 'Sales team, Q4', { isTheLead: true })!.lines;
    await (EmailService.prototype as any).sendReportReady.call(mailer, GRACE, 'Sales team, Q4', 'http://x/r', undefined, 'g-sales', undefined, lines);
    await (EmailService.prototype as any).sendReportReady.call(mailer, KEVIN, 'Sales team, Q4', 'http://x/r', undefined, 'g-sales', undefined, theFirstInsight(MONDAY, 'Sales team, Q4', { isTheLead: false })!.lines);
    /* Changed 4 November 2026 (release batch 1, Hafsah: no privacy notes in messages): neither mail carries a note about who sees what. */
    expect(read(GRACE)).not.toContain('including your manager');
    expect(read(GRACE)).not.toContain('can see what you say');
    expect(read(KEVIN)).not.toContain('can see what you say');
  });

  it('her own rule answers what the email asked her: Kilele Hotel has a payment record, so it counts', async () => {
    const { mailer, read } = theMailer();
    mailer.prisma.workItem.findMany = jest.fn(async () => []);
    const lines = theFirstInsight(MONDAY, 'Sales team, Q4', { isTheLead: true })!.lines;
    const rule = { deals: [{ name: 'Kilele Hotel', paid: true, signed: false }, { name: 'Greenfield', paid: false, signed: true }] };
    const said = lines.map((l) => withWhatHerRuleSays(l, rule)).join(' ');
    expect(said).toContain('The status of the Kilele Hotel sale is described differently. Your rule is that a sale counts only with a payment or a signed order. There is a payment record for Kilele Hotel, so it counts.');
    expect(said).not.toContain("meets the team's definition");
    /* And where nothing is on record, it says so, never asks her. */
    expect(withWhatHerRuleSays("Confirm if Kilele Hotel's word meets the team's definition of a completed deal.", { deals: [{ name: 'Kilele Hotel', paid: false, signed: false }] }))
      .toBe('Your rule is that a sale counts only with a payment or a signed order. Nothing on record shows a payment or a signed order for Kilele Hotel yet, so it does not count yet.');
    void read; void mailer;
  });

  it('as the email reaches her, and only her: Kevin is not told her rule in her words', async () => {
    const spy = jest.spyOn(herRule, 'theLeadsRuleForASale').mockResolvedValue({ deals: [{ name: 'Kilele Hotel', paid: true, signed: false }] });
    try {
      const { mailer, read } = theMailer();
      await (EmailService.prototype as any).sendReportReady.call(mailer, GRACE, 'Sales team, Q4', 'http://x/r', undefined, 'g-sales', undefined, theFirstInsight(MONDAY, 'Sales team, Q4', { isTheLead: true })!.lines);
      await (EmailService.prototype as any).sendReportReady.call(mailer, KEVIN, 'Sales team, Q4', 'http://x/r', undefined, 'g-sales', undefined, theFirstInsight(MONDAY, 'Sales team, Q4', { isTheLead: false })!.lines);
      expect(read(GRACE)).toContain('There is a payment record for Kilele Hotel, so it counts.');
      expect(read(GRACE)).not.toContain("meets the team's definition");
      expect(read(KEVIN)).not.toContain('Your rule is');
    } finally {
      spy.mockRestore();
    }
  });

  it('what each person said, never "your account states"', () => {
    const lines = theFirstInsight(TUESDAY, 'Sales team, Q4', { isTheLead: true })!.lines;
    expect(lines[0]).toBe('You said that no sales have been confirmed with proof of payment, while Kevin Omondi said that a 40-unit sale has been closed and paid for, and one more difference is still open.');
    expect(lines.join(' ')).not.toMatch(/\baccount\b/);
  });
});
