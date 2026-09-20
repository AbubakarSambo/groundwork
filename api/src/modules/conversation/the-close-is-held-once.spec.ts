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
  it('when the words disagree with the stated role, the words win and it is held more tentatively', () => {
    const stated = detectFunction('Project manager', [], null);
    const withWords = detectFunction('Project manager', [
      'I closed the deal with the buyer and sent the proposal to procurement. The pipeline has three qualified leads.',
      'Renewal call with the decision maker is booked, contract sent.',
    ], { fn: stated.fn, confidence: stated.confidence });
    expect(withWords.fn).toBe('SALES');
    expect(withWords.basis).toMatch(/does not bear out/);
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
    expect(service).toContain('if (oneTime || concrete.length || verdict.ready) return { ready: true };');
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
    expect(theOneThingNeverAsked('how they are making their number. Not the total: what kind of sales or work, on what terms, with whom.'))
      .toBe('One more before this closes, because it is what this check-in is for: how you are making your number.');
    expect(theOneThingNeverAsked('what they need from other people')).toContain('what you need from other people.');
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
