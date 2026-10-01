import { readFileSync } from 'fs';
import { join } from 'path';
import { whatIsConcreteIn, THE_ONE_CONCRETE_THING, isAnAcknowledgement, theOneThingNeverAsked } from './the-close-is-held-once';
import { numbersNobodySaid, screen, SentenceGate, askInsteadOfInventing, hitLogLine } from './nothing-invented-reaches-them';
import { detectFunction } from '../board/function-detection';
import { buildRoleProbeBlock, MIN_COACHING_CONFIDENCE } from '../board/role-maps';

describe('the close bar reads the last answer for one concrete thing', () => {
  it('a bare yes carries nothing', () => {
    expect(whatIsConcreteIn('yes that is everything', false)).toEqual([]);
  });
  it('a date, a number, a document or an attachment each count', () => {
    expect(whatIsConcreteIn('I will send it by Friday', false)).toContain('a date');
    expect(whatIsConcreteIn('two transfers waited', false)).toContain('a number');
    expect(whatIsConcreteIn('My number is N38m.', false)).toContain('a number');
    expect(whatIsConcreteIn('Value would be around $400,000 in the first year.', false)).toContain('a number');
    expect(whatIsConcreteIn('it is in the tracker', false)).toContain('a document');
    expect(whatIsConcreteIn('here you go', true)).toEqual(['an attachment']);
  });
  it('the one question is a question, and short', () => {
    expect(THE_ONE_CONCRETE_THING.split(/[.!?]/).filter((x) => x.trim()).length).toBeLessThanOrEqual(2);
    expect(THE_ONE_CONCRETE_THING).not.toMatch(/[–—]/);
  });
});

describe('a number nobody said is dropped like a name nobody said', () => {
  const SAID = ['two of our transfers waited on 30 August', 'I emailed on the 14th'];
  it('lets their own figures through, digits only, in any punctuation', () => {
    expect(numbersNobodySaid('So 30 August was the second wait?', SAID)).toEqual([]);
    expect(numbersNobodySaid('You wrote on the 14th.', SAID)).toEqual([]);
  });
  it('catches a figure that appears nowhere', () => {
    /*
     * THE 2 IS THE SECOND OF SEPTEMBER AND IT IS NO LONGER REPORTED.
     *
     * A day of the month is a figure the person did not say by construction - the product worked it
     * out - and reporting it deleted the sentence. That deletion is what stopped "End of the year,
     * so 31 December 2026?" reaching anybody for two days. See a-date-is-not-an-invention.
     *
     * The 45 is the point of this test and is still caught: a duration is not a date, however close
     * it sits to one.
     */
    expect(numbersNobodySaid('Three transfers waited 45 minutes on 2 September.', SAID)).toEqual(['45']);
  });
  it('a list marker is not a claim', () => {
    expect(numbersNobodySaid('1. What happened next?', SAID)).toEqual([]);
  });
  it('screen() names the sentence and says why', () => {
    /* Noted rather than removed - see DELETES_WHAT_IT_FINDS. The check and the offending figure are
       what this file is about, and both are asserted unchanged. */
    const r = screen('That waited 45 minutes. What happened after the email?', SAID);
    expect(r.dropped).toEqual(['That waited 45 minutes. ']);
    expect(r.hits).toEqual([{ sentence: 'That waited 45 minutes. ', check: 'a number nobody said', offending: ['45'] }]);
  });
  it('the stream gate records the same hits', () => {
    const g = new SentenceGate(SAID);
    g.push('That waited 45 minutes. What happened after the email?');
    g.flush();
    expect(g.hits.map((h) => h.check)).toEqual(['a number nobody said']);
  });
  it('a roster name in the known words is not an invention', () => {
    const r = screen('Did Hafsah reply to the email?', SAID.concat(['Hafsah', 'Jumare']));
    expect(r.hits).toEqual([]);
    expect(screen('Did Hafsah reply to the email?', SAID).hits[0].check).toBe('a name nobody said');
  });
  it('the second try names the thing and asks for a question instead', () => {
    const line = askInsteadOfInventing([{ sentence: 'x', check: 'a number nobody said', offending: ['45'] }]);
    expect(line).toContain('"45"');
    expect(line).toMatch(/ask for it/i);
  });
  it('the log line is greppable and carries the outcome', () => {
    const line = hitLogLine('ci1', { sentence: 'x. ', check: 'a name nobody said', offending: ['Alex'] }, 'dropped live');
    expect(line).toMatch(/^invention-gate check-in=ci1 check="a name nobody said" offending=\["Alex"\] outcome="dropped live"/);
  });
});

