import {
  nextMove,
  afterOffering,
  afterOutcome,
  consecutiveMisses,
  lastOutcome,
  coachingBlockFor,
  EMPTY,
  MISSES_BEFORE_IT_CHANGES,
  type CoachingStateShape,
  type SessionRead,
} from './one-step-at-a-time';

/**
 * A STEP NOT MANAGED TWICE IS INFORMATION ABOUT THE STEP. (G42)
 *
 * The coaching tables have been in the database since the migration that added
 * them and nothing has ever written a row - so every wall test written for
 * coaching has been guarding the absence of a leak in a feature that produced
 * nothing. This is the machine those walls were built for.
 *
 * The assertions are mostly about restraint, because that is where this either
 * works or becomes the thing the whole product refuses to be:
 *
 *   one step, never a list
 *   nothing offered on an empty session
 *   nothing offered without a reason
 *   two misses and the step changes, rather than being repeated at somebody
 *   nothing that accumulates into a judgement
 */

const read = (over: Partial<SessionRead> = {}): SessionRead => ({
  noticed: 'Works the friendly contact rather than the person who can sign',
  lookingLike: 'Gets to the person with budget and authority, even when it is awkward',
  reason: 'two of the three named conversations were with the same friendly contact',
  sessionNumber: 3,
  hadSubstance: true,
  ...over,
});

describe('when nothing is offered at all', () => {
  it('says nothing on a session with no reason', () => {
    // A step with no reason is an accusation with a to-do attached.
    const move = nextMove(EMPTY, read({ reason: '' }));
    expect(move).toMatchObject({ move: 'wait' });
  });

  it('says nothing on a session with nothing checkable in it', () => {
    // Somebody having a quiet week must not be handed homework for it. A step
    // offered on no evidence is a guess the person then has to carry.
    expect(nextMove(EMPTY, read({ hadSubstance: false })).move).toBe('wait');
  });

  it('says nothing when there is no destination to walk toward', () => {
    // The paired success signal IS the step. Without it there is a problem named
    // and nowhere to go, which is the worst thing this could produce.
    expect(nextMove(EMPTY, read({ lookingLike: null })).move).toBe('wait');
  });

  it('and waiting produces no block for the model', () => {
    expect(coachingBlockFor({ move: 'wait', because: 'x' })).toBeNull();
  });
});

describe('one step, and then a question about it', () => {
  it('offers exactly one, with what prompted it', () => {
    const move = nextMove(EMPTY, read());
    expect(move.move).toBe('offer');
    expect((move as any).step).toMatch(/budget and authority/);
    expect((move as any).because).toMatch(/same friendly contact/);
  });

  it('never offers a second while the first is unanswered', () => {
    // THE REGRESSION THAT MAKES THIS A LIST. Two open steps is a performance
    // review with bullet points, and somebody handed five things does none.
    const offered = afterOffering(EMPTY, 'Gets to the person with budget and authority', 3);
    const move = nextMove(offered, read({ sessionNumber: 4 }));
    expect(move).toMatchObject({ move: 'ask about the last one' });
    expect((move as any).step).toMatch(/budget and authority/);
  });

  it('and the ask takes "nothing happened" as a complete answer', () => {
    const block = coachingBlockFor({ move: 'ask about the last one', step: 'Gets to the buyer' })!;
    expect(block).toMatch(/"Nothing happened" and "I did something else instead" are both complete answers/);
    expect(block).toMatch(/as a question and not a check/);
  });

  it('the offer says offer, not require', () => {
    const block = coachingBlockFor({ move: 'offer', step: 'Gets to the buyer', because: 'a reason' })!;
    expect(block).toMatch(/Offer it, do not require it/);
    expect(block).toMatch(/never offer a second one/);
    // And silence is allowed, which is what stops it being shoehorned in.
    expect(block).toMatch(/If no natural moment comes, say nothing/);
  });
});

describe('what happens when a step does not happen', () => {
  const twiceMissed = (): CoachingStateShape => {
    let s = afterOffering(EMPTY, 'Gets to the person with budget and authority', 3);
    s = afterOutcome(s, 'not done');
    s = afterOffering(s, 'Gets to the person with budget and authority', 4);
    s = afterOutcome(s, 'not done');
    return s;
  };

  it('counts the misses', () => {
    expect(consecutiveMisses(twiceMissed())).toBe(MISSES_BEFORE_IT_CHANGES);
  });

  it('changes the step rather than repeating it', () => {
    // THE RULE THIS FILE IS NAMED FOR. A third offer of the same thing is the
    // product blaming somebody for its own bad guess.
    const move = nextMove(twiceMissed(), read({ sessionNumber: 5 }));
    expect(move.move).toBe('shrink');
    expect((move as any).because).toMatch(/too big or not actually theirs to do/);
  });

  it('and the shrink block says whose fault it is not', () => {
    const block = coachingBlockFor({ move: 'shrink', step: 'Gets to the buyer', because: 'x' })!;
    expect(block).toMatch(/information about the step rather than about them/);
    expect(block).toMatch(/Do not repeat the original/);
  });

  it('a miss keeps the step open, so it can be asked about again', () => {
    let s = afterOffering(EMPTY, 'a step', 3);
    s = afterOutcome(s, 'not done');
    expect(s.currentStep).toBe('a step');
  });
});

describe('what happens when it does', () => {
  it('closes the step, so nobody is asked about it in week nine', () => {
    let s = afterOffering(EMPTY, 'a step', 3);
    s = afterOutcome(s, 'done');
    expect(s.currentStep).toBeNull();
    expect(lastOutcome(s)).toBeNull();
  });

  it('moves up the staircase on done and on doing more', () => {
    // Progress is the step getting harder, not a count getting higher.
    for (const outcome of ['done', 'did more'] as const) {
      let s = afterOffering(EMPTY, 'a step', 3);
      s = afterOutcome(s, outcome);
      expect({ outcome, at: s.staircasePosition }).toMatchObject({ at: 1 });
    }
  });

  it('holds position when they did something else that addressed it', () => {
    // They engaged with it, differently. Counting that as a miss would be the
    // product marking somebody down for solving the problem their own way.
    let s = afterOffering(EMPTY, 'a step', 3);
    s = afterOutcome(s, 'sideways');
    expect(s.staircasePosition).toBe(0);
    expect(s.currentStep).toBeNull();
    expect(consecutiveMisses(s)).toBe(0);
  });

  it('an outcome starts as nobody having said', () => {
    // A default of anything else would put a fact in the record that nobody said.
    const s = afterOffering(EMPTY, 'a step', 3);
    expect(s.history[0].outcome).toBeNull();
    expect(lastOutcome(s)).toBeNull();
  });
});

describe('nothing here accumulates into a judgement', () => {
  it('exports no score, no streak, and no read of how somebody is doing', () => {
    /**
     * ASSERTED ON THE SHAPE OF THE MODULE, because this is the line the whole
     * feature sits on: the history exists so the coach can shrink a step, not so
     * anybody can count failures. Adding such a function would have to be a
     * deliberate act rather than a slip.
     */
    const api = require('./one-step-at-a-time');
    for (const name of Object.keys(api)) {
      expect({ name, bad: /score|rating|streak|performance|grade|assess/i.test(name) })
        .toMatchObject({ bad: false });
    }
  });

  it('and the history holds outcomes, never a verdict on the person', () => {
    let s = afterOffering(EMPTY, 'a step', 3);
    s = afterOutcome(s, 'not done');
    expect(Object.keys(s.history[0]).sort()).toEqual(['givenAtSession', 'outcome', 'step']);
  });
});
