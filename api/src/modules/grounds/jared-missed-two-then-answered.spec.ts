import { CheckInStatus } from '@prisma/client';
import { CLOSED_BY_THE_CLOCK } from '../../common/closed-by-the-clock';
import { theMissesJustBefore, whatTheSessionIsToldAboutMissing } from './missed-check-ins';
import { whatHappened, whyThisRow } from '../board/where-each-person-is-against-their-number';

/* Comments are taken out before anything is matched, so a sentence in a comment cannot satisfy a check (a-guard-that-a-comment-satisfies-is-not-a-guard). */
const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');


/**
 * NIGHT QUALITY RUN 1, PROBLEM 5. Jared Okoth missed sessions 1 and 2 (each closed by the clock with
 * nothing said) and answered session 3. His session never mentioned the two misses and never asked how
 * many kits he sold; the lead's board said "Jared Okoth has checked in, and nothing here needs you this week."
 */
const jared = [
  { sessionNumber: 1, status: CheckInStatus.COMPLETED, closedReason: CLOSED_BY_THE_CLOCK, turns: [], availableFrom: '2026-10-19T05:00:00Z' },
  { sessionNumber: 2, status: CheckInStatus.COMPLETED, closedReason: CLOSED_BY_THE_CLOCK, turns: [], availableFrom: '2026-10-26T05:00:00Z' },
  { sessionNumber: 3, status: CheckInStatus.IN_PROGRESS as any, closedReason: null, turns: [{}], availableFrom: '2026-11-02T05:00:00Z' },
];
const now = new Date('2026-11-03T10:00:00Z');

describe("Jared's session is handed the two check-ins he missed", () => {
  it('counts the two missed just before his latest one', () => {
    expect(theMissesJustBefore(jared as any, [], now)).toEqual([1, 2]);
  });

  it('hands the session the facts and the push for what was finished and the numbers', () => {
    const block = whatTheSessionIsToldAboutMissing('Jared Okoth', [1, 2]);
    expect(block).toContain('Jared Okoth missed the last two check-ins here (sessions 1 and 2). Each one closed with nothing said.');
    expect(block).toContain('ask what was finished since the last time they answered');
    expect(block).toContain('ask for the numbers, as you would ask anybody: how many, of what, and what shows it.');
    expect(block).toContain('Never call it a pattern, never give it a label, and never guess why.');
  });

  it('says nothing for one miss or none', () => {
    expect(whatTheSessionIsToldAboutMissing('Jared Okoth', [2])).toBe('');
    expect(theMissesJustBefore([{ ...jared[0], closedReason: null, turns: [{}] }, jared[2]] as any, [], now)).toEqual([]);
  });
});

describe("the lead's board after two missed", () => {
  const row = {
    participantId: 'p-jared', who: 'Jared Okoth', target: null, count: 0, answeredThisRound: true, roundsSoFar: 3,
    inTheWay: [], saidAnythingCheckable: true, missedJustBefore: 2,
  } as any;

  it('never says nothing here needs you about Jared', () => {
    const reason = whyThisRow(row, null);
    expect(whatHappened(row, reason, null)).toBe('Jared Okoth has checked in.');
    expect(whatHappened(row, reason, null)).not.toContain('nothing here needs you');
  });

  it('and still says it for somebody who missed none', () => {
    expect(whatHappened({ ...row, missedJustBefore: 0 }, 'nothing to do', null)).toBe('Jared Okoth has checked in, and nothing here needs you this week.');
  });
});

describe('the block reaches the session prompt', () => {
  it('is put into the returning context every session turn reads', () => {
    const src = withoutComments(require('node:fs').readFileSync(require('node:path').join(__dirname, '../conversation/conversation.service.ts'), 'utf8'));
    expect(src).toMatch(/if \(toldAboutMissing\) returningUserContext = \[toldAboutMissing, returningUserContext\]/);
  });
});
