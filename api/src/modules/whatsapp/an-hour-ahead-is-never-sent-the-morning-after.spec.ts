import { WhatsAppService, THE_HOUR_IT_WAS_ABOUT_HAS_PASSED } from './whatsapp.service';

/**
 * "OPENS IN AN HOUR" IS NEVER SENT THE MORNING AFTER (engine test, Muchemi & Co (test), Sunday 18 October).
 *
 * At 9pm Aisha, Njeri and Brian were each to read "Hi Aisha, your check-in for Fee notes opens in an hour, at 12:00 am East Africa
 * Time. Reply here when it opens and we'll begin." It was quiet hours, so it was held until seven, and then it went out beside "Hi
 * Aisha, your check-in for Fee notes is open." Read here as Aisha's phone would receive the held messages in the morning.
 */
function aService() {
  const written: any[] = [];
  const config: any = { get: () => undefined };
  const prisma: any = { whatsAppSend: { create: jest.fn(async (q: any) => { written.push(q.data); return {}; }) } };
  const wa: any = new WhatsAppService(config, prisma);
  const sent: string[] = [];
  wa.sendFor = jest.fn(async (_org: string, _to: string, text: string) => { sent.push(text); return { sent: true }; });
  wa.writeItDown = jest.fn(async (_org: any, _to: any, result: any, context: any) => { written.push({ result, kind: context?.kind }); });
  return { wa, sent, written };
}

describe("the messages held for the night, when Aisha's morning comes", () => {
  it('"opens in an hour, at 12:00 am" is not sent at seven, and is written down as not sent with the reason', async () => {
    const s = aService();
    const r = await s.wa.sendHeldForTheNight({ organizationId: 'org-muchemi', phone: '+254700400003', text: "Hi Aisha, your check-in for Fee notes opens in an hour, at 12:00 am East Africa Time. Reply here when it opens and we'll begin.", context: { kind: 'opens-soon', checkInId: 'c-aisha' } });
    expect(r).toEqual({ sent: false, error: THE_HOUR_IT_WAS_ABOUT_HAS_PASSED });
    expect(s.sent).toEqual([]);
    expect(s.written.map((w) => w.result?.error)).toEqual(['Held for quiet hours, and the hour it was about has passed; not sent']);
  });
  it('"is open" still goes, as before', async () => {
    const s = aService();
    await s.wa.sendHeldForTheNight({ organizationId: 'org-muchemi', phone: '+254700400003', text: 'Hi Aisha, your check-in for Fee notes is open. It takes about ten minutes, and you can answer right here. Reply START to begin.', context: { kind: 'checkin-open', checkInId: 'c-aisha' } });
    expect(s.sent).toEqual(['Hi Aisha, your check-in for Fee notes is open. It takes about ten minutes, and you can answer right here. Reply START to begin.']);
  });
});
