import { withTheStoredPatternLinesThroughTheWall, theStoredPatternLinesFor } from './stored-pattern-lines-through-the-wall';
import { overTimeAsServed, overTimeForThisReader } from '../reports/what-the-record-shows-over-time';

/**
 * The stored pattern lines come back for whoever runs the check-in, and only through decision 86's wall (6 October 2026).
 * The code is a real library code that reads as a plain name; three periods are needed; the person it is about has their turn first.
 */
const NOW = new Date('2026-10-06T12:00:00Z');
const day = (n: number) => new Date(NOW.getTime() - n * 86400000);
const stored = { patterns: [
  { participantId: 'p-ade', who: 'Participant A', code: 'M1', name: 'x', observation: 'Upward reporting was optimistic while a major account was being lost.', seenInSessions: [1, 2, 3], consecutive: 3, status: 'x', say: 'Seen in 3 sessions.' },
  { participantId: 'p-bola', who: 'Participant B', code: 'M1', name: 'x', observation: 'Bola reported a closed deal that was not closed.', seenInSessions: [1, 2, 3], consecutive: 3, status: 'x', say: '' },
] } as any;
const row = (participantId: string, extra: any = {}) => ({ id: `r-${participantId}`, participantId, code: 'M1', observationText: 'x', seenInSessions: [1, 2, 3], periodsObserved: 3, readyAt: day(1), shownToPersonAt: null, personAnswer: null, personAnsweredAt: null, ...extra });
const lead = { participantId: 'p-lead', runsIt: true };
const lines = (o: any) => (o?.patterns ?? []).map((p: any) => p.observation);

describe('the stored pattern lines', () => {
  it('the lead reads a line once the person it is about has answered', () => {
    const o = withTheStoredPatternLinesThroughTheWall(stored, [row('p-ade', { personAnswer: 'It was a bad week.', personAnsweredAt: day(0) })], lead, { now: NOW });
    expect(lines(o)).toEqual(['Upward reporting was optimistic while a major account was being lost.']);
  });
  it('the lead reads it three days after the person was shown it, and seven days after it was ready if never opened', () => {
    expect(lines(withTheStoredPatternLinesThroughTheWall(stored, [row('p-ade', { shownToPersonAt: day(3) })], lead, { now: NOW }))).toHaveLength(1);
    expect(lines(withTheStoredPatternLinesThroughTheWall(stored, [row('p-ade', { readyAt: day(7) })], lead, { now: NOW }))).toHaveLength(1);
  });
  it('the lead reads nothing while the person is still on their first read, or has not had three periods', () => {
    expect(lines(withTheStoredPatternLinesThroughTheWall(stored, [row('p-ade', { shownToPersonAt: day(1) })], lead, { now: NOW }))).toEqual([]);
    expect(lines(withTheStoredPatternLinesThroughTheWall(stored, [row('p-ade', { personAnswer: 'ok', personAnsweredAt: day(0), seenInSessions: [1, 2], periodsObserved: 2 })], lead, { now: NOW }))).toEqual([]);
  });
  it('a stored line with no live row behind it is not served', () => {
    expect(lines(withTheStoredPatternLinesThroughTheWall(stored, [], lead, { now: NOW }))).toEqual([]);
  });
  it('the person it is about does not get it back as a line in the lead list', () => {
    const me = { participantId: 'p-ade', runsIt: false };
    expect(lines(withTheStoredPatternLinesThroughTheWall(stored, [row('p-ade', { personAnswer: 'ok', personAnsweredAt: day(0) })], me, { now: NOW }))).toEqual([]);
  });
  it('a colleague reads none about anybody else, answered or not', () => {
    const rows = [row('p-ade', { personAnswer: 'ok', personAnsweredAt: day(0) }), row('p-bola', { personAnswer: 'ok', personAnsweredAt: day(0) })];
    expect(lines(withTheStoredPatternLinesThroughTheWall({ patterns: [] , ...stored }, rows, { participantId: 'p-bola', runsIt: false }, { now: NOW }))).toEqual([]);
  });
  it('an admin who only reads gets none', () => {
    expect(lines(withTheStoredPatternLinesThroughTheWall(stored, [row('p-ade', { personAnswer: 'ok', personAnsweredAt: day(0) })], { participantId: null, runsIt: false }, { now: NOW }))).toEqual([]);
  });
});

describe('as it is really served: what is served has had its patterns taken out, the stored row is where they come from', () => {
  const full = { sessions: 3, commitments: [], dependencies: [], gaps: [], stillOpen: [], cannotTellYou: [], toSettleFirst: [], ...stored } as any;
  const prisma = (rows: any[]) => ({ patternDetection: { findMany: async () => rows } });
  const ready = [row('p-ade', { personAnswer: 'ok', personAnsweredAt: day(0) })];
  it('the lead reads the line on top of overTimeAsServed', async () => {
    const served = overTimeAsServed(full)!;
    expect(served.patterns).toEqual([]);
    const o = await theStoredPatternLinesFor(prisma(ready), 'g', served, lead, full);
    expect(lines(o)).toEqual(['Upward reporting was optimistic while a major account was being lost.']);
  });
  it('a participant, on top of overTimeForThisReader, reads none about anybody', async () => {
    const served = overTimeForThisReader(full, { isLead: false, participantId: 'p-bola' })!;
    expect(lines(await theStoredPatternLinesFor(prisma(ready), 'g', served, { participantId: 'p-bola', runsIt: false }, full))).toEqual([]);
  });
  it('an admin who only reads, on top of the lead read, gets none', async () => {
    const served = overTimeForThisReader(full, { isLead: true, participantId: null })!;
    expect(lines(await theStoredPatternLinesFor(prisma(ready), 'g', served, { participantId: null, runsIt: false }, full))).toEqual([]);
  });
  it('a lookup that fails serves none', async () => {
    const bad = { patternDetection: { findMany: async () => { throw new Error('down'); } } };
    expect(lines(await theStoredPatternLinesFor(bad, 'g', overTimeAsServed(full)!, lead, full))).toEqual([]);
  });
});
