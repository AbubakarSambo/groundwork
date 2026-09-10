import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE PANEL NEVER SAYS DONE WHEN IT IS NOT.
 *
 * finishCheckIn cleared the check-in and the placeholder BEFORE the network call and discarded the
 * response, so a refused completion - a thin record, which the server refuses with canContinue: true -
 * was announced as done while the session stayed open. And the panel completed a session by itself
 * the moment the engine said it could close; completion is irreversible, and WhatsApp asks first.
 */
const PANEL = readFileSync(join(__dirname, 'static', 'panel.html'), 'utf8');
const code = PANEL.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
/* One function's body: to the next sibling function, or to the form listener that follows ask(). */
const fn = (name: string) => {
  const at = code.indexOf(`function ${name}(`);
  const ends = [code.indexOf('\n  function ', at + 10), code.indexOf('\n  form.addEventListener', at + 10), code.indexOf('\n  var ', at + 10)].filter((i) => i > at);
  return code.slice(at, Math.min(...ends));
};

describe('finishing', () => {
  const finish = fn('finishCheckIn');

  it('changes the state only after the server says it completed', () => {
    const clear = finish.indexOf('inCheckIn = null');
    const call = finish.indexOf("'/complete'");
    expect(clear).toBeGreaterThan(call);
    expect(finish).toMatch(/if \(outcome !== 'completed'\) return;/);
  });

  it('a refusal it can continue from prints the server’s sentence and keeps the check-in open', () => {
    expect(finish).toMatch(/r\.status === 400 && b && b\.canContinue/);
    expect(finish).toMatch(/Your check-in is still open\./);
  });

  it('says "That is done" only on the completed path', () => {
    const before = finish.slice(0, finish.indexOf("if (outcome !== 'completed') return;"));
    expect(before).not.toMatch(/That is done/);
  });
});

describe('the engine saying the session could close', () => {
  it('is an offer to the person, not a completion by the panel', () => {
    const answer = fn('answerInCheckIn');
    expect(answer).not.toMatch(/finishCheckIn\(/);
    expect(answer).toMatch(/Say "finish" to complete it, or keep going/);
  });

  it('and the word completes it, from the composer', () => {
    expect(code).toMatch(/FINISH_WORD = \/\^\\s\*\(finish\|complete\|done\|close\)/);
    expect(code).toMatch(/inCheckIn && FINISH_WORD\.test\(v\)\) \{ bubble\('me', v\); finishCheckIn\(inCheckIn\); \}/);
  });
});
