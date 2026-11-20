import { whereYouAreAgainstWhatYouNamed } from './where-you-are-against-what-you-named';

/**
 * "NOBODY HAS SAID WHAT SUCCESS LOOKS LIKE" IS NOT SAID WHILE A READ IS STILL TO COME (fix plan 16 November, group 5; end-to-end I-3).
 * Joel's picture read "Nobody has said what success looks like yet" over three people who had said they wanted 30 units, because the
 * conversations that held it had not been read. Nothing found in a conversation that has not been read is not an answer.
 */
const base = { counting: 'everyone' as const, stated: null, version: null, conditions: [], entries: [], readerIsTheLead: false, leadName: 'Lucy Mwangi' };

describe('what success looks like, for a reader of the shared picture', () => {
  it('while a read is still to come it says so, in one plain sentence, and never that nobody has said it', () => {
    const r = whereYouAreAgainstWhatYouNamed({ ...base, readsStillToCome: 2 });
    expect(r.saying).toBe('Groundwork is still working out what people said. This page will fill in when it has.');
    expect(r.saying).not.toMatch(/Nobody has said/);
  });
  it('once every read is in and nobody has said it, it says that, as before', () => {
    for (const reads of [0, undefined]) {
      expect(whereYouAreAgainstWhatYouNamed({ ...base, readsStillToCome: reads }).saying).toMatch(/^Nobody has said what success looks like yet\./);
    }
  });
});
