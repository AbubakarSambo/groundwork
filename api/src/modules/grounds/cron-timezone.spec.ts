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
