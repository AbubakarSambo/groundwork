import 'reflect-metadata';
import { CodeExpiryScheduler } from '../billing/code-expiry.scheduler';
import { EntryCron } from '../entry/entry.cron';
import { PatternsCron } from '../patterns/patterns.cron';
import { IntelligenceService } from '../intelligence/intelligence.service';
import { RemindService } from '../conversation/remind.service';
import { ReportsService } from '../reports/reports.service';

/**
 * Follow-up to grounds.cron.ts's cron-timezone.spec.ts: the same implicit-
 * timezone gap existed on every @Cron in the app, not just grounds.cron.ts -
 * six more jobs across five other modules. Locks that all of them are now
 * explicitly pinned to UTC, reading the real @nestjs/schedule metadata
 * (SCHEDULE_CRON_OPTIONS), not source text.
 */

const SCHEDULE_CRON_OPTIONS = 'SCHEDULE_CRON_OPTIONS';

function cronOptionsFor(proto: any, methodName: string) {
  return Reflect.getMetadata(SCHEDULE_CRON_OPTIONS, proto[methodName]);
}

describe('every remaining @Cron job across the app is pinned to UTC', () => {
  it.each([
    ['CodeExpiryScheduler', CodeExpiryScheduler.prototype, 'handleCodeExpiryReminders', '0 0 * * *'], // EVERY_DAY_AT_MIDNIGHT
    ['EntryCron', EntryCron.prototype, 'purgeAbandonedDrafts', '0 03 * * *'], // EVERY_DAY_AT_3AM
    ['PatternsCron', PatternsCron.prototype, 'sweep', '0 02 * * *'], // EVERY_DAY_AT_2AM
    ['IntelligenceService', IntelligenceService.prototype, 'weeklyLongitudinalSynthesis', '0 9 * * 1'],
    ['RemindService', RemindService.prototype, 'sendScheduledNudges', '0 08 * * *'], // EVERY_DAY_AT_8AM
    ['ReportsService', ReportsService.prototype, 'weeklyOutcomeLearningReport', '0 8 * * 1'],
  ])('%s.%s is pinned to UTC', (_className, proto, methodName, expectedCronTime) => {
    const opts = cronOptionsFor(proto, methodName as string);
    expect(opts).toBeDefined();
    expect(opts.cronTime).toBe(expectedCronTime);
    expect(opts.timeZone).toBe('UTC');
  });
});