describe('the role map is there from turn one, provisionally', () => {
  it('the stated role alone gives a read under the coaching threshold, so the block hedges', () => {
    const read = detectFunction('Project manager on the ward rota', [], null);
    expect(read.fn).not.toBeNull();
    expect(read.confidence).toBeLessThan(MIN_COACHING_CONFIDENCE);
    expect(buildRoleProbeBlock(read.fn, read.confidence)).toMatch(/PROVISIONAL/);
  });
  it('when the words disagree with the stated role, the stated role stands and the read is held provisional', () => {
    /* Reversed 21 Sep 2026, see GW-ROLEDETECT-02: a sales rep full of invoices read as finance for three sessions. */
    const stated = detectFunction('Project manager', [], null);
    const withWords = detectFunction('Project manager', [
      'I closed the deal with the buyer and sent the proposal to procurement. The pipeline has three qualified leads.',
      'Renewal call with the decision maker is booked, contract sent.',
    ], { fn: stated.fn, confidence: stated.confidence });
    expect(withWords.fn).toBe('PROJECT_MANAGEMENT');
    expect(withWords.basis).toMatch(/reads more like sales work/);
    expect(withWords.confidence).toBeLessThan(MIN_COACHING_CONFIDENCE);
  });
});

/*
 * BOTH ENDINGS IN ONE MESSAGE, READ LIVE:
 *
 *   "Your report is ready now, and nothing in it needs acting on today. Speak soon.
 *
 *    One more before this closes. Put a date or a number on that, or name where it is written down."
 */
