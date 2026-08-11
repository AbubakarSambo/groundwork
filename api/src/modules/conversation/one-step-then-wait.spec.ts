import { readOutcome, moveFor, isGenericStep, sizeFor } from './coaching-step';

/**
 * COACHING IS ONE SMALL THING, THEN A WAIT, THEN THE NEXT THING FROM WHAT
 * ACTUALLY HAPPENED.
 *
 * Advice hands over a list. Coaching gives one step, waits a week, asks what
 * happened, and picks the next step from the answer. So the whole layer turns on
 * reading one answer correctly, and these pin that reading.
 *
 * The two failures that would matter most in front of a real person:
 *
 *   Congratulating somebody for a step they just told you they did NOT take.
 *   "I didn't send it" contains "sent", and a naive read calls that a success.
 *   It proves nobody is listening, and the next answer will be shorter.
 *
 *   Repeating the step at somebody who did not do it. The instinct is to say it
 *   again or add a second thing. That turns the check-in into a place where you
 *   get told off twice for the same thing, and people stop answering honestly.
 */

describe('reading what happened to the step', () => {
  it('hears a plain yes', () => {
    expect(readOutcome('I sent it on Tuesday.')).toBe('done');
    expect(readOutcome('Had the conversation with Kavon.')).toBe('done');
  });

  it('hears a plain no, even when the words of the step are in the sentence', () => {
    // THE ONE THAT MATTERS MOST. Every one of these contains a success word.
    expect(readOutcome("I didn't send it.")).toBe('not_done');
    expect(readOutcome('Not yet, I meant to call but ran out of time.')).toBe('not_done');
    expect(readOutcome('Haven’t had the conversation yet.')).toBe('not_done');
    expect(readOutcome('No, I kept putting it off.')).toBe('not_done');
  });

  it('hears reality answering, which is a done step whose point is the result', () => {
    // Treating this as a plain success and moving on abandons them exactly where
    // the help was needed.
    expect(readOutcome('I sent it and heard nothing back.')).toBe('sideways');
    expect(readOutcome('Sent it, they replied asking about price.')).toBe('sideways');
    expect(readOutcome('I asked and they said no.')).toBe('sideways');
  });

  it('hears somebody who went further than they were asked', () => {
    expect(readOutcome('I sent it, and then I also called two of them.')).toBe('did_more');
  });

  it('admits when it cannot tell, rather than guessing', () => {
    // Guessing here means acting on a misread, which is worse than asking.
    expect(readOutcome('')).toBe('unclear');
    expect(readOutcome('It has been a strange week.')).toBe('unclear');
  });
});

describe('the move that follows', () => {
  it('never repeats the step at somebody who did not do it', () => {
    // THE REGRESSION THIS PREVENTS. The obstacle is the coaching, not the step.
    expect(moveFor('not_done')).toBe('ask_the_obstacle');
    expect(moveFor('not_done')).not.toBe('advance');
  });

  it('advances on a done step', () => {
    expect(moveFor('done')).toBe('advance');
  });

  it('picks up where they actually are when they overtook the step', () => {
    expect(moveFor('did_more')).toBe('meet_them_there');
  });

  it('works the result rather than the original plan when reality answered', () => {
    expect(moveFor('sideways')).toBe('work_the_result');
  });

  it('asks plainly when it cannot tell', () => {
    expect(moveFor('unclear')).toBe('ask_what_happened');
  });

  it('offers exactly one move for every outcome', () => {
    // One step per session is the mechanic. A branch that returned two things
    // would quietly turn this back into advice.
    const outcomes = ['done', 'did_more', 'not_done', 'sideways', 'unclear'] as const;
    for (const o of outcomes) expect(typeof moveFor(o)).toBe('string');
  });
});

describe('sizing the step to the person', () => {
  it('shrinks after a step that did not happen', () => {
    // "Draft it, do not send" is a real step for somebody who could not start.
    // "Send three" is not, and offering it just moves the failure along a week.
    expect(sizeFor('not_done')).toBe('shrink');
  });

  it('grows for somebody with momentum', () => {
    expect(sizeFor('did_more')).toBe('grow');
  });

  it('holds otherwise', () => {
    expect(sizeFor('done')).toBe('hold');
    expect(sizeFor('sideways')).toBe('hold');
  });
});

describe('a step that could have gone to anybody is not a step', () => {
  it('refuses the advice people have already heard and already not acted on', () => {
    for (const generic of [
      'Find some leads this week.',
      'Ask a colleague for an intro.',
      'Check LinkedIn for contacts.',
      'Network more.',
      'Do some research on the market.',
      'Reach out to a few people.',
      'Be more proactive with the client.',
      'Think about what is holding you back.',
    ]) {
      expect({ generic, rejected: isGenericStep(generic) }).toMatchObject({ rejected: true });
    }
  });

  it('accepts a step that could only have been written for this person', () => {
    for (const real of [
      'Draft the note to Priya at Brightwater about the March renewal. Do not send it yet.',
      'Ask Kavon directly whether the handover date moved, before Thursday.',
      'Put the Halden reset in writing and send it to Hafsah today.',
      'Follow up with Dana on the invoice she flagged on the 4th.',
    ]) {
      expect({ real, rejected: isGenericStep(real) }).toMatchObject({ rejected: false });
    }
  });

  it('treats an empty step as generic, because it is worse than generic', () => {
    expect(isGenericStep('')).toBe(true);
    expect(isGenericStep('   ')).toBe(true);
  });
});
