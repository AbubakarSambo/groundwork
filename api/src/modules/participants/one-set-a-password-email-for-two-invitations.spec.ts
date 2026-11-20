import { ParticipantsService } from './participants.service';
import { EmailService } from '../email/email.service';

/**
 * A SECOND "SET A PASSWORD FOR GROUNDWORK", MINUTES AFTER THE FIRST (messages test, 19 October, finding 17 in the findings file, 16 in
 * Hafsah's list).
 *
 * Muchemi & Co. (test), Monday 12 October. Brian opened his Fee notes invitation, which made his sign-in and sent "Set a password for
 * Groundwork". Minutes later, signed in, he opened his Litigation team daily invitation, and was sent the same email again, each saying
 * "Setting a password means you can sign in without Google." though nobody there used Google. One email, while its link still works, and
 * words that are true for somebody who has never used Google.
 */
function brianAccepts(o: { aLiveLinkWasSent: boolean }) {
  const mails: { subject: string; text: string }[] = [];
  const mailer: any = { sendEmail: async (m: any) => { mails.push({ subject: m.subject, text: m.html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() }); }, layout: (h: string) => h, frontendUrl: 'http://localhost:5197' };
  const participant = { id: 'e9e2d42c-c918-491e-8b13-73b212ec6f2c', groundId: 'lit', email: 'brian@muchemi.test', userId: null, inviteToken: 'tok-lit' };
  const brian = { id: 'u-brian', email: 'brian@muchemi.test', firstName: 'Brian', lastName: 'Otieno', role: 'MEMBER', organizationId: 'org-muchemi', passwordHash: null, isEmailVerified: true, isActive: true };
  const prisma: any = {
    groundParticipant: { findUnique: jest.fn(async () => participant), findFirst: jest.fn(async () => participant), update: jest.fn(async (a: any) => a) },
    ground: { findUnique: jest.fn(async () => ({ id: 'lit', organizationId: 'org-muchemi', initiatorId: 'u-wanjiru' })) },
    organizationMembership: { findUnique: jest.fn(async () => ({ role: 'MEMBER' })), upsert: jest.fn(async () => ({})) },
    membershipRequest: { upsert: jest.fn(async () => ({})) },
    user: {
      findUnique: jest.fn(async ({ where }: any) => (where?.id === 'u-wanjiru' ? { role: 'ADMIN', organizationId: 'org-muchemi' } : where?.id === 'u-brian' || where?.email === 'brian@muchemi.test' ? brian : null)),
      update: jest.fn(async () => brian),
      create: jest.fn(async () => brian),
    },
    checkIn: { findFirst: jest.fn(async () => ({ id: 'ci-lit-1' })) },
    emailVerificationToken: {
      create: jest.fn(async () => ({})),
      findFirst: jest.fn(async ({ where }: any) => (o.aLiveLinkWasSent && where?.type === 'PASSWORD_SETUP' ? { id: 'tok-fees', expiresAt: new Date(Date.now() + 3600_000) } : null)),
    },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };
  const email: any = new Proxy({}, { get: (_t, k: string) => (k === 'sendMagicLinkEmail' ? async () => undefined : (...a: any[]) => (EmailService.prototype as any)[k].apply(mailer, a)) });
  const svc = new ParticipantsService(prisma, { sign: () => 'jwt' } as any, email, { userShapeFor: jest.fn(async (id: string) => ({ id })) } as any);
  return { run: () => svc.accept('tok-lit', undefined, 'u-brian'), mails, prisma };
}

describe('one "Set a password" email for two invitations', () => {
  it('no second one while the first link still works', async () => {
    const w = brianAccepts({ aLiveLinkWasSent: true });
    await w.run().catch(() => undefined);
    await new Promise((r) => setImmediate(r));
    expect(w.mails.filter((m) => m.subject === 'Set a password for Groundwork')).toHaveLength(0);
  });

  /* UPDATED 19 NOVEMBER (rest of the list): joining no longer sends "Set a password" at all (batch 2, group 6, staging check S14: a person signs back in with an emailed link and sets a password from Settings). The old test pinned the first mail's words after joining; the words are now pinned on the mail itself, and joining is pinned to send none. */
  it('joining sends no "Set a password" email, with or without an earlier link', async () => {
    const w = brianAccepts({ aLiveLinkWasSent: false });
    await w.run().catch(() => undefined);
    await new Promise((r) => setImmediate(r));
    expect(w.mails.filter((m) => m.subject === 'Set a password for Groundwork')).toHaveLength(0);
  });

  it('the mail itself, where somebody asks for it, says what a password is for and nothing about Google', async () => {
    const sent: { subject: string; text: string }[] = [];
    const mailer: any = { sendEmail: async (m: any) => { sent.push({ subject: m.subject, text: m.html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() }); }, layout: (h: string) => h, frontendUrl: 'http://localhost:5197' };
    await (EmailService.prototype as any).sendAddPasswordEmail.call(mailer, 'brian@muchemi.test', 'Brian', 'tok');
    expect(sent[0].subject).toBe('Set a password for Groundwork');
    expect(sent[0].text).not.toContain('Google');
    expect(sent[0].text).toContain('Setting a password means you can come back and sign in with this email address and your password.');
  });
});
