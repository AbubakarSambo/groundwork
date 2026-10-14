import { EmailService, aReceiptLine } from '../email/email.service';

/**
 * THE BILLING EMAILS, AS GRACE (BARIDI'S ADMIN) READS THEM (fix list item 6).
 *
 * The cancellation email told everybody "Your team keeps ten free check-ins" and to "buy sessions", which is true of nobody
 * once the free month replaced the free plan. The receipt said only an amount. Read as the email Grace gets.
 */
function anEmailService() {
  const sent: { subject: string; html: string }[] = [];
  const email = new EmailService({ get: () => undefined } as any, {} as any, {} as any);
  jest.spyOn(email as any, 'sendEmail').mockImplementation(async (msg: any) => { sent.push({ subject: msg.subject, html: msg.html }); return undefined; });
  return { email, sent };
}
const words = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('the cancellation email', () => {
  it('to a team that began in the free month: check-ins pause until it subscribes again, and nothing about free check-ins or sessions', async () => {
    const { email, sent } = anEmailService();
    await email.sendSubscriptionCancelled('grace@baridi.test', 'SMALL_TEAM', null);
    const t = words(sent[0].html);
    expect(t).toContain('Check-ins pause until you subscribe again. Nothing is deleted, and every record stays readable.');
    expect(t).toContain('If you want to carry on as a team, you can subscribe again at any time.');
    expect(t).not.toMatch(/ten free check-ins|buy sessions/);
  });

  it('to a team that had the free plan before: back on it, with its own numbers', async () => {
    const { email, sent } = anEmailService();
    await email.sendSubscriptionCancelled('grace@baridi.test', 'STARTER', { checkIns: 10, people: 5 });
    expect(words(sent[0].html)).toContain('Your team is back on the free plan, which covers up to 10 check-ins and 5 people.');
  });
});

describe('the receipt', () => {
  it('says what the payment was for: the plan, the extra seats and the WhatsApp people', async () => {
    const lines = [
      aReceiptLine({ amount: 9000, quantity: 1, price: { metadata: { plan: 'SMALL_TEAM' } } }, 'Small Team'),
      aReceiptLine({ amount: 1500, quantity: 3, price: { metadata: { kind: 'extra-seat' } } }, 'Small Team'),
      aReceiptLine({ amount: 3600, quantity: 9, price: { metadata: { kind: 'whatsapp-per-person' } } }, 'Small Team'),
    ];
    expect(lines).toEqual(['The Small Team plan, 90.00 USD.', '3 extra seats, 15.00 USD.', 'WhatsApp for 9 people, 36.00 USD.']);
    const { email, sent } = anEmailService();
    await email.sendSubscriptionRenewal('grace@baridi.test', 'SMALL_TEAM', 14100, new Date('2026-11-01T00:00:00Z'), lines);
    const t = words(sent[0].html);
    expect(t).toContain('141.00 USD has been charged to the card on file.');
    expect(t).toContain('This payment was for: The Small Team plan, 90.00 USD. 3 extra seats, 15.00 USD. WhatsApp for 9 people, 36.00 USD.');
  });
});
