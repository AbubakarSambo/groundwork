import {
  whatThisGroundCanTellYou,
  contextStrengthSentence,
  type GroundContextInputs,
} from './what-this-ground-can-tell-you';

/**
 * THE CONTEXT READ IS ABOUT THE PRODUCT'S LIMITS, NEVER THE PERSON'S COMPETENCE.
 *
 * The version that writes itself is a completeness score: "your context is 40%
 * complete, add 3 more items". It is worse than nothing. It makes somebody feel
 * marked at the exact moment they are deciding whether this product is on their
 * side, and it tells them nothing about what they would get for the effort.
 *
 * "It will not be able to tell you whether the conditions were met, because none
 * have been named" carries the same information and does three things the score
 * cannot: it names the missing thing, it says what it costs, and it is a fact
 * about a tool rather than a judgement on a reader.
 *
 * So the assertions here are as much about the WORDING as the logic, because the
 * wording is the feature. A ground with thin context is still a real ground.
 */

const bare: GroundContextInputs = {
  partyCount: 2,
  hasSuccessDefinition: false,
  conditionCount: 0,
  hasBaseline: false,
  perPersonObjectiveCount: 0,
  openDocumentCount: 0,
  peopleWorkTogether: true,
  plannedSessions: 12,
};

const rich: GroundContextInputs = {
  partyCount: 4,
  hasSuccessDefinition: true,
  conditionCount: 3,
  hasBaseline: true,
  perPersonObjectiveCount: 4,
  openDocumentCount: 2,
  peopleWorkTogether: true,
  plannedSessions: 8,
};

describe('a ground with almost nothing in it', () => {
  const read = whatThisGroundCanTellYou(bare);

  it('still says what it CAN do, because it can always do something', () => {
    // Two accounts of the same work is the whole mechanism and needs nothing
    // else configured. A read that opened with a list of failures would be
    // telling somebody their ground is worthless, which is untrue.
    expect(read.can.length).toBeGreaterThan(0);
    expect(read.can.join(' ')).toMatch(/where your accounts of the same work differ/);
  });

  it('names what is missing, not that something is missing', () => {
    const text = read.cannot.join(' ');
    expect(text).toMatch(/because none have been named/);
    expect(text).toMatch(/because nobody has said what doing well looks like/);
    expect(text).toMatch(/because there is no record of where this stood at the start/);
  });

  it('says what each gap costs, in the same sentence', () => {
    // The half that makes it worth reading. "No baseline" is a fact about a form;
    // "show movement, only position" is a consequence.
    expect(read.cannot.join(' ')).toMatch(/show movement, only position/);
  });
});

describe('a ground with real context in it', () => {
  const read = whatThisGroundCanTellYou(rich);

  it('can do the things the bare one could not', () => {
    const text = read.can.join(' ');
    expect(text).toMatch(/conditions you named turned out to be true/);
    expect(text).toMatch(/show movement/);
    expect(text).toMatch(/against what they were personally trying to achieve/);
    expect(text).toMatch(/who is waiting on whom/);
  });

  it('and has little left to refuse', () => {
    expect(read.cannot.length).toBeLessThanOrEqual(1);
  });
});

describe('the cases that are about the shape of the ground rather than its context', () => {
  it('one person is a record, not a comparison', () => {
    const read = whatThisGroundCanTellYou({ ...bare, partyCount: 1 });
    expect(read.cannot.join(' ')).toMatch(/only one person is in this ground/);
  });

  it('two people cannot answer who this depended on', () => {
    // Not a gap in what they provided. A fact about two.
    const read = whatThisGroundCanTellYou({ ...rich, partyCount: 2, perPersonObjectiveCount: 2 });
    expect(read.cannot.join(' ')).toMatch(/only the two of you are in it/);
  });

  it('a cohort is told it has no corroboration, and what it has instead', () => {
    // Both halves. The limitation is real and so is the thing only a cohort can
    // do, and a read that gave only the first would be describing a defect.
    const read = whatThisGroundCanTellYou({ ...rich, peopleWorkTogether: false });
    expect(read.cannot.join(' ')).toMatch(/none of you sees the others' work/);
    expect(read.can.join(' ')).toMatch(/the same gap appears in account after account/);
  });

  it('one session cannot show change', () => {
    const read = whatThisGroundCanTellYou({ ...rich, plannedSessions: 1 });
    expect(read.cannot.join(' ')).toMatch(/one session is a snapshot/);
  });

  it('counts partial per-person objectives honestly', () => {
    const read = whatThisGroundCanTellYou({ ...rich, perPersonObjectiveCount: 2 });
    expect(read.cannot.join(' ')).toMatch(/2 of you are doing against your own objective/);
  });
});

describe('the words it must not use', () => {
  /**
   * The whole point, asserted. Every scenario, checked for the vocabulary of
   * marking - because the moment one of these appears, the read has become a
   * score and the reader has become a candidate.
   */
  const scenarios: GroundContextInputs[] = [
    bare,
    rich,
    { ...bare, partyCount: 1 },
    { ...rich, peopleWorkTogether: false },
    { ...rich, plannedSessions: 1 },
    { ...rich, perPersonObjectiveCount: 1 },
  ];

  const forbidden = [
    /\bscore\b/i, /\bgrade\b/i, /\brating\b/i, /\bweak\b/i, /\bpoor\b/i,
    /\bincomplete\b/i, /\binsufficient\b/i, /\bfail/i, /\b\d+%/, /out of \d+/i,
    /you (have )?(not|failed|should)/i, /you must/i, /required/i,
  ];

  for (const [i, s] of scenarios.entries()) {
    it(`scenario ${i + 1} says nothing that reads as a mark`, () => {
      const text = [...whatThisGroundCanTellYou(s).can, ...whatThisGroundCanTellYou(s).cannot].join(' ');
      for (const pattern of forbidden) {
        expect({ pattern: String(pattern), found: pattern.test(text) }).toMatchObject({ found: false });
      }
    });
  }

  it('and talks about the report rather than about the reader', () => {
    // "It will not be able to" is a fact about a tool. "You have not provided" is
    // an accusation. They carry identical information.
    const sentence = contextStrengthSentence(whatThisGroundCanTellYou(bare));
    expect(sentence).toMatch(/^The report will be able to/);
    expect(sentence).toMatch(/It will not be able to/);
  });
});

describe('the prose form', () => {
  it('reads as sentences, not as a list with commas', () => {
    const sentence = contextStrengthSentence(whatThisGroundCanTellYou(rich));
    expect(sentence).toMatch(/, and /);
    expect(sentence.endsWith('.')).toBe(true);
  });

  it('survives a read with nothing on one side', () => {
    const sentence = contextStrengthSentence({ can: ['do the one thing'], cannot: [] });
    expect(sentence).toBe('The report will be able to do the one thing.');
  });
});
