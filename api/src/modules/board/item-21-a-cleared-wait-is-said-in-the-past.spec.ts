import { boardAs, answered, handoff, AMINA, RUKIA, JUMA } from './the-switchboards-sections-harness';

/**
 * ITEM 21, THE FOUNDER'S BOARD: A WAIT THAT HAS BEEN CLEARED IS SAID IN THE PAST.
 *
 * "A second founder joining" (local test database, 9a904212): Ada read, on a wait whose status was
 * CLEARED, "You are waiting on their lawyer." Each reader is now told it was cleared.
 */
const setup = {
  checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)],
  dependencies: [
    handoff('d-lawyer', 'p-rukia', 'the final details for the paperwork', { onLabel: 'the lawyer', status: 'CLEARED', clearedAt: new Date('2026-09-10T09:00:00Z') }),
    handoff('d-open', 'p-baraka', 'the price list', { onParticipantId: 'p-rukia', status: 'WAITING' }),
  ],
};
const said = (board: any) => Object.fromEntries((board.dependencies ?? []).map((d: any) => [d.id, d.waitingSays]));

describe('a cleared wait, as each reader reads it', () => {
  it('Rukia, who was waiting, reads that it has been cleared', async () => {
    expect(said(await boardAs(setup as any, ...RUKIA))['d-lawyer']).toBe('You were waiting on the lawyer, and that has been cleared.');
  });
  it.each([['Amina, who runs it', AMINA], ['Juma, an admin', JUMA]])('%s reads it with Rukia named', async (_w, reader) => {
    const s = said(await boardAs(setup as any, ...(reader as readonly [string, string])));
    expect(s['d-lawyer']).toBe('Rukia Mwangi was waiting on the lawyer, and that has been cleared.');
  });
  it('an open wait reads as before', async () => {
    expect(said(await boardAs(setup as any, ...AMINA))['d-open']).toBe('Baraka Otieno is waiting on Rukia Mwangi.');
  });
});
