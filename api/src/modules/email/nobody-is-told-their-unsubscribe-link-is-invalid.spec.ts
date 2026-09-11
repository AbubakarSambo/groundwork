import { RoundDigestService, NOT_A_LINK_WE_KNOW } from './round-digest.service';

/** Somebody trying to make the mail stop must never be told their link is broken; the next click is the spam button. */
describe('an unknown unsubscribe token', () => {
  it('is answered as already stopped, with a kind sentence, not a 404', async () => {
    const prisma: any = { emailPreference: { findUnique: jest.fn(async () => null), update: jest.fn() } };
    const svc = Object.create(RoundDigestService.prototype) as RoundDigestService;
    (svc as any).prisma = prisma;
    await expect(svc.unsubscribe('nobody-knows-this')).resolves.toEqual({ ok: true, already: true, says: NOT_A_LINK_WE_KNOW });
    expect(prisma.emailPreference.update).not.toHaveBeenCalled();
  });
  it('and a known one stops the mail', async () => {
    const prisma: any = { emailPreference: { findUnique: jest.fn(async () => ({ id: 'p1', unsubscribedAt: null })), update: jest.fn(async () => ({})) } };
    const svc = Object.create(RoundDigestService.prototype) as RoundDigestService;
    (svc as any).prisma = prisma;
    await expect(svc.unsubscribe('t')).resolves.toEqual({ ok: true, already: false });
    expect(prisma.emailPreference.update).toHaveBeenCalled();
  });
});
