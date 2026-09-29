import { readFileSync } from 'fs';
import { join } from 'path';
import { endingOnTheClose, endsOnTheClose, THE_CLOSE } from './the-close-says-what-comes-next';

/* What a person reads at the end of a check-in (task 2.7). The prototype: check-in-end-card.txt. */

describe('the close, as a person reads it', () => {
  it("is the prototype's sentences, word for word", () => {
    const proto = readFileSync(join(__dirname, '../../../../docs/prototype/screens/B3-the-check-in/check-in-end-card.txt'), 'utf8');
    expect(proto).toContain(THE_CLOSE);
  });

  it("the reviewer's closes: never says the report is ready, and ends on the prototype's sentences", () => {
    expect(endingOnTheClose('Your report is ready now. Speak soon.')).toBe(THE_CLOSE);
    expect(endingOnTheClose('Thank you, Femi. You said you will call Tobi by Friday. Your report is ready now. Speak soon.'))
      .toBe(`Thank you, Femi. You said you will call Tobi by Friday.\n\n${THE_CLOSE}`);
    expect(endingOnTheClose('Understood. This record shows nothing more on that.'))
      .toBe(`Understood. This record shows nothing more on that.\n\n${THE_CLOSE}`);
    expect(endingOnTheClose('Your report is ready now, and nothing in it needs acting on today. Speak soon.')).not.toMatch(/report is ready/i);
  });

  it('says it once, however often it runs', () => {
    const once = endingOnTheClose('Thank you. That’s all for today.');
    expect(endingOnTheClose(once)).toBe(once);
    expect(once.split('That’s all for today').length).toBe(2);
  });

  it('a stored close still counts as closed when the same answer arrives twice', () => {
    expect(endsOnTheClose(`Thank you.\n\n${THE_CLOSE}`)).toBe(true);
    expect(endsOnTheClose('What happened with Green Mart?')).toBe(false);
  });

  it('is put on the turn that closed, after it is known to be closed', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const decided = src.indexOf("const sessionComplete = close.ready && !stillAsking(aiTurn.content ?? '');");
    const closed = src.indexOf("const closed = endingOnTheClose(aiTurn.content ?? '');");
    expect(decided).toBeGreaterThan(0);
    expect(closed).toBeGreaterThan(decided);
    expect(src.slice(closed - 200, closed)).toContain('if (sessionComplete) {');
  });
});
