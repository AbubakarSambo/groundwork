import { EmailService } from './email.service';

/** User journeys F-26: "Kito Foods added you to their Groundwork workspace." */
describe('the invitation to join an organisation, as the person reads it', () => {
  it('says the organisation has added them to Groundwork, and nothing about a workspace', async () => {
    const s = Object.create(EmailService.prototype) as any;
    s.frontendUrl = 'https://app.test';
    s.layout = (x: string) => x;
    let sent: any;
    s.sendEmail = jest.fn(async (m: any) => { sent = m; });
    await s.sendUserInvite('amani@kito.test', 'Amani', 'tok', 'Kito Foods');
    const read = sent.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    expect(read).toContain('Kito Foods has added you to Groundwork.');
    expect(read).not.toMatch(/workspace/i);
  });
});
