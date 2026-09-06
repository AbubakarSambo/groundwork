/**
 * THE SCHEDULE USED TO LIVE IN THE SERVICE, SO EVERY GROUND CHASED ALIKE.
 *
 * These hold the two ways a reminder system loses the people it is for: chasing
 * somebody who asked it to stop, and chasing three times and then telling nobody.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  whatToDoToday,
  theEmailForTheLead,
  CHASE_AFTER_DAYS,
  ChasingPolicy,
} from './chasing-belongs-to-the-lead';

const withoutComments = (file: string) =>
  fs
    .readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

const policy = (over: Partial<ChasingPolicy> = {}): ChasingPolicy => ({
  days: CHASE_AFTER_DAYS,
  stopped: false,
  tellTheLead: true,
  ...over,
});

describe('what to do about one person today', () => {
  it('nudges on a day this ground chases on', () => {
    expect(whatToDoToday({ policy: policy(), daysOpen: 7, hoursSinceLastNudge: null, leadAlreadyTold: false }))
      .toEqual({ do: 'nudge them' });
  });

  it('does nothing on a day it does not', () => {
    const decided = whatToDoToday({ policy: policy(), daysOpen: 5, hoursSinceLastNudge: null, leadAlreadyTold: false });
    expect(decided.do).toBe('nothing');
  });

  it('honours a lead who turned chasing off, on a chasing day', () => {
    const decided = whatToDoToday({
      policy: policy({ stopped: true }), daysOpen: 3, hoursSinceLastNudge: null, leadAlreadyTold: false,
    });
    expect(decided).toEqual({ do: 'nothing', because: 'the lead turned chasing off' });
  });

  it('honours an empty schedule the same way', () => {
    const decided = whatToDoToday({
      policy: policy({ days: [] }), daysOpen: 3, hoursSinceLastNudge: null, leadAlreadyTold: false,
    });
    expect(decided.do).toBe('nothing');
  });

  it('a stopped ground never tells the lead either', () => {
    const decided = whatToDoToday({
      policy: policy({ stopped: true }), daysOpen: 40, hoursSinceLastNudge: null, leadAlreadyTold: false,
    });
    expect(decided.do).toBe('nothing');
  });

  it('never nudges the same person twice in a day', () => {
    const decided = whatToDoToday({ policy: policy(), daysOpen: 3, hoursSinceLastNudge: 5, leadAlreadyTold: false });
    expect(decided).toEqual({ do: 'nothing', because: 'they were nudged in the last day' });
  });

  it('follows a lead’s own schedule rather than the default', () => {
    const theirs = policy({ days: [2] });
    expect(whatToDoToday({ policy: theirs, daysOpen: 2, hoursSinceLastNudge: null, leadAlreadyTold: false }).do)
      .toBe('nudge them');
    expect(whatToDoToday({ policy: theirs, daysOpen: 3, hoursSinceLastNudge: null, leadAlreadyTold: false }).do)
      .not.toBe('nudge them');
  });

  it('tells the lead once the chasing is done', () => {
    expect(whatToDoToday({ policy: policy(), daysOpen: 15, hoursSinceLastNudge: null, leadAlreadyTold: false }))
      .toEqual({ do: 'tell the lead' });
  });

  it('and does not tell them the same thing every morning', () => {
    const decided = whatToDoToday({ policy: policy(), daysOpen: 40, hoursSinceLastNudge: null, leadAlreadyTold: true });
    expect(decided.do).toBe('nothing');
  });

  it('says nothing to a lead who asked not to hear', () => {
    const decided = whatToDoToday({
      policy: policy({ tellTheLead: false }), daysOpen: 15, hoursSinceLastNudge: null, leadAlreadyTold: false,
    });
    expect(decided.do).toBe('nothing');
  });
});

describe('what the lead is told', () => {
  const composed = theEmailForTheLead({
    leadName: 'Ada',
    groundLabel: 'Q4 delivery',
    whoHasNotStarted: ['Grace', 'Alan'],
    chasedOn: [3, 7, 14],
    link: 'https://app.example/grounds',
  })!;

  it('names every person', () => {
    expect(composed.text).toContain('Grace');
    expect(composed.text).toContain('Alan');
  });

  it('is never a count', () => {
    /* A number of people, anywhere. "3 have not started" is a number somebody has
       to go and turn back into names, and the turning back is the work the email
       was supposed to save. The days it chased on are numbers and are fine. */
    expect(composed.text).not.toMatch(/\d+\s+(people|of them|outstanding|not started)/i);
    expect(composed.text).not.toMatch(/\b2\b/);
  });

  it('says the reminders have stopped, so the lead knows it is theirs now', () => {
    expect(composed.text).toContain('stopped');
  });

  it('is not sent at all when nobody is outstanding', () => {
    expect(theEmailForTheLead({
      leadName: 'Ada', groundLabel: 'Q4', whoHasNotStarted: [], chasedOn: [3], link: 'x',
    })).toBeNull();
  });
});

describe('the schedule has one home', () => {
  it('is not written into the reminder service any more', () => {
    const service = withoutComments('remind.service.ts');
    expect(service).not.toContain('NUDGE_DAY_THRESHOLDS');
    expect(service).not.toContain('[3, 7, 14]');
  });

  it('and the service asks this file what to do', () => {
    const service = withoutComments('remind.service.ts');
    expect(service).toContain('whatToDoToday');
    expect(service).toContain('chaseAfterDays');
  });

  it('a person’s own email switch still wins over the lead’s schedule', () => {
    /* In the SCHEDULED run specifically. The same check exists in the manual
       reminder, and asserting it appears anywhere in the file passed happily
       while the scheduled one was deleted. */
    const service = withoutComments('remind.service.ts');
    const from = service.indexOf('async sendScheduledNudges');
    const to = service.indexOf('checkAndSendConsecutiveAbsenceReminder(', from);
    const scheduled = service.slice(from, to);
    expect(from).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(from);
    expect(scheduled).toContain('emailNotifications === false');
  });

  it('sends the lead one email per check-in, not one per session', () => {
    /* A ground with three sessions open sent three emails in one morning, all
       about the same people. Found by running it, not by reading it. */
    const service = withoutComments('remind.service.ts');
    expect(service).toContain('const key = checkIn.groundId;');
    expect(service).not.toContain('${checkIn.groundId}:${checkIn.sessionNumber}');
  });

  it('marks people told only after the lead’s email went out', () => {
    const service = withoutComments('remind.service.ts');
    const send = service.indexOf('sendWhoHasNotStarted');
    const mark = service.indexOf('leadToldAt: now');
    expect(send).toBeGreaterThan(-1);
    expect(mark).toBeGreaterThan(send);
  });
});
