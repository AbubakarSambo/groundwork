import { theStreamedRouteRunsThePlainRoute } from './__fixtures__/the-streamed-route-is-the-plain-route';
import { withoutTheLastOne, aFirstSessionHasNoLastOne } from './a-first-session-has-no-last-one';
import { readFileSync } from 'fs';
import { join } from 'path';

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const SERVICE = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));

/**
 * "What moved on this since the last update?" and "Nothing has moved since the last update" - both
 * said in the first minute of a first session, to somebody who had never given one (22 Sep 2026).
 */
describe('a first session has no last one', () => {
  it('turns what moved since the last one into what it is at now', () => {
    const r = withoutTheLastOne('Theft and unreliable agents have been issues in the past. What moved on this since the last update? A number or a date is enough.', 1);
    expect(r.changed).toBe(true);
    expect(r.text).toBe('Theft and unreliable agents have been issues in the past. What is that at now? A number or a date is enough.');
    expect(r.text).not.toContain('last update');
  });

  it('asks what it is at now where the sentence was only that question', () => {
    expect(withoutTheLastOne('What moved on it since the last one?', 1).text).toBe('What is that at now?');
  });

  it('cuts a sentence that is nothing but the false reference', () => {
    const r = withoutTheLastOne('Nothing has moved since the last update. Your report is ready now. Speak soon.', 1);
    expect(r.text).toBe('Your report is ready now. Speak soon.');
  });

  it('cuts a recall of what they said last time, because they have not said anything before', () => {
    const r = withoutTheLastOne('Last time you said the arrears were at 14%. What is that at now?', 1);
    expect(r.text).toBe('What is that at now?');
  });

  it('leaves the second session alone, where the difference between two updates is the whole point', () => {
    const said = 'What moved on this since the last update? A number or a date is enough.';
    expect(withoutTheLastOne(said, 2)).toEqual({ text: said, changed: false });
    expect(aFirstSessionHasNoLastOne(2)).toBe(false);
    expect(aFirstSessionHasNoLastOne(1)).toBe(true);
    expect(aFirstSessionHasNoLastOne(null)).toBe(true);
  });

  it('and never ships an empty bubble: a reply that is only the reference stands', () => {
    expect(withoutTheLastOne('Since the last update?', 1).changed).toBe(false);
  });

  it('runs on both reply paths', () => {
    /* Changed 28 Sep 2026: the streamed route now runs sendMessage itself (the-streamed-route-is-the-plain-route), so a rule held on both paths is in sendMessage once, and the stream runs it. */
    expect(SERVICE.match(/withoutTheLastOne\(/g)!.length).toBeGreaterThanOrEqual(1);
    expect(theStreamedRouteRunsThePlainRoute(SERVICE)).toBe(true);
  });
});
