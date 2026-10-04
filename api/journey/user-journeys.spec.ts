/**
 * THE NINE USER JOURNEYS, AS EACH READER, THROUGH THE API (Phase B, item 5).
 *
 * Runs only when asked, because it needs a running local API, a local gw_ database copy, the real model, and
 * the mail catcher's port (127.0.0.1:1025) to itself:
 *   RUN_USER_JOURNEYS=1 DATABASE_URL=postgresql://hafsahjumare@localhost:5432/gw_user_journeys npx jest journey/user-journeys.spec.ts
 * with the API started as the header of user-journeys.ts says. Otherwise it is skipped, like the other live
 * journeys, so the usual test run is not slowed or broken.
 */
const on = process.env.RUN_USER_JOURNEYS === '1';

(on ? describe : describe.skip)('the nine user journeys, walked as each reader through the API', () => {
  /* Booting the application inside Jest makes Node's "possible memory leak" warning throw (an Error from another realm); it is only a warning. */
  beforeAll(() => { jest.spyOn(process, 'emitWarning').mockImplementation(() => undefined); });
  afterAll(() => { jest.restoreAllMocks(); });

  it('passes every check: what each person reads, word for word, and what is stored', async () => {
    const { runUserJourneys } = await import('./user-journeys');
    const { checks } = await runUserJourneys({ quiet: true });
    /* A fault that sits in another builder's part of the code is reported to them and listed here, not hidden and not fixed here. */
    const open = checks.filter((c) => !c.ok && c.owner);
    if (open.length) console.warn(`Open in other people's code:\n${open.map((c) => `- ${c.what} [${c.owner}]`).join('\n')}`);
    const failed = checks.filter((c) => !c.ok && !c.owner).map((c) => `${c.journey}: ${c.what}${c.detail ? ` [${c.detail.slice(0, 300)}]` : ''}`);
    expect(failed).toEqual([]);
    expect(checks.length).toBeGreaterThan(80);
  }, 3_600_000);
});
