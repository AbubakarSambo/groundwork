import { whatGroundworkNoticed } from './the-review-noticed-from-the-record';
import { EmailService } from '../email/email.service';

/** B-025: Imani read "The outcome is that the person stays in the role." about herself, and a closing mail said "both parties retain access". */
describe('what a person reads about how a check-in about them ended', () => {
  it('says their name, never "the person"', async () => {
    const prisma: any = {
      user: { findUnique: async () => ({ firstName: 'Imani' }) },
      resolution: { findMany: async () => [{
        endState: 'KEEP', reason: 'She has settled in well', closedAt: new Date('2026-10-14T10:00:00Z'),
        ground: { label: 'Imani Hassan, first ninety days', scenario: 'NEW_HIRE', initiatorId: 'u-b', participants: [{ userId: 'u-b', user: { firstName: 'Baraka' } }] },
      }] },
    };
    const lines = await whatGroundworkNoticed(prisma, 'org', 'u-imani');
    expect(lines[0].says).toBe('Baraka made the decision at the end of “Imani Hassan, first ninety days” on 14 October 2026, and said why, “She has settled in well”. The outcome is that Imani stays in the role.');
    expect(lines[0].says).not.toMatch(/the person/);
  });
});

describe('the mail that says a check-in is closed', () => {
  it('says plainly that everything is kept and who can read it, without "parties"', async () => {
    const email = new EmailService({ get: () => undefined } as any, {} as any, {} as any);
    const sent: any[] = [];
    (email as any).sendEmail = jest.fn(async (m: any) => { sent.push(m); });
    await email.sendGroundClosed('imani@x.test', 'Imani Hassan, first ninety days', 'KEEP', 'http://x', 'NEW_HIRE');
    const words = sent[0].html.replace(/<[^>]+>/g, '');
    expect(words).toContain('Everything in the check-in is kept, and the people in it can still read it.');
    expect(words).not.toMatch(/parties|permanent/);
  });
});
