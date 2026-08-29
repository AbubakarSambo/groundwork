import { readFileSync } from 'fs';
import { truncationsOfTheirWords } from './the-record-holds-what-was-said';
import { join } from 'path';

/**
 * A GUARD THAT RUNS ONLY IN THE PATH NOBODY TAKES IS NOT A GUARD.
 *
 * `restoreTheirWords` was written so that nobody reads a company name they never typed, it has its
 * own tests, and it had never run for a single real person: it was applied in `sendMessage`, and
 * ChatPage calls `sendMessageStream`. The non-streaming path it protected is only reached as a
 * fallback, after a stream has already failed.
 *
 * That is the hardest kind of gap to see, because everything about it looks right - the guard
 * exists, it is correct, and its unit tests pass. Only the wiring was wrong, and wiring is what no
 * test of the guard itself can check.
 */
const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');

/** Each path, from its signature to the next method, so a guard in one cannot vouch for the other. */
function body(startsWith: string): string {
  const from = SRC.indexOf(startsWith);
  expect(from).toBeGreaterThan(-1);
  const rest = SRC.slice(from + startsWith.length);
  const next = rest.search(/\n  (?:async |private |\/\*\*)/);
  return rest.slice(0, next === -1 ? rest.length : next);
}

describe('both paths repair what the model invented', () => {
  const paths: [string, string][] = [
    ['the streaming path, which is the one the chat uses', 'async *sendMessageStream('],
    ['the non-streaming path, which is its fallback', 'async sendMessage('],
  ];

  it.each(paths)('%s puts the person\'s own word back', (_name, sig) => {
    expect(body(sig)).toMatch(/restoreTheirWords\(/);
  });

  it.each(paths)('%s records a name it could not repair', (_name, sig) => {
    /*
     * A name invented whole has nothing of theirs underneath, so substitution deliberately leaves
     * it alone rather than picking a replacement. That reasoning holds. What did not hold is that
     * nothing recorded it - so a fabricated colleague reached somebody with no trace it happened,
     * and the rate stayed unknowable.
     */
    expect(body(sig)).toMatch(/namesNobodySaid\(/);
  });

  it.each(paths)('%s records a causal claim nobody made', (_name, sig) => {
    expect(body(sig)).toMatch(/causalClaimNobodyMade\(/);
  });
});

describe('the streamed text and the repaired text are not confused', () => {
  it('flushes the tail from what was actually streamed', () => {
    /*
     * The tail is the part of the ALREADY-STREAMED text that has not been sent yet, so it indexes
     * into that. Slicing the repaired reply by the same offset would drop or duplicate characters
     * any time a substitution changed the length - a corruption caused by the repair.
     */
    expect(SRC).toMatch(/const tail = streamedText\.slice\(/);
  });

  it('and persists the repaired one, because that is what every later session reads', () => {
    const stream = body('async *sendMessageStream(');
    const persist = stream.slice(stream.indexOf('conversationTurn.create'));
    expect(persist).toMatch(/content: reply/);
    expect(persist).not.toMatch(/content: streamedText/);
  });
});

describe('a tidy-up of their own word, in lower case', () => {
  /*
   * FOUND BY DRIVING A REAL CHECK-IN. The person typed "microchipshit"; the reply came back as "the
   * microchip account". That is exactly the mangling `namesNobodySaid` was written for - its own
   * comment uses that example - and it walked past, because a proper-noun check looks for a capital
   * letter and the model wrote it lower case.
   */
  it('is caught', () => {
    expect(truncationsOfTheirWords(
      'tell me what happened with the microchip account',
      ['I spent the week on the microchipshit account'],
    )).toEqual(['microchip (they typed "microchipshit")']);
  });

  it('and a word they actually typed is never reported, however much it looks shortened', () => {
    expect(truncationsOfTheirWords(
      'so the reporting endpoint is done',
      ['the reporting endpoint, and the reportingendpointmigration too'],
    )).toEqual([]);
  });

  it('and short words are left alone, because every one of them is a prefix of something', () => {
    expect(truncationsOfTheirWords('what did the team decide', ['the teamwork was difficult'])).toEqual([]);
  });

  it('and both paths report it', () => {
    for (const sig of ['async *sendMessageStream(', 'async sendMessage(']) {
      expect(body(sig)).toMatch(/truncationsOfTheirWords\(/);
    }
  });
});
