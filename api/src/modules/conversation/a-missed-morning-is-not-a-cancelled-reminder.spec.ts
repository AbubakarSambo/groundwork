/**
 * A CHASE DAY WAS ONE CRON PASS.
 *
 * `policy.days.includes(daysOpen)` is exact equality with today, so a deploy or an outage on the
 * morning of day 3 meant the day-3 nudge never happened — and nothing retried it, nothing recorded
 * it, and the schedule looked like it had run. These tests are about the day after a bad morning.
 */
import { whatToDoToday } from './chasing-belongs-to-the-lead';

const policy = { days: [3, 7, 14], stopped: false, tellTheLead: true };
const ask = (daysOpen: number, hoursSinceLastNudge: number | null, leadAlreadyTold = false) =>
  whatToDoToday({ policy, daysOpen, hoursSinceLastNudge, leadAlreadyTold });
/* `because` only exists on the do-nothing arm of the union, so a test that reads it says so. */
const why = (d: ReturnType<typeof ask>) => ('because' in d ? d.because : `it decided to ${d.do}`);

describe('a missed morning is not a cancelled reminder', () => {
  it('nudges on the chase day itself, as it always did', () => {
    expect(ask(3, null).do).toBe('nudge them');
  });

  it('still nudges on day 4 when day 3 was missed', () => {
    expect(ask(4, null).do).toBe('nudge them');
  });

  it('and on day 6, three bad mornings later', () => {
    expect(ask(6, null).do).toBe('nudge them');
  });

  it('but gives up on a chase day missed by more than a bad weekend', () => {
    /* Day 40 on a ground nobody ever chased: sending the day-14 nudge now is not a recovery, it is
       a reminder about something that has moved on. */
    expect(ask(40, null).do).not.toBe('nudge them');
  });

  it('does not nudge again for a day already served', () => {
    /* Nudged on day 3, and it is now day 5: nothing between them is due. */
    expect(ask(5, 48).do).toBe('nothing');
  });

  it('nudges for the NEXT chase day even though an earlier one was served', () => {
    /* Nudged on day 3, now day 7. */
    expect(ask(7, 96).do).toBe('nudge them');
  });

  it('never nudges twice in a day', () => {
    const twiceInADay = ask(3, 2);
    expect(twiceInADay.do).toBe('nothing');
    /* And says WHY truthfully. "Not a day this ground chases on" was returned here too, which
       reads in a log as a schedule that never had a day-3 at all. */
    expect(why(twiceInADay)).toMatch(/every reminder due so far/i);
  });

  it('does not nudge before the first chase day', () => {
    expect(ask(1, null).do).toBe('nothing');
    expect(ask(2, null).do).toBe('nothing');
  });

  it('serves a missed last chase day before it gives up and tells the lead', () => {
    /* Day 15, last spoken to on day 7: day 14 was missed, so the PERSON is reminded first. The
       lead hearing about it can wait a morning; the person being reminded at all cannot. */
    expect(ask(15, 200).do).toBe('nudge them');
  });

  it('tells the lead once nothing is owed to the person, and then stops', () => {
    /* Day 15, spoken to yesterday — day 14 was served, so the chasing really is finished. */
    expect(ask(15, 30).do).toBe('tell the lead');
    expect(ask(15, 30, true).do).toBe('nothing');
  });

  it('says the reminders are finished rather than that this is not a chase day', () => {
    expect(why(ask(15, 30, true))).toMatch(/lead has been told/i);
    expect(why(ask(1, null))).toMatch(/not a day this ground chases on/i);
  });

  it('respects the lead turning chasing off, whatever day it is', () => {
    expect(whatToDoToday({ policy: { ...policy, stopped: true }, daysOpen: 9, hoursSinceLastNudge: null, leadAlreadyTold: false }).do).toBe('nothing');
    expect(whatToDoToday({ policy: { ...policy, days: [] }, daysOpen: 9, hoursSinceLastNudge: null, leadAlreadyTold: false }).do).toBe('nothing');
  });
});

describe('and the absence reminder is not pinned to day fourteen', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs
    .readFileSync(path.join(__dirname, 'remind.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('asks about the ground\'s own last chase day rather than the number 14', () => {
    expect(src).not.toContain('daysElapsed === 14');
    expect(src).toContain('daysElapsed >= lastChaseDay');
  });

  it('and remembers it told them, so an open window does not mean every morning', () => {
    expect(src).toContain('absenceToldAt');
    const at = src.indexOf('sendAbsenceReminder');
    const guard = src.lastIndexOf('if (already?.absenceToldAt) return;', at);
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(at);
  });
});
