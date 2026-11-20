import { endingOnTheClose, endsOnTheClose } from './the-close-says-what-comes-next';
import { whatIsSaidWhenNothingIsLeft } from './nothing-invented-reaches-them';

/**
 * FIX PLAN 16 NOVEMBER, GROUP 2: finishing a check-in cannot fail in front of the person. These read the last message a person is shown.
 */
describe('the last message of a check-in, as the person reads it', () => {
  it('a reply the screen emptied is a thank-you on the turn that closes, never "That did not come out right"', () => {
    const reply = whatIsSaidWhenNothingIsLeft({ closing: true, acknowledgement: false });
    const shown = endingOnTheClose(reply, 'web', false, 'usual');
    expect(shown).toBe('Thank you.\n\nThat’s all for today. Below is what I wrote down from your answers. Is anything wrong?');
    expect(shown).not.toMatch(/did not come out right|Say that again/);
  });

  it('on a turn that does not close, an emptied reply still asks again, and a bare "Ok." is still "Noted."', () => {
    expect(whatIsSaidWhenNothingIsLeft({ closing: false, acknowledgement: false })).toBe('That did not come out right. Say that again and I will pick it up.');
    expect(whatIsSaidWhenNothingIsLeft({ closing: false, acknowledgement: true })).toBe('Noted.');
  });

  it('when the read-back already asked "Is anything wrong?", the close does not ask it again', () => {
    const shown = endingOnTheClose('Thank you.', 'web', false, 'already asked');
    expect(shown).toBe('Thank you.\n\nThat’s all for today. Below is what I wrote down from your answers.');
    expect(shown).not.toMatch(/\?/);
    expect(endsOnTheClose(shown)).toBe(true);
  });

  it('when the model could not read the conversation, the close says what is saved and points at no empty box', () => {
    const shown = endingOnTheClose('Thank you.', 'web', false, 'read still to come');
    expect(shown).toBe('Thank you.\n\nThat’s all for today. Everything you said is saved, and your report will be ready as soon as Groundwork has finished reading it.');
    expect(shown).not.toMatch(/Below is|Is anything wrong|did not come out right/);
    expect(endsOnTheClose(shown)).toBe(true);
    /* said once, however often it is run */
    expect(endingOnTheClose(shown, 'web', false, 'read still to come')).toBe(shown);
  });

  it('in the plainer words, the same two closes read plainly', () => {
    expect(endingOnTheClose('', 'web', true, 'already asked')).toBe('That is all for today. Below is what I wrote down from what you said.');
    expect(endingOnTheClose('', 'web', true, 'read still to come')).toBe('That is all for today. Everything you said is saved. Your report will be ready as soon as Groundwork has finished reading it.');
  });

  it('WhatsApp and the API close as they always did, whatever the read', () => {
    expect(endingOnTheClose('Thank you.', 'whatsapp', false, 'read still to come')).toBe('Thank you.\n\nThat’s all for today. Reply "finish" to close this check-in, and your report will come here.');
    expect(endingOnTheClose('Thank you.', 'api', false, 'already asked')).toContain('When this check-in is closed');
  });
});

describe('what a failed read leaves in the record', () => {
  const { theFactsIn } = require('./the-facts-on-record');
  const { theReadBackFrom } = require('./the-read-back');
  const kept = (n: number, words: string) => ({ id: `kept.${n}`, words, from: [n], whoMaySee: 'the people in this check-in', saidWordForWord: true, what: 'Said, and not yet read into any other part.' });
  const assessment = (modelFailed: boolean) => ({
    about: { checkInId: 'c1', groundId: 'g1', participantId: 'p1', who: 'Joel', isTheLead: false, sessionNumber: 1, endedAt: '2026-11-16T10:00:00Z' },
    measure: { modelFailed }, messages: [{ n: 1, turnId: 't1', where: 'check-in' }, { n: 2, turnId: 't2', where: 'check-in' }],
    everythingElse: [kept(1, 'Leads are the blocker'), kept(2, 'Nothing wrong. Thanks.')],
  });
  it('lists no line as something the person said, and gives no read-back, when the model could not read it', () => {
    expect(theFactsIn(assessment(true), { kind: 'the person', participantId: 'p1' })).toEqual([]);
    expect(theReadBackFrom(assessment(true))).toBeNull();
  });
  it('keeps the lines it always kept when the read worked', () => {
    expect(theFactsIn(assessment(false), { kind: 'the person', participantId: 'p1' }).map((f: any) => f.words)).toEqual(['Leads are the blocker', 'Nothing wrong. Thanks.']);
  });
});
