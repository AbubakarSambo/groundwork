import 'reflect-metadata';
import { GroundsCron } from '../grounds/grounds.cron';
import { ARequestWaitsTooLongCron } from '../suites/a-request-waits-too-long.cron';

/**
 * WHEN IN THE MORNING THE LEAD'S NUDGE GOES (decision 120, found on the test bed, 8 October).
 *
 * The first version went at seven, first of all. A lead with something outstanding is told something every day, so it took her one message of the day every day,
 * and the messages that come once or once a week (the test check-in that moves on, the follow-up after a report, what Groundwork is doing while people have not
 * started, who has gone quiet) were refused each morning and never went. It now goes after them, and before the reminders, which it has always been ahead of.
 * It must also go after the requests that waited too long have been passed on, so the count it gives is the true one (B-121).
 */
const cronOf = (target: any, method: string): { cron: string; zone: string } => {
  const fn = target.prototype[method];
  const o = Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', fn);
  const time = Reflect.getMetadata('SCHEDULER_CRON_TIME', fn) ?? o?.cronTime;
  return { cron: String(time ?? ''), zone: String(o?.timeZone ?? 'UTC') };
};
const minuteOfTheDayInUtc = (c: { cron: string; zone: string }) => {
  const [m, h] = c.cron.split(' ').map(Number);
  const offset = c.zone === 'Africa/Lagos' ? 1 : 0;
  return (((h - offset) * 60 + m) + 1440) % 1440;
};
const at = (method: string, target: any = GroundsCron) => minuteOfTheDayInUtc(cronOf(target, method));

describe('the lead\'s daily nudge in the morning', () => {
  const nudge = at('sendTheLeadsDailyNudges');

  it('is a job that runs every day', () => {
    expect(cronOf(GroundsCron, 'sendTheLeadsDailyNudges').cron).toMatch(/^\d+ \d+ \* \* \*$/);
  });

  it.each([
    'sendHeresWhatIsNew', 'sendTheTestCheckInMessages', 'sendTheReportFollowUps', 'sendWhoHasGoneQuiet', 'sendWhatGroundworkIsDoing',
  ])('goes after %s, which would otherwise never be told', (method) => {
    expect(at(method)).toBeLessThan(nudge);
  });

  it.each(['sendWhatsAppReminders', 'sendReminders'])('goes before %s', (method) => {
    expect(nudge).toBeLessThan(at(method));
  });

  it('goes after the requests that waited too long have been passed on', () => {
    expect(at('passOnTheRequestsThatWaitTooLong', ARequestWaitsTooLongCron)).toBeLessThan(nudge);
  });

  it('is still called by its old name by the journeys, and runs the one morning job', () => {
    expect(typeof (GroundsCron.prototype as any).sendTheLeadsDailySummariesInner).toBe('function');
    expect(cronOf(GroundsCron, 'sendTheLeadsDailySummaries').cron).toBe('');
  });
});
