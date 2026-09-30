import * as fs from 'fs';
import * as path from 'path';
import { nothingToTakeFrom, traceableToWhatTheySaid, aLengthTheyCouldHaveMeant, dropsAPromiseWithNothingToKeep } from './nothing-proposed-that-nobody-said';

/**
 * "I WILL RECORD THAT AS WHAT DOING WELL LOOKS LIKE: 'HI! WHAT'S ON YOUR MIND?'"
 *
 * In the browser, 22 September 2026. She typed "hi". The chat asked its next gap question, ignored
 * her, and offered its own greeting - from the turn before - as the yardstick every report reads her
 * team against, with a Yes button under it.
 */
describe('nothing proposed that nobody said', () => {
  it('a greeting has nothing in it to take', () => {
    for (const said of ['hi', 'Hi!', 'hello', 'hey', 'thanks', 'ok', 'okay', 'cool', 'got it', 'yes', 'hmm', 'not sure yet']) {
      expect(nothingToTakeFrom(said)).toBe(true);
    }
    expect(nothingToTakeFrom('')).toBe(true);
  });

  it('and an answer does', () => {
    for (const said of [
      'Doing well is every deal having a budget owner and a date',
      '12 weeks',
      'about three months',
      'Amina should close 4m this quarter',
    ]) expect(nothingToTakeFrom(said)).toBe(false);
  });

  it('the words of a proposal have to be their words', () => {
    const said = 'Doing well is every deal on the board having a budget owner and a date we agreed';
    /* A tidy-up keeps the nouns. */
    expect(traceableToWhatTheySaid('Every deal on the board has a budget owner and an agreed date', said)).toBe(true);
    /* An invention keeps nothing. */
    expect(traceableToWhatTheySaid("Hi! What's on your mind?", said)).toBe(false);
    expect(traceableToWhatTheySaid('The team is aligned and morale is high', said)).toBe(false);
    /* And nothing said means nothing traceable, which is the "hi" case. */
    expect(traceableToWhatTheySaid('anything at all here', 'hi')).toBe(false);
    expect(traceableToWhatTheySaid('', said)).toBe(false);
  });

  it('a length has to have a number behind it', () => {
    expect(aLengthTheyCouldHaveMeant(84, '12 weeks')).toBe(true);
    expect(aLengthTheyCouldHaveMeant(90, 'about three months')).toBe(true);
    expect(aLengthTheyCouldHaveMeant(90, 'until the end of December')).toBe(true);
    expect(aLengthTheyCouldHaveMeant(90, 'hi')).toBe(false);
    expect(aLengthTheyCouldHaveMeant(90, 'as long as it takes')).toBe(false);
    expect(aLengthTheyCouldHaveMeant(null, '12 weeks')).toBe(false);
  });

  it('and the chat refuses to read a greeting, checks every proposal, and answers before it asks', () => {
    const src = fs.readFileSync(path.join(__dirname, 'grounds.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(src).toContain('!nothingToTakeFrom(lastFromLead)');
    expect(src).toContain("dropped a ${proposal.kind} proposal whose words were not theirs");
    /* And at the write, not only at the offer. */
    expect(src).toContain('I could not find that in what you said, so nothing was recorded');
    const prompt = fs.readFileSync(path.join(__dirname, 'the-context-chat.ts'), 'utf8');
    expect(prompt).toContain('ANSWER THEM BEFORE YOU ASK');
    expect(prompt).toContain('is not a conversation, and it is the thing people close this panel over');
  });
});

/*
 * FIX 4, 30 September 2026. Driven live: after "Ben should be more proactive", the chat said "I will
 * record this as your read of Ben... it will never be quoted to Ben" and nothing was recorded - a
 * false statement, since nothing was ever proposed that turn. A sentence promising to record or keep
 * something is dropped unless a proposal is actually attached to the same turn.
 */
describe('dropsAPromiseWithNothingToKeep: nothing says it will be recorded unless something actually is', () => {
  it('drops the promise when nothing is proposed', () => {
    expect(dropsAPromiseWithNothingToKeep(
      'I will record this as your read of Ben. It will never be quoted to Ben.', false,
    )).toBe('It will never be quoted to Ben.');
  });

  it('leaves the sentence alone when a proposal is attached this turn', () => {
    const text = 'I will record this as your read of Ben. It will never be quoted to Ben.';
    expect(dropsAPromiseWithNothingToKeep(text, true)).toBe(text);
  });

  it('catches the other phrasings the model uses for the same promise', () => {
    expect(dropsAPromiseWithNothingToKeep('Keeping that as a private note.', false)).toBe('');
    expect(dropsAPromiseWithNothingToKeep('That will be recorded for you.', false)).toBe('');
    expect(dropsAPromiseWithNothingToKeep('I will keep a note of that.', false)).toBe('');
  });

  it('leaves an ordinary sentence with no such promise untouched either way', () => {
    expect(dropsAPromiseWithNothingToKeep('What have you seen that makes you say that?', false))
      .toBe('What have you seen that makes you say that?');
  });
});
