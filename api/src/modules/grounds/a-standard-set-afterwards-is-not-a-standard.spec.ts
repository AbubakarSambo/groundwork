import {
  TOPICS,
  nextMove,
  closingLine,
  standardAgainstRecord,
  A_STANDARD_SET_AFTERWARDS_IS_NOT_A_STANDARD,
  type InterviewState,
  type ChangeMyMind,
} from './an-interview-not-a-longer-setup';

/**
 * A STANDARD SET AFTERWARDS IS NOT A STANDARD. (G21, G22)
 *
 * G22 is the highest-value single question on the whole list and one of the
 * smallest things to build:
 *
 *   "I would keep him if he owns a client end to end by month three."
 *
 * Recorded in week one, before anything had happened. That is the standard the
 * week-twelve decision gets measured against, and she set it before she knew the
 * answer - so it cannot be accused of having moved. The protection runs towards
 * the person being decided about, not the person deciding.
 *
 * G21 is how it gets asked without turning setup into a form. The engineering
 * problem is entirely the stop condition: an interview that does not stop is a
 * form that nags, and a lead who gave a thin answer gave the answer they had.
 * Asking again produces a better-sounding one, not a truer one.
 */

const fresh: InterviewState = { asked: [], thin: [], followUps: {} };

describe('the interview drives, and then stops', () => {
  it('opens on what good looks like', () => {
    const move = nextMove(fresh);
    expect(move).toMatchObject({ move: 'ask' });
    expect((move as any).topic.id).toBe('what good looks like');
  });

  it('works through the topics once each', () => {
    const asked = TOPICS.slice(0, 3).map((t) => t.id);
    const move = nextMove({ ...fresh, asked });
    expect((move as any).topic.id).toBe('what happens after');
  });

  it('accepts a thin answer and moves on', () => {
    // THE REGRESSION G21 EXISTS FOR. Everywhere but one topic, thin is recorded
    // as thin and the interview keeps going - because the alternative is a
    // product that makes people justify themselves to a chat box before their
    // team has said a word.
    const move = nextMove({ asked: ['what good looks like'], thin: ['what good looks like'], followUps: {} });
    expect(move.move).toBe('ask');
  });

  it('follows up exactly once, and only where vagueness defeats the point', () => {
    const state: InterviewState = {
      asked: ['what good looks like', 'what would change your mind'],
      thin: ['what would change your mind'],
      followUps: {},
    };
    const move = nextMove(state);
    expect(move.move).toBe('follow up');
    expect((move as any).prompt).toMatch(/not a target to hold anybody to/i);

    // And never twice. The second ask is where an interview becomes an
    // interrogation, and the answer it produces is performed.
    expect(nextMove({ ...state, followUps: { 'what would change your mind': 1 } }).move).toBe('ask');
  });

  it('stops when the topics are done', () => {
    const move = nextMove({ asked: TOPICS.map((t) => t.id), thin: ['what happens after'], followUps: {} });
    expect(move).toMatchObject({ move: 'stop', unfilled: ['what happens after'] });
  });
});

describe('what it says about what it did not get', () => {
  it('says it once, as a state of the ground', () => {
    const line = closingLine(['what happens after', 'what you are unsure about']);
    expect(line).toMatch(/^That is enough to start/);
    expect(line).toMatch(/2 things are still thin/);
    // The sentence that keeps it from being a to-do list.
    expect(line).toMatch(/or leave it/);
  });

  it('and does not manufacture a gap where there is none', () => {
    expect(closingLine([])).toMatch(/everything worth asking/);
  });

  it('never nags', () => {
    for (const line of [closingLine([]), closingLine(['what has to be true'])]) {
      for (const p of [/please/i, /you (?:need|should|must)/i, /before you can/i, /incomplete/i, /required/i]) {
        expect({ line, p: String(p), hit: p.test(line) }).toMatchObject({ hit: false });
      }
    }
  });
});

describe('the standard, once set', () => {
  it('cannot be edited, and the type says so', () => {
    // Same argument as the baseline, and the same refusal to carry an updatedAt:
    // a standard editable in week eleven is a description of the outcome.
    const c: ChangeMyMind = { wouldReassure: 'a client owned end to end', wouldWorry: 'another handover slipping', setAtSession: 1 };
    expect(Object.keys(c).sort()).toEqual(['setAtSession', 'wouldReassure', 'wouldWorry']);
    expect(A_STANDARD_SET_AFTERWARDS_IS_NOT_A_STANDARD).toMatch(/cannot be edited/);
  });

  it('asks in both directions, which is what stops it being a target', () => {
    const q = TOPICS.find((t) => t.id === 'what would change your mind')!.question;
    expect(q).toMatch(/reassure you/);
    expect(q).toMatch(/worry you/);
  });
});

describe('the standard against the record', () => {
  it('says plainly when nothing ever reached it', () => {
    // THE MOST DECISION-RELEVANT STATE IN THE PRODUCT, and the one a boolean
    // cannot express: the stated standard that twelve weeks of accounts never
    // touched. Invisible unless something says it, because absence is.
    const { state, line } = standardAgainstRecord('owns a client end to end', 0);
    expect(state).toBe('not touched');
    expect(line).toMatch(/twelve weeks of accounts did not reach it/);
  });

  it('sends a reader to the entries when there are few', () => {
    expect(standardAgainstRecord('x', 1).line).toMatch(/Read it, rather than the summary/);
  });

  it('and says so when it is well covered', () => {
    expect(standardAgainstRecord('x', 5).state).toBe('covered');
  });

  it('never says whether the standard was met', () => {
    // The line this must not cross. "Covered" means the record speaks to it, not
    // that it went well - and one word of drift here turns a reading aid into
    // an automated verdict on somebody's job.
    for (const n of [0, 1, 5]) {
      const { line } = standardAgainstRecord('x', n);
      for (const p of [/\bmet\b/i, /\bachieved\b/i, /\bfell short\b/i, /\bon track\b/i, /\bsuccess(?:ful)?\b/i]) {
        expect({ n, line, p: String(p), hit: p.test(line) }).toMatchObject({ hit: false });
      }
    }
  });
});
