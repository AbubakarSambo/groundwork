import { PartyType } from '@prisma/client';
import { boardAs, person, answered, JUMA, type Setup } from './the-switchboards-sections-harness';

/**
 * ITEM 21, THE WHERE-NEXT BOARD: A LEAD WHO CHECKS IN TOO IS COUNTED AMONG THE PEOPLE ASKED.
 *
 * "Three people, three different versions of the priority" (local test database, 52d4fd15): Omar, who runs
 * it and checks in too, read "3 of 3 people have answered." under "By who they are", and at the top "All
 * four people have answered." A lead who only runs the check-in is still not counted.
 */
const people = (leadChecksIn: boolean) => [
  { ...person('p-omar', 'u-lead', 'Omar', 'Haddad', PartyType.INITIATOR), managingOnly: !leadChecksIn },
  person('p-ruth', 'u-ruth', 'Ruth', 'Njeri'), person('p-marco', 'u-marco', 'Marco', 'Bianchi'), person('p-aisha', 'u-aisha', 'Aisha', 'Bello'),
];
const setup = (leadChecksIn: boolean): Setup => ({
  kindOfWork: 'MarketView where next', initiatorId: 'u-lead', people: people(leadChecksIn) as any,
  checkIns: [...(leadChecksIn ? [answered('p-omar', 1)] : []), answered('p-ruth', 1), answered('p-marco', 1), answered('p-aisha', 1)],
} as any);

describe('by who they are, as each reader reads it', () => {
  it('Omar, who checks in too, is counted', async () => {
    expect((await boardAs(setup(true), 'u-lead', 'MEMBER')).byWhoTheyAre.says).toBe('4 of 4 people have answered.');
  });
  it('an admin reads the same count', async () => {
    expect((await boardAs(setup(true), ...JUMA)).byWhoTheyAre.says).toBe('4 of 4 people have answered.');
  });
  it('a lead who only runs it is not counted, as before', async () => {
    expect((await boardAs(setup(false), 'u-lead', 'MEMBER')).byWhoTheyAre.says).toBe('3 of 3 people have answered.');
  });
  it('Ruth, who checks in, is served none of it, as before', async () => {
    expect((await boardAs(setup(true), 'u-ruth', 'MEMBER')).byWhoTheyAre).toBeUndefined();
  });
});
