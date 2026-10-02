import { AMINA, RUKIA, BARAKA, JUMA, A_RELEASED_REPORT, boardAs } from './the-switchboards-sections-harness';
import { peopleDisagreeInASentence } from '../reports/people-disagree-in-a-sentence';

/**
 * ITEM 18 (THE ONBOARDING BOARD): "PEOPLE DISAGREE ON 1: ..." IS SAID AS A SENTENCE.
 *
 * "Engagement Director, first 90 days" (served from the local test database on 2 October 2026). The report's stored
 * opening kept a line of the model's brief, and both readers read, as how it is going: "Both people have answered.
 * People disagree on 1: The definition of 'ownership' and the trigger for Tobi Adewale to lead client meetings."
 * They now read "Both people have answered. People disagree about the definition of 'ownership' and the trigger for
 * Tobi Adewale to lead client meetings." (Tobi reads "for you to lead".)
 */
const OPENING = "Both people have answered. People disagree on 1: The definition of 'ownership' and the trigger for Participant A to lead client meetings.";
const report = { ...A_RELEASED_REPORT, theOpening: OPENING, sharedPicture: OPENING };

describe('item 18: people disagree, in a sentence', () => {
  it('the sentences', () => {
    expect(peopleDisagreeInASentence("People disagree on 1: The definition of 'ownership'.")).toBe("People disagree about the definition of 'ownership'.");
    expect(peopleDisagreeInASentence('People disagree on 2: the price list; Who owns the deadline is not agreed.'))
      .toBe('People disagree about the price list. Who owns the deadline is not agreed.');
    expect(peopleDisagreeInASentence('Nothing to change here.')).toBe('Nothing to change here.');
  });

  it.each([['Amina, who runs it', AMINA], ['Rukia, who checks in', RUKIA], ['Baraka, who checks in', BARAKA], ['Juma, an admin who only reads', JUMA]])('%s reads no count and colon', async (_who, [user, role]) => {
    const b = await boardAs({ report }, user, role);
    const served = JSON.stringify(b);
    expect(served).not.toMatch(/People disagree on \d+:/);
  });

  it('Amina reads the sentence', async () => {
    const b = await boardAs({ report }, ...AMINA);
    expect(JSON.stringify(b)).toMatch(/People disagree about the definition of 'ownership' and the trigger for /);
  });
});
