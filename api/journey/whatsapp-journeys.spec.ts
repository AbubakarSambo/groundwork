/**
 * EVERY CLIENT JOURNEY ON WHATSAPP, THROUGH THE LOCAL WEBHOOK (Phase B, item 3).
 *
 * Runs only when asked, because it needs a running local API, a local gw_ database and the real model:
 *   RUN_WHATSAPP_JOURNEYS=1 plus the same test settings the API was started with (see whatsapp-journeys.ts).
 * Otherwise it is skipped, like the other live journeys, so the usual test run is not slowed or broken.
 */
const on = process.env.RUN_WHATSAPP_JOURNEYS === '1';

(on ? describe : describe.skip)('every client journey on WhatsApp, with signed messages through the local webhook', () => {
  /* Booting the application inside Jest makes Node's "possible memory leak" warning throw (an Error from another realm); it is only a warning. */
  beforeAll(() => { jest.spyOn(process, 'emitWarning').mockImplementation(() => undefined); });
  afterAll(() => { jest.restoreAllMocks(); });

  it('passes every check: what each person reads, word for word, and what is stored', async () => {
    const { runWhatsAppJourneys } = await import('./whatsapp-journeys');
    const { checks } = await runWhatsAppJourneys({ quiet: true });
    const failed = checks.filter((c) => !c.ok).map((c) => `${c.journey}: ${c.what}${c.detail ? ` [${c.detail.slice(0, 300)}]` : ''}`);
    expect(failed).toEqual([]);
    expect(checks.length).toBeGreaterThan(100);
  }, 1_800_000);

});

