import { boardAs } from './the-switchboards-sections-harness';
import { review5, RUKIA_RUNS_IT, AMANI, JUMA_READS } from './__fixtures__/sales-board-review-5';
import { yourOwnReadSaysYou } from './your-own-read-says-you';

/**
 * ITEM 18 (THE ONBOARDING AND PROJECT BOARDS): A PERSON'S OWN READ IS SAID TO THEM.
 *
 * Served from the local test database on 2 October 2026, Samuel (on "Atlas delivery") read about himself: "11 lines
 * taken from what they said, ... Their work is read against what being on track means for project management, ..."
 * and "Nobody has said anything about this person's work moving elsewhere. Their responsibilities are staying with
 * them." Tobi (on "Engagement Director, first 90 days") read the same of himself.
 *
 * His own row now reads "taken from what you said", "Your work is read against ...", "Nobody has said anything about
 * your work moving elsewhere." and "Your responsibilities are staying with you." Nobody else's row changes.
 */
const mine = (b: any, id: string) => ({
  c: ((b.contribution ?? []) as any[]).find((r) => r.participantId === id),
  v: ((b.coverage?.reads ?? []) as any[]).find((r) => r.participantId === id),
});

describe('item 18: your own read says "you"', () => {
  it('Amani reads her own row as "you"', async () => {
    const b = await boardAs(review5(), ...AMANI);
    const { c, v } = mine(b, 'p-amani');
    expect(c.reason).toMatch(/lines taken from what you said/);
    expect(v.what).toBe('Nobody has said anything about your work moving elsewhere.');
    expect(v.reasonText).toMatch(/^Your responsibilities are staying with you\./);
    expect(JSON.stringify([c, v])).not.toMatch(/what they said|Their work|this person|staying with them/);
  });

  it.each([['Rukia, who runs it', RUKIA_RUNS_IT], ['Juma, an admin who only reads', JUMA_READS]])('%s reads nobody else\'s row turned into "you"', async (_who, reader) => {
    const b = await boardAs(review5(), reader[0], reader[1]);
    const { c, v } = mine(b, 'p-amani');
    expect(JSON.stringify([c ?? null, v ?? null])).not.toMatch(/what you said|your work moving|staying with you/);
  });

  it('the sentences', () => {
    expect(yourOwnReadSaysYou('Others credit them 9 times for moving something forward.')).toBe('Others credit you 9 times for moving something forward.');
    expect(yourOwnReadSaysYou('Their work is read against what being on track means for management.')).toBe('Your work is read against what being on track means for management.');
    expect(yourOwnReadSaysYou('This read of their function is still provisional.')).toBe('This read of your function is still provisional.');
  });
});
