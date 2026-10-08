import 'reflect-metadata';
import { ARequestWaitsTooLongCron } from './a-request-waits-too-long.cron';
import { TheApproversSummaryCron } from './the-approvers-summary.cron';

/**
 * B-121: a lead at Baobab was written to twice in the same minute with two numbers. The morning
 * message about what waits ran at 07:30 Lagos and said "One request is waiting for you"; thirty
 * minutes of the clock later the job that passes on what has waited too long gave her 171 more and
 * told her again: "172 requests are waiting for you". The requests are now passed on first, so the
 * one morning message carries the true number, and the second job has nothing new to say.
 */
const cronOf = (target: any, method: string): { cronTime: string; timeZone: string } => {
  const o = Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', target.prototype[method]);
  const time = Reflect.getMetadata('SCHEDULER_CRON_TIME', target.prototype[method]) ?? o?.cronTime;
  return { cronTime: String(time ?? ''), timeZone: String(o?.timeZone ?? 'UTC') };
};
/** Minutes after midnight UTC that a "m h * * *" job runs at, in the zones these two use. */
const minuteOfTheDayInUtc = (c: { cronTime: string; timeZone: string }) => {
  const [m, h] = c.cronTime.split(' ').map(Number);
  const offset = c.timeZone === 'Africa/Lagos' ? 1 : 0;
  return (((h - offset) * 60 + m) + 1440) % 1440;
};

describe('the order of the two jobs that tell an approver what waits', () => {
  it('passes the requests on before the morning message is sent', () => {
    const passOn = cronOf(ARequestWaitsTooLongCron, 'passOnTheRequestsThatWaitTooLong');
    const tell = cronOf(TheApproversSummaryCron, 'tellApproversWhatWaits');
    expect(passOn.cronTime).toMatch(/^\d+ \d+ \* \* \*$/);
    expect(tell.cronTime).toMatch(/^\d+ \d+ \* \* \*$/);
    expect(minuteOfTheDayInUtc(passOn)).toBeLessThan(minuteOfTheDayInUtc(tell));
  });
});
