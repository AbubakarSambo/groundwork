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

  /** B-196: plain words, and a true account of who reads what: the people in the check-in and the organisation's admins. */
  it('says in plain words who can read what they say, admins included, and that their questions to Ask stay private', async () => {
    const s = Object.create(EmailService.prototype) as any;
    s.frontendUrl = 'https://app.test'; s.layout = (x: string) => x;
    let sent: any;
    s.sendEmail = jest.fn(async (m: any) => { sent = m; });
    await s.sendUserInvite('faith@msingi.test', 'Faith', 'tok', 'Msingi Foods');
    const read = sent.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    expect(read).toContain("The people in each check-in you join, and your organisation's admins, can read what you say in it.");
    expect(read).toContain('Your questions to Ask Msingi Foods stay private.');
    expect(read).not.toMatch(/structured|surfaces|alignment/i);
  });
});
