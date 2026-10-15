import { AMINA, RUKIA, BARAKA, JUMA, boardAs, handoff } from './the-switchboards-sections-harness';

/**
 * ITEM 18 (THE ONBOARDING BOARD): A WAIT ON "MY DIRECT REPORTS" IS SAID FROM THE READER'S SIDE.
 *
 * "Engagement Director, first 90 days" (served from the local test database on 2 October 2026). Tobi said he was
 * waiting on "my direct reports" for three dates and times for a meeting. Tobi read "You are waiting on my direct
 * reports for three dates and times for the meeting." and "My direct reports holds it."; Amina, who runs it, read
 * "Tobi Adewale is waiting on my direct reports ...", as if they were hers.
 *
 * Now the person waiting reads "your direct reports", and everybody else "their own direct reports". No name is
 * added, so nobody learns who is waiting who could not before.
 */
const SETUP = { dependencies: [handoff('d1', 'p-rukia', 'three dates and times for the meeting', { onLabel: 'my direct reports' })] };
const served = (b: any) => JSON.stringify(b);

describe('item 18: a holder in their own words is said from the reader\'s side', () => {
  it('Rukia, who is waiting, reads "your direct reports"', async () => {
    const b = await boardAs(SETUP, ...RUKIA);
    expect(served(b)).toMatch(/You are waiting on your direct reports for three dates and times for the meeting\./);
    expect(served(b)).not.toMatch(/\bmy direct reports\b/i);
  });

  it.each([['Amina, who runs it', AMINA], ['Baraka, who checks in', BARAKA], ['Juma, an admin who only reads', JUMA]])('%s reads "their own direct reports", never "my"', async (_who, [user, role]) => {
    const b = await boardAs(SETUP, user, role);
    expect(served(b)).not.toMatch(/\bmy direct reports\b/i);
  });

  it('Amina reads whose direct reports they are', async () => {
    const b = await boardAs(SETUP, ...AMINA);
    expect(served(b)).toMatch(/Rukia Mwangi is waiting on their own direct reports for three dates and times for the meeting\./);
  });
});
