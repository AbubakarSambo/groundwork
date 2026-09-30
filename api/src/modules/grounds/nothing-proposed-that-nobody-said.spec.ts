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

  /*
   * FOUND LIVE AGAIN, 30 September 2026, on the four live checks: this test used to assert the
   * OPPOSITE - that a proposal attached this turn made the model's own restating sentence fine to
   * keep. It is not: `proposal.say` is the one true statement of what gets kept, built
   * deterministically from the lead's own words, and the model's own restatement is a second,
   * independent description of the same thing that is free to disagree with it - see fix 3 for the
   * two exact live sentences that did. The sentence is dropped either way now; only the reason
   * differs (a false promise with nothing behind it, or a true one told twice and possibly wrongly).
   */
  it('drops the model\'s own restating sentence even when a proposal is attached this turn, because proposal.say already says it', () => {
    const text = 'I will record this as your read of Ben. It will never be quoted to Ben.';
    expect(dropsAPromiseWithNothingToKeep(text, true)).toBe('It will never be quoted to Ben.');
  });

  it('catches the other phrasings the model uses for the same promise', () => {
    expect(dropsAPromiseWithNothingToKeep('Keeping that as a private note.', false)).toBe('');
    expect(dropsAPromiseWithNothingToKeep('That will be recorded for you.', false)).toBe('');
    expect(dropsAPromiseWithNothingToKeep('I will keep a note of that.', false)).toBe('');
  });

  /*
   * FOUND LIVE, 30 September 2026, on the very first real run of the four live checks (port 3001,
   * real Gemini): the first version of this regex only caught the future tense, and the model said
   * the same false promise two OTHER ways on that one run - past tense on the old route, present
   * continuous on Ask Groundwork - neither of which the first version dropped.
   */
  it('catches the past tense, exactly as the old route said it live: "I have recorded..."', () => {
    expect(dropsAPromiseWithNothingToKeep('I have recorded that as your read of Ben.', false)).toBe('');
  });

  it('catches the present continuous, exactly as Ask Groundwork said it live: "I am recording..."', () => {
    expect(dropsAPromiseWithNothingToKeep(
      "I'm recording that you see Ben as struggling and difficult to work with.", false,
    )).toBe('');
    expect(dropsAPromiseWithNothingToKeep('I am recording that.', false)).toBe('');
  });

  /*
   * FOUND LIVE AGAIN, 30 September 2026, on the four live checks: neither door dropped this, because
   * "I'll" is a contraction with no space before the apostrophe, which the old regex required.
   */
  it('catches the contraction, exactly as both doors said it live: "I\'ll record..."', () => {
    expect(dropsAPromiseWithNothingToKeep(
      "I'll record what you tell me as your perspective on Ben, and it will guide how we run this check-in.",
      false,
    )).toBe('');
  });

  it('catches "I\'m going to" and "we\'ll" as well', () => {
    expect(dropsAPromiseWithNothingToKeep("I'm going to record that as your expectation of Ben.", false)).toBe('');
    expect(dropsAPromiseWithNothingToKeep("We'll record that as your read of Ben.", false)).toBe('');
  });

  it('catches "record ... as your perspective/read/expectation" without needing "I" right next to the verb', () => {
    expect(dropsAPromiseWithNothingToKeep('That is noted as your read of Ben.', false)).toBe('');
  });

  /*
   * FIX 3, FOUND LIVE, 30 September 2026, on the four live checks: with a proposal attached, the
   * model's own sentence restating what it would add sometimes contradicted the real say-back beside
   * it - "I can add that you expect Ben to be more proactive." beside an offer to keep "should be
   * more proactive" as a PRIVATE NOTE, and "I can add that Ben expects to close three renewals by the
   * end of December." (wrong person, and "three" instead of the said-back "3") beside the correct
   * say-back. Neither had been caught, because "can add" was not in the old pattern at all.
   */
  it('drops "I can add that ..." beside a lead_read proposal, exactly as it was said live', () => {
    expect(dropsAPromiseWithNothingToKeep(
      'I can add that you expect Ben to be more proactive. Is there anything else you have seen?', true,
    )).toBe('Is there anything else you have seen?');
  });

  it('drops "I can add that ..." beside an expectation proposal, exactly as it was said live', () => {
    expect(dropsAPromiseWithNothingToKeep(
      'I can add that Ben expects to close three renewals by the end of December.', true,
    )).toBe('');
  });

  /*
   * FOUND LIVE AGAIN, 30 September 2026, on the four live checks (output line 74): before the lead
   * had said yes to anything, Ask Groundwork said, in one reply -
   *   "I have also recorded that you want the pipeline update by every Friday. This will be marked
   *   as your expectation for him, and when he checks in, he will be asked in his own words what he
   *   understands about his pipeline updates. What else have you tried with Ben, or what else have
   *   you observed that makes him difficult to work with?"
   * Nothing had been recorded yet, so the first sentence was false; the second restated what would
   * be kept beside the product's own say-back, which already says it. Only the model's question
   * should survive.
   */
  it('drops "I have also recorded..." - an adverb between the modal and the verb, exactly as said live', () => {
    expect(dropsAPromiseWithNothingToKeep(
      'I have also recorded that you want the pipeline update by every Friday.', true,
    )).toBe('');
  });

  it('drops "This will be marked as your expectation..." - a subjectless passive promise, exactly as said live', () => {
    expect(dropsAPromiseWithNothingToKeep(
      'This will be marked as your expectation for him, and when he checks in, he will be asked in his own words what he understands about his pipeline updates.',
      true,
    )).toBe('');
  });

  it('drops both sentences together and keeps only the model\'s question, exactly as the live reply read', () => {
    const text =
      'I have also recorded that you want the pipeline update by every Friday. This will be marked ' +
      'as your expectation for him, and when he checks in, he will be asked in his own words what he ' +
      'understands about his pipeline updates. What else have you tried with Ben, or what else have ' +
      'you observed that makes him difficult to work with?';
    expect(dropsAPromiseWithNothingToKeep(text, true)).toBe(
      'What else have you tried with Ben, or what else have you observed that makes him difficult to work with?',
    );
  });

  it('catches other adverbs in the same gap: "already", "now", "just", "gone ahead and"', () => {
    expect(dropsAPromiseWithNothingToKeep("I've already noted that Ben missed his last check-in.", false)).toBe('');
    expect(dropsAPromiseWithNothingToKeep('I will now record that as your expectation.', false)).toBe('');
    expect(dropsAPromiseWithNothingToKeep("I'll just add that to his notes.", false)).toBe('');
    expect(dropsAPromiseWithNothingToKeep('I have gone ahead and recorded that.', false)).toBe('');
  });

  it('two sentences that must survive untouched: a genuine follow-up question and a plain observation', () => {
    expect(dropsAPromiseWithNothingToKeep('What else have you tried with Ben?', false))
      .toBe('What else have you tried with Ben?');
    expect(dropsAPromiseWithNothingToKeep('I hear that Ben is struggling.', false))
      .toBe('I hear that Ben is struggling.');
  });

  it('a genuine question from the model survives, because nothing here matches a question', () => {
    expect(dropsAPromiseWithNothingToKeep('Should I record that as well?', true)).toBe('Should I record that as well?');
    expect(dropsAPromiseWithNothingToKeep('Should I record that as well?', false)).toBe('Should I record that as well?');
  });

  it('does not touch an ordinary sentence that happens to contain "note" or "record" as a different word', () => {
    expect(dropsAPromiseWithNothingToKeep('Note that Ben has been assigned a new client.', false))
      .toBe('Note that Ben has been assigned a new client.');
  });

  it('leaves an ordinary sentence with no such promise untouched either way', () => {
    expect(dropsAPromiseWithNothingToKeep('What have you seen that makes you say that?', false))
      .toBe('What have you seen that makes you say that?');
  });
});

