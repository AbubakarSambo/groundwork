import { BAD_FAITH_CODES, CARRYING_CODES, POSITIVE_CODES } from './pattern-library';
import { servedPatterns, whatHappenedIn, periodsSeen, type APatternRow } from './who-reads-a-pattern';

/**
 * THE RULES FOR SERVING A PATTERN, READ AS EACH READER. See who-reads-a-pattern.
 *
 * The rows are the ones the capability check found on the live Atlas board, 27 September 2026:
 * Ngozi's B11 and Femi's B3 after three sessions, Femi's R3 after one, and Ngozi's E1 seen once.
 */

const on = { on: true };
const EVERY_INTERNAL_NAME = [...POSITIVE_CODES, ...CARRYING_CODES, ...BAD_FAITH_CODES].map((c) => c.name);

const ROWS: APatternRow[] = [
  { id: 'pd1', participantId: 'p-ngozi', code: 'B11', observationText: 'The failure to secure approvals is attributed entirely to the credit committee not clearing submitted files.', seenInSessions: [1, 2, 4], periodsObserved: 1 },
  { id: 'pd2', participantId: 'p-femi', code: 'B3', observationText: 'Femi described the Harbor Foods deal as his own although Ngozi prepared the pricing.', seenInSessions: [1, 2, 3], periodsObserved: 3 },
  { id: 'pd3', participantId: 'p-femi', code: 'R3', observationText: 'Femi credited Ngozi by name for the pricing sheet.', seenInSessions: [2], periodsObserved: 1 },
  { id: 'pd4', participantId: 'p-ngozi', code: 'E1', observationText: 'Named the new analyst as the reason the forecast was late.', seenInSessions: [2], periodsObserved: 1 },
  { id: 'pd5', participantId: 'p-ngozi', code: 'E4', observationText: 'Absorbs operational load relative to the other founder.', seenInSessions: [1, 2, 3], periodsObserved: 3 },
  { id: 'pd6', participantId: 'p-ngozi', code: 'k5', observationText: 'Invented by the model.', seenInSessions: [1, 2, 3], periodsObserved: 3 },
];

const LEAD = { participantId: 'p-lead', runsIt: true };
const NGOZI = { participantId: 'p-ngozi', runsIt: false };
const FEMI = { participantId: 'p-femi', runsIt: false };
const ADMIN = { participantId: null, runsIt: true };
const STRANGER = { participantId: null, runsIt: false };

describe('who reads a pattern', () => {
  it('nobody reads one while the switch is off, whoever they are', () => {
    for (const r of [LEAD, NGOZI, FEMI, ADMIN, STRANGER]) expect(servedPatterns(ROWS, r)).toEqual([]);
  });

  it('a participant reads their own and never a colleague’s', () => {
    expect(servedPatterns(ROWS, NGOZI, on).map((p) => p.id)).toEqual(['pd1']);
    expect(servedPatterns(ROWS, FEMI, on).map((p) => p.id)).toEqual(['pd2']);
    expect(servedPatterns(ROWS, STRANGER, on)).toEqual([]);
  });

  it('only after three periods, counted with gaps and never from the detector’s status', () => {
    expect(periodsSeen({ seenInSessions: [1, 2, 4], periodsObserved: 1 })).toBe(3);
    /* R3 is SURFACED after one period in the detector. It is not shown after one. */
    expect(servedPatterns(ROWS, LEAD, on).map((p) => p.id).sort()).toEqual(['pd1', 'pd2']);
  });

  it('never E4, F5 or a code the library does not know', () => {
    const ids = servedPatterns(ROWS, ADMIN, on).map((p) => p.id);
    expect(ids).not.toContain('pd5');
    expect(ids).not.toContain('pd6');
  });

  it('in plain words, with no label, code or name joined to it', () => {
    const [mine] = servedPatterns(ROWS, NGOZI, on);
    expect(mine).toEqual({
      id: 'pd1',
      participantId: 'p-ngozi',
      yours: true,
      kind: 'attention',
      heading: 'Problems are always put down to something outside',
      whatHappened: 'The failure to secure approvals is attributed entirely to the credit committee not clearing submitted files.',
      sessions: [1, 2, 4],
      howOften: 'This came up in 3 of your check-ins, in sessions 1, 2 and 4.',
      askThem: null,
    });
    const served = JSON.stringify(servedPatterns(ROWS, LEAD, on));
    for (const name of EVERY_INTERNAL_NAME) expect(served).not.toContain(name);
    expect(served).not.toMatch(/"(?:code|label|who|name)"|"B11"|"B3"/);
    expect(servedPatterns(ROWS, LEAD, on).find((p) => p.id === 'pd1')?.askThem).toBe('What was within your control in this situation?');
    expect(servedPatterns(ROWS, LEAD, on).find((p) => p.id === 'pd2')?.howOften).toBe('This came up in 3 check-ins, in sessions 1, 2 and 3.');
  });

  it('the engine’s sentence is dropped whole when it holds an internal name or a code', () => {
    expect(whatHappenedIn('This is Blame Shifting again.')).toBeNull();
    expect(whatHappenedIn('A B11 signal was seen.')).toBeNull();
    expect(whatHappenedIn('[period=2] The record shows that the quote went out late')).toBe('The quote went out late.');
    expect(whatHappenedIn('   ')).toBeNull();
  });
});
