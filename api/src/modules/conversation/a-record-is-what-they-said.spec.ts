import { isTheirs, MUST_BE_THEIRS, ONLY_THEIR_WORDS } from './a-record-is-what-they-said';

/**
 * DRIVEN AGAINST THE TRANSCRIPT THAT PRODUCED THE FABRICATION.
 *
 * These are the lead's actual words from her check-in, and the actual sentences her report
 * attributed to her. She was talking about testing a product and fixing bugs. The report said she
 * had made "more than ten specific commitments on design and UX" and quoted two of them.
 */
const WHAT_SHE_ACTUALLY_SAID = [
  'i am the one setting up the context',
  'I want them to be able to find the bugs and fix them',
  'we need to test the product and resolve all the bugs',
  'That they need to test the product and resolve bugs',
  'yes, i have we had a call last tuesday',
  'the evidence it that the product is now stable and easy to use, not breaks in the process for cleints',
  'do you have recommendations on the outcomes for me to track? a client shuld be able to sign-up, setup an org, add people, create checkins and have their team checkin and get the first check-in reports with no issues',
  'all 3 of the above',
  'a friend of ours will be testing',
  'sahar',
].join('\n');

describe('the sentences her report put in her mouth', () => {
  for (const fabricated of [
    'Five tabs, one design language',
    'light theme only, deliberately',
    'The work is to implement a detailed user experience with a specific design language, including a five-tab structure, defined color and font styles',
    'A person who arrives from the site does not have to relearn the product',
    'Success is achieved when the product\'s user experience is intuitive and consistent with the main site',
  ]) {
    it(`refuses "${fabricated.slice(0, 46)}…"`, () => {
      expect(isTheirs(fabricated, WHAT_SHE_ACTUALLY_SAID)).toBe(false);
    });
  }
});

describe('and the things she did say, which must survive', () => {
  for (const real of [
    'Success is that the product is stable and easy to use, and does not break in the process for clients',
    'A client can sign up, set up an org, add people, create check-ins, have their team check in and get the first session reports with no issues',
    'The goal is to test the product and resolve all the bugs',
    'Sahar will confirm the testing was completed',
    'She told them the goal on a call last Tuesday',
  ]) {
    it(`keeps "${real.slice(0, 46)}…"`, () => {
      expect(isTheirs(real, WHAT_SHE_ACTUALLY_SAID)).toBe(true);
    });
  }
});

describe('how the check behaves', () => {
  it('allows paraphrase, which the extractor is meant to do', () => {
    expect(isTheirs('They want the bugs found and fixed', 'I want them to be able to find the bugs and fix them')).toBe(true);
  });

  it('does not let the extractor\'s own tags vouch for an entry', () => {
    /*
     * "[INFERRED: ...]" is the model's commentary, not the person's words, and counting it lets a
     * sentence corroborate itself. The reason is written INTO the tag, so a tag that quotes what
     * she really said can carry a fabricated claim past the check while explaining itself.
     *
     * My first version of this used a tag about a "design brief", which shares nothing with her
     * words either - so it passed with the stripping removed and proved nothing.
     */
    const vouchesForItself =
      'Five tabs design language'
      + ' [INFERRED: testing product bugs client signup setup people create checkins team session reports issues sahar]';
    expect(isTheirs(vouchesForItself, WHAT_SHE_ACTUALLY_SAID)).toBe(false);
    /* And the claim itself is refused on its own, which is what the tag was hiding. */
    expect(isTheirs('Five tabs design language', WHAT_SHE_ACTUALLY_SAID)).toBe(false);
  });

  it('keeps an entry with nothing distinctive to check, rather than guessing', () => {
    expect(isTheirs('It is what it is', WHAT_SHE_ACTUALLY_SAID)).toBe(true);
  });

  it('sits at half, which is loose enough for paraphrase and tight enough for invention', () => {
    expect(MUST_BE_THEIRS).toBe(0.5);
  });
});

describe('what the extractor is now told', () => {
  it('names both speakers and says which one is the party', () => {
    expect(ONLY_THEIR_WORDS).toContain('Lines beginning PERSON:');
    expect(ONLY_THEIR_WORDS).toContain('Lines beginning GROUNDWORK:');
  });

  it('covers the case that actually happened - a definition the session wrote', () => {
    expect(ONLY_THEIR_WORDS).toContain('summaries, definitions read back');
    expect(ONLY_THEIR_WORDS).toContain('record what the PERSON said in agreeing, not the definition the session wrote');
  });

  it('and closes the "but it sounds right" gap', () => {
    expect(ONLY_THEIR_WORDS).toContain('however reasonable it would be');
  });
});
