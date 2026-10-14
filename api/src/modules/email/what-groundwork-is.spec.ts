/**
 * Of the 110 emails a hundred audited journeys produced, not one named the organisation and 54
 * never said who can see what the reader writes — and half of those go to somebody who has met the
 * product once, for ten minutes. What a person believes happens to their words decides what they
 * write down, so this is not a copy problem: a record built on a misunderstanding about privacy is
 * a worse record.
 */
import * as fs from 'fs';
import * as path from 'path';
import { withWhatGroundworkIs, shouldSayWhatGroundworkIs, WHAT_GROUNDWORK_IS } from './what-groundwork-is';
import { WHAT_EACH_MAIL_IS } from './nothing-goes-out-that-was-turned-off';

describe('where it belongs', () => {
  it('goes on a mail about the work', () => {
    expect(shouldSayWhatGroundworkIs('sendReportReady')).toBe(true);
    /* Changed on 8 October: this said sendParticipantCheckedIn too. That mail goes to the lead about somebody else's answer, and the paragraph tells the
       reader that "your manager" can see what THEY say, which is not what the lead is reading. It is left off (see the-footer-says-only-what-is-true.spec). */
    expect(shouldSayWhatGroundworkIs('sendNudge')).toBe(true);
  });

  it('stays off a door', () => {
    /* A person clicking a sign-in link is not writing anything, and a footer on a one-line mail is
       noise that teaches people to skip footers. */
    for (const sender of ['sendMagicLinkEmail', 'sendSignInLinkEmail', 'sendPasswordResetEmail', 'sendParticipantInvite']) {
      /* Named in the loop rather than as a matcher message: this is jest, not vitest. */
      expect({ sender, footer: shouldSayWhatGroundworkIs(sender) }).toEqual({ sender, footer: false });
    }
  });

  it('and off a mail with no sender at all, rather than guessing', () => {
    expect(shouldSayWhatGroundworkIs(undefined)).toBe(false);
  });
});

describe('what it says', () => {
  it('says what the product is and who sees what somebody writes', () => {
    expect(WHAT_GROUNDWORK_IS).toMatch(/each give their own account/);
    /* Changed on 7 October: it said "not shown to anybody until the record is released ... does not quote you", which is not true (decision 4).
       It now says what the invitation says: who can read what a person says. */
    expect(WHAT_GROUNDWORK_IS).toMatch(/The people in this check-in, including your manager, can see what you say in it\./);
    expect(WHAT_GROUNDWORK_IS).not.toMatch(/not shown to anybody|does not quote you|privately/);
  });

  it('claims nothing the product does not do', () => {
    /* Deliberately NOT "we cannot see your conversations": turns are stored unencrypted and
       transcripts go to a model for processing. The same line the check-in screen holds. */
    expect(WHAT_GROUNDWORK_IS).not.toMatch(/encrypted|we cannot see|only you can ever/i);
  });
});

describe('appending it', () => {
  it('adds it to a mail about the work', () => {
    expect(withWhatGroundworkIs('<p>hello</p>', 'sendReportReady')).toContain('each give their own account');
  });

  it('leaves a door alone', () => {
    expect(withWhatGroundworkIs('<p>hello</p>', 'sendMagicLinkEmail')).toBe('<p>hello</p>');
  });

  it('does not say it twice where a template says it already', () => {
    const already = '<p>Groundwork is where the people involved in a piece of work each give their own account.</p>';
    expect(withWhatGroundworkIs(already, 'sendReportReady')).toBe(already);
  });
});

describe('and the sender applies it once, for every mail', () => {
  const src = fs
    .readFileSync(path.join(__dirname, 'email.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('is applied in sendEmail rather than in the templates', () => {
    expect(src).toContain('withWhatGroundworkIs(options.html, sender,');
  });

  it('before the send and before the dev log, so what is logged is what goes out', () => {
    const at = src.indexOf('withWhatGroundworkIs(options.html');
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(src.indexOf('[DEV EMAIL] To:'));
    expect(at).toBeLessThan(src.indexOf('transport.sendMail'));
  });

  it('and every classified sender is one or the other, never unclassified', () => {
    /* The footer's line comes from `WHAT_EACH_MAIL_IS`, so a sender missing from it would silently
       get the footer as "we decided to send it". That list has its own completeness guard; this
       asserts the two files agree about what a door is. */
    const doors = Object.entries(WHAT_EACH_MAIL_IS).filter(([, k]) => k === 'the way back in');
    expect(doors.length).toBeGreaterThan(5);
    for (const [sender] of doors) expect(shouldSayWhatGroundworkIs(sender)).toBe(false);
  });
});
