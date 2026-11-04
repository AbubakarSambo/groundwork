/**
 * The invitation says "you can simply ignore this". Until this existed, ignoring it got you
 * chased every three days with no way out, and the only exit was to accept the invitation, make
 * an account, open the check-in and answer a willingness question with a no.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { STOP_LINE, whyNotRemindThem } from './ignoring-it-should-be-enough';
import { whyNotNudge } from './who-is-worth-nudging';

const stripped = (p: string) =>
  readFileSync(join(__dirname, p), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

describe('somebody who asked us to stop', () => {
  it('is not reminded', () => {
    expect(whyNotRemindThem({ remindersStoppedAt: new Date() })).toMatch(/asked us to stop/);
  });

  it('and somebody who has not asked is left alone by this rule', () => {
    expect(whyNotRemindThem({ remindersStoppedAt: null })).toBeNull();
    expect(whyNotRemindThem({})).toBeNull();
  });

  it('is refused BEFORE any question about their check-in state', () => {
    /*
     * Order matters and is the point. Somebody who has withdrawn consent to be chased must not be
     * assessed on whether they finished, whether they accepted, or whether a day has passed -
     * those are all questions about how to chase them.
     */
    const asked = whyNotNudge({
      remindersStoppedAt: new Date(),
      session: { id: 'c1', status: 'NOT_STARTED' },
      hasAccepted: true,
      emailNotifications: true,
      hoursSinceLastNudge: 400,
    } as never);
    expect(asked).toMatch(/asked us to stop/);
  });

  it('and is still refused when every other rule says go ahead', () => {
    const would = whyNotNudge({
      session: { id: 'c1', status: 'NOT_STARTED' },
      hasAccepted: true,
      emailNotifications: true,
      hoursSinceLastNudge: 400,
    } as never);
    expect(would).toBeNull();
  });
});

describe('the link itself', () => {
  it('carries the url it was given', () => {
    expect(STOP_LINE('https://x/stop-reminders/abc')).toContain('href="https://x/stop-reminders/abc"');
  });

  /* Changed 4 November 2026 (release batch 1): the way out is the link alone, with no note about what is recorded. It still promises nothing more. */
  it('promises what the route actually does, and no more', () => {
    const line = STOP_LINE('u');
    expect(line).toMatch(/Stop the reminders/);
    expect(line).not.toMatch(/decline|recorded/);
  });

  it('does not offer to decline for them, because a scanner can follow a link', () => {
    /* "Stop reminding me" is about our behaviour and is theirs for the asking. "No" is a decision
       that shows on somebody's board. A GET that could do the second is a GET a mail-security
       scanner can use to answer for them. */
    expect(STOP_LINE('u').toLowerCase()).not.toMatch(/decline|not taking part|withdraw/);
  });
});

describe('the mail actually carries it', () => {
  const email = stripped('../email/email.service.ts');

  it('on the invitation, which is where the promise is made', () => {
    expect(email).toMatch(/sendParticipantInvite[\s\S]{0,600}theWayToStopBeingChased/);
  });

  it('and on the reminder, which is the thing being stopped', () => {
    expect(email).toMatch(/sendNudge[\s\S]{0,2400}theWayToStopBeingChased/);
  });

  it('minted once and kept, not tied to the invite token that is cleared on accept', () => {
    expect(email).toMatch(/stopRemindersToken/);
    expect(email).not.toMatch(/theWayToStopBeingChased\([^)]*inviteToken/);
  });
});

describe('the reminder path reads the column', () => {
  /**
   * The fault this fixes has a twin: `managingOnly` was read off a select that omitted it, so the
   * exclusion was permanently false and nothing looked wrong. A stop that is never selected is a
   * stop that never stops anything.
   */
  const remind = stripped('./remind.service.ts');

  it('selects it', () => {
    expect(remind).toMatch(/remindersStoppedAt: true/);
  });

  it('and the reminder tells the mail which participant it is for', () => {
    expect(remind).toMatch(/sendNudge\([\s\S]{0,320}participant\.id/);
  });
});
