import { GroundScenario, PartyType } from '@prisma/client';
import { buildScenarioPackForParty, whichDiscoveryGroup } from './prompt-library';
import { theSpineLinesIn } from './what-this-session-has-covered';

/**
 * Run 8, 21 Sep 2026: the Sahel Agricultural Research Institute was asked what it was trying to grow
 * over the next two to three years. Hafsah: "the conversations seem to think research orgs have
 * business plans for expansion, as opposed to the types of data."
 */
describe('a research organisation in a discovery room is asked about data, not expansion', () => {
  it('reads the group off the role', () => {
    expect(whichDiscoveryGroup('Dr Chidi Okafor, Sahel Agricultural Research Institute (research organisation).')).toBe('research');
    expect(whichDiscoveryGroup('Prof Yusuf Musa, Bayero Agricultural Economics Unit (research organisation).')).toBe('research');
    expect(whichDiscoveryGroup('Yakubu Danladi, Danladi Agro Inputs (input distributor).')).toBe('input distributor');
    expect(whichDiscoveryGroup('Adamu Tanko, Tanko Rice Mills (agroprocessor).')).toBe('processor');
    expect(whichDiscoveryGroup(null)).toBeNull();
  });
  it('gives them a spine about what they study and the data they lack', () => {
    const pack = buildScenarioPackForParty(GroundScenario.DISCOVERY, PartyType.PARTICIPANT, undefined, undefined, 'Dr Chidi Okafor, Sahel Agricultural Research Institute (research organisation).');
    const spine = theSpineLinesIn(pack).map((s) => s.what);
    expect(spine[0]).toMatch(/studying or trying to answer/);
    expect(spine.join(' ')).toMatch(/What data do you not have/);
    expect(spine.join(' ')).not.toMatch(/expand or grow/);
    expect(pack).toMatch(/Never ask what they are trying to grow/);
  });
  it('and everybody else keeps the market spine', () => {
    const pack = buildScenarioPackForParty(GroundScenario.DISCOVERY, PartyType.PARTICIPANT, undefined, undefined, 'Adamu Tanko, Tanko Rice Mills (agroprocessor).');
    expect(theSpineLinesIn(pack)[0].what).toMatch(/expand or grow/);
    const convener = buildScenarioPackForParty(GroundScenario.DISCOVERY, PartyType.INITIATOR, undefined, undefined, 'Kemi Olawale, research lead at MarketView');
    expect(convener).toMatch(/CONVENED/);
  });
});
