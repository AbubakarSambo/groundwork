import { tellTheAdminsSomebodyIsWaiting } from './somebody-is-waiting-at-the-door';
import { EmailService } from '../email/email.service';

/**
 * "AMOS KIPRONO WAS INVITED TO CHECK IN ON SALES TEAM, Q4 BY GRACE ACHIENG" (messages test, 19 October, finding 7).
 *
 * Drop Access (test), Monday 12 October 09:15. Amos asked to join Sales team, Q4 through its join link; nobody invited him. Grace, the
 * admin who reads the mail, is also the person it named, in full, as the one who invited him. The same at Muchemi & Co. (test) for David
 * Mwangi and Wanjiru. The mail now says how they came, and the reader is "you".
 */
async function theMail(o: { cameThroughTheLink: boolean; admins: { email: string; firstName: string }[] }) {
  const mails: { to: string; subject: string; text: string }[] = [];
  const mailer: any = { sendEmail: async (m: any) => { mails.push({ to: m.to, subject: m.subject, text: m.html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() }); }, layout: (h: string) => h, frontendUrl: 'http://localhost:5196' };
  const email: any = { sendSomebodyIsWaiting: (...a: any[]) => (EmailService.prototype as any).sendSomebodyIsWaiting.apply(mailer, a) };
  const prisma: any = {
    user: {
      findMany: jest.fn(async () => o.admins),
      findUnique: jest.fn(async ({ where }: any) => (where.id === 'u-grace'
        ? { firstName: 'Grace', lastName: 'Achieng', email: 'grace@dropaccess.test' }
        : where.email === 'amos@dropaccess.test' ? { firstName: 'Amos', lastName: 'Kiprono' } : null)),
    },
    ground: { findUnique: jest.fn(async () => ({ label: 'Sales team, Q4' })) },
    organization: { findUnique: jest.fn(async () => ({ name: 'Drop Access (test)' })) },
  };
  await tellTheAdminsSomebodyIsWaiting({ prisma, email, logger: { warn: jest.fn() } as any }, 'drop', 'g', 'u-grace', 'amos@dropaccess.test', { cameThroughTheLink: o.cameThroughTheLink });
  return mails;
}

describe('the admins are told how somebody came to be waiting', () => {
  it('Grace reads that Amos asked through the check-in\'s join link, and never that she invited him', async () => {
    const [mail] = await theMail({ cameThroughTheLink: true, admins: [{ email: 'grace@dropaccess.test', firstName: 'Grace' }] });
    expect(mail.subject).toBe('Amos Kiprono is waiting to be let into Drop Access (test).');
    expect(mail.text).toContain('Amos Kiprono asked to join Sales team, Q4 through its join link, and they are not in your organisation yet.');
    expect(mail.text).not.toContain('invited');
    expect(mail.text).not.toContain('by Grace Achieng');
  });

  it('an invitation Grace sent herself reads "You invited", never her own name', async () => {
    const [mail] = await theMail({ cameThroughTheLink: false, admins: [{ email: 'grace@dropaccess.test', firstName: 'Grace' }] });
    expect(mail.text).toContain('You invited Amos Kiprono to check in on Sales team, Q4, and they are not in your organisation yet.');
  });

  it('another admin still reads who invited them, by name', async () => {
    const mails = await theMail({ cameThroughTheLink: false, admins: [{ email: 'peter@dropaccess.test', firstName: 'Peter' }] });
    expect(mails[0].text).toContain('Amos Kiprono was invited to check in on Sales team, Q4 by Grace Achieng, and they are not in your organisation yet.');
  });
});
