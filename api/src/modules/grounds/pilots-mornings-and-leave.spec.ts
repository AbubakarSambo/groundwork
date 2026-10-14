import { Cadence } from '@prisma/client';
import { whenTheNextSessionOpens, whenTheRoundCloses } from './the-check-ins-own-schedule';
import { leaveOfThePeopleOn, awayUntilOn } from '../suites/who-is-away';

/* Comments are taken out before anything is matched, so a sentence in a comment cannot satisfy a check (a-guard-that-a-comment-satisfies-is-not-a-guard). */
const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');


/**
 * PILOTS, 13 OCTOBER 2026, PROBLEM 14, AND HAFSAH'S DECISION D4 (13 October, evening): "Daily check-ins should open at
 * 8am in the time zone of the client." Every person on WhatsApp was written to at 11pm and again after midnight, and
 * Brian was written to on the Friday of his approved leave.
 */
const NAIROBI = 'Africa/Nairobi';
const daily = { cadence: Cadence.DAILY, anchorDay: null, workingDays: [], startedAt: new Date('2026-10-19T05:00:00Z'), startsNow: true, zone: NAIROBI };

describe('a daily check-in opens at 8 in the morning where the team is', () => {
  it('the next session after Monday opens at 8am on Tuesday in Nairobi, and Monday\'s closes then', () => {
    const opened = new Date('2026-10-19T05:00:00Z');
    const next = whenTheNextSessionOpens(daily as any, opened, new Date('2026-10-19T12:00:00Z'));
    expect(next.toISOString()).toBe('2026-10-20T05:00:00.000Z');
    expect(whenTheRoundCloses(daily as any, opened)?.toISOString()).toBe('2026-10-20T05:00:00.000Z');
  });

  it('a check-in that opened at midnight before this change gets its next one at 8am, and only one', () => {
    const openedAtMidnight = new Date('2026-10-18T21:00:00Z');
    expect(whenTheRoundCloses(daily as any, openedAtMidnight)?.toISOString()).toBe('2026-10-20T05:00:00.000Z');
  });

  it('a weekly check-in still opens at the start of its day', () => {
    const weekly = { ...daily, cadence: Cadence.WEEKLY };
    const next = whenTheNextSessionOpens(weekly as any, new Date('2026-10-19T05:00:00Z'), new Date('2026-10-19T12:00:00Z'));
    expect(next.getUTCHours()).toBe(21);
  });
});

describe('a day of leave is a day where the person is', () => {
  const prisma: any = {
    groundParticipant: { findMany: jest.fn(async () => [{ id: 'p-brian', userId: 'u-brian', ground: { organizationId: 'org-muchemi' } }]) },
    leaveRequest: { findMany: jest.fn(async () => [{ userId: 'u-brian', organizationId: 'org-muchemi', startsOn: new Date('2026-10-23T00:00:00Z'), endsOn: new Date('2026-10-23T00:00:00Z') }]) },
    organization: { findUnique: jest.fn(async () => ({ timeZone: NAIROBI })) },
  };

  it("Brian is away from midnight to midnight on Friday in Nairobi, so Friday's 00:00 and 8am messages are not sent", async () => {
    const leave = await leaveOfThePeopleOn(prisma, ['g-1']);
    expect(awayUntilOn(leave.get('p-brian'), new Date('2026-10-22T21:00:00Z'))).toBe('2026-10-23');
    expect(awayUntilOn(leave.get('p-brian'), new Date('2026-10-23T05:00:00Z'))).toBe('2026-10-23');
    expect(awayUntilOn(leave.get('p-brian'), new Date('2026-10-22T20:00:00Z'))).toBeNull();
    expect(awayUntilOn(leave.get('p-brian'), new Date('2026-10-23T21:00:00Z'))).toBeNull();
  });
});

describe('one routine message a day', () => {
  it('a daily check-in is not told it opens in an hour', () => {
    const src = withoutComments(require('fs').readFileSync(require('path').join(__dirname, 'grounds.cron.ts'), 'utf8'));
    const at = src.indexOf('async sendWhatsAppOpensSoonInner(');
    expect(src.slice(at, at + 3000)).toContain("if (ci.ground.cadence === 'DAILY') continue;");
  });
});
