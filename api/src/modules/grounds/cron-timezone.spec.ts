import 'reflect-metadata';
import { GroundsCron } from './grounds.cron';

/**
 * Weekly pattern-surfacing timing determines when behavioral signals
 * actually become visible to real users. The @Cron decorator's timeZone
 * option was previously unset on both weekly jobs - meaning they ran in
 * whatever local timezone the Node process happened to be in, with no TZ
 * env var pinned anywhere in this repo's config (checked railway.toml,
 * .env.example). That's implicit and could silently differ between a
 * developer's machine and the deployed environment. Locks that both weekly
 * crons now explicitly resolve to UTC by reading the ACTUAL metadata
 * @nestjs/schedule registers at runtime (SCHEDULE_CRON_OPTIONS) - not just
 * matching source text, but what the framework will really schedule.
 */

const SCHEDULE_CRON_OPTIONS = 'SCHEDULE_CRON_OPTIONS';

function cronOptionsFor(methodName: keyof GroundsCron) {
  return Reflect.getMetadata(SCHEDULE_CRON_OPTIONS, (GroundsCron.prototype as any)[methodName]);
}

describe('weekly pattern crons run in an explicit, pinned timezone', () => {
  it('weeklyPeriodBoundary (Monday 05:00) is pinned to UTC', () => {
    const opts = cronOptionsFor('weeklyPeriodBoundary');
    expect(opts).toBeDefined();
    expect(opts.cronTime).toBe('0 5 * * 1');
    expect(opts.timeZone).toBe('UTC');
  });

  it('weeklyConcentrationRisk (Monday 05:30) is pinned to UTC', () => {
    const opts = cronOptionsFor('weeklyConcentrationRisk');
    expect(opts).toBeDefined();
    expect(opts.cronTime).toBe('30 5 * * 1');
    expect(opts.timeZone).toBe('UTC');
  });
});

// Follow-up to the two weekly pattern crons above: the remaining 7 crons in
// this same file had the identical implicit-timezone gap (flagged but
// deliberately left out of the original narrower fix). Every @Cron in
// GroundsCron is now pinned - this locks all of them so none can regress
// back to implicit silently.
describe('every remaining GroundsCron job is also pinned to UTC', () => {
  it.each([
    ['stallOverdueGrounds', '0 03 * * *'], // CronExpression.EVERY_DAY_AT_3AM
    ['autoCloseStaleCheckIns', '*/30 * * * *'],
    ['fireSessionClosingWarnings', '*/15 * * * *'],
    ['sendReminders', '0 09 * * *'], // CronExpression.EVERY_DAY_AT_9AM
    ['sendSessionReadyNotifications', '*/15 * * * *'],
    ['synthesisBackstop', '0 4 * * *'],
    ['sendFeedbackRequests', '0 10 * * *'],
  ])('%s is pinned to UTC', (methodName, expectedCronTime) => {
    const opts = cronOptionsFor(methodName as keyof GroundsCron);
    expect(opts).toBeDefined();
    expect(opts.cronTime).toBe(expectedCronTime);
    expect(opts.timeZone).toBe('UTC');
  });
});
