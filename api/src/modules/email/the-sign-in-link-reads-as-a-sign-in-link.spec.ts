import { EmailService } from './email.service';

/**
 * THE SIGN-IN LINK READS AS A SIGN-IN LINK (request 182 item 7, 7 October 2026).
 *
 * Somebody who already had a sign-in was sent "You or someone on your team just signed up for Groundwork using this email... Activate sign-in".
 * Sign-up sends the same mail to a new address and to an existing one, so that it says nothing about who has an account, so it has to read
 * correctly for both. Rendered, as the person who reads it.
 */
function theMail() {
  const svc = new EmailService({ get: () => undefined } as any, {} as any, { platformSetting: { findUnique: jest.fn(async () => null) } } as any);
  const sent: any[] = [];
  (svc as any).sendEmail = jest.fn(async (o: any) => { sent.push(o); return undefined; });
  return { svc, sent };
}
const text = (html: string) => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

describe('the mail with the sign-in link', () => {
  it('Amina, who already has a sign-in, reads a sign-in link and nothing about signing up', async () => {
    const { svc, sent } = theMail();
    await svc.sendMagicLinkEmail('amina@baridi.test', 'Amina', 'tok');
    const read = text(sent[0].html);
    expect(sent[0].subject).toBe('Your Groundwork sign-in link');
    expect(read).toContain('Hi Amina, Click the link below to sign in to Groundwork. No password is needed.');
    expect(read).toContain('Sign in');
    expect(read).not.toMatch(/signed up|just signed|Activate/i);
  });

  it('somebody new reads the same mail and is told the link also finishes setting up', async () => {
    const { svc, sent } = theMail();
    await svc.sendMagicLinkEmail('new@baridi.test', 'Ngozi', 'tok');
    expect(text(sent[0].html)).toContain('If this is your first time, the same link also finishes setting up your sign-in.');
  });
});
