import { boardAs, answered, A_RELEASED_REPORT, AMINA, BARAKA, RUKIA, SETUP_ADMIN } from './the-switchboards-sections-harness';
import * as hidden from '../admin/what-is-hidden-at-release';

/**
 * PIECE 0 OF THE ANCHOR SCENARIO (docs/anchor-scenario-plan.md, section 3): THE SWITCH.
 *
 * `release.anchorScenario` is off unless the row says it is on. The board tells the screens which it
 * is (`anchorScenarioOn`), and apart from that one field every reader is sent exactly what they were
 * sent before, with the switch off and with it on, until the later anchor pieces are built.
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
  const runsIt = (who: string) => who.startsWith('Amina') || who.startsWith('the admin');

  it.each(everyone)('%s is told the switch is off when no row says otherwise', async (who, reader) => {
    const b = await boardAs(setup as any, ...(reader as readonly [string, string]));
    /* Only whoever runs the check-in is told; a person in it has a board of their own (a-participants-board-is-their-own). */
    expect(b.anchorScenarioOn).toBe(runsIt(who) ? false : undefined);
  });

  it.each(everyone)('%s is sent exactly the same board with the switch on, apart from that one field', async (who, reader) => {
    (hidden.theAnchorScenarioIsOn as jest.Mock).mockResolvedValue(false);
    const off = await boardAs(setup as any, ...(reader as readonly [string, string]));
    (hidden.theAnchorScenarioIsOn as jest.Mock).mockResolvedValue(true);
    const on = await boardAs(setup as any, ...(reader as readonly [string, string]));
    (hidden.theAnchorScenarioIsOn as jest.Mock).mockResolvedValue(false);
    expect(on.anchorScenarioOn).toBe(runsIt(who) ? true : undefined);
    const { anchorScenarioOn: _a, ...restOff } = off;
    const { anchorScenarioOn: _b, ...restOn } = on;
    expect(JSON.stringify(restOn)).toBe(JSON.stringify(restOff));
  });
});
