import { WhatsAppForAnOrganisationService } from './whatsapp-for-an-organisation.service';

/* Polish round 1 (26 October 2026): Brian joined from his phone with no name on his sign-in, and his request to spend was dropped from the queue. */
describe('a person who joins from the phone keeps the name the organisation gave them', () => {
  it('Brian Otieno, from the staff list, goes on his sign-in, and a name already there is never written over', async () => {
    const updates: any[] = [];
    const prisma: any = {
      person: { findFirst: async () => ({ id: 'p-brian', email: 'brian@muchemi.test', givenName: 'Brian', familyName: 'Otieno', displayName: 'Brian Otieno' }), updateMany: async () => ({ count: 1 }) },
      user: { findUnique: async () => null, findFirst: async () => ({ id: 'u-brian' }), updateMany: async (a: any) => { updates.push(a); return { count: 1 }; } },
      groundParticipant: { findFirst: async () => ({ inviteToken: 'tok' }) },
    };
    const participants: any = { accept: jest.fn(async () => ({})) };
    const svc = new WhatsAppForAnOrganisationService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, participants);
    expect(await (svc as any).joinFromTheNumberTheCompanyAdded('org-mu', 'p-brian')).toBe('u-brian');
    expect(updates).toEqual([{ where: { id: 'u-brian', firstName: '' }, data: { firstName: 'Brian', lastName: 'Otieno' } }]);
  });
});
