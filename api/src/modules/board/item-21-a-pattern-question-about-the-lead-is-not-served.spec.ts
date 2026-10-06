import { boardAs, answered, A_RELEASED_REPORT, AMINA, RUKIA, JUMA } from './the-switchboards-sections-harness';

/**
 * ITEM 21, THE SUPPORT DESK BOARD: A STORED QUESTION BUILT FROM A PATTERN ABOUT THE LEAD IS NOT SERVED EITHER.
 *
 * "First ninety days managing the team he was on" (local test database, f46133fb): Maria, who runs it,
 * read under "what to settle first" "The record names another person positively with specific evidence
 * of their contribution. Seen in 1 sessions. Your own account of this is not in this check-in." The
 * questions built from a pattern are left out of what the record shows (they are served with the
 * patterns, under their own rules); the one about a colleague was left out, but the one about Maria
 * had already been turned to "Your own account ..." by the time it was checked, so it slipped through.
 */
const report = {
  ...A_RELEASED_REPORT,
  overTime: {
    sessions: 1, commitments: [], dependencies: [], patterns: [], gaps: [], stillOpen: [], cannotTellYou: [],
    toSettleFirst: [
      'Nothing here is backed by a document. Ask for one thing in writing that you could check yourself.',
      'The record names another person positively with specific evidence of their contribution. Seen in 1 sessions. Ask the initiator what they have changed about it since the first time.',
      'A core function of the team is being carried by one person. Seen in 1 sessions. Ask Participant A what they have changed about it since the first time.',
    ],
  },
};
const setup = { checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)], report };

describe('what to settle first, as each reader reads it', () => {
  it('Amina, who runs it, reads no question built from a pattern, about herself or anybody', async () => {
    expect((await boardAs(setup as any, ...AMINA)).overTime.toSettleFirst).toEqual([
      'Nothing here is backed by a document. Ask for one thing in writing that you could check yourself.',
    ]);
  });
  it.each([['Rukia, who checks in', RUKIA], ['Juma, an admin', JUMA]])('%s is not served the lead\'s list, as before', async (_w, reader) => {
    expect((await boardAs(setup as any, ...(reader as readonly [string, string]))).overTime ?? null).toBeNull();
  });
});
