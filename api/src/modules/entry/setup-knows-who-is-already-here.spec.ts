import { whatTheyAlreadyHave, thePeopleAlreadyHere, ENOUGH_PEOPLE_TO_RECOGNISE } from './setup-is-not-a-stranger-to-somebody-who-is-signed-in';

/**
 * SETUP KNOWS WHO IS ALREADY IN THE ORGANISATION (round 6, 1 November 2026).
 *
 * The family business and clinic admins added their team on People first, then set up a check-in and said "my team". Setup knew only
 * the names said again in the conversation, so Ben Juma, Diana Omondi and Emeka Obi were left off. Now the setup conversation and its
 * reading are told who is already here (name and team only, from the one colleagues reader), to work out who the lead means, confirm it
 * in one question, and never ask for a name, email or number it can see. Not everybody here is on every check-in: their words decide.
 */
const FAMILY = [
  { name: 'Ben Juma', role: 'MEMBER', team: 'Stores' },
  { name: 'Diana Omondi', role: 'MEMBER', team: 'Deliveries' },
  { name: 'Karanja Mumbi', role: 'MEMBER', team: null },
  { name: 'Sarah Wairimu', role: 'MEMBER', team: null },
];

describe('the people already in the organisation', () => {
  it('are named for the setup conversation, with their teams, and it is told to confirm who is meant rather than ask again', () => {
    const block = whatTheyAlreadyHave({ theirCheckIns: [], people: FAMILY });
    expect(block).toContain('PEOPLE ALREADY IN THEIR ORGANISATION');
    expect(block).toContain('- Ben Juma, Stores');
    expect(block).toContain('- Diana Omondi, Deliveries');
    expect(block).toContain('- Karanja Mumbi');
    expect(block).toContain('say who you');
    expect(block).toContain('Never ask for the name, email or number of somebody on this list.');
    expect(block).toContain('their words decide who is.');
  });

  it('never carry an address or a number into the conversation', () => {
    const block = thePeopleAlreadyHere({ theirCheckIns: [], people: FAMILY });
    expect(block).not.toMatch(/@|\+\d/);
  });

  it('in a big organisation, only so many are named, and the rest are counted', () => {
    const many = Array.from({ length: ENOUGH_PEOPLE_TO_RECOGNISE + 12 }, (_, i) => ({ name: `Person ${i + 1}`, role: 'MEMBER', team: null }));
    const block = thePeopleAlreadyHere({ theirCheckIns: [], people: many });
    expect(block).toContain(`- Person ${ENOUGH_PEOPLE_TO_RECOGNISE}`);
    expect(block).not.toContain(`- Person ${ENOUGH_PEOPLE_TO_RECOGNISE + 1}\n`);
    expect(block).toContain('- and 12 more');
  });

  it('nobody here yet: nothing is said', () => {
    expect(thePeopleAlreadyHere({ theirCheckIns: [], people: [] })).toBe('');
  });
});