describe('a refused close does not keep its goodbye', () => {
  const { withoutTheGoodbye } = require('./the-close-is-held-once');

  it('takes the farewell out and leaves what they said', () => {
    const out = withoutTheGoodbye(
      'That is 1,200 units toward the goal. Your report is ready now, and nothing in it needs acting on today. Speak soon.',
    );
    expect(out).toBe('That is 1,200 units toward the goal.');
  });

  it('and hands back nothing rather than half a farewell when that is all there was', () => {
    expect(withoutTheGoodbye('Your report is ready now. Speak soon.')).toBe('');
  });

  it('and leaves an ordinary turn exactly as it was', () => {
    const asked = 'What specifically is making it slower, and what had you expected by now?';
    expect(withoutTheGoodbye(asked)).toBe(asked);
  });

  it('is applied at both close sites, not only the one that was read', () => {
    const src = require('fs')
      .readFileSync(require('path').join(__dirname, 'conversation.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    /* The turn path and the stream path append the held question separately; fixing one leaves the
       other reading exactly as it did before. */
    expect((src.match(/withoutTheGoodbye\(/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});

/**
 * THE WHOLE SESSION IS READ FOR THE CONCRETE THING, AND A ONE-TIME SESSION IS NEVER HELD.
 * Adversarial run, 20 September 2026: "One more before this closes. Put a date or a number on that"
 * went to a rep who had said "N38m" two turns earlier, to a person who had said "No.", to a business
 * owner in a one-time discovery session, and "That did not come out right" answered a bare "Ok.".
 */
describe('the bar, since 20 September 2026', () => {
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const service = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
  it('reads every answer of the session, not the last one', () => {
    expect(service).toContain("const concrete = whatIsConcreteIn(personSaid.join('\\n'), attached);");
    expect(service).not.toMatch(/whatIsConcreteIn\(last,/);
  });
  it('never holds a one-time session', () => {
    expect(service).toContain('const oneTime = (row as any)?.ground?.cadence === Cadence.ONE_TIME;');
    expect(service).toContain('if (oneTime || concrete.length || verdict.ready) return noDecision ? { ready: true, sayFirst: NO_DECISION_YET } : { ready: true };');
    /* And the close chases nothing: no "put a date or a number on that" is appended any more. */
    expect(service).not.toContain('return { ready: false, ask: THE_ONE_CONCRETE_THING };');
  });
  it('answers a bare acknowledgement rather than saying it did not come out right', () => {
    expect(service).toContain("reply = screened.text || (isAnAcknowledgement(message) ? 'Noted.' : ASK_AGAIN);");
    expect(isAnAcknowledgement('Ok.')).toBe(true);
    expect(isAnAcknowledgement('No.')).toBe(true);
    expect(isAnAcknowledgement('It is on the system.')).toBe(false);
  });
});

describe('the close is held once for the thing the session was for', () => {
  it('says it to the person, first sentence only', () => {
    /* A question, not a label after a colon (Hafsah, 21 Sep 2026: "the conversation had weird colons"). */
    expect(theOneThingNeverAsked('how they are making their number. Not the total: what kind of sales or work, on what terms, with whom.'))
      .toBe('I have one more question before we finish. How are you making your number?');
    expect(theOneThingNeverAsked('what they need from other people')).toBe('I have one more question before we finish. What do you need from other people?');
    expect(theOneThingNeverAsked('what they are answerable for')).toBe('I have one more question before we finish. What are you answerable for?');
    expect(theOneThingNeverAsked('the part of the plan that is theirs to do')).toBe('I have one more question before we finish. Which part of the plan is yours to do?');
  });
});

describe('a goodbye without the marker, and a thank-you', () => {
  const { saysGoodbye, isAnAcknowledgement } = require('./the-close-is-held-once');
  it('the farewell is the close signal', () => {
    expect(saysGoodbye('Your report is ready now, and nothing in it needs acting on today. Speak soon.')).toBe(true);
    expect(saysGoodbye('What connects those two things?')).toBe(false);
    expect(saysGoodbye('Your report is ready once you answer this. What is the number?')).toBe(false);
  });
  it('"Ok, thank you." is an acknowledgement', () => {
    for (const t of ['Ok, thank you.', 'Understood.', 'Thanks!', 'Yes. Thank you.', 'Alright, noted.']) expect(isAnAcknowledgement(t)).toBe(true);
    expect(isAnAcknowledgement('Ok, but the diesel is N90,000 more a month.')).toBe(false);
  });
});

describe('no homework in a one-time session', () => {
  const { withoutTheHomework } = require('./the-close-is-held-once');
  it('the question comes out and the rest stands', () => {
    const r = withoutTheHomework('Three weeks for a proposal that shapes your board\'s options. What will you do about this, and by when?');
    expect(r.cut).toBe(true);
    expect(r.text).toBe("Three weeks for a proposal that shapes your board's options.");
    expect(withoutTheHomework('What would you need to have in place by March?').cut).toBe(false);
  });
});

/**
 * THE HOMEWORK QUESTION HAS A BUDGET, AND THE LEAD'S IS A DECISION. Run 7, 21 Sep 2026: Funmi was asked
 * "what will you do about this, and by when?" in every session; Halima had it four times in one.
 */
describe('the homework question, budgeted', () => {
  const { withinTheHomeworkBudget, THE_LEADS_DECISION } = require('./the-close-is-held-once');
  const ask = 'That is a real answer. What will you do about this, and by when?';
  it('a participant keeps it twice and loses it the third time', () => {
    expect(withinTheHomeworkBudget(ask, [], false)).toEqual({ text: ask, changed: 'kept' });
    expect(withinTheHomeworkBudget(ask, ['Before we close: what will you do about this, and by when?'], false).changed).toBe('kept');
    const third = withinTheHomeworkBudget(ask, ['What will you do about this, and by when?', 'So what is the first thing you will do about that, and when?'], false);
    expect(third.changed).toBe('cut');
    expect(third.text).toBe('That is a real answer.');
  });
  /*
   * IT USED TO BECOME "That goes on this record as you put it."
   *
   * Read five times in one live check-in on 23 September 2026, three of them as the whole reply to
   * a question. Hafsah: "you used on the record alot which is fucking annoying." A cut that empties
   * the reply now asks for the next thing instead of announcing a filing, and the wording rotates
   * so the same conversation never uses it twice running. See the-same-sentence-five-times.
   */
  it('a bare third ask becomes a plain acknowledgement and a question, never the record line', () => {
    const out = withinTheHomeworkBudget('What will you do about this, and by when?', ['what will you do about this, and by when?', 'what will you do about it and by when?'], false).text;
    expect(out).not.toMatch(/record/i);
    expect(out).toMatch(/\?$/);
  });

  /* And two of them in a row are not the same words. */
  it('and the wording moves with the turn, so it cannot repeat', () => {
    const asked = 'what will you do about this, and by when?';
    /* Two earlier asks puts it over budget; a third turn of history picks the next wording. */
    const cutOnce = withinTheHomeworkBudget('What will you do about this, and by when?', [asked, asked], false).text;
    const cutAgain = withinTheHomeworkBudget('What will you do about this, and by when?', [asked, asked, 'anything else?'], false).text;
    expect(cutOnce).not.toMatch(/record/i);
    expect(cutAgain).not.toMatch(/record/i);
    expect(cutOnce).not.toBe(cutAgain);
  });
  /* Pip, run 8: the lead read "One thing From everything you have said, what have you decided?" */
  it('"One thing before we close:" goes with the question it introduced, so no half of it is left', () => {
    const out = withinTheHomeworkBudget('You will be sending Nathan an invite for this meeting. One thing before we close: what will you do about this, and by when?', [], true);
    expect(out.text).toBe(`You will be sending Nathan an invite for this meeting. ${THE_LEADS_DECISION}`);
  });
  it('the lead gets the decision question once, then nothing', () => {
    const first = withinTheHomeworkBudget(ask, [], true);
    expect(first.changed).toBe('decision');
    expect(first.text).toBe(`That is a real answer. ${THE_LEADS_DECISION}`);
    const again = withinTheHomeworkBudget(ask, [first.text], true);
    expect(again.changed).toBe('cut');
    expect(again.text).toBe('That is a real answer.');
  });
});

/** 21 Sep 2026, live: a close held twice recited "You said you will do some research online..." three times. */
describe('a held close does not recite what was already said', () => {
  const { withoutWhatWasAlreadySaid } = require('./the-close-is-held-once');
  it('drops a sentence already in an earlier turn and keeps the rest', () => {
    const earlier = ['You will do some research online to find these people, and that will be done by October 31, 2026.\n\nOne more before this closes, because it is what this check-in is for: what you are answerable for.'];
    expect(withoutWhatWasAlreadySaid('The signed contracts. You said you will do some research online to find these people, and that will be done by October 31, 2026.', earlier)).toBe('The signed contracts.');
    expect(withoutWhatWasAlreadySaid('You will do some research online to find these people, and that will be done by October 31, 2026.', earlier)).toBe('');
  });
});
