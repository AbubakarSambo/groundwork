import { boardAs, answered, A_RELEASED_REPORT, AMINA, RUKIA, JUMA } from './the-switchboards-sections-harness';
import { atAGlanceTiles } from '../reports/what-this-session-holds';

/**
 * ITEM 21, THE TRAINING PROGRAMME BOARD: THE DIFFERENCES TILE SAYS HOW MANY, WHERE IT CANNOT NAME ONE.
 *
 * "Engagement Director, first 90 days" (local test database, d4b862f4): Amina read "Differences 2. The
 * written report reads this as still open." The first difference was too long for a tile, so it was
 * not named, and "this" pointed at nothing. One still reads as before.
 */
const LONG = 'The core responsibilities of the role are not agreed, because one account expects commercial leadership on renewals and pricing while the other describes a relationship management role with no commercial part at all';
const report = {
  ...A_RELEASED_REPORT,
  divergences: [{ topic: LONG, atStake: null, evidence: [], positions: [] }, { topic: `${LONG}, again`, atStake: null, evidence: [], positions: [] }],
};
const setup = { checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)], report };
const tile = async (reader: readonly [string, string]) => ((await boardAs(setup as any, ...reader)).quickRead ?? []).find((t: any) => t.label === 'Differences');

describe('the Differences tile, as each reader reads it', () => {
  it.each([['Amina, who runs it', AMINA], ['Rukia, who checks in, once it is shared', RUKIA], ['Juma, an admin', JUMA]])('%s reads how many', async (_w, reader) => {
    const t = await tile(reader as readonly [string, string]);
    expect(t).toEqual(expect.objectContaining({ value: '2', sub: 'The written report reads 2 differences as still open.' }));
  });
  it('one difference that cannot be named reads as before', () => {
    const t = atAGlanceTiles({ agreed: 0, stillOpen: 1, movedOnTargets: null, blocked: 0, waiting: 0, backedPct: null, numberWasSaid: false }).find((x) => x.label === 'Differences');
    expect(t!.sub).toBe('The written report reads this as still open.');
  });
});
