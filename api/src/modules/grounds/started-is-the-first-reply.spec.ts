import { theSessionAndItsCount } from './this-sessions-count';
import { theyHaveReplied } from './an-answer-includes-a-refusal';
import { whereEachPersonIsGettingStarted } from './getting-each-person-started';
import * as fs from 'fs';
import * as path from 'path';

/**
 * A CHECK-IN COUNTS AS STARTED ONLY WHEN THE PERSON FIRST REPLIES (Hafsah, 3 November 2026, word for word: "The first question can be
 * written when the invitation goes out, but the check-in only counts as started when the person first replies, so the counts stay
 * right.")
 *
 * David opened his check-in, so Groundwork's first question is written, and he has not replied. Neema has not opened hers. Aisha
 * replied and has not finished. What Juma, who leads, reads: David has not started, like Neema; Aisha has.
 */
const p = (id: string, userId: string, firstName: string, partyType = 'PARTICIPANT') => ({ id, userId, partyType, user: { firstName, lastName: null }, managingOnly: false });
const PEOPLE = [p('p-juma', 'u-juma', 'Juma', 'INITIATOR'), p('p-aisha', 'u-aisha', 'Aisha'), p('p-david', 'u-david', 'David'), p('p-neema', 'u-neema', 'Neema')];
const OPENS = new Date('2026-11-03T06:00:00Z');
const ROWS = [
  { participantId: 'p-juma', sessionNumber: 1, status: 'COMPLETED', completedAt: new Date('2026-11-03T09:00:00Z'), availableFrom: OPENS, turns: [{ id: 't' }] },
  { participantId: 'p-aisha', sessionNumber: 1, status: 'IN_PROGRESS', availableFrom: OPENS, turns: [{ id: 't' }] },
  { participantId: 'p-david', sessionNumber: 1, status: 'IN_PROGRESS', availableFrom: OPENS, turns: [] },
  { participantId: 'p-neema', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: OPENS, turns: [] },
];

describe('started is the first reply', () => {
  it('Juma reads that Aisha has started, and that David, who has only been asked, has not', () => {
    const { count } = theSessionAndItsCount(
      { participants: PEOPLE, checkIns: ROWS, scenario: 'NEW_PROJECT', cadence: 'DAILY', runsUntilEnded: true },
      { now: new Date('2026-11-03T12:00:00Z'), names: { readerUserId: 'u-juma' } },
    );
    expect(count.says).toBe('1 of 4 has checked in; Aisha has started and not finished yet, and David and Neema haven’t started yet.');
  });

  it('one rule for it, read from their turns', () => {
    expect(theyHaveReplied({ status: 'IN_PROGRESS', turns: [] })).toBe(false);
    expect(theyHaveReplied({ status: 'IN_PROGRESS', personTurns: 2 })).toBe(true);
    expect(theyHaveReplied({ status: 'NOT_STARTED', turns: [{}] })).toBe(true);
  });

  it('the lead\'s list of where each person is getting started, the activation funnel and the daily delivery alert read it the same way', () => {
    const src = (f: string) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    expect(src('grounds/getting-each-person-started.ts')).toContain("startedAt: c.turns?.[0]?.createdAt ? new Date(c.turns[0].createdAt) : null,");
    expect(src('engagement/the-activation-funnel.ts')).toContain("COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM conversation_turns t WHERE t.check_in_id = check_ins.id AND t.role = 'PERSON'))::int AS started,");
    expect(src('engagement/the-daily-delivery-alert.ts')).toContain('const answered = (ci: any) => theyAnswered.has(ci.id);');
    expect(src('reports/reports.service.ts')).toContain("c.status === 'IN_PROGRESS' && theyHaveReplied(c)");
    expect(src('board/board.service.ts')).toContain("ci.status === CheckInStatus.IN_PROGRESS && theyHaveReplied(ci as any) ? 'in-progress'");
  });

  it('who has started and not finished, for the lead, is who replied', () => {
    const [david] = whereEachPersonIsGettingStarted([{
      participantId: 'p-david', name: 'David Ouma', team: null, invitedAt: new Date('2026-11-02T08:00:00Z'), acceptedAt: new Date('2026-11-02T09:00:00Z'),
      hasAnAccount: true, bounced: false, delivered: true, checkIns: [{ startedAt: null, completedAt: null, quietClose: false, sessionNumber: 1, availableFrom: OPENS }],
    } as any], new Date('2026-11-03T12:00:00Z'));
    /* "Started a check-in and stopped before the end. What they said is saved." would be untrue: he has said nothing. */
    expect(david.says).not.toContain('stopped before the end');
    expect(david.says).toContain('has not started a check-in yet');
  });
});
