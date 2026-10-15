import { remindThemToCarryOn, warnTheirPhone, tellThemTheClockClosedIt } from './a-check-in-left-halfway';

/**
 * AN EXISTING CLIENT'S RUNNING CHECK-IN IS NEVER WRITTEN TO ABOUT BEING LEFT HALFWAY (decision 88).
 * Nothing reaches a phone for a session that began before decision 107 was made.
 */
const HOUR = 3_600_000;
const NOON_LAGOS = new Date('2026-10-06T11:00:00Z');
const lastAsked = (hoursAgo: number) => ({ role: 'AI', createdAt: new Date(NOON_LAGOS.getTime() - hoursAgo * HOUR) });

describe('a session that began before this was decided is never written to', () => {
  it('Amani\'s old session, even if she wrote on WhatsApp after it began, gets nothing', async () => {
    const sent: any[] = [];
    const before = new Date('2026-10-01T09:00:00Z');
    const prisma: any = {
      checkIn: { findUnique: jest.fn(async () => ({ startedAt: before, createdAt: before, ground: { organizationId: 'org-1', label: 'Sales team, Q4', overWhatsApp: null }, participant: { email: 'amani@kito.test', user: { firstName: 'Amani', phoneNumber: null, deletedAt: null } } })) },
      platformSetting: { findUnique: jest.fn(async () => ({ value: { at: '2026-09-01T00:00:00Z' } })) },
      person: { findFirst: jest.fn(async () => ({ phone: '+254700000001' })) },
      whatsAppSend: { findFirst: jest.fn(async () => ({ id: 'w' })) },
    };
    const whatsapp = { sendFor: jest.fn(async (_o: string, to: string, text: string) => { sent.push({ to, text }); return { sent: true }; }) };
    expect(await remindThemToCarryOn(prisma, whatsapp, { id: 'ci-1' }, lastAsked(4), NOON_LAGOS)).toBe(false);
    expect(await warnTheirPhone(prisma, whatsapp, 'ci-1')).toBe(false);
    expect(await tellThemTheClockClosedIt(prisma, whatsapp, 'ci-1')).toBe(false);
    expect(sent).toEqual([]);
  });
});
