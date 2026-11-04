import { boardAs, answered, A_RELEASED_REPORT, AMINA, BARAKA, RUKIA, SETUP_ADMIN } from './the-switchboards-sections-harness';
import * as hidden from '../admin/what-is-hidden-at-release';

/**
 * PIECE 0 OF THE ANCHOR SCENARIO (docs/anchor-scenario-plan.md, section 3): THE SWITCH.
 *
 * `release.anchorScenario` is off unless the row says it is on. It decides whether a new anchor check-in can be
 * started, and nothing on an existing board: every reader is sent exactly the same board with the switch off and
 * with it on. The board no longer tells the screens the switch at all: the only screen that read it was "Groundwork
 * recommends", which every lead now reads whatever the switch (Hafsah, 3 November evening).
 */
jest.mock('../admin/what-is-hidden-at-release', () => {
  const real = jest.requireActual('../admin/what-is-hidden-at-release');
  return { ...real, theAnchorScenarioIsOn: jest.fn(async () => false) };
});

const setup = {
  createdByUserId: 'u-setup',
  checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)],
  report: { ...A_RELEASED_REPORT, agreements: ['Everybody agrees the price list has to be out before the shops are visited.'], divergences: [] },
};
const everyone = [['Amina, the lead', AMINA], ['the admin who set it up', SETUP_ADMIN], ['Rukia, who checks in', RUKIA], ['Baraka, who checks in', BARAKA]] as const;

describe('the anchor scenario switch, on the board', () => {
  it.each(everyone)('%s is not told the switch at all', async (_who, reader) => {
    const b = await boardAs(setup as any, ...(reader as readonly [string, string]));
    expect(b.anchorScenarioOn).toBeUndefined();
  });

  it.each(everyone)('%s is sent exactly the same board with the switch on', async (_who, reader) => {
    (hidden.theAnchorScenarioIsOn as jest.Mock).mockResolvedValue(false);
    const off = await boardAs(setup as any, ...(reader as readonly [string, string]));
    (hidden.theAnchorScenarioIsOn as jest.Mock).mockResolvedValue(true);
    const on = await boardAs(setup as any, ...(reader as readonly [string, string]));
    (hidden.theAnchorScenarioIsOn as jest.Mock).mockResolvedValue(false);
    expect(JSON.stringify(on)).toBe(JSON.stringify(off));
  });
});
