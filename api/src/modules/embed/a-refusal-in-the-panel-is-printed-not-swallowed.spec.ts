import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A REFUSAL IN THE PANEL IS PRINTED, NOT SWALLOWED.
 *
 * Four calls did `r.ok ? r.json() : null`, collapsing every refusal - the billing wall, a legal hold,
 * an already-complete check-in - into "try again in a moment", which trying again cannot fix. One
 * call did not check the status at all, so a refusal body with no blocks rendered as nothing. And
 * nothing was locked while a call was out, so five presses were five sessions. The server writes a
 * sentence for every refusal; the panel reads it, and one thing is in flight at a time.
 */
const PANEL = readFileSync(join(__dirname, 'static', 'panel.html'), 'utf8');
const code = PANEL.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
/* One function's body: to the next sibling function, or to the form listener that follows ask(). */
const fn = (name: string) => {
  const at = code.indexOf(`function ${name}(`);
  const ends = [code.indexOf('\n  function ', at + 10), code.indexOf('\n  form.addEventListener', at + 10), code.indexOf('\n  var ', at + 10)].filter((i) => i > at);
  return code.slice(at, Math.min(...ends));
};

describe('every call that can be refused', () => {
  it.each(['startCheckIn', 'answerInCheckIn', 'ask'])('%s reads the refusal’s own sentence rather than printing "try again"', (name) => {
    const body = fn(name);
    expect(body).toMatch(/if \(!r\.ok\) return refusalFrom\(r,/);
    expect(body).not.toMatch(/r\.ok \? r\.json\(\) : null/);
  });

  it('refusalFrom takes the message off the body, a string or an array, and falls back to a sentence', () => {
    const body = fn('refusalFrom');
    expect(body).toMatch(/b && b\.message/);
    expect(body).toMatch(/Array\.isArray\(m\)/);
    expect(body).toMatch(/return fallback/);
  });
});

describe('one thing in flight', () => {
  it.each(['startCheckIn', 'answerInCheckIn', 'finishCheckIn', 'ask'])('%s refuses to start while busy and releases when done', (name) => {
    const body = fn(name);
    expect(body).toMatch(/if \(busy\) return;/);
    expect(body).toMatch(/setBusy\(true\)/);
    expect(body).toMatch(/\.then\(function \(\) \{ setBusy\(false\); \}\);/);
  });

  it('busy disables the composer and every acting chip', () => {
    const body = fn('setBusy');
    expect(body).toMatch(/input\.disabled = on/);
    expect(body).toMatch(/\.chip\.act/);
  });
});
