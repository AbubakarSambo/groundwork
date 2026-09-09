import { readFileSync } from 'fs';
import {
  truncationsOfTheirWords, namesNobodySaid, namesWorthReporting, restoreTheirWords,
} from './the-record-holds-what-was-said';
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
const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

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

  it.each(paths)('%s screens what it sends, rather than only reporting on it', (_name, sig) => {
    /*
     * This used to assert each path called `restoreTheirWords` and `namesWorthReporting` directly.
     * Both still run - inside the screen - and the rule they enforce got stronger: a sentence with a
     * name that cannot be repaired is now DROPPED rather than logged and shown. So the assertion
     * moved to the guarantee rather than the mechanism, which is the thing that must not regress.
     */
    const b = body(sig);
    expect(b).toMatch(/SentenceGate|screen\(/);
    /* And the person is asked again rather than shown an empty bubble when nothing survives. */
    expect(b).toMatch(/ASK_AGAIN/);
  });

  it.each(paths)('%s records what it dropped', (_name, sig) => {
    /* The rate is what decides whether the other two faults ever become drops as well. */
    expect(body(sig)).toMatch(/hitLogLine\(checkIn\.id, h,/);
  });

  it.each(paths)('%s records a causal claim nobody made', (_name, sig) => {
    expect(body(sig)).toMatch(/causalClaimNobodyMade\(/);
  });
});

describe('the streamed text and the repaired text are not confused', () => {
  it('stores exactly what the person saw', () => {
    /*
     * `shown` is the concatenation of the deltas that actually left. Storing anything else - the raw
     * text, or a second pass over it - means the record and the screen agree only by both arriving
     * at the same answer twice, and they will eventually disagree.
     *
     * The old tail-slicing is gone with it: there is no unsent remainder to flush, because the gate
     * decides what leaves and flushes its own.
     */
    const stream = body('async *sendMessageStream(');
    expect(stream).toMatch(/let reply = shown\.trim\(\);/);
    expect(stream).toMatch(/reply = ASK_AGAIN;/);
    const persist = stream.slice(stream.indexOf('conversationTurn.create'));
    expect(persist).toMatch(/content: reply/);
    expect(SRC).not.toMatch(/const tail = streamedText\.slice\(/);
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

describe('the two callers want different strictness, and mixing them broke restoration', () => {
  /*
   * I applied the sentence-start exemption inside `namesNobodySaid` to quiet a noisy log, and it
   * silently stopped "Microchip Solutions signed up afterwards" being restored - the name was in
   * first position, so the exemption dropped it. Their own report test caught it on the next run.
   *
   * Repairing wants few false NEGATIVES, because the cost lands on the page. Reporting wants few
   * false POSITIVES, because a log nobody trusts is a log nobody reads. One function cannot be
   * tuned for both, so there are two.
   */
  const hers = ['we sell to microchipshit and it went fine'];

  it('restoration still sees a mangled name at the start of a sentence', () => {
    expect(namesNobodySaid('Microchip Solutions signed up afterwards.', hers)).toContain('Microchip Solutions');
    expect(restoreTheirWords('Microchip Solutions signed up afterwards.', hers))
      .toBe('microchipshit signed up afterwards.');
  });

  it('while reporting stays quiet about a word capitalised only by grammar', () => {
    /* "Starting" was reported as an invented name on a real check-in, because the exemption list
       was a hand-written list of English words and nobody had added it. */
    expect(namesWorthReporting('Starting with what went badly.', hers)).toEqual([]);
    expect(namesNobodySaid('Starting with what went badly.', hers)).toContain('Starting');
  });

  it('and reporting still catches an invented name that is not the opener', () => {
    expect(namesWorthReporting('Did Alex Smith get back to you?', hers)).toContain('Alex Smith');
    expect(namesWorthReporting('The client name: Alex Smith.', hers)).toContain('Alex Smith');
  });
});

describe('the end of the reply is not lost', () => {
  it('the withheld tail reaches the gate before it flushes', () => {
    /*
     * The stream withholds the last SESSION_CLOSE_MARKER.length characters of every reply in case
     * they turn out to be the close marker. Routing the deltas through the gate and deleting the old
     * separate flush dropped those characters entirely - every reply ended mid-word.
     *
     * Found by reading the deltas of one real check-in, which ended "What is it," and stopped. No
     * test of the gate could have caught it: the gate was right, it was never given the last piece.
     */
    const stream = body('async *sendMessageStream(');
    const withheld = stream.indexOf('const withheld = forHumans(raw).slice(cleanEmitted)');
    const flush = stream.indexOf('gate.flush()');
    expect(withheld).toBeGreaterThan(-1);
    expect(withheld).toBeLessThan(flush);
  });
});

describe('a seeded agreement is described as agreed, not as the lead\'s opinion', () => {
  const LIB = readFileSync(join(__dirname, 'prompt-library.ts'), 'utf8');

  it('there are three answers to "who set this", not two', () => {
    /*
     * "Set by the person leading this" is right when a lead wrote it in the product, and wrong for an
     * agreement the organisation's own system already held. That is not one person's view - it is
     * what everybody is working against - and describing it as an opinion invites the interview to
     * treat it as negotiable when it is not.
     */
    expect(LIB).toMatch(/they wrote this themselves/);
    expect(LIB).toMatch(/recorded as already agreed in the organisation/);
    expect(LIB).toMatch(/set by the person leading this/);
  });

  it('and the source changes the wording, never whether it can be challenged', () => {
    /*
     * `seenBySubject` still decides whether somebody may be pressed on a gap. A seeded target that
     * was never shown to the person is still not a stick to beat them with - which is the whole
     * reason an integration cannot set that flag on their behalf.
     */
    /*
     * `describeObjective`, which is where this reasoning moved when the block learned to render
     * several objectives instead of the first one. Sliced to the function rather than by a
     * character count, so the next edit does not push the assertion off the end of what it reads.
     */
    const from = LIB.indexOf('function describeObjective(');
    const block = LIB.slice(from, LIB.indexOf('function renderObjectives(', from));
    expect(block).toMatch(/seenBySubject/);
    expect(block).toMatch(/PRESS ON THE GAP/);
  });
});

describe('words do not fuse across a delta boundary', () => {
  it('the stream cleans the whole and takes what is new, never a chunk on its own', () => {
    /*
     * `forHumans` ends with `.trim()` - right for a finished reply, wrong for a fragment. A chunk
     * ending "you're " lost its trailing space, the next began "focused", and a real check-in showed
     * somebody "you'refocused". Invisible in a terminal; obvious in the stored turn.
     */
    const stream = body('async *sendMessageStream(');
    expect(stream).toMatch(/const cleanedSoFar = forHumans\(raw\.slice\(0, safeUpTo\)\)/);
    expect(stream).not.toMatch(/gate\.push\(forHumans\(chunk\)\)/);
  });

  it('and the withheld tail is measured in cleaned characters, not raw ones', () => {
    /* Cleaning changes lengths, so a raw offset into cleaned text is off by however much was
       stripped - which would drop or repeat the end of every reply. */
    expect(body('async *sendMessageStream(')).toMatch(/forHumans\(raw\)\.slice\(cleanEmitted\)/);
  });
});

describe('who set an objective is read from what the column holds', () => {
  it('and not compared to a participant id, which it never contains', () => {
    /*
     * `authoredBy` holds 'self' or 'lead'. It was compared to `checkIn.participantId`, a uuid, so
     * the comparison was false for every objective ever written and the interview told everybody
     * their own objective had been set for them. No test failed: the branch simply never ran.
     */
    expect(SRC).toMatch(/authoredByThem: personObjective\.authoredBy === 'self'/);
    expect(SRC).not.toMatch(/authoredBy === checkIn\.participantId/);
  });
});
