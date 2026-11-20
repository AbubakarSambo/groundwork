import { aWorldForOnboarding, addFatima } from './a-world-for-onboarding';
import { addAnExecutive } from './onboard-an-executive';
import { releaseTheIntroductionHeldForANumber, retryTheHeldIntroductions } from './the-introduction-delivery';

/**
 * FATIMA ROUND 2, D2: the introduction on WhatsApp was held, and the held reason says it goes "after the person writes to this number first". She wrote first,
 * and it did not go: it went on the next sweep, a day later on the test clock, after a long conversation. Now it goes when she writes, once.
 */
const normalise = (p: string) => p.replace(/[^\d+]/g, '');
const NOW = new Date('2026-11-11T10:00:00Z');

describe('a held WhatsApp introduction', () => {
  it('goes at once when she writes to the number first, and only once', async () => {
    const w = aWorldForOnboarding(NOW);
    const added = await addAnExecutive(w.prisma as any, w.ports, addFatima(w));
    expect((added as any).deliveries.find((i: any) => i.channel === 'whatsapp').state).toBe('held');
    expect(w.sent.filter((s) => s.channel === 'whatsapp')).toHaveLength(0);

    /* Within the hour: the sweep would still wait. She has written, so the window is open now. */
    w.settings.whatsapp = 'accept';
    const soon = new Date(NOW.getTime() + 5 * 60_000);
    expect(await retryTheHeldIntroductions(w.prisma as any, w.ports, soon)).toBe(0);
    expect(await releaseTheIntroductionHeldForANumber(w.prisma as any, w.ports, { phone: normalise('+2348031112222'), now: soon, normalise })).toBe(1);
    const whatsapps = w.sent.filter((s) => s.channel === 'whatsapp');
    expect(whatsapps).toHaveLength(1);
    expect(whatsapps[0].text).toContain("Hello Fatima, I’m your Groundwork assistant");

    /* A second message from her sends nothing more. */
    expect(await releaseTheIntroductionHeldForANumber(w.prisma as any, w.ports, { phone: normalise('+2348031112222'), now: soon, normalise })).toBe(0);
    expect(w.sent.filter((s) => s.channel === 'whatsapp')).toHaveLength(1);
  });

  it('is not sent to somebody else who writes, or when the gate still refuses', async () => {
    const w = aWorldForOnboarding(NOW);
    await addAnExecutive(w.prisma as any, w.ports, addFatima(w));
    w.settings.whatsapp = 'accept';
    expect(await releaseTheIntroductionHeldForANumber(w.prisma as any, w.ports, { phone: normalise('+2348039999999'), now: NOW, normalise })).toBe(0);
    expect(w.sent.filter((s) => s.channel === 'whatsapp')).toHaveLength(0);
    w.settings.whatsapp = 'refuse';
    expect(await releaseTheIntroductionHeldForANumber(w.prisma as any, w.ports, { phone: normalise('+2348031112222'), now: NOW, normalise })).toBe(0);
    const row = w.t.introductionDelivery.rows.find((r: any) => r.channel === 'whatsapp');
    expect(row.state).toBe('held');
  });
});
