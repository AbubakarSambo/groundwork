import {
  readsAsAJudgement,
  whyThisIsNotACondition,
  readinessRead,
  dependsOnSomebodyNotHere,
  distanceToObjective,
  learningLine,
  type Condition,
} from './what-has-to-be-true';

/**
 * THE MOMENT THIS BECOMES A COMPETENCY FRAMEWORK, IT IS OVER. (G15-G19)
 *
 * A condition is a claim about the world. "A client account is free to hand over"
 * is either true or not, somebody could arrange it, and if it is missing that is
 * a fact about the setup. "Shows initiative" is a judgement about a person
 * wearing a condition's clothes - and a system that accepts it has a tracked,
 * dated, permanent record of somebody's character, which is the precise thing
 * this product exists not to build.
 *
 * So the check is deliberately over-eager. Rejecting a real condition costs
 * somebody a rephrase. Accepting one judgement has no way back, because by the
 * time anybody notices it is in twelve weeks of records.
 *
 * WHY THE MIDDLE MATTERS AT ALL. Without it a failed ground produces one finding:
 * the person did not get there. With it, the same ground usually produces the
 * true one - the objective needed three things, two were never in place, and
 * nobody noticed because nobody had written them down.
 */

describe('a condition is about the world', () => {
  const real = [
    'A client account is free to hand over by month two',
    'The migration environment exists and somebody can grant access',
    'The grant terms are shared with everybody who has to report against them',
    'Two lab leads are recruited before the second site opens',
  ];

  it('accepts things that are either true or not', () => {
    for (const text of real) {
      expect({ text, judgement: readsAsAJudgement(text) }).toMatchObject({ judgement: null });
    }
  });

  const judgements = [
    'Shows initiative',
    'Demonstrates ownership of the work',
    'Has the right attitude',
    'Is proactive about raising blockers',
    'Is a strong communicator',
    'Is capable of handling a difficult client',
    'Fits in with the team',
    'Willingness to learn',
  ];

  it('refuses judgements about a person, however reasonable they sound', () => {
    // THE REGRESSION. Every one of these is a sentence a decent manager might
    // write in good faith, and every one turns the ground into a competency
    // framework the moment it is stored as a requirement.
    for (const text of judgements) {
      expect({ text, judgement: readsAsAJudgement(text) }).not.toMatchObject({ judgement: null });
    }
  });

  it('says why, and offers the shape of the fix', () => {
    // "Invalid condition" makes people delete the thought. The thought is usually
    // a real one badly worded, so the message asks the question that rescues it.
    const why = whyThisIsNotACondition('Shows initiative on the client work');
    expect(why).toMatch(/judgement about a person/);
    expect(why).toMatch(/What would have to be TRUE/);
  });

  it('and says nothing when there is nothing to say', () => {
    expect(whyThisIsNotACondition(real[0])).toBeNull();
  });
});

describe('readiness, where "not checked" is its own answer', () => {
  const c = (status: Condition['status']): Condition => ({ text: 'x', status });

  it('reports what is not in place, which is the most valuable state', () => {
    expect(readinessRead([c('in place'), c('not in place'), c('in place')]).line)
      .toMatch(/1 of the 3 things this depends on is not in place/);
  });

  it('does not let unchecked read as fine', () => {
    // THE REGRESSION. A ground whose conditions were never checked is in a
    // different position from one whose conditions hold, and collapsing the two
    // is how a report ends up confidently wrong.
    const line = readinessRead([c('in place'), c('unknown')]).line;
    // Singular here, because one condition is unchecked. The pluralisation is
    // the code being right and my first assertion being lazy.
    expect(line).toMatch(/has not been checked/);
    expect(line).toMatch(/Not checked is not the same as fine/);
  });

  it('says plainly when nothing was named', () => {
    expect(readinessRead([]).line).toMatch(/nothing here can tell you whether this was set up to succeed/);
  });

  it('and says so when everything held', () => {
    expect(readinessRead([c('in place'), c('in place')]).line).toMatch(/All 2 things this depends on were in place/);
  });

  it('reports "not in place" ahead of "unknown" when both exist', () => {
    // A known failure outranks an unknown. Leading with the unknown would bury
    // the thing somebody can act on today.
    expect(readinessRead([c('not in place'), c('unknown')]).line).toMatch(/not in place/);
  });
});

