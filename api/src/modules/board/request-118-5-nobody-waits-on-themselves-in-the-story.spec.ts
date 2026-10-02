import { boardAs, A_RELEASED_REPORT } from './the-switchboards-sections-harness';
import { review5, RUKIA_RUNS_IT, AMANI, BARAKA_M, JUMA_READS, GRACE_SET_IT_UP } from './__fixtures__/sales-board-review-5';
import { nobodyWaitsOnThemselvesInAStory } from '../reports/nobody-waits-on-themselves-in-a-story';

/**
 * REQUEST 118 (5), FROM REQUEST 117 (6): "YOU ARE WAITING ON THEMSELVES" IN THE STORY RUKIA READS.
 *
 * The record of "Sales team, Q3" was put right (request 117, part 6, and journey/bring-a-check-in-up-to-date.ts),
 * but the story stored with its report was written before, in labels: "The initiator is waiting on themselves to
 * approve a discount ...". Rukia read "You are waiting on themselves to approve a discount for Baraka Mwangi and to
 * send a price list to Amani Wekesa." It is now put right where it is served, before any script runs: "You still
 * have to approve a discount for Baraka Mwangi and to send a price list to Amani Wekesa."
 */
const STORY = 'The initiator is waiting on themselves to approve a discount and to send a price list.';
const withTheStory = () => review5({ report: { ...A_RELEASED_REPORT, theOpening: STORY, sharedPicture: STORY } });

describe('request 118 (5): nobody waits on themselves in the story', () => {
  it('Rukia, who runs it, reads "You still have to"', async () => {
    const b = await boardAs(withTheStory(), ...RUKIA_RUNS_IT);
    const served = JSON.stringify(b);
    expect(served).not.toMatch(/waiting on themselves/);
    expect(served).toMatch(/You still have to approve a discount and to send a price list\./);
  });

  it.each([['Grace, the admin who set it up', GRACE_SET_IT_UP], ['Juma, an admin who only reads', JUMA_READS], ['Amani', AMANI], ['Baraka', BARAKA_M]])('%s never reads anybody waiting on themselves', async (_who, reader) => {
    const b = await boardAs(withTheStory(), reader[0], reader[1]);
    expect(JSON.stringify(b)).not.toMatch(/waiting on themselves/);
  });

  it('the sentence, for a name and for "you", and a wait on somebody else left alone', () => {
    expect(nobodyWaitsOnThemselvesInAStory('Rukia Otieno is waiting on themselves to approve a discount.')).toBe('Rukia Otieno still has to approve a discount.');
    expect(nobodyWaitsOnThemselvesInAStory('You are waiting on themselves to send a price list.')).toBe('You still have to send a price list.');
    expect(nobodyWaitsOnThemselvesInAStory('Amani Wekesa is waiting on you for the price list.')).toBe('Amani Wekesa is waiting on you for the price list.');
  });
});
