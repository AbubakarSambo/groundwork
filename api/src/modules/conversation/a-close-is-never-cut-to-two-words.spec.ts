import { readFileSync } from 'fs';
import { join } from 'path';
import { aPromiseTheyNeverMade, whatIsLeftToSend, A_CLOSE_THAT_CLAIMS_NOTHING } from './a-promise-they-never-made';
import { withoutPromisingTheReport } from './the-report-is-not-yours-to-promise';

/*
 * "SPEAK SOON." WAS THE WHOLE OF ELENA ROSSI'S LAST TURN.
 *
 * run-7, the crisis scenario. The close was the sentence below. The promise guard read "What you
 * said" as an attribution, found nothing of hers in it, and cut it, leaving two words.
 */
describe('a close is never cut down to two words', () => {
  const THE_CRISIS_CLOSE = 'What you said is now in the record, and the report will be ready for you. Speak soon.';
  const hers = ['The shipment was held at the port for nine days and the customer cancelled.'];

  it('"What you said is now in the record" is not a promise attributed to her', () => {
    expect(aPromiseTheyNeverMade(THE_CRISIS_CLOSE, hers)).toBeNull();
  });

  it('and neither are the other ways of saying "your answers"', () => {
    for (const line of [
      'Everything you told us is in the record now.',
      'All that you shared is saved.',
      "Whatever you've mentioned stays with this check-in.",
    ]) {
      expect({ line, cut: aPromiseTheyNeverMade(line, hers) }).toEqual({ line, cut: null });
    }
  });

  it('but an invented promise is still caught', () => {
    expect(aPromiseTheyNeverMade('You said you would send the rota by Friday. Speak soon.', hers))
      .toBe('You said you would send the rota by Friday.');
    expect(aPromiseTheyNeverMade('What you said is saved. You said you would send the rota by Friday.', hers))
      .toBe('You said you would send the rota by Friday.');
  });

  it('when a cut leaves a stub on the closing turn, the close is a plain full sentence instead', () => {
    const sent = whatIsLeftToSend('You said you would send the rota by Friday. Speak soon.', 'You said you would send the rota by Friday.', true);
    expect(sent).toBe('Thank you. Your check-in is saved.');
    expect(sent).toBe(A_CLOSE_THAT_CLAIMS_NOTHING);
    /* The crisis sentence itself, had it been cut, would not have shipped as "Speak soon." either. */
    expect(whatIsLeftToSend(THE_CRISIS_CLOSE, 'What you said is now in the record, and the report will be ready for you.', true))
      .toBe('Thank you. Your check-in is saved.');
  });

  it('and a remainder of five words or more is kept as it is', () => {
    const reply = 'You said you would send the rota by Friday. Thank you for going through all of this with me.';
    expect(whatIsLeftToSend(reply, 'You said you would send the rota by Friday.', true))
      .toBe('Thank you for going through all of this with me.');
  });

  it('mid-conversation the cut stands as it always has', () => {
    const reply = 'You said you would send the rota by Friday. What happened at the port?';
    expect(whatIsLeftToSend(reply, 'You said you would send the rota by Friday.', false)).toBe('What happened at the port?');
  });

  it('the plain close promises no report and no other conversation, so the later guard leaves it whole', () => {
    expect(withoutPromisingTheReport(A_CLOSE_THAT_CLAIMS_NOTHING)).toBe(A_CLOSE_THAT_CLAIMS_NOTHING);
  });

  it('is what the live turn uses', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/whatIsLeftToSend\(screened\.text, promiseNobodyMade, closingNow\)/);
  });
});
