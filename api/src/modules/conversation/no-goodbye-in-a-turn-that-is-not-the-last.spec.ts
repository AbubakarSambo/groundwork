import { theStreamedRouteRunsThePlainRoute } from './__fixtures__/the-streamed-route-is-the-plain-route';
import { readFileSync } from 'fs';
import { join } from 'path';
import { askedToFinish } from './close-readiness';
import { withoutTheGoodbye, hasAGoodbye } from './the-close-is-held-once';
import { withAQuestion } from './nobody-is-left-looking-at-a-paragraph';

const SERVICE = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/**
 * REQUEST 47, 28 SEPTEMBER 2026. Rukia read "Your report is ready now. Speak soon." three times
 * while her check-in stayed open, and her own "Please finish my check-in" was not heard as asking
 * to finish. Two causes, both here.
 */
describe('no goodbye in a turn that is not the last', () => {
  it('"please finish my check-in" is asking to finish', () => {
    for (const t of ['Please finish my check-in', 'Finish my check-in now', 'Please finish.', 'End my session']) {
      expect(askedToFinish([t])).toBe(true);
    }
  });

  it('and finishing some piece of work is not', () => {
    for (const t of ['I want to finish the proposal by Friday', 'We need to finish the rollout first', 'I will close the account next week', 'Stop the pilot in Kano']) {
      expect(askedToFinish([t])).toBe(false);
    }
  });

  it('a refused close loses its goodbye and still asks something', () => {
    const reply = 'Thank you, that is clear. Your report is ready now. Speak soon.';
    expect(hasAGoodbye(reply)).toBe(true);
    const out = withAQuestion(withoutTheGoodbye(reply), { closing: false });
    expect(out).not.toMatch(/report is ready|speak soon/i);
    expect(out).toContain('Thank you, that is clear.');
    expect(out).toMatch(/\?\s*$/);
  });

  it('both the turn and the stream take it off when the product does not close', () => {
    /* Changed 28 Sep 2026: the streamed route now runs sendMessage itself (the-streamed-route-is-the-plain-route), so a rule held on both paths is in sendMessage once, and the stream runs it. */
    /* Changed 3 November 2026: the held-close branch went, so this is the first branch now, an `if` and not an `else if`. */
    const both = SERVICE.match(/if \(!close\.ready && hasAGoodbye\(/g) ?? [];
    expect(both.length).toBe(1);
    expect((SERVICE.match(/withAQuestion\(withoutTheGoodbye\(/g) ?? []).length).toBeGreaterThanOrEqual(1);
    expect(theStreamedRouteRunsThePlainRoute(SERVICE)).toBe(true);
  });
});
