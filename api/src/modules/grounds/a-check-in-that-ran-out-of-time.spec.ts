import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  hasEnded, hasStalled, isShut, isHeld, mayChangeOnItsOwn, whyItRefuses, howItEnded,
  A_GROUND_IS_OVER, A_GROUND_HAS_STOPPED, IT_RAN_OUT_OF_TIME, IT_RAN_OUT_OF_TIME_ASK_THE_LEAD,
} from './a-ground-that-has-ended';

/**
 * A STATE A MACHINE CAN PUT YOU IN HAS TO HAVE A WAY OUT A PERSON CAN USE.
 *
 * Nate Peterson, 23 September 2026: "i let a few check-ins wait and they are now stalled, with no
 * clear way to open them back up. i can't easily see where to reopen them or to extend the
 * timeline... the whole thing would be of little to no use even if many of the users checked in."
 * And: "it doesn't seem clear that you can't check in, because all of the involved accounts have
 * things like 'your turn - 12 days late', which would indicate that a user could still check in."
 *
 * Three faults, all real. STALLED sat with RESOLVED and CLOSED - two decisions somebody took - so
 * it inherited their one property: irreversible. Extending the timeline wrote, moved the dates and
 * left the status alone, so it did nothing. And the rail never read the ground's status at all.
 */
describe('a check-in that ran out of time', () => {
  it('is not a check-in that ended', () => {
    expect(A_GROUND_IS_OVER).toEqual(['RESOLVED', 'CLOSED']);
    expect(A_GROUND_HAS_STOPPED).toEqual(['STALLED']);
    expect(hasEnded('STALLED')).toBe(false);
    expect(hasStalled('STALLED')).toBe(true);
    /* And a decision is still a decision. */
    expect(hasEnded('RESOLVED')).toBe(true);
    expect(hasStalled('RESOLVED')).toBe(false);
  });

  /* But nothing may be written to it, which is the question every door actually has. */
  it('and nothing can be added to it while it is stopped', () => {
    expect(isShut('STALLED')).toBe(true);
    expect(isShut('CLOSED')).toBe(true);
    expect(isShut('PAUSED')).toBe(true);
    expect(isShut('ACTIVE')).toBe(false);
    expect(isShut('REPORT_READY')).toBe(false);
  });

  /* And nothing revives it on its own: not a report release, not the next sweep. */
  it('and only a person lifts it', () => {
    expect(mayChangeOnItsOwn('STALLED')).toBe(false);
    expect(mayChangeOnItsOwn('PAUSED')).toBe(false);
    expect(mayChangeOnItsOwn('ACTIVE')).toBe(true);
  });

  /*
   * THE SENTENCE IT SAYS. The old one was "This check-in stopped without an agreed end." - true,
   * final, and no use to somebody who wanted to know what to do about it.
   */
  it('and says what lifts it, to whoever is reading', () => {
    expect(whyItRefuses('STALLED', null, 'the lead')).toBe(IT_RAN_OUT_OF_TIME);
    expect(whyItRefuses('STALLED', null, 'anybody else')).toBe(IT_RAN_OUT_OF_TIME_ASK_THE_LEAD);
    expect(IT_RAN_OUT_OF_TIME).toContain('until you give it more time');
    expect(IT_RAN_OUT_OF_TIME_ASK_THE_LEAD).toContain('whoever runs it gives it more time');
    /* Neither version says "ended", and both say the answers are kept. */
    for (const said of [IT_RAN_OUT_OF_TIME, IT_RAN_OUT_OF_TIME_ASK_THE_LEAD]) {
      expect(said).not.toMatch(/\bended\b/i);
      expect(said).toContain('Everything already in it is kept');
    }
    expect(howItEnded('STALLED')).toBeNull();
  });

  it('and a held one still reads as held', () => {
    expect(isHeld('PAUSED')).toBe(true);
    expect(whyItRefuses('PAUSED')).toContain('on hold');
  });
});

