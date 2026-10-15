import { aDailyCheckInWithNoEndSaid } from './grounds.service';
import { openingLine } from './the-context-chat';
import { theSessionClock } from '../board/one-count-for-the-sessions';
import { readFileSync } from 'fs';
import { join } from 'path';

/* Comments are taken out before anything is matched, so a sentence in a comment cannot satisfy a check (a-guard-that-a-comment-satisfies-is-not-a-guard). */
const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');


/**
 * PILOTS, 13 OCTOBER 2026, E2. "Litigation team daily" had no end said, and read "Session 3 of 365. It ends on 25 October
 * 2027." and "This check-in runs for 365 days". No end said means it runs until the lead ends it, with no count.
 */
const LITIGATION = { cadence: 'DAILY', scenario: 'PULSE_CHECK', timelineDays: 365, endsAt: null, runsUntilEnded: false };

describe('a daily check-in with no end said', () => {
  it('is read as running until the lead ends it', () => {
    expect(aDailyCheckInWithNoEndSaid(LITIGATION)).toBe(true);
  });
  it('one with an end she gave keeps it', () => {
    expect(aDailyCheckInWithNoEndSaid({ ...LITIGATION, endsAt: new Date('2026-12-18') })).toBe(false);
    expect(aDailyCheckInWithNoEndSaid({ ...LITIGATION, timelineDays: 60 })).toBe(false);
  });
  it('a weekly check-in keeps its count', () => {
    expect(aDailyCheckInWithNoEndSaid({ ...LITIGATION, cadence: 'WEEKLY' })).toBe(false);
  });
  it('the setup conversation opens on "until you end it", never 365 days', () => {
    expect(openingLine(null, 'DAILY', true, [1, 2, 3, 4, 5])).toBe('This check-in runs until you end it and people check in every weekday, Monday to Friday.');
  });
  it('the header counts the session with no "of 365", and no end date is served', () => {
    const says = theSessionClock([{ participantId: 'p1', sessionNumber: 3, status: 'IN_PROGRESS' } as any], new Set(['p1']), null)?.says ?? '';
    expect(says).not.toMatch(/of 365/);
    const src = withoutComments(readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8'));
    expect(src).toContain('const endsOn = noEnd ? null : deadlineOf(ground as any);');
    expect(src).toContain('noEnd ? null : totalSessionsFor((ground as any).timelineDays, (ground as any).cadence) ?? null,');
  });
});
