import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';

/**
 * Hafsah, 12 October 2026: "Someone already in another organisation gets an email when added to a new one."
 * Amina already uses Groundwork at her own company. Kito Foods adds her. She used to get a bare sign-in link
 * that said nothing about who had added her. Now she reads who, and that nothing of hers elsewhere changes.
 * A plain email, caught here; no WhatsApp message.
 */
function auth(existing: any, membership: any = null) {
  const prisma: any = {
    user: { findUnique: jest.fn(async () => existing) },
    organization: { findUnique: jest.fn(async () => ({ name: 'Kito Foods' })) },
    organizationMembership: { findUnique: jest.fn(async () => membership), create: jest.fn(async () => ({})) },
    emailVerificationToken: { updateMany: jest.fn(async () => ({})), create: jest.fn(async () => ({})) },
  };
  const emailService: any = { sendMagicLinkEmail: jest.fn(async () => undefined), sendAddedToAnotherOrganisation: jest.fn(async () => undefined) };
  const service = new AuthService(prisma, {} as any, {} as any, emailService, {} as any, { canInviteMember: async () => ({ allowed: true }) } as any, { emit: () => undefined } as any);
  return { service, emailService };
}

describe('somebody from another organisation, added to a new one', () => {
  it('is sent the email that says who added them, not a bare sign-in link', async () => {
    const { service, emailService } = auth({ id: 'u-amina', firstName: 'Amina', organizationId: 'her-own-org' });
    await service.teamInvite('Kito Foods', 'amina@elsewhere.test', 'org-kito');
    expect(emailService.sendAddedToAnotherOrganisation).toHaveBeenCalledWith('amina@elsewhere.test', 'Amina', expect.any(String), 'Kito Foods');
    expect(emailService.sendMagicLinkEmail).not.toHaveBeenCalled();
  });

  it('somebody already a member there is only sent a sign-in link, as before', async () => {
    const { service, emailService } = auth({ id: 'u-amina', firstName: 'Amina', organizationId: 'her-own-org' }, { id: 'm1' });
    await service.teamInvite('Kito Foods', 'amina@elsewhere.test', 'org-kito');
    expect(emailService.sendAddedToAnotherOrganisation).not.toHaveBeenCalled();
    expect(emailService.sendMagicLinkEmail).toHaveBeenCalled();
  });

  it('what she reads', async () => {
    const mail: any = Object.create(EmailService.prototype);
    mail.frontendUrl = 'https://myground.work';
    mail.layout = (h: string) => h;
    mail.sendEmail = jest.fn(async () => undefined);
    await mail.sendAddedToAnotherOrganisation('amina@elsewhere.test', 'Amina', 'tok', 'Kito Foods');
    const sent = mail.sendEmail.mock.calls[0][0];
    const text = String(sent.html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(`AMINA READS: ${sent.subject} / ${text}`);
    expect(sent.subject).toBe("You've been added to Kito Foods on Groundwork");
    expect(text).toContain('Kito Foods has added you on Groundwork. You already use Groundwork, and everything you have there stays as it is.');
  });
});