describe('and giving it more time opens it again', () => {
  const SERVICE = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const CRON = readFileSync(join(__dirname, 'grounds.cron.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  /* The extension IS the reopen: one act, because they are one intention. */
  it('back to what it was before the time ran out', () => {
    expect(SERVICE).toMatch(/const reopening = hasStalled\(ground\.status\) && requestedDays !== undefined/);
    expect(SERVICE).toMatch(/status: ground\.stalledFromStatus \?\? GroundStatus\.ACTIVE/);
    expect(SERVICE).toMatch(/stalledFromStatus: null,/);
  });

  /*
   * AND NOT TO A DATE THAT HAS ALREADY PASSED, which would hand it straight back to tonight's
   * sweep - the person doing exactly what the product told them and watching it stall by morning.
   */
  it('and refuses a reopen that would stall again tonight', () => {
    expect(SERVICE).toMatch(/const opensAgain = !!reopening && reopening\.getTime\(\) > Date\.now\(\)/);
    expect(SERVICE).toMatch(/the new end date has already passed/);
  });

  it('and the sweep records what it stalled from, so the reopen never has to guess', () => {
    expect(CRON).toMatch(/data: \{ status: GroundStatus\.STALLED, stalledFromStatus: prior, stalledAt: new Date\(\) \}/);
  });

  it('and somebody who has left the check-in is not mailed that it ran out of time (N50)', () => {
    expect(CRON).toMatch(/participants: \{ where: \{ leftAt: null \}, select: \{ id: true, email: true, userId: true \} \}/);
  });

  /* Without this the 3am sweep re-stalls the same grounds nightly and re-emails everybody daily. */
  it('and a ground already out of time is not stopped a second time', () => {
    expect(CRON).toMatch(/const STOPPED: GroundStatus\[\] = A_GROUND_HAS_STOPPED;/);
    expect(CRON).toMatch(/status: \{ notIn: \[\.\.\.TERMINAL, \.\.\.HELD, \.\.\.STOPPED\] \}/);
  });

  it('and everybody who was told it stalled is told it is open again', () => {
    expect(SERVICE).toMatch(/this\.tellThemItIsOpenAgain\(groundId\)/);
    expect(SERVICE).toMatch(/sendReopenedNotification\(/);
  });

  it('and the reopen is on the record', () => {
    expect(SERVICE).toMatch(/changes: \{ reopened: \{ from: GroundStatus\.STALLED/);
  });
});

describe('and nothing runs out of time without notice', () => {
  const CRON = readFileSync(join(__dirname, 'grounds.cron.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('the lead is warned while there is still time to act', () => {
    expect(CRON).toMatch(/async warnBeforeTimeRunsOut\(\)/);
    expect(CRON).toMatch(/const DAYS_OF_NOTICE = 7;/);
    expect(CRON).toMatch(/sendTimeRunningOut\(/);
  });

  /* Once. A check-in nobody extends is not nagged daily - letting it run out is a real answer. */
  it('once, and stamped before the send so a failed mailer cannot make it daily', () => {
    expect(CRON).toMatch(/stallWarningSentAt: null,/);
    const at = CRON.indexOf('data: { stallWarningSentAt: new Date() }');
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(CRON.indexOf('sendTimeRunningOut('));
  });

  /* Two o'clock against the stall sweep's three, so a warning can never arrive after the stall. */
  it('and before the sweep it warns about', () => {
    expect(CRON.indexOf("@Cron('0 2 * * *'")).toBeGreaterThan(-1);
    expect(CRON.indexOf("@Cron('0 2 * * *'")).toBeLessThan(CRON.indexOf('async stallOverdueGrounds'));
  });
});

/**
 * AND THE EMAIL NO LONGER POINTS AT A BUTTON THAT DOES NOT EXIST.
 *
 * "If you want to continue, either party can reopen the conversation from the check-in page." There
 * was no reopen on the check-in page or anywhere else, and this was the only thing anybody was ever
 * told about it.
 */
describe('what the stalled email says', () => {
  const EMAIL = readFileSync(join(__dirname, '../email/email.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const stalled = EMAIL.slice(EMAIL.indexOf('async sendStalledNotification('), EMAIL.indexOf('async sendReopenedNotification('));

  it('says whose call it is, and that the answers are kept', () => {
    expect(stalled).not.toContain('either party can reopen the conversation');
    expect(stalled).toContain('Whoever runs this check-in can give it more time');
    expect(stalled).toContain('Everything already answered is kept');
  });
});

/**
 * AND NOTHING STALLS IN SILENCE ANY MORE.
 *
 * "have a risk of stalling show, don't just stall." The notice sweep runs an hour before the stall
 * sweep and the stall sweep will not touch a check-in nobody has been told about, so the worst case
 * is a warning tonight and a stall tomorrow - never the two in the same silence.
 */
describe('the order of the two sweeps', () => {
  const CRON = readFileSync(join(__dirname, 'grounds.cron.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('nothing is stopped that was never warned', () => {
    const sweep = CRON.slice(CRON.indexOf('async stallOverdueGrounds'), CRON.indexOf('Gap #22'));
    expect(sweep).toMatch(/stallWarningSentAt: \{ not: null \}/);
  });

  /*
   * AND A CHECK-IN ALREADY PAST ITS DATE IS WARNED, NOT SKIPPED. The first version skipped anything
   * with negative days left, which on the day this shipped was every overdue check-in in the
   * product - so the whole existing population would have stalled tonight, unwarned, which is the
   * exact fault being fixed.
   */
  it('and one already past its date gets the notice rather than nothing', () => {
    const warn = CRON.slice(CRON.indexOf('async warnBeforeTimeRunsOut'), CRON.indexOf('async stallOverdueGrounds'));
    expect(warn).toMatch(/if \(daysLeft > DAYS_OF_NOTICE\) continue;/);
    expect(warn).not.toMatch(/daysLeft < 0\) continue/);
  });
});

/**
 * AND THE ONES ALREADY STALLED ARE NOT REOPENED BY A MIGRATION (Hafsah, 29 September 2026,
 * decision 54). The new rule, that a stalled check-in has a way back, applies from now on, and a
 * lead can reopen one themselves. This migration once reopened every stalled check-in with work
 * outstanding; it now changes no data, and its file stays so the order of migrations is unchanged.
 */
describe('the check-ins that were already stalled', () => {
  const SQL = readFileSync(
    join(__dirname, '../../../prisma/migrations/20260923200000_reopen_every_check_in_that_ran_out_of_time/migration.sql'),
    'utf8',
  )
    .replace(/^\s*--.*$/gm, '');

  it('are left as they are: the migration changes no data', () => {
    expect(SQL).not.toMatch(/\b(UPDATE|INSERT|DELETE|ALTER|DROP|TRUNCATE)\b/i);
    expect(SQL.trim()).toBe('SELECT 1;');
  });
});
