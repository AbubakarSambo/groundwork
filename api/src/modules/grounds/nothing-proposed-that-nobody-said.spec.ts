import * as fs from 'fs';
import * as path from 'path';
import { nothingToTakeFrom, traceableToWhatTheySaid, aLengthTheyCouldHaveMeant, dropsAPromiseWithNothingToKeep, whatTheModelsReplyShows } from './nothing-proposed-that-nobody-said';

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
  /*
   * FOUND LIVE AGAIN, 30 September 2026, on the four live checks: this used to assert the SECOND
   * sentence survived - "It will never be quoted to Ben." - once the first one, the promise it
   * continues, was dropped. Read on its own it is a fragment pointing at nothing: "it" has no
   * antecedent left on the page. See OPENS_WITH_A_DANGLING_PRONOUN and the live example that drove
   * the fix, "It will guide how this check-in is run..." orphaned the same way.
   */
  it('drops the promise when nothing is proposed, and the pronoun sentence that continued it', () => {
    expect(dropsAPromiseWithNothingToKeep(
      'I will record this as your read of Ben. It will never be quoted to Ben.', false,
    )).toBe('');
  });

  it('a pronoun-opening sentence survives when the sentence before it was not dropped', () => {
    expect(dropsAPromiseWithNothingToKeep(
      'Ben has missed two updates. It will help to know what you have already tried.', false,
    )).toBe('Ben has missed two updates. It will help to know what you have already tried.');
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
    /* And the pronoun sentence that continued the dropped one goes too - see the dangling-pronoun
       test above. */
    expect(dropsAPromiseWithNothingToKeep(text, true)).toBe('');
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

/*
 * THE FOUR LIVE CHECKS, RE-RUN AFTER FIX 7 (30 September 2026): the residual leaks that still reached
 * the browser on the real model - phrase-by-phrase regex dropping either caught the wrong half of a
 * sentence, or nothing at all of a phrasing nobody had written a pattern for yet. `whatTheModelsReplyShows`
 * replaces phrase-matching, for a turn with a proposal attached, with a structural rule: keep the
 * model's question, drop everything else, because `proposal.say` already says what will be kept.
 */
describe('whatTheModelsReplyShows: with a proposal attached, only the model\'s question survives', () => {
  /*
   * Item 16, second turn, both doors, live: the whole reply read "What is on the record now stays
   * too, as an earlier version." - the guard dropped the product's OWN restatement sentence
   * (`changeSay`, built in code by `restatesSuccess`/`saidBackForRestatedSuccess`) and left its tail
   * standing alone. Fixed by Rule 2, not here - `changeSay` never reaches this function at all now
   * (see grounds.service.ts) - so this proves the function would not have mangled it even if it had:
   * the two clauses read as one sentence with no question, so a proposal attached this turn means
   * nothing here is shown at all, never a fragment of it.
   */
  it('item 16\'s exact sentence, with no question in it, produces nothing rather than a fragment', () => {
    const text = 'I will record that as what doing well looks like now: "every stage has an owner and a next date", '
      + 'because the board kept going stale. What is on the record now stays too, as an earlier version.';
    expect(whatTheModelsReplyShows(text, true)).toBe('');
  });

  /*
   * Ask Groundwork, live: "I'll make a note of that: Ben is expected to close 3 renewals by the end
   * of December. To clarify, is this check-in running until the end of December?" - "make a note of"
   * has no modal directly before a record verb, so no regex in `dropsAPromiseWithNothingToKeep`
   * caught it. The structural rule needs no pattern for it: it is not a question, so it goes,
   * whatever words it uses.
   */
  it('"I\'ll make a note of that: ..." - a phrasing no regex caught - is dropped, and the question survives', () => {
    const text = "I'll make a note of that: Ben is expected to close 3 renewals by the end of December. "
      + 'To clarify, is this check-in running until the end of December?';
    expect(whatTheModelsReplyShows(text, true)).toBe('To clarify, is this check-in running until the end of December?');
  });

  /*
   * Ask Groundwork, live: "It will guide how this check-in is run and how I talk to you about it. It
   * is not quoted to Ben Okafor as a finding. Regarding the timeline, how long should this run?" - the
   * sentence "It" referred to (the model's own restating of the private-note offer) had already been
   * dropped, leaving two orphaned "It" sentences standing in front of the real question. Under the
   * structural rule neither survives regardless of what dropped the sentence before them: only a
   * question, or a short, claim-free, non-pronoun-opening sentence directly before the FIRST question,
   * is kept - and "It is not quoted to Ben Okafor as a finding." (the sentence directly before the
   * question) opens with a dangling pronoun, so it is refused that seat too.
   */
  it('"It will guide..." / "It is not quoted..." are both dropped; only the timeline question survives', () => {
    const text = 'It will guide how this check-in is run and how I talk to you about it. '
      + 'It is not quoted to Ben Okafor as a finding. '
      + 'Regarding the timeline, how long should this run?';
    expect(whatTheModelsReplyShows(text, true)).toBe('Regarding the timeline, how long should this run?');
  });

  /*
   * Ask Groundwork, live, before any yes: '"Good means every pipeline stage ..." is now the
   * description of success for this check-in.' - a false claim that something is already recorded,
   * in the present tense, with no promise VERB in it at all ("is now the description of", not
   * "record/mark/note/keep/save"), so `PROMISES_TO_RECORD` never had a chance of catching it. It also
   * has no question in it, so under the structural rule nothing here is shown - the lead reads only
   * `proposal.say`, the true, not-yet-confirmed offer.
   */
  it('a false claim with no promise verb and no question in it produces nothing', () => {
    const text = '"Good means every pipeline stage has an owner and nothing sits unowned for more than two days" '
      + 'is now the description of success for this check-in.';
    expect(whatTheModelsReplyShows(text, true)).toBe('');
  });

  it('a short, claim-free, non-pronoun acknowledgement directly before the question is kept alongside it', () => {
    expect(whatTheModelsReplyShows('Got it, thanks. What else have you seen?', true))
      .toBe('Got it, thanks. What else have you seen?');
  });

  it('an acknowledgement more than a short sentence away from the question is dropped, only the question kept', () => {
    const text = 'That is useful context, and it helps to hear it in your own words rather than a summary. '
      + 'What else have you seen?';
    expect(whatTheModelsReplyShows(text, true)).toBe('What else have you seen?');
  });

  it('with no proposal attached, defers to dropsAPromiseWithNothingToKeep unchanged', () => {
    const text = 'I will record this as your read of Ben. It will never be quoted to Ben.';
    expect(whatTheModelsReplyShows(text, false)).toBe(dropsAPromiseWithNothingToKeep(text, false));
    expect(whatTheModelsReplyShows(text, false)).toBe('');
  });

  it('a genuine question with a proposal attached and nothing before it survives whole', () => {
    expect(whatTheModelsReplyShows('What else have you tried with Ben?', true)).toBe('What else have you tried with Ben?');
  });
});
