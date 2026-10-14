import { theyAreConnectedOnWhatsApp } from './connect-whatsapp';

/**
 * HAFSAH, 14 OCTOBER: EACH OPENING MESSAGE GOES ON ONE CHANNEL ONLY. WhatsApp if the person has joined there (written to
 * Groundwork from their number, with WhatsApp on for the organisation), otherwise email. A number saved is not joining.
 */
function prismaFor(o: { written: boolean; whatsappOn: boolean; phone?: string | null }) {
  return {
    organization: { findUnique: jest.fn(async () => ({ whatsappAddOnOn: o.whatsappOn, whatsappFreeUntil: null })) },
    person: { findFirst: jest.fn(async () => ({ phone: o.phone === undefined ? '+254722000203' : o.phone, whatsappLastInboundAt: null })) },
    user: { findUnique: jest.fn(async () => ({ phoneNumber: null })) },
    whatsAppInboundMessage: { findFirst: jest.fn(async () => (o.written ? { messageId: 'in:theirs:254722000203:1' } : null)) },
  };
}
const MERCY = { organizationId: 'org-kilima', userId: 'u-mercy', email: 'mercy@kilima.test' };

describe('one channel for an opening', () => {
  it('Mercy, who writes to Groundwork on WhatsApp, is told there', async () => {
    expect(await theyAreConnectedOnWhatsApp(prismaFor({ written: true, whatsappOn: true }), MERCY)).toBe(true);
  });
  it('a number saved but never used, or WhatsApp off, means email', async () => {
    expect(await theyAreConnectedOnWhatsApp(prismaFor({ written: false, whatsappOn: true }), MERCY)).toBe(false);
    expect(await theyAreConnectedOnWhatsApp(prismaFor({ written: true, whatsappOn: false }), MERCY)).toBe(false);
    expect(await theyAreConnectedOnWhatsApp(prismaFor({ written: false, whatsappOn: true, phone: null }), MERCY)).toBe(false);
  });
});
