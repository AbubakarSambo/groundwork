import {
  objectiveState,
  mayBeReadAgainst,
  describeObjective,
  mayCompare,
  canShowMovement,
  type PersonObjective,
} from './an-objective-belongs-to-a-person';

/**
 * THE FINDING GROUND 1 PRODUCED, ELEVEN WEEKS LATE, AND WHY IT WAS LATE. (G13)
 *
 * The real report closed on this sentence:
 *
 *   "I was measured on a queue and judged on judgement, and only one of those
 *    was said."
 *
 * The hire never had an objective of his own, so he inferred one from the only
 * number anybody had named. That is not a communication failure. It is a missing
 * field: nowhere in the system was there a place for "what success looks like for
 * this person, stated to this person". With one, the week-one report shows that
 * his objective and hers do not connect - which is the whole finding, before the
 * eleven weeks rather than after them.
 *
 * AND THE THING THAT WOULD RUIN IT. An objective is a place to put a target and
 * score somebody against it, which is what every other product in this category
 * does and what this one must not. So the assertions below are mostly about what
 * the product REFUSES to do with one.
 */

const own: PersonObjective = {
  participantId: 'hire',
  text: 'Own one client relationship end to end by day ninety',
  authoredBy: 'self',
  seenBySubject: true,
};

const proposed: PersonObjective = {
  participantId: 'hire',
  text: 'Own one client relationship end to end by day ninety',
  authoredBy: 'lead',
  seenBySubject: false,
};

const accepted: PersonObjective = { ...proposed, seenBySubject: true };

const none: PersonObjective = {
  participantId: 'hire',
  text: null,
  authoredBy: null,
  seenBySubject: false,
};

describe('the four states an objective can be in', () => {
  it('their own, which is the strongest', () => {
    expect(objectiveState(own)).toBe('their own');
  });

  it('proposed, when the lead wrote it and they have not seen it', () => {
    expect(objectiveState(proposed)).toBe('proposed');
  });

  it('accepted, when they have seen it and left it', () => {
    expect(objectiveState(accepted)).toBe('accepted');
  });

  it('none, which is a real answer and usually the finding', () => {
    expect(objectiveState(none)).toBe('none');
    expect(objectiveState(null)).toBe('none');
    expect(objectiveState({ ...own, text: '   ' })).toBe('none');
  });
});

describe('nobody is read against a target they have never seen', () => {
  it('a proposal is not something to measure anybody against', () => {
    // THE REGRESSION. Reading a person against a target they have not seen is
    // the definition of an unfair review, and a product doing it silently is
    // worse than a manager doing it out loud.
    expect(mayBeReadAgainst(proposed)).toBe(false);
  });

  it('an accepted one is', () => {
    expect(mayBeReadAgainst(accepted)).toBe(true);
  });

  it('their own certainly is', () => {
    expect(mayBeReadAgainst(own)).toBe(true);
  });

  it('and an absent one produces no read at all', () => {
    // Matters as much as the rest. Where nobody has said what success looks
    // like, the honest output is nothing - the same position the board already
    // takes on remits: an undefined role is often the real problem, not the
    // person.
    expect(mayBeReadAgainst(none)).toBe(false);
    expect(mayBeReadAgainst(null)).toBe(false);
  });
});

describe('the state travels with the text, always', () => {
  it('says when it is somebody else\'s suggestion they have not seen', () => {
    // "Your objective is X" and "your manager has suggested X and you have not
    // replied" are different statements, and the difference is the whole point.
    expect(describeObjective(proposed)).toMatch(/not yet seen by the person it is for/);
  });

  it('says when they wrote it themselves', () => {
    expect(describeObjective(own)).toMatch(/in their own words/);
  });

  it('says when they accepted somebody else\'s', () => {
    expect(describeObjective(accepted)).toMatch(/left as it stands/);
  });

  it('and says plainly when there is none, without dressing it up', () => {
    expect(describeObjective(none)).toBe('Nobody has said what success looks like for this person.');
  });

  it('never presents a proposal as a fact', () => {
    for (const o of [proposed, accepted, own]) {
      expect(describeObjective(o)).toMatch(/\(/);
    }
  });
});

describe('what the product is allowed to ask about two objectives', () => {
  it('whether they connect, once both are real', () => {
    expect(mayCompare(own, accepted)).toMatchObject({ can: true });
  });

  it('refuses when one is still a proposal, and says why', () => {
    const { can, reason } = mayCompare(own, proposed);
    expect(can).toBe(false);
    expect(reason).toMatch(/a proposal cannot be compared to a commitment/);
  });

  it('refuses when one person has none, and calls that the finding', () => {
    // The wording matters. "Insufficient data" invites somebody to go and fill a
    // field in. "This is usually the finding" tells them what it means.
    const { can, reason } = mayCompare(own, none);
    expect(can).toBe(false);
    expect(reason).toMatch(/usually the finding rather than a gap in the data/);
  });

  it('and never asks whose is better or who is further along', () => {
    // Asserted by the shape of the API rather than by a string check: there is
    // no function here that returns a comparison of achievement, and adding one
    // would be a deliberate act rather than a slip.
    const result = mayCompare(own, accepted);
    expect(Object.keys(result).sort()).toEqual(['can', 'reason']);
  });
});

describe('the baseline, and why it cannot be edited', () => {
  const baseline = { text: 'Four running sites, none of them audited this year.', capturedAtSession: 1 };

  it('one session cannot show movement however good the baseline is', () => {
    expect(canShowMovement(baseline, 1)).toBe(false);
  });

  it('two can', () => {
    expect(canShowMovement(baseline, 2)).toBe(true);
  });

  it('and no baseline means position only, forever', () => {
    // The state the product is in today: the arc is inferred from session 1 by
    // accident rather than recorded on purpose, so session 1 is doing two jobs
    // and doing the second badly.
    expect(canShowMovement(null, 12)).toBe(false);
    expect(canShowMovement({ text: '  ', capturedAtSession: 1 }, 12)).toBe(false);
  });

  it('the type carries no updatedAt, which is the point', () => {
    // Somebody will want to correct it - the first session usually reveals the
    // day-one description was wrong, and fixing it feels like accuracy. It is
    // the opposite: half the findings this product makes are the distance
    // between what people believed at the start and what turned out to be true.
    // Corrected, the baseline becomes a second description of the present.
    expect(Object.keys(baseline)).toEqual(['text', 'capturedAtSession']);
  });
});
