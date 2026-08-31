import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * PAUSING A GROUND DID NOT STOP ANYONE ALREADY TYPING IN IT.
 *
 * `open()` has always refused to START a check-in on a ground that is paused, closed or stalled.
 * `sendMessage()` never asked - its entire 86-line body contained no reference to the ground's status
 * at all - so CONTINUING an open session was permitted. Every further turn persisted, was extracted
 * into the record, and reached synthesis and the shared report.
 *
 * That matters most for PAUSED, whose schema comment states its purpose: "temporarily paused (e.g.
 * active legal proceedings detected)". A hold that keeps accepting answers is not a hold.
 *
 * Pinned as source order because the defect was the ABSENCE of a call, and absence is what a
 * behavioural test of the happy path cannot see. Comments are stripped first - this repository quotes
 * code verbatim inside its comments, which has produced four false positives in its own audit.
 */
const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const bodyOf = (name: string) => {
  const start = CODE.indexOf(`async ${name}(`);
  return CODE.slice(start, start + 1200);
};

describe('every path that writes to a ground checks the ground still accepts writing', () => {
  it.each(['sendMessage', 'complete'])('%s calls the guard', (method) => {
    expect(bodyOf(method)).toMatch(/await this\.assertGroundAcceptsInput\(checkIn\.groundId\)/);
  });

  it('and it runs AFTER ownership is established, not before', () => {
    /** Order matters: a stranger should be refused for not owning the check-in, not told the ground's state. */
    const b = bodyOf('sendMessage');
    expect(b.indexOf('loadOwnedCheckIn')).toBeLessThan(b.indexOf('assertGroundAcceptsInput'));
  });

  it('open() still has its own check, which is where this started', () => {
    expect(CODE).toMatch(/OPEN_STATUSES/);
  });
});

describe('the guard refuses what it should and says which state it is in', () => {
  const g = CODE.slice(CODE.indexOf('private async assertGroundAcceptsInput'));
  const guard = g.slice(0, g.indexOf('async sendMessage('));

  it('a paused ground gets a message about a hold, not a generic refusal', () => {
    /** "No longer accepting check-ins" tells a person nothing about whether to wait or give up. */
    expect(guard).toMatch(/GroundStatus\.PAUSED/);
    expect(guard).toMatch(/on hold/);
  });

  it('anything else non-open is refused as closed', () => {
    expect(guard).toMatch(/is closed\. Nothing further can be added/);
  });

  it('the four open states are permitted', () => {
    for (const st of ['OPEN', 'AWAITING_PARTIES', 'ACTIVE', 'REPORT_READY']) {
      expect(guard).toContain(`GroundStatus.${st}`);
    }
  });

  it('it selects status itself, so no caller can drop it', () => {
    /**
     * This is what makes the unreadable-status allowance below safe rather than a loophole: the
     * guard owns its own query.
     */
    expect(guard).toMatch(/select: \{ status: true \}/);
  });

  it('an unreadable status does not masquerade as closed', () => {
    /**
     * The first version threw "this ground is closed" whenever status was absent, which in production
     * cannot happen (non-nullable, and the guard selects it) and which failed 46 prompt-assembly tests
     * with a message about closure that had nothing to do with what they were checking.
     */
    expect(guard).toMatch(/if \(!ground\?\.status\) return;/);
  });
});
