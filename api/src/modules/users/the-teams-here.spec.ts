import { theTeamsFrom, theSpellingToKeep, oneKeyFor } from './the-teams-here';

/** TEAMS ARE A LIST, ONE SPELLING EACH, IGNORING CASE (Hafsah, 21 November 2026). */
describe('the teams here', () => {
  it('"Sales", "sales" and " SALES " are one team, under the spelling most people hold', () => {
    expect(theTeamsFrom(['Sales', 'sales', ' SALES ', 'Sales', 'Operations', null, ''])).toEqual([
      { name: 'Operations', people: 1 },
      { name: 'Sales', people: 4 },
    ]);
  });

  it('a different name is a different team: "Sales team" is not "Sales"', () => {
    expect(theTeamsFrom(['Sales', 'Sales team']).map((t) => t.name)).toEqual(['Sales', 'Sales team']);
  });

  it('typing a team that is already here keeps the spelling in use, and a new one as typed, tidied', () => {
    const teams = [{ name: 'Sales' }, { name: 'Field operations' }];
    expect(theSpellingToKeep('sales', teams)).toBe('Sales');
    expect(theSpellingToKeep('  FIELD   operations ', teams)).toBe('Field operations');
    expect(theSpellingToKeep(' Finance  team ', teams)).toBe('Finance team');
    expect(theSpellingToKeep('   ', teams)).toBeNull();
    expect(oneKeyFor(' Sales  Team ')).toBe('sales team');
  });
});
