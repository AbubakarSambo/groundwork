import { boardAs, answered, A_RELEASED_REPORT, AMINA, BARAKA, RUKIA, JUMA, SETUP_ADMIN } from './the-switchboards-sections-harness';

/**
 * REQUEST 100: TWO SCREEN CHECKS FROM THE REVIEW OF 1 OCTOBER, AS EACH READER IS SENT THEM.
 *
 * (1) `divergence.whyNothingYet` says why "Where people differ" is empty. It went out beside differences on
 * 38 boards; since the contradiction work of 1 October it is deleted where there are differences
 * (a-board-that-does-not-contradict-itself.spec). This holds the other half: where there are only
 * agreements, it is not sent either, and over a truly empty section it still is.
 *
 * (2) `kindOfWork` is a key the screens draw by (the headings, the participant's own records), never a
 * sentence anybody reads. This holds that no sentence a reader is sent quotes it.
 */
const everyone = [
  ['Amina, the lead', AMINA],
  ['the admin who set it up', SETUP_ADMIN],
  ['Juma, an admin who only reads', JUMA],
  ['Rukia, who checks in', RUKIA],
  ['Baraka, who checks in', BARAKA],
] as const;

const withAgreementsOnly = {
  createdByUserId: 'u-setup',
  checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)],
  report: { ...A_RELEASED_REPORT, agreements: ['Everybody agrees the price list has to be out before the shops are visited.'], divergences: [] },
};

describe('request 100 (1): the reason the section is empty, only over an empty section', () => {
  it.each(everyone)('%s is not told nothing reads as an agreement beside the agreement', async (_who, reader) => {
    const b = await boardAs(withAgreementsOnly as any, ...(reader as readonly [string, string]));
    expect(b.divergence.agreements.length).toBe(1);
    expect(b.divergence.whyNothingYet).toBeUndefined();
  });

  it('over a section with nothing in it, whoever runs it is still told why', async () => {
    const empty = { ...withAgreementsOnly, report: { ...A_RELEASED_REPORT, agreements: [], divergences: [] } };
    for (const reader of [AMINA, SETUP_ADMIN]) {
      const b = await boardAs(empty as any, ...(reader as readonly [string, string]));
      expect(typeof b.divergence.whyNothingYet).toBe('string');
      expect(b.divergence.whyNothingYet).toMatch(/^[A-Z].*\.$/);
    }
  });
});

describe('request 100 (2): the kind of work is a key, never a sentence', () => {
  it.each(everyone)('%s reads no sentence that quotes "sales org"', async (_who, reader) => {
    const b = await boardAs({ ...withAgreementsOnly, kindOfWork: 'sales org' } as any, ...(reader as readonly [string, string]));
    /* kindsOffered is, like kindOfWork, a list of keys the dialog chooses from, never read as a sentence. */
    const { kindOfWork, kindsOffered, ...rest } = b as any;
    expect(kindOfWork).toBe('sales org');
    /* Only whoever can choose the kind is served the list. */
    if (kindsOffered !== undefined) expect(kindsOffered).toEqual(['sales org', 'engineering release']);
    expect(JSON.stringify(rest).toLowerCase()).not.toContain('sales org');
  });
});
