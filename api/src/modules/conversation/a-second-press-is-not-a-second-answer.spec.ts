import { theStreamedRouteRunsThePlainRoute } from './__fixtures__/the-streamed-route-is-the-plain-route';
/**
 * A second press must not become a second answer — and must not become a refusal either. The
 * person is not doing anything wrong; they are doubting a wait.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  isThisTheSameAnswerAgain,
  A_SECOND_PRESS_WINDOW_MS,
  STILL_ON_YOUR_LAST_ANSWER,
} from './a-second-press-is-not-a-second-answer';

const at = (ms: number) => new Date(1_700_000_000_000 + ms);
const person = (content: string, ms: number) => ({ role: 'PERSON' as const, content, createdAt: at(ms) });
const ai = (content: string, ms: number) => ({ role: 'AI' as const, content, createdAt: at(ms) });

describe('the same answer arriving twice', () => {
  it('gets the first answer back rather than a fresh question', () => {
    const v = isThisTheSameAnswerAgain(
      [person('Sam is waiting on me.', 0), ai('Waiting on you for what?', 1000)],
      'Sam is waiting on me.',
      at(3000),
    );
    expect(v).toEqual({ kind: 'the same answer, already answered', reply: 'Waiting on you for what?' });
  });

  it('is told the first one is still being read when no reply exists yet', () => {
    const v = isThisTheSameAnswerAgain([person('Sam is waiting on me.', 0)], 'Sam is waiting on me.', at(5000));
    expect(v.kind).toBe('the same answer, still working');
  });

  it('is a new answer once the window has passed, because repeating yourself is allowed', () => {
    const v = isThisTheSameAnswerAgain(
      [person('It is still the same problem.', 0), ai('What changed?', 500)],
      'It is still the same problem.',
      at(A_SECOND_PRESS_WINDOW_MS + 1),
    );
    expect(v.kind).toBe('a new answer');
  });

  it('is a new answer when only an EARLIER turn matches, not the last one', () => {
    // Otherwise a session that circles back to a phrase gets its later answers swallowed.
    const v = isThisTheSameAnswerAgain(
      [person('The invoice.', 0), ai('Which invoice?', 100), person('The March one.', 200)],
      'The invoice.',
      at(300),
    );
    expect(v.kind).toBe('a new answer');
  });

  it('ignores whitespace, which is what a second press differs by', () => {
    const v = isThisTheSameAnswerAgain([person('Two weeks late.', 0)], '  Two weeks late.  ', at(10));
    expect(v.kind).toBe('the same answer, still working');
  });

  it('lets an empty message through to the ordinary refusal rather than swallowing it', () => {
    expect(isThisTheSameAnswerAgain([person('x', 0)], '   ', at(10)).kind).toBe('a new answer');
  });
});

describe('and the service asks before it writes anything', () => {
  const src = fs
    .readFileSync(path.join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  /* Changed 28 Sep 2026: the streamed route now runs sendMessage itself (the-streamed-route-is-the-plain-route), so a rule held on both paths is in sendMessage once, and the stream runs it. */
  it('and the streamed route runs sendMessage, so it is asked there too', () => {
    expect(theStreamedRouteRunsThePlainRoute(src)).toBe(true);
  });

  it.each(['sendMessage'])('%s consults it before creating a PERSON turn', (method) => {
    const from = src.indexOf(`async ${method === 'sendMessageStream' ? '*sendMessageStream' : 'sendMessage'}(`);
    expect(from).toBeGreaterThan(-1);
    const body = src.slice(from, src.indexOf('\n  async ', from + 10));
    const asks = body.indexOf('theSameAnswerAgain');
    const writes = body.indexOf('TurnRole.PERSON, content: message');
    expect(asks).toBeGreaterThan(-1);
    expect(writes).toBeGreaterThan(-1);
    expect(asks).toBeLessThan(writes);
  });

  it('says the waiting sentence rather than throwing', () => {
    expect(src).toContain('STILL_ON_YOUR_LAST_ANSWER');
    expect(STILL_ON_YOUR_LAST_ANSWER).not.toMatch(/error|failed|invalid/i);
  });
});