describe('who this depends on, against who is actually here', () => {
  it('says nothing when everybody needed is present', () => {
    expect(dependsOnSomebodyNotHere(['a', 'b'], ['a', 'b', 'c']).line).toBeNull();
  });

  it('names the people who are needed and absent', () => {
    // The finding that explains most stuck grounds: the objective needed somebody
    // who was never in the room, so twelve weeks of check-ins circled a decision
    // nobody present could make.
    const { missing, line } = dependsOnSomebodyNotHere(['a', 'b', 'x'], ['a', 'b']);
    expect(missing).toBe(1);
    expect(line).toMatch(/1 of the people this depends on is not in this ground/);
  });

  it('counts the dependencies with nobody named at all, separately', () => {
    // Different problem, different fix. An absent person is somebody to invite;
    // an unnamed dependency is a decision that has not been made.
    expect(dependsOnSomebodyNotHere([null, null], ['a']).line)
      .toMatch(/2 of the things this depends on have nobody's name against them/);
  });

  it('reports both at once when both are true', () => {
    expect(dependsOnSomebodyNotHere(['x', null], ['a']).line)
      .toMatch(/is not in this ground, and 1 more has nobody named at all/);
  });
});

describe('the distance to the objective, and whose it is', () => {
  it('says when everything left is a condition nobody arranged', () => {
    // The case a single number would report identically to the next one, and it
    // is the opposite situation.
    const line = distanceToObjective([
      { text: 'no account free', belongsTo: 'the conditions' },
      { text: 'no environment', belongsTo: 'the conditions' },
    ]).line;
    expect(line).toMatch(/Everything still standing in the way is a condition nobody has arranged/);
  });

  it('says when what is left is theirs', () => {
    expect(distanceToObjective([{ text: 'has not run one alone', belongsTo: 'the person' }]).line)
      .toMatch(/one thing for this person to do/);
  });

  it('splits it when it is both, which is the usual case', () => {
    const { line, theirs, conditions } = distanceToObjective([
      { text: 'a', belongsTo: 'the conditions' },
      { text: 'b', belongsTo: 'the conditions' },
      { text: 'c', belongsTo: 'the person' },
    ]);
    expect(conditions).toBe(2);
    expect(theirs).toBe(1);
    expect(line).toMatch(/2 of the 3 things still in the way are conditions nobody has arranged, and 1 is for this person/);
  });

  it('never produces a score or a percentage', () => {
    // The whole reason this returns a list. One number lets a reader assume the
    // remaining distance is the person's, which is the default assumption anyway
    // and the one most often wrong.
    const { line } = distanceToObjective([
      { text: 'a', belongsTo: 'the conditions' },
      { text: 'b', belongsTo: 'the person' },
    ]);
    expect(line).not.toMatch(/%|out of \d+|score|rating/i);
  });

  it('says so plainly when nothing is in the way', () => {
    expect(distanceToObjective([]).line).toMatch(/Nothing is recorded as standing between here and the objective/);
  });
});

describe('what somebody needs to know', () => {
  it('is a fact about the onboarding, not a note about the person', () => {
    // "This needs somebody who knows the escalation path and nobody has taught
    // it" gets fixed. "Does not know the escalation path" goes in a file.
    const line = learningLine(['the escalation path', 'the pricing rules'], ['the pricing rules']);
    expect(line).toMatch(/has not been covered by anyone/);
    expect(line).not.toMatch(/does not know|lacks|unable/i);
  });

  it('says when everything was covered', () => {
    expect(learningLine(['a'], ['a'])).toMatch(/have been covered/);
  });

  it('and says nothing where nothing was named', () => {
    expect(learningLine([], [])).toBeNull();
  });

  it('matches case-insensitively, so a capital does not read as untaught', () => {
    expect(learningLine(['The Escalation Path'], ['the escalation path'])).toMatch(/have been covered/);
  });
});
