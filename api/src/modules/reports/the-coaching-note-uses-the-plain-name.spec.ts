import { whatToWorkOnNext } from './what-to-work-on-next';
import { BAD_FAITH_CODES, CARRYING_CODES, POSITIVE_CODES } from '../patterns/pattern-library';
import { plainNameOf } from '../patterns/plain-pattern-names';

/**
 * THE PERSON'S OWN COACHING NOTE READS THE PLAIN NAME, NEVER THE DETECTOR'S OWN SIGNAL.
 *
 * `whatToWorkOnNext` used to build "showingUp" from `LIBRARY.get(code).signal`, the detector's own
 * terse description ("Ownership claimed for work others delivered." for B3), straight onto the one
 * sentence the person themselves reads about what keeps coming up in their own work (decision 52:
 * no internal name or code reaches any reader, and this reader is the person it is about). Fixed by
 * reading the plain name from plain-pattern-names.ts, so the person's own note now agrees with the
 * board, their own record and the lead's probe list about what a pattern is called.
 */
const memberBase = {
  role: 'ward coordinator',
  detectedFunction: null as string | null,
  functionConfidence: null as number | null,
  noticedBehaviour: null as string | null,
  sessionNumber: 4,
  totalSessions: 6,
  scenario: 'NEW_HIRE',
  waitingOn: [] as any[],
  holdingUp: [] as any[],
  saidSomethingSpecific: true,
  anythingDocumented: false,
};

const INTERNAL = [...POSITIVE_CODES, ...CARRYING_CODES, ...BAD_FAITH_CODES];
const b3 = INTERNAL.find((c) => c.code === 'B3')!;

describe('the coaching note, decision 52', () => {
  it('says the plain name, and never the internal name, the code or the detector’s own signal', () => {
    const note = whatToWorkOnNext({ ...memberBase, patterns: [{ code: 'B3', periodsObserved: 3 }] });
    expect(note.showingUp).toContain(plainNameOf('B3')!.name);
    expect(note.showingUp).not.toContain(b3.signal);
    expect(note.showingUp).not.toContain(b3.name);
    expect(note.showingUp).not.toMatch(/\bB3\b/);
  });

  it('a code with no plain name (E4, F5, or one the library does not know) is never read as a recurring pattern', () => {
    const note = whatToWorkOnNext({ ...memberBase, patterns: [{ code: 'E4', periodsObserved: 3 }] });
    expect(note.showingUp).toBeNull();
  });
});