/*
 * FOUND LIVE, 30 September 2026: on a ground with 'timeline' still open, confirming a `lead_read` or
 * `expectation` proposal read from the SECOND reading (WHO_AND_WHAT_THEY_EXPECT) - the only reading
 * that can hear it, since 'objectives' was not the open gap - could disagree with itself between the
 * two model calls PROPOSE and CONFIRM each make (a real, already-documented class of disagreement;
 * see the inventory's equivalence run for the success field). When it did, the lead was shown
 * "REFUSED 400: No length in that answer" - the OPEN GAP's own irrelevant refusal, about a timeline
 * question nobody had just answered - rather than an honest refusal about the thing they actually
 * confirmed.
 */
describe('a disagreement between the two model calls refuses honestly, not with the open gap\'s own unrelated reason', () => {
  const CODE = require('fs').readFileSync(require('path').join(__dirname, 'grounds.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, '');
  const apply = CODE.slice(CODE.indexOf('async applyContextProposal('), CODE.indexOf('private async writeWhatThePasteGave('));

  it('the refusal is the honest, generic one whenever the second reading was tried', () => {
    expect(apply).toContain('const triedTheSecondReading = openGap !== \'objectives\';');
    const block = apply.slice(apply.indexOf('const triedTheSecondReading'), apply.indexOf('/* The same rule where the write happens'));
    expect(block).toContain('triedTheSecondReading');
    expect(block).toContain('I could not find that in what you said, so nothing was recorded. Say it in your own words and I will take it.');
    /* And the open gap's own reason is only used when the second reading was never even tried. */
    expect(block).toContain(': proposal.why,');
  });
});
