import { WhatsAppForAnOrganisationService } from '../public-api/whatsapp-for-an-organisation.service';

/**
 * PILOTS, 13 OCTOBER 2026, E11. Brian finished on WhatsApp, read "Your check-in is complete and on record. Your report
 * follows in a moment." and no report followed: his number was on his sign-in, saved on People, and not on the roster.
 */
describe('the report follows to the number on the sign-in', () => {
  it('Brian’s report is sent to the number on his sign-in when the roster has none', async () => {
    const prisma: any = {
      checkIn: { findUnique: jest.fn(async () => ({ id: 'ci-b', sessionNumber: 2, status: 'COMPLETED', ground: { id: 'g', organizationId: 'org-1', label: 'Litigation team daily', overWhatsApp: null, simplerWords: false }, participant: { userId: 'u-brian', email: 'brian@muchemi.test' } })) },
      person: { findFirst: jest.fn(async () => null) },
      user: { findUnique: jest.fn(async () => ({ phoneNumber: '+254712345678' })) },
      whatsAppSend: { findFirst: jest.fn(async () => null) },
      organizationMembership: { findUnique: jest.fn(async () => ({ role: 'MEMBER' })) },
    };
    const svc = new WhatsAppForAnOrganisationService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    (svc as any).logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
    const sent: any[] = [];
    (svc as any).sendTheReport = jest.fn(async (...a: any[]) => { sent.push(a); });
    await svc.onCheckInCompleted({ checkInId: 'ci-b', groundId: 'g', participantId: 'p-brian', sessionNumber: 2 } as any);
    expect(sent[0][3]).toBe('+254712345678');
  });
});
