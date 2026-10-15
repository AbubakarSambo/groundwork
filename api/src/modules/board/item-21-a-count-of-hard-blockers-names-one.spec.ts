import { boardAs, answered, handoff, A_RELEASED_REPORT, AMINA, RUKIA, JUMA } from './the-switchboards-sections-harness';

/**
 * ITEM 21, THE GOVERNMENT PROGRAMME BOARD: A COUNT OF HARD BLOCKERS NAMES A HARD BLOCKER.
 *
 * "The rollout across four branches" (local test database, 927dc43a): Stephen read "Blockers 1. Work is
 * held up by an update on a fix." The one hard blocker was Musa's "a fix for the printer connection"; the
 * tile took its name from the top line, whose oldest wait was Ngozi's "an update on a fix", which nobody
 * called blocking.
 */
const setup = {
  report: A_RELEASED_REPORT,
  waitsAreReadOnTheirOwn: true,
  checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)],
  dependencies: [
    handoff('d-update', 'p-rukia', 'an update on a fix', { onLabel: 'support', status: 'WAITING', sourceCheckInId: 'c1-p-rukia', createdAt: new Date('2026-09-02T09:00:00Z') }),
    handoff('d-printer', 'p-baraka', 'a fix for the printer connection', { onLabel: 'the vendor', status: 'BLOCKING', sourceCheckInId: 'c1-p-baraka', createdAt: new Date('2026-09-02T10:00:00Z') }),
  ],
};
const tile = async (reader: readonly [string, string]) => ((await boardAs(setup as any, ...reader)).quickRead ?? []).find((t: any) => t.label === 'Blockers');

describe('the Blockers tile, as each reader reads it', () => {
  it.each([['Amina, who runs it', AMINA], ['Juma, an admin', JUMA]])('%s reads the hard blocker it counts', async (_w, reader) => {
    const t = await tile(reader as readonly [string, string]);
    expect(t.value).toBe('1');
    expect(t.sub).toMatch(/^Work is held up by a fix for the printer connection/);
  });
  it('Rukia, who checks in, never reads the softer wait named as the hard one', async () => {
    const t = await tile(RUKIA);
    if (t && /^\d+$/.test(String(t.value))) expect(t.sub).not.toMatch(/an update on a fix/);
  });
});
