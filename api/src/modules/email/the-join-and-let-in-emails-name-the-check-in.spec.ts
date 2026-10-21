import { EntryService } from '../entry/entry.service';
import { WhoIsWaitingAtTheDoorService } from '../participants/who-is-waiting-at-the-door.service';
import { EmailService } from './email.service';

/**
 * THE JOIN CONFIRMATION NAMED NOTHING, AND "YOU CAN START YOUR CHECK-IN NOW" OPENED "HI," (messages test, 19 October, finding 16 in the
 * findings file, 15 in Hafsah's list).
 *
 * Drop Access (test), Monday 12 October. Amos entered his address on Sales team, Q4's join page and was sent "Your Groundwork check-in":
 * "Somebody shared a Groundwork check-in with you and this address was entered to join it." It named neither the check-in, nor the
 * organisation, nor who runs it. When Grace let him in he was sent "Hi, An admin at Drop Access (test) has approved you joining, so the
 * check-in you were invited to is open." with no name, though he had given it, and "invited", though he came by the link.
 */
function aMailer() {
  const mails: { to: string; subject: string; text: string }[] = [];
  const mailer: any = { sendEmail: async (m: any) => { mails.push({ to: m.to, subject: m.subject, text: m.html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() }); }, layout: (h: string) => h, frontendUrl: 'http://localhost:5196' };
  const email: any = new Proxy({}, { get: (_t, k: string) => (...a: any[]) => (EmailService.prototype as any)[k].apply(mailer, a) });
  return { mails, email };
}

describe('the join and let-in emails name the check-in', () => {
  it('Amos\'s join confirmation names Sales team, Q4, who runs it, and Drop Access (test)', async () => {
    const { mails, email } = aMailer();
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ id: 'g', status: 'ACTIVE', endState: null, scenario: 'OKR_ALIGNMENT', label: 'Sales team, Q4', organization: { name: 'Drop Access (test)' }, initiator: { firstName: 'Grace', lastName: 'Achieng' } })) },
      pendingJoin: { updateMany: jest.fn(async () => ({ count: 0 })), create: jest.fn(async () => ({})) },
    };
    const svc: any = Object.create(EntryService.prototype);
    svc.prisma = prisma; svc.email = email; svc.logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
    await svc.askToJoin({ joinToken: 'cb2452', email: 'amos@dropaccess.test', firstName: 'Amos', lastName: 'Kiprono' });
    await new Promise((r) => setImmediate(r));
    expect(mails[0].subject).toBe('Your check-in for "Sales team, Q4"');
    expect(mails[0].text).toContain('Hi Amos,');
    expect(mails[0].text).toContain('This address was entered on the join page of "Sales team, Q4", a check-in Grace Achieng runs at Drop Access (test).');
    expect(mails[0].text).not.toContain('Somebody shared');
  });

  it('"You can start your check-in now" greets Amos by name and names the check-in and who let him in', async () => {
    const { mails, email } = aMailer();
    const svc: any = Object.create(WhoIsWaitingAtTheDoorService.prototype);
    svc.logger = { warn: jest.fn(), log: jest.fn() };
    svc.email = email;
    svc.mine = jest.fn(async () => ({ id: 'r', groundId: 'g', userId: 'u-amos', email: 'amos@dropaccess.test', requestedByUserId: null, viaInvitation: false, organization: { name: 'Drop Access (test)' } }));
    svc.prisma = {
      $transaction: async (fn: any) => fn({ membershipRequest: { update: async () => ({}) }, user: { update: async () => ({}) }, organizationMembership: { upsert: async () => ({}) } }),
      user: { findUnique: jest.fn(async ({ where }: any) => (where.id === 'u-amos' ? { firstName: 'Amos', lastName: 'Kiprono' } : where.id === 'u-grace' ? { firstName: 'Grace', lastName: 'Achieng' } : null)) },
      ground: { findUnique: jest.fn(async () => ({ label: 'Sales team, Q4' })) },
    };
    await svc.approve('drop', 'r', 'u-grace');
    await new Promise((r) => setImmediate(r));
    const mail = mails.find((m) => m.subject === 'You can start your check-in now')!;
    expect(mail.text).toContain('Hi Amos,');
    expect(mail.text).toContain('Grace Achieng, an admin at Drop Access (test), has let you in, so your check-in for "Sales team, Q4" is open.');
    expect(mail.text).not.toContain('invited');
  });
});
