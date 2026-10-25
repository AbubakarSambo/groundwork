import { eachPersonsOwnBesideTheTeams, whyTheNumbersDoNotMatch } from './the-team-and-each-persons-figures';

const names: Record<string, string> = { 'p-kevin': 'Kevin', 'p-mercy': 'Mercy', 'p-joseph': 'Joseph' };
const nameOf = (id: string) => names[id] ?? null;
const TEAM = { id: 'o-team', name: 'Units sold by 30 October', count: 72, target: 120, unit: 'units' };

describe('Release 4: each person\'s own target beside the team\'s', () => {
  it('lists each person who has a target of the same name, as "count of target", with the unit', () => {
    const rows = eachPersonsOwnBesideTheTeams([
      TEAM,
      { id: 'o-k', name: 'units sold by 30 October', count: 4, target: 40, unit: 'units', ownerParticipantId: 'p-kevin' },
      { id: 'o-m', name: 'Units sold by 30 October', count: null, target: 40, unit: 'units', ownerParticipantId: 'p-mercy' },
    ], nameOf);
    expect(rows).toEqual([{ objectiveId: 'o-team', people: [
      { participantId: 'p-kevin', name: 'Kevin', says: '4 units of 40 units' },
      { participantId: 'p-mercy', name: 'Mercy', says: 'Nothing yet of 40 units' },
    ] }]);
  });

  it('says a person\'s share of a limit as a limit', () => {
    const rows = eachPersonsOwnBesideTheTeams([
      { id: 'o-e', name: 'Passed to engineering each week', count: 7, target: 5, direction: 'LIMIT' },
      { id: 'o-t', name: 'Passed to engineering each week', count: 3, target: 2, ownerParticipantId: 'p-kevin' },
    ], nameOf);
    expect(rows[0].people[0].says).toBe('3 of at most 2');
  });

  it('leaves out a team target nobody holds a share of', () => {
    expect(eachPersonsOwnBesideTheTeams([TEAM], nameOf)).toEqual([]);
  });
});

describe('Release 4: why the numbers don\'t match', () => {
  it('says the difference when every person\'s figure is on record and they do not add up', () => {
    const said = whyTheNumbersDoNotMatch([
      TEAM,
      { id: 'o-k', name: 'Units sold by 30 October', count: 30, target: 40, unit: 'units', ownerParticipantId: 'p-kevin' },
      { id: 'o-m', name: 'Units sold by 30 October', count: 25, target: 40, unit: 'units', ownerParticipantId: 'p-mercy' },
      { id: 'o-j', name: 'Units sold by 30 October', count: 13, target: 40, unit: 'units', ownerParticipantId: 'p-joseph' },
    ], nameOf);
    expect(said).toEqual([{ objectiveId: 'o-team', says: "The team's figure for Units sold by 30 October is 72 units, and each person's own figures add up to 68 units. 4 units of the team's figure is not in anyone's own figure." }]);
  });

  it('says nothing when they add up', () => {
    expect(whyTheNumbersDoNotMatch([
      TEAM,
      { id: 'o-k', name: 'Units sold by 30 October', count: 40, target: 40, unit: 'units', ownerParticipantId: 'p-kevin' },
      { id: 'o-m', name: 'Units sold by 30 October', count: 32, target: 40, unit: 'units', ownerParticipantId: 'p-mercy' },
    ], nameOf)).toEqual([]);
  });

  it('names who has no figure, rather than guessing a difference', () => {
    const said = whyTheNumbersDoNotMatch([
      { ...TEAM, unit: 'KES', name: 'Revenue this quarter', count: 1200000 },
      { id: 'o-k', name: 'Revenue this quarter', count: 500000, unit: 'KES', ownerParticipantId: 'p-kevin' },
      { id: 'o-m', name: 'Revenue this quarter', count: null, unit: 'KES', ownerParticipantId: 'p-mercy' },
    ], nameOf);
    expect(said[0].says).toBe("The team's figure for Revenue this quarter is KES 1,200,000. Mercy has no figure of their own yet, so the two cannot be checked against each other.");
  });

  it('never adds up a rate', () => {
    expect(whyTheNumbersDoNotMatch([
      { ...TEAM, unit: '%', count: 91 },
      { id: 'o-k', name: TEAM.name, count: 80, unit: '%', ownerParticipantId: 'p-kevin' },
      { id: 'o-m', name: TEAM.name, count: 70, unit: '%', ownerParticipantId: 'p-mercy' },
    ], nameOf)).toEqual([]);
  });
});
