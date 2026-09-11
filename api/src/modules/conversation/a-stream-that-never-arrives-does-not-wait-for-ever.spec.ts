/**
 * A STREAM THAT NEVER ARRIVES DOES NOT WAIT FOR EVER.
 *
 * respond() has had a ninety-second ceiling since the hour when every model call failed while
 * /health still said ok. respondStream() - the path the chat actually uses, both in a check-in and
 * in the entry flow - had none. Not on opening the stream, not between chunks.
 *
 * Watched live: an answer typed into a check-in sat for over ten minutes with the typing dots
 * still going. Nothing was ever going to give up, and both controllers already know how to say
 * "that did not send" when the generator throws - they were just never given anything to catch.
 *
 * Two clocks, because there are two ways to hang. A stream that never opens, and a stream that
 * opens and stalls halfway through a sentence - the second never trips a total budget that a long
 * healthy answer would also trip.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { withADeadline, OPENING_A_STREAM_WAITS, A_CHUNK_WAITS } from './anthropic.service';

describe('a promise with a clock on it', () => {
  it('gives back the answer when the work finishes in time', async () => {
    await expect(withADeadline(Promise.resolve('here'), 1000, 'nope')).resolves.toBe('here');
  });

  it('throws when it does not, naming what failed and how long it waited', async () => {
    const never = new Promise<never>(() => {});
    await expect(withADeadline(never, 20, 'The stream did not open')).rejects.toThrow(
      /The stream did not open after 0s/,
    );
  });

  it('passes a real failure through rather than turning it into a timeout', async () => {
    await expect(withADeadline(Promise.reject(new Error('refused')), 1000, 'nope')).rejects.toThrow('refused');
  });

  it('clears its timer, so a chat does not leave one dangling per answer', async () => {
    /* The version that leaks is the one that looks right, so this is held rather than trusted. */
    const cleared: unknown[] = [];
    const realClear = global.clearTimeout;
    (global as any).clearTimeout = (t: unknown) => { cleared.push(t); return realClear(t as any); };
    try {
      await withADeadline(Promise.resolve(1), 5000, 'nope');
      expect(cleared.length).toBeGreaterThan(0);
    } finally {
      (global as any).clearTimeout = realClear;
    }
  });
});

describe('what the streaming path does with them', () => {
  const CODE = readFileSync(join(__dirname, 'anthropic.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const body = CODE.slice(CODE.indexOf('async *respondStream('), CODE.indexOf('private conversationThinkingBudget'));

  it('puts a clock on opening the stream', () => {
    expect(body).toMatch(/withADeadline\(\s*\n?\s*this\.client\.models\.generateContentStream/);
    expect(body).toMatch(/OPENING_A_STREAM_WAITS/);
  });

  it('and another between chunks, which a total budget would not catch', () => {
    expect(body).toMatch(/withADeadline\(chunks\.next\(\), A_CHUNK_WAITS/);
    /* The plain for-await cannot be raced, which is why the iterator is stepped by hand. */
    expect(body).not.toMatch(/for await \(const chunk of stream\)/);
  });

  it('waits long enough for a real answer and nothing like ten minutes', () => {
    expect(OPENING_A_STREAM_WAITS).toBeLessThanOrEqual(60_000);
    expect(A_CHUNK_WAITS).toBeLessThanOrEqual(60_000);
    expect(OPENING_A_STREAM_WAITS).toBeGreaterThanOrEqual(20_000);
  });
});
