import { whereTheirNumberStands, somethingTheyCouldNotHaveSaid } from './something-they-could-not-have-said-themselves';
import { theNumbersDoNotMeet } from './the-numbers-do-not-meet';

/**
 * WHAT THE CHECK-IN IS GIVEN ABOUT WHERE A PERSON'S NUMBER STANDS (final real-model check, item 16). The lines are the run's: Mercy on
 * Monday 12 October ("Mrs. Achola is interested in 25 units", nothing sold) read "You are at 25 of 30 for Mrs Achola, with about 3 weeks
 * left." and, after "I'm looking at targeting around 5-10 more kiosks in Kawangware", "This check-in is aiming at 120. You said 10."; Joseph
 * ("Juja Hardware wants 20 units", nothing sold) read "You are at 20 units towards the 30 unit target. That is 4 units a week from here."
 */
describe('where their number stands', () => {
  it('is the record’s count for a sales aim, never a lead’s units', () => {
    const mercy = { name: 'units sold by 30 October', count: 0 };
    expect(whereTheirNumberStands(mercy, [25])).toBe(0);
    expect(whereTheirNumberStands({ name: 'units sold by 30 October', count: 0 }, [20])).toBe(0);
    /* Not a sales aim: what they said beside a word for now, as before. */
    expect(whereTheirNumberStands({ name: 'Migrations done', count: null }, [9])).toBe(9);
  });
  it('so the give-back the model is handed says 0 of 30, never 25 or 20', () => {
    const said = somethingTheyCouldNotHaveSaid({ theirTarget: 30, standsAt: whereTheirNumberStands({ name: 'units sold by 30 October', count: 0 }, [20]), daysLeft: 18, answersSoFar: 4, gaveSomethingAlready: false, somethingBetterFired: false })!;
    expect(said).toMatch(/They are at 0 of 30, with about 3 weeks left\. That is 10 a week from here\./);
  });
});

describe('a number of kiosks is not a part of the units', () => {
  it('"around 5-10 more kiosks" is never put against the 120', () => {
    expect(theNumbersDoNotMeet([{ name: 'Units sold by 30 October', target: 120, ownerParticipantId: null }], "I'm looking at targeting around 5-10 more kiosks in Kawangware to cover those remaining units, just in case.", [30])).toBeNull();
  });
});
